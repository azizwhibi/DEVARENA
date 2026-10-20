export type SkillStatus = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'not_evaluated';

export interface SkillProgress {
  skillId: string;
  name: string;
  slug: string;
  category?: string;
  technology?: string;
  levelScore: number | null;
  validatedAttempts: number;
  status: SkillStatus;
  delta30d?: number | null;
  updatedAt?: string | null;
  description?: string;
}

export interface SkillHistoryPoint {
  levelScore: number;
  validatedAttempts: number;
  recordedAt: string;
}

export type ChallengeDifficulty = 'easy' | 'medium' | 'hard';
export type ChallengeState = 'validated' | 'in_progress' | 'not_started';
export type ChallengeCategory = 'Debugging' | 'Logic' | 'Code Assembly' | 'SQL' | 'AI Trap';

export interface ChallengeSummary {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  category: ChallengeCategory | string;
  weight: number;
  state: ChallengeState;
  attemptsCount: number;
  accuracy?: number | null;
  description?: string;
  points?: number;
  timeEstimate?: string;
}

export interface SkillChallengesResponse {
  skillId: string;
  skillName: string;
  total: number;
  validated: number;
  challenges: ChallengeSummary[];
}

export interface CoachRecommendation {
  observation: string;
  competentIn?: string | null;
  skillId?: string | null;
  skillName?: string | null;
  challengeId?: string | null;
  reason?: string | null;
  source: 'ai' | 'fallback';
}

export interface AdminSkill {
  id: string;
  name: string;
  slug: string;
  category: string;
  categoryId?: string;
  technology: string;
  technologyId?: string | null;
  description: string;
  isActive: boolean;
  challengesCount: number;
  updatedAt?: string;
}

export interface SkillStats {
  skillId: string;
  skillName: string;
  totalUsersEngaged: number;
  avgScore: number;
  completionRate: number;
  levelDistribution: {
    beginner: number;
    intermediate: number;
    advanced: number;
    expert: number;
  };
}

export interface DeveloperRank {
  rank: number;
  username: string;
  avatarUrl?: string;
  tier: 'Grandmaster' | 'Master' | 'Diamond' | 'Platinum' | 'Gold';
  points: number;
  badges: string[];
  challengesCompleted: number;
  streakDays: number;
}

export interface TechnologyItem {
  id: string;
  name: string;
  icon: string;
  category: string;
  skillsCount: number;
  challengesCount: number;
  color: string;
  level: string;
}
