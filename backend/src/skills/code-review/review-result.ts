export const AI_SOLVED_THRESHOLD = 90;
export type Review = {
  score: number;
  assessable: boolean;
  feedback: string;
  issues: string[];
};

// Provider JSON is untrusted, even when structured output is enabled.
export function parseReview(value: unknown): Review {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid review');
  const r = value as Record<string, unknown>;
  if (
    Object.keys(r).sort().join(',') !== 'assessable,feedback,issues,score' ||
    typeof r.score !== 'number' ||
    !Number.isInteger(r.score) ||
    r.score < 0 ||
    r.score > 100 ||
    typeof r.assessable !== 'boolean' ||
    (!r.assessable && r.score !== 0) ||
    typeof r.feedback !== 'string' ||
    !r.feedback.trim() ||
    r.feedback.length > 3000 ||
    !Array.isArray(r.issues) ||
    r.issues.length > 5 ||
    !r.issues.every(
      (s: unknown) =>
        typeof s === 'string' && s.trim().length > 0 && s.length <= 500,
    )
  )
    throw new Error('Invalid review');
  return r as Review;
}

export const reviewPassed = (r: Review) =>
  r.assessable && r.score >= AI_SOLVED_THRESHOLD;

export const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'integer', minimum: 0, maximum: 100 },
    assessable: { type: 'boolean' },
    feedback: { type: 'string' },
    issues: { type: 'array', items: { type: 'string' }, maxItems: 5 },
  },
  required: ['score', 'assessable', 'feedback', 'issues'],
  additionalProperties: false,
};
