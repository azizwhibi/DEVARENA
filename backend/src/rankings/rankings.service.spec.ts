import { RankingsService } from './rankings.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('RankingsService', () => {
  let service: RankingsService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: jest.fn(),
        rpc: jest.fn(),
      },
    };

    service = new RankingsService(mockSupabase as SupabaseService);
  });

  it('returns global leaderboard for anonymous visitor with me = null', async () => {
    const mockRows = [
      {
        rank: 1,
        user_id: 'user-1',
        username: 'alice',
        avatar_url: 'https://example.com/alice.png',
        country: 'FR',
        institution: 'University A',
        dev_score: 85.5,
        tier: 'expert',
        total: 10,
      },
      {
        rank: 2,
        user_id: 'user-2',
        username: 'bob',
        avatar_url: null,
        country: 'DE',
        institution: 'University B',
        dev_score: 72,
        tier: 'advanced',
        total: 10,
      },
    ];

    mockSupabase.client.rpc.mockResolvedValueOnce({
      data: mockRows,
      error: null,
    });

    const res = await service.getRankings({ scope: 'global', page: 1, pageSize: 20 });

    expect(mockSupabase.client.rpc).toHaveBeenCalledWith('leaderboard', {
      p_scope: 'global',
      p_value: null,
      p_limit: 20,
      p_offset: 0,
    });

    expect(res.items.length).toBe(2);
    expect(res.items[0]).toEqual({
      rank: 1,
      userId: 'user-1',
      username: 'alice',
      avatarUrl: 'https://example.com/alice.png',
      country: 'FR',
      institution: 'University A',
      devScore: 85.5,
      tier: 'expert',
    });
    expect(res.total).toBe(10);
    expect(res.page).toBe(1);
    expect(res.pageSize).toBe(20);
    expect(res.me).toBeNull();
  });

  it('returns caller rank in me object when user is authenticated', async () => {
    const mockRows = [
      {
        rank: 1,
        user_id: 'user-1',
        username: 'alice',
        dev_score: 85.5,
        tier: 'expert',
        total: 1,
      },
    ];

    mockSupabase.client.rpc
      .mockResolvedValueOnce({ data: mockRows, error: null }) // leaderboard
      .mockResolvedValueOnce({
        data: [{ rank: 1, dev_score: 85.5, tier: 'expert', eligible: true }],
        error: null,
      }); // my_rank

    const res = await service.getRankings(
      { scope: 'global' },
      { id: 'user-1' },
    );

    expect(res.me).toEqual({
      rank: 1,
      devScore: 85.5,
      tier: 'expert',
      eligible: true,
    });
  });

  it('defaults scope value to user country if scope is country and value is omitted', async () => {
    mockSupabase.client.from.mockReturnValueOnce({
      select: jest.fn().mockReturnValueOnce({
        eq: jest.fn().mockReturnValueOnce({
          maybeSingle: jest.fn().mockResolvedValueOnce({
            data: { country: 'FR', institution: 'University Paris' },
          }),
        }),
      }),
    });

    mockSupabase.client.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({ data: [], error: null });

    await service.getRankings(
      { scope: 'country' },
      { id: 'user-fr' },
    );

    expect(mockSupabase.client.rpc).toHaveBeenCalledWith('leaderboard', {
      p_scope: 'country',
      p_value: 'FR',
      p_limit: 20,
      p_offset: 0,
    });
  });

  it('handles private caller returning eligible = false and rank = null', async () => {
    mockSupabase.client.rpc
      .mockResolvedValueOnce({ data: [], error: null })
      .mockResolvedValueOnce({
        data: [{ rank: null, dev_score: 90, tier: 'expert', eligible: false }],
        error: null,
      });

    const res = await service.getRankings(
      { scope: 'global' },
      { id: 'user-private' },
    );

    expect(res.me).toEqual({
      rank: null,
      devScore: 90,
      tier: 'expert',
      eligible: false,
    });
  });
});
