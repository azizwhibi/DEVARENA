export interface RankingItem {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  country: string | null;
  institution: string | null;
  devScore: number;
  tier: string;
  xp: number;
  matchesWon: number;
  totalMatches: number;
  avgAccuracy: number;
}

export interface UserRankMetrics extends RankingItem {
  status: string;
  visibility: string;
  winRate: number;
  validatedAttempts: number;
}

export interface GetRankingsResponse {
  items: RankingItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  currentUserRank: UserRankMetrics | null;
}
