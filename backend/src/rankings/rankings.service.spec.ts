import { ServiceUnavailableException } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('RankingsService competitive snapshot', () => {
  const rpc = jest.fn();
  const from = jest.fn();
  const service = new RankingsService({
    client: { rpc, from },
  } as unknown as SupabaseService);
  const standing = {
    rank: 4,
    dev_score: 60,
    tier: 'Gold',
    division: 'I',
    eligible: true,
    competitive_points: 1620,
    duel_rating: 1200,
    wins: 3,
    matches_played: 5,
    win_rate: 60,
    points_to_next_tier: 180,
    next_tier: 'Platinum',
    next_tier_reward: 1000,
    tier_progress: 40,
  };
  beforeEach(() => rpc.mockReset());

  it('maps authoritative score, record and progress from one RPC snapshot', async () => {
    rpc.mockResolvedValue({
      data: {
        items: [
          {
            ...standing,
            user_id: 'alice',
            username: 'Alice',
            avatar_url: null,
            country: 'FR',
            institution: 'Paris',
          },
        ],
        total: 22,
        me: standing,
      },
      error: null,
    });
    const response = await service.getRankings(
      { scope: 'country', search: 'Ali', page: 2, pageSize: 10 },
      { id: 'alice' },
    );
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('competitive_rankings', {
      p_scope: 'country',
      p_value: null,
      p_search: 'Ali',
      p_limit: 10,
      p_offset: 10,
      p_user_id: 'alice',
    });
    expect(response).toMatchObject({
      total: 22,
      page: 2,
      pageSize: 10,
      items: [
        {
          rank: 4,
          userId: 'alice',
          username: 'Alice',
          country: 'FR',
          institution: 'Paris',
          competitivePoints: 1620,
          duelRating: 1200,
          division: 'I',
          wins: 3,
          matchesPlayed: 5,
          winRate: 60,
        },
      ],
      me: {
        rank: 4,
        eligible: true,
        pointsToNextTier: 180,
        nextTier: 'Platinum',
        nextTierReward: 1000,
        tierProgress: 40,
      },
    });
  });
  it('preserves total and private standing on an empty page', async () => {
    rpc.mockResolvedValue({
      data: {
        items: [],
        total: 22,
        me: { ...standing, rank: null, eligible: false },
      },
      error: null,
    });
    const result = await service.getRankings(
      { value: 'Paris', scope: 'institution', page: 99 },
      { id: 'private' },
    );
    expect(result.items).toEqual([]);
    expect(result.total).toBe(22);
    expect(result.me).toMatchObject({
      rank: null,
      eligible: false,
      competitivePoints: 1620,
    });
  });
  it('returns no standing to an anonymous caller', async () => {
    rpc.mockResolvedValue({
      data: { items: [], total: 0, me: null },
      error: null,
    });
    expect(await service.getRankings({})).toEqual({
      items: [],
      total: 0,
      me: null,
      page: 1,
      pageSize: 20,
    });
    expect(rpc).toHaveBeenCalledWith('competitive_rankings', {
      p_scope: 'global',
      p_value: null,
      p_search: null,
      p_limit: 20,
      p_offset: 0,
      p_user_id: null,
    });
  });
  it.each([
    { data: null, error: { message: 'SECRET' } },
    { data: null, error: null },
  ])('fails closed without exposing database errors', async (result) => {
    rpc.mockResolvedValue(result);
    await expect(service.getRankings({})).rejects.toThrow(
      new ServiceUnavailableException('Rankings are temporarily unavailable.'),
    );
  });
  it('sanitizes rejected network calls', async () => {
    rpc.mockRejectedValue(new Error('SECRET'));
    await expect(service.getRankings({})).rejects.toThrow(
      'Rankings are temporarily unavailable.',
    );
  });

  it('gracefully falls back to resilient query when RPC is missing from schema cache (PGRST202)', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'Could not find the function public.competitive_rankings in the schema cache' },
    });
    from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const chain: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockImplementation((col: string) => {
            if (col === 'role') {
              return Promise.resolve({
                data: [
                  {
                    id: 'dev1',
                    username: 'alice',
                    avatar_url: null,
                    country: 'FR',
                    institution: 'Paris',
                    visibility: 'public',
                  },
                ],
                error: null,
              });
            }
            return chain;
          }),
        };
        return chain;
      }
      return {
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const result = await service.getRankings({});
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      userId: 'dev1',
      username: 'alice',
      rank: 1,
      tier: 'Bronze',
    });
    expect(result.total).toBe(1);
  });
});
