import { SkillProgressService } from './skill-progress.service';
import { SupabaseService } from './skills-database.service';
import { AssignmentsService } from './assignments.service';

describe('Automatic demonstrated skills', () => {
  function setup(insertError: unknown = null) {
    const insert = jest.fn().mockResolvedValue({ error: insertError });
    const query = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest
        .fn()
        .mockResolvedValue({ data: { id: 'problem' }, error: null }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [{ skill_id: 'arrays' }, { skill_id: 'hashing' }],
          error: null,
        }).then(resolve),
    };
    const db = {
      client: {
        from: (table: string) => (table === 'attempts' ? { insert } : query),
      },
    } as unknown as SupabaseService;
    const service = new SkillProgressService(db);
    const recalculate = jest
      .spyOn(service, 'recalculate')
      .mockImplementation((userId, skillId) =>
        Promise.resolve({
          userId,
          skillId,
          levelScore: 100,
          validatedAttempts: 1,
          status: 'expert',
        }),
      );
    return { service, recalculate, insert };
  }
  it('recalculates every linked skill using existing scoring, even when a caller targets one skill', async () => {
    const { service, recalculate, insert } = setup();
    await service.applyAttemptResult('developer', 'problem', true, 'arrays');
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'developer',
        challenge_id: 'problem',
        is_validated: true,
      }),
    );
    expect(recalculate.mock.calls).toEqual([
      ['developer', 'arrays'],
      ['developer', 'hashing'],
    ]);
  });
  it('does not grant proficiency for failed results', async () => {
    const { service, recalculate, insert } = setup();
    await service.applyAttemptResult('developer', 'problem', false);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ is_validated: false }),
    );
    expect(recalculate).not.toHaveBeenCalled();
  });
  it('never awards skills after a failed database write or for an unrelated target', async () => {
    const error = new Error('Database write failed');
    const failed = setup(error);
    await expect(
      failed.service.applyAttemptResult('developer', 'problem', true),
    ).rejects.toThrow(error);
    expect(failed.recalculate).not.toHaveBeenCalled();
    const unrelated = setup();
    await expect(
      unrelated.service.applyAttemptResult(
        'developer',
        'problem',
        true,
        'unrelated',
      ),
    ).rejects.toThrow('not linked');
    expect(unrelated.insert).not.toHaveBeenCalled();
  });
  it('scopes demonstrated reads to one identity and reports missing migration failures', async () => {
    const eq = jest.fn().mockReturnThis();
    const query = {
      select: jest.fn().mockReturnThis(),
      eq,
      order: jest.fn().mockResolvedValue({
        data: [{ id: 'arrays', solved_count: 1 }],
        error: null,
      }),
    };
    const service = new AssignmentsService({
      client: { from: () => query },
    } as unknown as SupabaseService);
    expect(await service.demonstrated('developer')).toEqual([
      { id: 'arrays', solved_count: 1 },
    ]);
    expect(eq).toHaveBeenCalledWith('user_id', 'developer');
    query.order.mockResolvedValueOnce({
      data: null,
      error: { code: '42P01' },
    });
    await expect(service.demonstrated('developer')).rejects.toThrow(
      'automatic-skills.sql',
    );
  });
});
