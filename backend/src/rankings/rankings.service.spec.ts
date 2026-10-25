import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { RankingsService } from './rankings.service';
import { escapeSearchTerm } from './dto/get-rankings-query.dto';
import type { SupabaseService } from '../supabase/supabase.service';

describe('RankingsService (Phase 7 - Dev Score Engine)', () => {
  let service: RankingsService;
  let mockSupabase: any;

  const mockRankingsRows = [
    {
      user_id: 'user-1',
      username: 'CodeWarrior',
      avatar_url: 'https://avatars.githubusercontent.com/u/1',
      country: 'FR',
      institution: '42 Paris',
      institution_key: '42 PARIS',
      visibility: 'public',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      xp: 2500,
      matches_won: 15,
      total_matches: 20,
      avg_accuracy: 0.95,
      validated_attempts: 12,
      dev_score: 2970, // 2500 + 15*25 + 95
      tier: 'Grandmaster',
      rank: 1,
    },
    {
      user_id: 'user-2',
      username: 'CyberNinja',
      avatar_url: null,
      country: 'TN',
      institution: 'INSAT',
      institution_key: 'INSAT',
      visibility: 'public',
      status: 'active',
      created_at: '2026-01-02T00:00:00Z',
      xp: 1200,
      matches_won: 8,
      total_matches: 12,
      avg_accuracy: 0.85,
      validated_attempts: 8,
      dev_score: 1485, // 1200 + 8*25 + 85
      tier: 'Diamond',
      rank: 2,
    },
  ];

  beforeEach(() => {
    mockSupabase = {
      client: {
        from: jest.fn(),
      },
    };
    service = new RankingsService(mockSupabase as unknown as SupabaseService);
  });

  describe('escapeSearchTerm', () => {
    it('strips unsafe SQL characters %, _, ,, (, )', () => {
      expect(escapeSearchTerm('user%_test,name(1)')).toBe('usertestname1');
      expect(escapeSearchTerm('normalUsername')).toBe('normalUsername');
    });
  });

  describe('getRankings', () => {
    it('returns paginated rankings with totalPages and formatted items', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockRankingsRows,
          count: 2,
          error: null,
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      const result = await service.getRankings({ page: 1, limit: 10 });

      expect(mockSupabase.client.from).toHaveBeenCalledWith('v_dev_rankings');
      expect(queryBuilder.select).toHaveBeenCalledWith('*', { count: 'exact' });
      expect(queryBuilder.eq).toHaveBeenCalledWith('visibility', 'public');
      expect(queryBuilder.order).toHaveBeenCalledWith('rank', { ascending: true });
      expect(queryBuilder.range).toHaveBeenCalledWith(0, 9);

      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toEqual({
        rank: 1,
        userId: 'user-1',
        username: 'CodeWarrior',
        avatarUrl: 'https://avatars.githubusercontent.com/u/1',
        country: 'FR',
        institution: '42 Paris',
        devScore: 2970,
        tier: 'Grandmaster',
        xp: 2500,
        matchesWon: 15,
        totalMatches: 20,
        avgAccuracy: 0.95,
      });
      expect(result.currentUserRank).toBeNull();
    });

    it('applies search filter when query.search is provided', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockRankingsRows[0]],
          count: 1,
          error: null,
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      const result = await service.getRankings({ search: 'Warrior%' });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('username', '%Warrior%');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].username).toBe('CodeWarrior');
    });

    it('applies country filter when scope is country', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockRankingsRows[0]],
          count: 1,
          error: null,
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      await service.getRankings({ scope: 'country', value: 'fr' });

      expect(queryBuilder.eq).toHaveBeenCalledWith('country', 'FR');
    });

    it('applies school filter when scope is school', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [mockRankingsRows[1]],
          count: 1,
          error: null,
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      await service.getRankings({ scope: 'school', value: 'INSAT' });

      expect(queryBuilder.ilike).toHaveBeenCalledWith('institution', '%INSAT%');
    });

    it('retrieves currentUserRank when currentUserId is passed', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockRankingsRows,
          count: 2,
          error: null,
        }),
      };
      const userRankBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockRankingsRows[0],
          error: null,
        }),
      };

      mockSupabase.client.from.mockImplementation((table: string) => {
        if (table === 'v_dev_rankings') {
          return queryBuilder;
        }
        return userRankBuilder;
      });

      // Spy on getUserRankMetrics
      jest.spyOn(service, 'getUserRankMetrics').mockResolvedValueOnce({
        ...mockRankingsRows[0],
        userId: mockRankingsRows[0].user_id,
        avatarUrl: mockRankingsRows[0].avatar_url,
        devScore: mockRankingsRows[0].dev_score,
        matchesWon: mockRankingsRows[0].matches_won,
        totalMatches: mockRankingsRows[0].total_matches,
        avgAccuracy: mockRankingsRows[0].avg_accuracy,
        winRate: 75,
        validatedAttempts: 12,
      });

      const result = await service.getRankings({}, 'user-1');

      expect(result.currentUserRank).toBeDefined();
      expect(result.currentUserRank?.userId).toBe('user-1');
      expect(result.currentUserRank?.winRate).toBe(75);
    });

    it('throws InternalServerErrorException on database error', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: null,
          count: null,
          error: { message: 'Database failure' },
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      await expect(service.getRankings({})).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('getUserRankMetrics', () => {
    it('returns full ranking metrics with calculated winRate', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: mockRankingsRows[0],
          error: null,
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      const result = await service.getUserRankMetrics('user-1');

      expect(result.userId).toBe('user-1');
      expect(result.rank).toBe(1);
      expect(result.devScore).toBe(2970);
      expect(result.tier).toBe('Grandmaster');
      expect(result.winRate).toBe(75); // 15 / 20 * 100
      expect(result.validatedAttempts).toBe(12);
    });

    it('returns winRate = 0 when totalMatches = 0', async () => {
      const rowZeroMatches = {
        ...mockRankingsRows[0],
        matches_won: 0,
        total_matches: 0,
      };
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: rowZeroMatches,
          error: null,
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      const result = await service.getUserRankMetrics('user-1');
      expect(result.winRate).toBe(0);
    });

    it('throws NotFoundException when user row is null', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      await expect(service.getUserRankMetrics('unknown-user')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws InternalServerErrorException when query fails', async () => {
      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Connection error' },
        }),
      };
      mockSupabase.client.from.mockReturnValue(queryBuilder);

      await expect(service.getUserRankMetrics('user-1')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
