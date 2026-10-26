import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createHash,
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'node:crypto';
import { SupabaseService } from '../skills-database.service';
import {
  pickRandom,
  PRACTICE_QUESTIONS,
  resolveBank,
  type Question,
} from './question-bank';
import type { PracticeAnswerDto } from './practice.dto';

const keyFor = (question: Question) =>
  createHash('sha256').update(JSON.stringify(question)).digest('hex');
const questions = new Map(
  PRACTICE_QUESTIONS.map((question) => [keyFor(question), question]),
);
type Session = {
  id: string;
  userId: string;
  problemId: string;
  questionKey: string;
  expiresAt: number;
};
type Result = {
  source: 'quiz_practice';
  question_key: string;
  option_id: string;
  practice_correct: boolean;
};
type Skill = { id: string; name: string; technology: { name: string } | null };
type PracticeRow = {
  challenge_id: string;
  created_at: string;
  challenge: {
    id: string;
    title: string;
    challenge_skills: { skill: Skill | null }[];
  } | null;
};

@Injectable()
export class PracticeService {
  private readonly signingKey: Buffer;
  constructor(
    private readonly db: SupabaseService,
    config: ConfigService,
  ) {
    this.signingKey = createHmac(
      'sha256',
      config.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY'),
    )
      .update('devarena.practice.sessions.v1')
      .digest();
  }

  private async problem(id: string) {
    const { data, error } = await this.db.client
      .from('challenges')
      .select('id,title,is_published,challenge_skills(skill:skills(name))')
      .eq('id', id)
      .maybeSingle<{
        id: string;
        title: string;
        is_published: boolean;
        challenge_skills: { skill: { name: string } | null }[];
      }>();
    if (error)
      throw new ServiceUnavailableException(
        'Practice is unavailable. Please retry.',
      );
    if (!data || !data.is_published)
      throw new NotFoundException('Published problem not found.');
    return data;
  }

  private sign(payload: string) {
    return createHmac('sha256', this.signingKey)
      .update(payload)
      .digest('base64url');
  }

  private session(token: string, userId: string, problemId: string): Session {
    try {
      const [payload, signature, extra] = token.split('.');
      const expected = Buffer.from(this.sign(payload));
      const actual = Buffer.from(signature ?? '');
      if (
        extra ||
        actual.length !== expected.length ||
        !timingSafeEqual(actual, expected)
      )
        throw new Error();
      const session = JSON.parse(
        Buffer.from(payload, 'base64url').toString(),
      ) as Session;
      if (
        session.userId !== userId ||
        session.problemId !== problemId ||
        !Number.isFinite(session.expiresAt) ||
        session.expiresAt < Date.now() ||
        !questions.has(session.questionKey)
      )
        throw new Error();
      return session;
    } catch {
      throw new BadRequestException(
        'This practice session is invalid or expired. Start a new question.',
      );
    }
  }

  async start(userId: string, problemId: string) {
    const problem = await this.problem(problemId);
    const skillNames = problem.challenge_skills
      .map((link) => link.skill?.name ?? '')
      .join(' ');
    const question = pickRandom(
      resolveBank(problemId, problem.title, skillNames),
    );
    const session: Session = {
      id: randomUUID(),
      userId,
      problemId,
      questionKey: keyFor(question),
      expiresAt: Date.now() + 15 * 60_000,
    };
    const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
    return {
      session: payload + '.' + this.sign(payload),
      question: {
        question: question.question,
        codeSnippet: question.codeSnippet,
        hint: question.hint,
        options: question.options.map(({ id, text }) => ({ id, text })),
      },
    };
  }

  async answer(userId: string, problemId: string, body: PracticeAnswerDto) {
    const session = this.session(body.session, userId, problemId);
    await this.problem(problemId);
    const question = questions.get(session.questionKey)!;
    const option = question.options.find((item) => item.id === body.optionId);
    if (!option)
      throw new BadRequestException('Select one of the available answers.');
    let result: Result = {
      source: 'quiz_practice',
      question_key: session.questionKey,
      option_id: option.id,
      practice_correct: option.isCorrect,
    };
    const { error } = await this.db.client.from('attempts').insert({
      id: session.id,
      user_id: userId,
      challenge_id: problemId,
      accuracy: option.isCorrect ? 1 : 0,
      is_validated: false,
      metadata: result,
    });
    if (error?.code === '23505') {
      // The first answer wins, including simultaneous or retried submissions.
      const previous = await this.db.client
        .from('attempts')
        .select('metadata')
        .eq('id', session.id)
        .eq('user_id', userId)
        .eq('challenge_id', problemId)
        .maybeSingle<{ metadata: Result }>();
      if (previous.error || previous.data?.metadata?.source !== 'quiz_practice')
        throw new ServiceUnavailableException(
          'Unable to restore this practice result.',
        );
      result = previous.data.metadata;
    } else if (error)
      throw new ServiceUnavailableException(
        'Your practice result was not saved. Please retry.',
      );
    const selected = question.options.find(
      (item) => item.id === result.option_id,
    )!;
    return {
      correct: result.practice_correct,
      selectedOptionId: selected.id,
      correctOptionId: question.options.find((item) => item.isCorrect)?.id,
      explanation: selected.explanation,
      saved: true,
      verified: false,
    };
  }

  async summary(userId: string) {
    const rows: PracticeRow[] = [];
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await this.db.client
        .from('attempts')
        .select(
          'challenge_id,created_at,challenge:challenges(id,title,challenge_skills(skill:skills(id,name,technology:technologies(name))))',
        )
        .eq('user_id', userId)
        .eq('is_validated', false)
        .contains('metadata', {
          source: 'quiz_practice',
          practice_correct: true,
        })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + pageSize - 1);
      if (error)
        throw new ServiceUnavailableException(
          'Practice progress is unavailable. Please retry.',
        );
      const page = (data ?? []) as unknown as PracticeRow[];
      rows.push(...page);
      if (page.length < pageSize) break;
    }
    const completed = new Map<string, PracticeRow>();
    for (const row of rows)
      if (row.challenge && !completed.has(row.challenge_id))
        completed.set(row.challenge_id, row);
    const skills = new Map<
      string,
      {
        id: string;
        name: string;
        technology: string | null;
        solvedProblems: number;
      }
    >();
    for (const row of completed.values()) {
      const seen = new Set<string>();
      for (const link of row.challenge?.challenge_skills ?? []) {
        const skill = link.skill;
        if (!skill || seen.has(skill.id)) continue;
        seen.add(skill.id);
        const item = skills.get(skill.id) ?? {
          id: skill.id,
          name: skill.name,
          technology: skill.technology?.name ?? null,
          solvedProblems: 0,
        };
        item.solvedProblems++;
        skills.set(skill.id, item);
      }
    }
    return {
      completedProblems: completed.size,
      completedProblemIds: [...completed.keys()],
      skills: [...skills.values()].sort(
        (a, b) =>
          b.solvedProblems - a.solvedProblems || a.name.localeCompare(b.name),
      ),
      recentProblems: [...completed.values()].slice(0, 5).map((row) => ({
        id: row.challenge_id,
        title: row.challenge!.title,
        completedAt: row.created_at,
      })),
    };
  }
}
