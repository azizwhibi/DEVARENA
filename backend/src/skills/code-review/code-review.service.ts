import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  HttpException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import { SupabaseService } from '../skills-database.service';
import {
  CODE_LANGUAGES,
  type CodeReviewDto,
  type CodeLanguage,
} from './code-review.dto';
import { GeminiCodeReviewService } from './gemini-code-review.service';
import { skillGroup } from './skill-groups';
import {
  AI_SOLVED_THRESHOLD,
  parseReview,
  reviewPassed,
  type Review,
} from './review-result';

type Metadata = {
  source: 'gemini_code_review';
  state: 'pending' | 'completed' | 'failed';
  language: CodeLanguage;
  code: string;
  request_hash: string;
  problem_hash: string;
  model?: string;
  review?: Review;
  reviewed_at?: string;
};
type Row = {
  id: string;
  user_id: string;
  challenge_id: string;
  created_at: string;
  metadata: Metadata;
};
type Problem = {
  id: string;
  title: string;
  description: string;
  is_published: boolean;
};
type SummaryRow = Row & {
  challenge: {
    title: string;
    challenge_skills: {
      skill: { id: string; name: string; slug?: string | null } | null;
    }[];
  } | null;
};
const hash = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');

@Injectable()
export class CodeReviewService {
  constructor(
    private readonly db: SupabaseService,
    private readonly gemini: GeminiCodeReviewService,
  ) {}

