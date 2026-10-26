export type RankingScope = 'global' | 'country' | 'institution' | 'technology';
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';
export type LeaderboardEntry = {
  rank: number; userId: string; username: string; avatarUrl: string | null;
  country: string | null; institution: string | null; devScore: number;
  tier: RankTier; division: string; competitivePoints: number; duelRating: number;
  wins: number; matchesPlayed: number; winRate: number;
};
export type MyRanking = Omit<LeaderboardEntry, 'rank' | 'userId' | 'username' | 'avatarUrl' | 'country' | 'institution'> & {
  rank: number | null; eligible: boolean; pointsToNextTier: number;
  nextTier: RankTier | null; nextTierReward: number; tierProgress: number;
};
export type RankingsResponse = { items: LeaderboardEntry[]; total: number; page: number; pageSize: number; me: MyRanking | null };
export type RankPromotion = { tier: RankTier; credits_awarded: number; new_balance: number };
export function buildRankingsQuery(params: { scope: RankingScope; value?: string; search?: string; page: number; pageSize: number }): string {
  const query = new URLSearchParams({ scope: params.scope, page: String(params.page), pageSize: String(params.pageSize) });
  if (params.value?.trim()) query.set('value', params.value.trim());
  if (params.search?.trim()) query.set('search', params.search.trim());
  return `/rankings?${query}`;
}
export function parseRankPromotion(value: unknown): RankPromotion | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  if (!['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master'].includes(String(data.tier)) ||
    typeof data.credits_awarded !== 'number' || !Number.isSafeInteger(data.credits_awarded) || data.credits_awarded <= 0 ||
    typeof data.new_balance !== 'number' || !Number.isSafeInteger(data.new_balance) || data.new_balance < 0) return null;
  return data as RankPromotion;
}
