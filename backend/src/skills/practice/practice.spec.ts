import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../skills-database.service';
import { PracticeService } from './practice.service';
import { PRACTICE_QUESTIONS } from './question-bank';

describe('Developer practice persistence', () => {
  function setup() {
    const attempts = new Map<
      string,
      {
        id: string;
        user_id: string;
        challenge_id: string;
        accuracy: number;
        is_validated: boolean;
        metadata: {
          source: string;
          practice_correct: boolean;
          option_id: string;
        };
        created_at: string;
      }
    >();
    const tables: string[] = [];
    const problem = {
      id: 'problem',
      title: 'Algorithms and arrays',
      is_published: true,
      challenge_skills: [
        {
          skill: {
            id: 'arrays',
            name: 'Arrays',
            technology: { name: 'JavaScript' },
          },
        },
        {
          skill: {
            id: 'hashing',
            name: 'Hash tables',
            technology: { name: 'JavaScript' },
          },
        },
      ],
    };
    let failInsert = false;
    const db = {
      client: {
        from: (table: string) => {
          tables.push(table);
          const filters = new Map<string, unknown>();
          const query = {
            select: () => query,
            eq: (name: string, value: unknown) => {
              filters.set(name, value);
              return query;
            },
            contains: (_name: string, value: unknown) => {
              filters.set('metadata', value);
              return query;
            },
            order: () => query,
            maybeSingle: () =>
              Promise.resolve({
                data:
                  table === 'challenges'
                    ? problem
                    : [...attempts.values()].find(
                        (row) =>
                          row.id === filters.get('id') &&
                          row.user_id === filters.get('user_id'),
                      ),
                error: null,
              }),
            insert: (
              row: Omit<ReturnType<typeof attempts.get> & object, 'created_at'>,
            ) => {
              if (failInsert)
                return Promise.resolve({ error: { code: 'XX000' } });
              if (attempts.has(row.id))
                return Promise.resolve({ error: { code: '23505' } });
              attempts.set(row.id, {
                ...row,
                created_at: new Date().toISOString(),
              });
              return Promise.resolve({ error: null });
            },
            range: (from: number, to: number) =>
              Promise.resolve({
                data: [...attempts.values()]
                  .filter(
                    (row) =>
                      row.user_id === filters.get('user_id') &&
                      row.is_validated === false &&
                      row.metadata.source === 'quiz_practice' &&
                      row.metadata.practice_correct,
                  )
                  .slice(from, to + 1)
                  .map((row) => ({
                    ...row,
                    challenge: { ...problem, id: row.challenge_id },
                  })),
                error: null,
              }),
          };
          return query;
        },
      },
    } as unknown as SupabaseService;
    const service = new PracticeService(db, {
      getOrThrow: () => 'isolated-test-signing-material',
    } as unknown as ConfigService);
    return {
      service,
      attempts,
      tables,
      problem,
      fail: () => {
        failInsert = true;
      },
    };
  }
  function choices(start: Awaited<ReturnType<PracticeService['start']>>) {
    const question = PRACTICE_QUESTIONS.find(
      (item) =>
        item.question === start.question.question &&
        item.codeSnippet === start.question.codeSnippet,
    )!;
    return {
      correct: question.options.find((item) => item.isCorrect)!.id,
      wrong: question.options.find((item) => !item.isCorrect)!.id,
    };
  }
  it('returns public options without answer keys, then checks and persists a correct developer answer', async () => {
    const { service, attempts, tables } = setup();
    const start = await service.start('developer', 'problem');
    expect(
      start.question.options.every(
        (option) => Object.keys(option).sort().join(',') === 'id,text',
      ),
    ).toBe(true);
    const result = await service.answer('developer', 'problem', {
      session: start.session,
      optionId: choices(start).correct,
    });
    expect(result).toMatchObject({
      correct: true,
      saved: true,
      verified: false,
    });
    expect([...attempts.values()][0]).toMatchObject({
      user_id: 'developer',
      challenge_id: 'problem',
      is_validated: false,
      metadata: { source: 'quiz_practice', practice_correct: true },
    });
    expect((await service.summary('developer')).completedProblems).toBe(1);
    expect((await service.summary('developer')).skills).toHaveLength(2);
    expect(
      tables.every((table) => ['challenges', 'attempts'].includes(table)),
    ).toBe(true);
  });
  it('does not award completion for a wrong answer and makes the first answer immutable', async () => {
    const { service, attempts } = setup();
    const start = await service.start('developer', 'problem');
    const options = choices(start);
    expect(
      await service.answer('developer', 'problem', {
        session: start.session,
        optionId: options.wrong,
      }),
    ).toMatchObject({ correct: false, saved: true });
    expect(
      await service.answer('developer', 'problem', {
        session: start.session,
        optionId: options.correct,
      }),
    ).toMatchObject({ correct: false, selectedOptionId: options.wrong });
    expect(attempts.size).toBe(1);
    expect((await service.summary('developer')).completedProblems).toBe(0);
  });
  it('counts each completed problem once, refreshes linked skills and isolates accounts', async () => {
    const { service } = setup();
    for (const id of ['problem', 'problem', 'second-problem']) {
      const start = await service.start('developer', id);
      await service.answer('developer', id, {
        session: start.session,
        optionId: choices(start).correct,
      });
    }
    const summary = await service.summary('developer');
    expect(summary.completedProblems).toBe(2);
    expect(summary.skills.every((skill) => skill.solvedProblems === 2)).toBe(
      true,
    );
    expect((await service.summary('another-developer')).completedProblems).toBe(
      0,
    );
  });
  it('rejects forged, cross-user, cross-problem and expired sessions', async () => {
    const { service, attempts } = setup();
    const start = await service.start('developer', 'problem');
    const optionId = choices(start).correct;
    await expect(
      service.answer('another-developer', 'problem', {
        session: start.session,
        optionId,
      }),
    ).rejects.toThrow('invalid or expired');
    await expect(
      service.answer('developer', 'another-problem', {
        session: start.session,
        optionId,
      }),
    ).rejects.toThrow('invalid or expired');
    const [payload, signature] = start.session.split('.');
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString(),
    ) as Record<string, unknown>;
    const modified =
      Buffer.from(
        JSON.stringify({ ...decoded, userId: 'another-developer' }),
      ).toString('base64url') +
      '.' +
      signature;
    await expect(
      service.answer('another-developer', 'problem', {
        session: modified,
        optionId,
      }),
    ).rejects.toThrow('invalid or expired');
    const clock = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.now() + 16 * 60_000);
    try {
      await expect(
        service.answer('developer', 'problem', {
          session: start.session,
          optionId,
        }),
      ).rejects.toThrow('invalid or expired');
    } finally {
      clock.mockRestore();
    }
    expect(attempts.size).toBe(0);
  });
  it('reports unpublished problems and save failures without claiming completion', async () => {
    const first = setup();
    first.problem.is_published = false;
    await expect(first.service.start('developer', 'problem')).rejects.toThrow(
      'Published problem not found',
    );
    const second = setup();
    const start = await second.service.start('developer', 'problem');
    second.fail();
    await expect(
      second.service.answer('developer', 'problem', {
        session: start.session,
        optionId: choices(start).correct,
      }),
    ).rejects.toThrow('not saved');
    expect(second.attempts.size).toBe(0);
  });
});