  private check(error: unknown) {
    if (error)
      throw new ServiceUnavailableException(
        'Code reviews could not be saved or loaded. Please retry.',
      );
  }
  private async problem(id: string) {
    const { data, error } = await this.db.client
      .from('challenges')
      .select('id,title,description,is_published')
      .eq('id', id)
      .maybeSingle<Problem>();
    this.check(error);
    if (!data?.is_published)
      throw new NotFoundException('Published problem not found.');
    return data;
  }
  private languages(problem: Problem): readonly CodeLanguage[] {
    return /^sql\s*:/i.test(problem.title)
      ? ['sql']
      : CODE_LANGUAGES.filter((l) => l !== 'sql');
  }
  private async row(userId: string, id: string) {
    const { data, error } = await this.db.client
      .from('attempts')
      .select('id,user_id,challenge_id,created_at,metadata')
      .eq('id', id)
      .eq('user_id', userId)
      .eq('is_validated', false)
      .contains('metadata', { source: 'gemini_code_review' })
      .maybeSingle<Row>();
    this.check(error);
    return data;
  }
  private output(row: Row) {
    const m = row.metadata;
    const state =
      m.state === 'pending' && Date.now() - Date.parse(row.created_at) > 120000
        ? 'failed'
        : m.state;
    const review = state === 'completed' ? parseReview(m.review) : null;
    return {
      id: row.id,
      problemId: row.challenge_id,
      language: m.language,
      code: m.code,
      state,
      score: review?.assessable ? review.score : null,
      assessable: review?.assessable ?? null,
      passed: !!review && reviewPassed(review),
      feedback: review?.feedback ?? null,
      issues: review?.issues ?? [],
      model: m.model ?? null,
      reviewedAt: m.reviewed_at ?? null,
      threshold: AI_SOLVED_THRESHOLD,
      aiGenerated: true,
      verified: false,
    };
  }
  async get(userId: string, id: string) {
    const row = await this.row(userId, id);
    if (!row) throw new NotFoundException('Code review not found.');
    return this.output(row);
  }
  async detail(userId: string, id: string) {
    const problem = await this.problem(id);
    const { data, error } = await this.db.client
      .from('attempts')
      .select('id,user_id,challenge_id,created_at,metadata')
      .eq('user_id', userId)
      .eq('challenge_id', id)
      .eq('is_validated', false)
      .contains('metadata', { source: 'gemini_code_review' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(1)
      .maybeSingle<Row>();
    this.check(error);
    return {
      id,
      title: problem.title,
      description: problem.description,
      languages: this.languages(problem),
      threshold: AI_SOLVED_THRESHOLD,
      latest: data ? this.output(data) : null,
    };
  }
  async submit(userId: string, problemId: string, dto: CodeReviewDto) {
    if (!dto.code.trim() || dto.code.trim().length < 10)
      throw new BadRequestException('Enter your solution code.');
    const problem = await this.problem(problemId);
    if (
      !problem.description ||
      problem.description.trim().length < 10 ||
      problem.description.length > 50000
    )
      throw new ConflictException(
        'This problem needs a complete statement before code can be reviewed.',
      );
    if (!this.languages(problem).includes(dto.language))
      throw new BadRequestException(
        'Choose a language supported by this problem.',
      );
    const problemHash = hash([problem.title, problem.description]);
    const requestHash = hash([problemId, dto.language, dto.code]);
    const existing = await this.row(userId, dto.submissionId);
    if (existing) {
      if (existing.metadata.request_hash !== requestHash)
        throw new ConflictException(
          'A submission ID cannot be reused with different code.',
        );
      return this.output(existing);
    }
    const { model } = this.gemini.settings();
    const quota = await this.db.client
      .from('attempts')
      .select('id', { head: true, count: 'exact' })
      .eq('user_id', userId)
      .contains('metadata', { source: 'gemini_code_review' })
      .gte('created_at', new Date(Date.now() - 86400000).toISOString());
    this.check(quota.error);
    if ((quota.count ?? 0) >= 30)
      throw new HttpException(
        'Daily code review limit reached. Try again tomorrow.',
        429,
      );
    const metadata: Metadata = {
      source: 'gemini_code_review',
      state: 'pending',
      language: dto.language,
      code: dto.code,
      request_hash: requestHash,
      problem_hash: problemHash,
      model,
    };
    const inserted = await this.db.client.from('attempts').insert({
      id: dto.submissionId,
      user_id: userId,
      challenge_id: problemId,
      accuracy: 0,
      is_validated: false,
      metadata,
    });
    if (inserted.error?.code === '23505') {
      const previous = await this.row(userId, dto.submissionId);
      if (!previous || previous.metadata.request_hash !== requestHash)
        throw new ConflictException(
          'Submission ID already used. Start a new submission.',
        );
      return this.output(previous);
    }
    this.check(inserted.error);
    try {
      const { model: reviewedModel, ...review } = await this.gemini.review(
        userId,
        problem,
        dto.language,
        dto.code,
      );
      const current = await this.problem(problemId);
      if (hash([current.title, current.description]) !== problemHash)
        throw new ConflictException(
          'The problem changed during review. Read it again and resubmit.',
        );
      const completed: Metadata = {
        ...metadata,
        state: 'completed',
        model: reviewedModel,
        review,
        reviewed_at: new Date().toISOString(),
      };
      const result = await this.db.client
        .from('attempts')
        .update({
          accuracy: review.score / 100,
          is_validated: false,
          metadata: completed,
        })
        .eq('id', dto.submissionId)
        .eq('user_id', userId)
        .contains('metadata', {
          source: 'gemini_code_review',
          state: 'pending',
        })
        .select('id,user_id,challenge_id,created_at,metadata')
        .maybeSingle<Row>();
      this.check(result.error);
      if (!result.data)
        throw new ServiceUnavailableException(
          'Review was not saved. Retry loading the result.',
        );
      return this.output(result.data);
    } catch (error) {
      // Provider failures can never turn a pending submission into a solved result.
      await this.db.client
        .from('attempts')
        .update({ metadata: { ...metadata, state: 'failed' } })
        .eq('id', dto.submissionId)
        .eq('user_id', userId)
        .contains('metadata', {
          source: 'gemini_code_review',
          state: 'pending',
        });
      throw error;
    }
  }
  async summary(userId: string) {
    const rows: SummaryRow[] = [];
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await this.db.client
        .from('attempts')
        .select(
          'id,user_id,challenge_id,created_at,metadata,challenge:challenges(title,challenge_skills(skill:skills(id,name,slug)))',
        )
        .eq('user_id', userId)
        .eq('is_validated', false)
        .contains('metadata', {
          source: 'gemini_code_review',
          state: 'completed',
        })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + 499);
      this.check(error);
      const page = (data ?? []) as unknown as SummaryRow[];
      rows.push(...page);
      if (page.length < 500) break;
    }
    const solved = new Map<string, SummaryRow>();
    const languages = new Map<CodeLanguage, Set<string>>();
    for (const row of rows) {
      const review = parseReview(row.metadata.review);
      if (!row.challenge || !reviewPassed(review)) continue;
      // Count actual persisted submission languages, never a problem title or skill's technology.
      if (CODE_LANGUAGES.includes(row.metadata.language)) {
        const problems =
          languages.get(row.metadata.language) ?? new Set<string>();
        problems.add(row.challenge_id);
        languages.set(row.metadata.language, problems);
      }
      const previous = solved.get(row.challenge_id);
      if (!previous || review.score > previous.metadata.review!.score)
        solved.set(row.challenge_id, row);
    }
    const skills = new Map<
      string,
      {
        id: string;
        name: string;
        group: ReturnType<typeof skillGroup>;
        solvedProblems: number;
        total: number;
      }
    >();
    for (const row of solved.values()) {
      const seen = new Set<string>();
      for (const link of row.challenge!.challenge_skills) {
        if (!link.skill || seen.has(link.skill.id)) continue;
        seen.add(link.skill.id);
        const skill = skills.get(link.skill.id) ?? {
          id: link.skill.id,
          name: link.skill.name,
          group: skillGroup(link.skill),
          solvedProblems: 0,
          total: 0,
        };
        skill.solvedProblems++;
        skill.total += row.metadata.review!.score;
        skills.set(skill.id, skill);
      }
    }
    return {
      threshold: AI_SOLVED_THRESHOLD,
      solvedProblems: solved.size,
      reviewedSubmissions: rows.length,
      solvedProblemIds: [...solved.keys()],
      languages: [...languages.entries()]
        .map(([language, problems]) => ({
          language,
          solvedProblems: problems.size,
        }))
        .sort(
          (a, b) =>
            b.solvedProblems - a.solvedProblems ||
            a.language.localeCompare(b.language),
        ),
      skills: [...skills.values()]
        .map(({ total, ...s }) => ({
          ...s,
          reviewScore: Math.round(total / s.solvedProblems),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      recentProblems: [...solved.values()]
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .slice(0, 5)
        .map((row) => ({
          id: row.challenge_id,
          title: row.challenge!.title,
          score: row.metadata.review!.score,
        })),
    };
  }
}
