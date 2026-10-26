import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { RankingsQueryDto } from './dto/rankings-query.dto';

function isSchemaCacheMissing(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === 'PGRST205' ||
    e.code === 'PGRST202' ||
    (typeof e.message === 'string' &&
      (e.message.includes('schema cache') ||
        e.message.includes('not find the table') ||
        e.message.includes('not find the function')))
  );
}

export interface RankingScore {
  devScore: number;
  tier: string;
  division: string;
  competitivePoints: number;
  duelRating: number;
  wins: number;
  matchesPlayed: number;
  winRate: number;
}
export interface RankingItem extends RankingScore {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  institution: string | null;
}
export interface MyRank extends RankingScore {
  rank: number | null;
  eligible: boolean;
  pointsToNextTier: number;
  nextTier: string | null;
  nextTierReward: number;
  tierProgress: number;
}
export interface RankingsResponse {
  items: RankingItem[];
  total: number;
  page: number;
  pageSize: number;
  me: MyRank | null;
}
interface RankingRow {
  rank: number | null;
  user_id: string;
  username: string;
  avatar_url: string | null;
  country: string | null;
  institution: string | null;
  dev_score: number;
  tier: string;
  division: string;
  competitive_points: number;
  duel_rating: number;
  wins: number;
  matches_played: number;
  win_rate: number;
  eligible: boolean;
  points_to_next_tier: number;
  next_tier: string | null;
  next_tier_reward: number;
  tier_progress: number;
}

@Injectable()
export class RankingsService {
  private readonly logger = new Logger(RankingsService.name);
  constructor(private readonly supabase: SupabaseService) {}

