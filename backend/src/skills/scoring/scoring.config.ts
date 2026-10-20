// Seul endroit ou la formule est parametree.
export const SCORING_VERSION = 'skills-v1';
export const MIN_ATTEMPTS = 1;

export const DIFFICULTY_WEIGHT: Record<string, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  beginner: 1,
  intermediate: 2,
  advanced: 3,
  expert: 4,
};

export const THRESHOLDS = {
  intermediate: 35,
  advanced: 65,
  expert: 85,
};
