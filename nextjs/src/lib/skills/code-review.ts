'use client';
import { apiRequest } from '@/lib/api';

import type { CodeLanguage } from './code-languages';
export { languageNames, type CodeLanguage } from './code-languages';
export type CodeReview = {
  id: string; problemId: string; language: CodeLanguage; code: string;
  state: 'pending' | 'completed' | 'failed'; score: number | null; assessable: boolean | null;
  passed: boolean; feedback: string | null; issues: string[]; model: string | null;
  reviewedAt: string | null; threshold: number; aiGenerated: true; verified: false;
};
export type CodeProblem = {
  id: string; title: string; description: string; languages: CodeLanguage[];
  threshold: number; latest: CodeReview | null;
};
export type CodeReviewSummary = {
  threshold: number; solvedProblems: number; reviewedSubmissions: number; solvedProblemIds: string[];
  languages: { language: CodeLanguage; solvedProblems: number }[];
  skills: { id: string; name: string; group: 'fundamental' | 'intermediate' | 'advanced' | 'other'; solvedProblems: number; reviewScore: number }[];
  recentProblems: { id: string; title: string; score: number }[];
};
export const codeReviewApi = {
  problem: (id: string) => apiRequest<CodeProblem>('/me/code-reviews/problems/' + encodeURIComponent(id)),
  submit: (id: string, submissionId: string, language: CodeLanguage, code: string) =>
    apiRequest<CodeReview>('/me/code-reviews/problems/' + encodeURIComponent(id), { method: 'POST', body: JSON.stringify({ submissionId, language, code }) }),
  result: (id: string) => apiRequest<CodeReview>('/me/code-reviews/' + encodeURIComponent(id)),
  summary: () => apiRequest<CodeReviewSummary>('/me/code-reviews/summary'),
};