  async getRankings(
    query: RankingsQueryDto,
    user?: { id: string },
  ): Promise<RankingsResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    try {
      // SQL ranks the eligible scope before search and pagination, in one snapshot.
      const { data, error } = await this.supabase.client.rpc(
        'competitive_rankings',
        {
          p_scope: query.scope ?? 'global',
          p_value: query.value ?? null,
          p_search: query.search ?? null,
          p_limit: pageSize,
          p_offset: (page - 1) * pageSize,
          p_user_id: user?.id ?? null,
        },
      );

      if (error && isSchemaCacheMissing(error)) {
        this.logger.warn(
          "RPC 'competitive_rankings' not in schema cache; using resilient fallback.",
        );
        return await this.fallbackRankings(query, user);
      }

      if (error || !data) throw new Error();
      const snapshot = data as unknown as {
        items: RankingRow[];
        total: number;
        me: RankingRow | null;
      };
      const score = (row: RankingRow): RankingScore => ({
        devScore: Number(row.dev_score),
        tier: row.tier,
        division: row.division,
        competitivePoints: Number(row.competitive_points),
        duelRating: Number(row.duel_rating),
        wins: Number(row.wins),
        matchesPlayed: Number(row.matches_played),
        winRate: Number(row.win_rate),
      });
      const me = snapshot.me;
      return {
        items: snapshot.items.map((row) => ({
          ...score(row),
          rank: Number(row.rank),
          userId: row.user_id,
          username: row.username,
          avatarUrl: row.avatar_url,
          country: row.country,
          institution: row.institution,
        })),
        total: Number(snapshot.total),
        page,
        pageSize,
        me: me
          ? {
              ...score(me),
              rank: me.rank === null ? null : Number(me.rank),
              eligible: me.eligible,
              pointsToNextTier: Number(me.points_to_next_tier),
              nextTier: me.next_tier,
              nextTierReward: Number(me.next_tier_reward),
              tierProgress: Number(me.tier_progress),
            }
          : null,
      };
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      throw new ServiceUnavailableException(
        'Rankings are temporarily unavailable.',
      );
    }
  }

  private async fallbackRankings(
    query: RankingsQueryDto,
    user?: { id: string },
  ): Promise<RankingsResponse> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    const { data: profiles, error: profErr } = await this.supabase.client
      .from('profiles')
      .select('id, username, avatar_url, country, institution, visibility')
      .eq('status', 'active')
      .eq('role', 'developer');

    if (profErr || !profiles) {
      throw new ServiceUnavailableException(
        'Rankings are temporarily unavailable.',
      );
    }

    const statsMap = new Map<
      string,
      { duelRating: number; wins: number; matchesPlayed: number }
    >();
    try {
      const { data: stats } = await (this.supabase.client as any)
        .from('user_rank_stats')
        .select('user_id, duel_rating, wins, matches_played');
      if (stats && Array.isArray(stats)) {
        for (const s of stats as any[]) {
          statsMap.set(s.user_id, {
            duelRating: Number(s.duel_rating ?? 1200),
            wins: Number(s.wins ?? 0),
            matchesPlayed: Number(s.matches_played ?? 0),
          });
        }
      }
    } catch {
      // Table not migrated yet; baseline defaults used
    }

    const devScoresMap = new Map<string, number>();
    try {
      const { data: devScores } = await (this.supabase.client as any)
        .from('dev_scores')
        .select('user_id, dev_score');
      if (devScores && Array.isArray(devScores)) {
        for (const ds of devScores as any[]) {
          devScoresMap.set(ds.user_id, Number(ds.dev_score ?? 0));
        }
      }
    } catch {
      // View not migrated yet; default to 0
    }

    const allDetailed = profiles.map((p) => {
      const stats = statsMap.get(p.id) ?? {
        duelRating: 1200,
        wins: 0,
        matchesPlayed: 0,
      };
      const devScore = devScoresMap.get(p.id) ?? 0;
      const competitivePoints = Math.round(
        stats.duelRating * 0.6 + devScore * 15,
      );

      let tier = 'Bronze';
      let tierStart = 0;
      let tierEnd: number | null = 1200;
      let nextTier: string | null = 'Silver';
      let nextTierReward = 250;

      if (competitivePoints >= 2600) {
        tier = 'Master';
        tierStart = 2600;
        tierEnd = null;
        nextTier = null;
        nextTierReward = 0;
      } else if (competitivePoints >= 2200) {
        tier = 'Diamond';
        tierStart = 2200;
        tierEnd = 2600;
        nextTier = 'Master';
        nextTierReward = 5000;
      } else if (competitivePoints >= 1800) {
        tier = 'Platinum';
        tierStart = 1800;
        tierEnd = 2200;
        nextTier = 'Diamond';
        nextTierReward = 2500;
      } else if (competitivePoints >= 1500) {
        tier = 'Gold';
        tierStart = 1500;
        tierEnd = 1800;
        nextTier = 'Platinum';
        nextTierReward = 1000;
      } else if (competitivePoints >= 1200) {
        tier = 'Silver';
        tierStart = 1200;
        tierEnd = 1500;
        nextTier = 'Gold';
        nextTierReward = 500;
      }

      let division = 'Elite';
      if (tierEnd !== null) {
        const band = (tierEnd - tierStart) / 3;
        if (competitivePoints < tierStart + band) {
          division = 'III';
        } else if (competitivePoints < tierStart + 2 * band) {
          division = 'II';
        } else {
          division = 'I';
        }
      }

      const pointsToNextTier =
        tierEnd !== null ? Math.max(0, tierEnd - competitivePoints) : 0;
      const tierProgress =
        tierEnd !== null
          ? Math.round(
              (100 * (competitivePoints - tierStart)) / (tierEnd - tierStart),
            )
          : 100;
      const winRate =
        stats.matchesPlayed > 0
          ? Math.round((100 * stats.wins) / stats.matchesPlayed)
          : 0;

      return {
        userId: p.id,
        username: p.username,
        avatarUrl: p.avatar_url,
        country: p.country,
        institution: p.institution,
        visibility: p.visibility,
        devScore,
        tier,
        division,
        competitivePoints,
        duelRating: stats.duelRating,
        wins: stats.wins,
        matchesPlayed: stats.matchesPlayed,
        winRate,
        pointsToNextTier,
        nextTier,
        nextTierReward,
        tierProgress,
      };
    });

    const scope = query.scope ?? 'global';
    const scopeValue = query.value?.trim();
    let callerProfile: { country: string | null; institution: string | null } | null = null;
    if (user?.id) {
      const found = profiles.find((p) => p.id === user.id);
      if (found) {
        callerProfile = {
          country: found.country,
          institution: found.institution,
        };
      }
    }

    const scoped = allDetailed.filter((d) => {
      if (scope === 'global') return true;
      if (scope === 'country') {
        const targetCountry = (scopeValue || callerProfile?.country)?.toUpperCase();
        return targetCountry ? d.country?.toUpperCase() === targetCountry : false;
      }
      if (scope === 'institution') {
        const targetInst = (scopeValue || callerProfile?.institution)?.toLowerCase().trim();
        return targetInst ? d.institution?.toLowerCase().trim() === targetInst : false;
      }
      return true;
    });

    const rankedPublic = scoped
      .filter((d) => d.visibility === 'public')
      .sort(
        (a, b) =>
          b.competitivePoints - a.competitivePoints ||
          a.userId.localeCompare(b.userId),
      )
      .map((d, index) => ({
        ...d,
        rank: index + 1,
      }));

    const searchTerm = query.search?.trim().toLowerCase();
    const searched = searchTerm
      ? rankedPublic.filter(
          (d) =>
            d.username.toLowerCase().includes(searchTerm) ||
            (d.institution && d.institution.toLowerCase().includes(searchTerm)),
        )
      : rankedPublic;

    const offset = (page - 1) * pageSize;
    const pageItems = searched.slice(offset, offset + pageSize).map((d) => ({
      rank: d.rank,
      userId: d.userId,
      username: d.username,
      avatarUrl: d.avatarUrl,
      country: d.country,
      institution: d.institution,
      devScore: d.devScore,
      tier: d.tier,
      division: d.division,
      competitivePoints: d.competitivePoints,
      duelRating: d.duelRating,
      wins: d.wins,
      matchesPlayed: d.matchesPlayed,
      winRate: d.winRate,
    }));

    let me: MyRank | null = null;
    if (user?.id) {
      const myDetail = allDetailed.find((d) => d.userId === user.id);
      if (myDetail) {
        const publicRankEntry = rankedPublic.find((d) => d.userId === user.id);
        const isEligible = !!publicRankEntry;
        me = {
          rank: publicRankEntry ? publicRankEntry.rank : null,
          eligible: isEligible,
          devScore: myDetail.devScore,
          tier: myDetail.tier,
          division: myDetail.division,
          competitivePoints: myDetail.competitivePoints,
          duelRating: myDetail.duelRating,
          wins: myDetail.wins,
          matchesPlayed: myDetail.matchesPlayed,
          winRate: myDetail.winRate,
          pointsToNextTier: myDetail.pointsToNextTier,
          nextTier: myDetail.nextTier,
          nextTierReward: myDetail.nextTierReward,
          tierProgress: myDetail.tierProgress,
        };
      }
    }

    return {
      items: pageItems,
      total: searched.length,
      page,
      pageSize,
      me,
    };
  }
}
