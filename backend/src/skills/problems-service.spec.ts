import { ProblemsService } from './problems.service';
import { SupabaseService } from './skills-database.service';

describe('Problem detail schema compatibility', () => {
  const id = 'a93c639c-d4e6-52f4-afef-cf2da0beda43';
  function setup() {
    const problem = {
      id,
      title: 'Imported problem',
      description: 'Return the required result.',
      difficulty: 'beginner',
      category: 'Arrays',
      duration_seconds: 900,
      is_published: true,
      topic_links: [{ topic_id: 'topic' }],
      skill_links: [{ skill_id: 'skill', weight: 2 }],
    };
    const single = jest
      .fn<
        Promise<{
          data: typeof problem | null;
          error: { code: string } | null;
        }>,
        []
      >()
      .mockResolvedValue({ data: problem, error: null });
    const select = jest.fn((columns: string) => ({
      eq: jest.fn(() => ({
        maybeSingle: () => {
          // Reproduce the actual exported table: lifecycle columns do not exist.
          if (/published_at|archived_at/.test(columns))
            return Promise.resolve({
              data: null,
              error: { code: '42703' },
            });
          return single();
        },
      })),
    }));
    const rpc = jest.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST202' },
    });
    const db = { client: { from: jest.fn(() => ({ select })), rpc } };
    const service = new ProblemsService(db as unknown as SupabaseService);
    return { service, problem, select, single, rpc };
  }
  it('loads imported problems without lifecycle columns and preserves their association IDs and weights', async () => {
    const s = setup();
    expect(await s.service.detail(id)).toEqual(s.problem);
    expect(s.select.mock.calls[0][0]).not.toMatch(/published_at|archived_at/);
    expect(s.select.mock.calls[0][0]).toContain(
      'skill_links:challenge_skills(skill_id,weight)',
    );
  });
  it('still distinguishes nonexistent records and genuine database failures', async () => {
    const s = setup();
    s.single.mockResolvedValueOnce({ data: null, error: null });
    await expect(s.service.detail(id)).rejects.toMatchObject({ status: 404 });
    s.single.mockResolvedValueOnce({ data: null, error: { code: '08006' } });
    await expect(s.service.detail(id)).rejects.toMatchObject({ status: 503 });
  });
  it('reports the missing administration migration without unsafe fallback writes or false success', async () => {
    const s = setup();
    const expected = {
      status: 409,
      response: { code: 'PROBLEM_ADMINISTRATION_SETUP_REQUIRED' },
    };
    await expect(
      s.service.write('admin', id, {
        title: 'Updated problem',
        description: 'The updated statement.',
        difficulty: 'beginner',
      }),
    ).rejects.toMatchObject(expected);
    await expect(
      s.service.action('admin', id, 'archive'),
    ).rejects.toMatchObject(expected);
    expect(s.select).not.toHaveBeenCalled();
  });
});
