import { DIFFICULTY_WEIGHT, MIN_ATTEMPTS, THRESHOLDS } from './scoring.config';

export type SkillStatus =
  'not_evaluated' | 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface AttemptInput {
  accuracy: number; // 0 a 1
  difficulty: string; // easy | medium | hard
  linkWeight: number; // 1 a 3
}

export interface LevelResult {
  levelScore: number | null; // 0 a 100, null si non evalue
  validatedAttempts: number;
  status: SkillStatus;
}

export function statusFromScore(score: number): SkillStatus {
  if (score >= THRESHOLDS.expert) return 'expert';
  if (score >= THRESHOLDS.advanced) return 'advanced';
  if (score >= THRESHOLDS.intermediate) return 'intermediate';
  return 'beginner';
}

/** Les tentatives recues doivent deja etre les premieres tentatives validees. */
export function computeLevel(attempts: AttemptInput[]): LevelResult {
  const count = attempts.length;
  if (count < MIN_ATTEMPTS) {
    return {
      levelScore: null,
      validatedAttempts: count,
      status: 'not_evaluated',
    };
  }

  let num = 0;
  let den = 0;
  for (const a of attempts) {
    const w = (DIFFICULTY_WEIGHT[a.difficulty] ?? 1) * a.linkWeight;
    num += a.accuracy * w;
    den += w;
  }
  if (den <= 0) {
    return {
      levelScore: null,
      validatedAttempts: count,
      status: 'not_evaluated',
    };
  }

  const raw = (num / den) * 100;
  const levelScore = Math.min(100, Math.max(0, Math.round(raw * 100) / 100));
  return {
    levelScore,
    validatedAttempts: count,
    status: statusFromScore(levelScore),
  };
}
