'use client';
import { apiRequest } from '@/lib/api';

export type PracticeSession = {
  session: string;
  question: {
    question: string;
    codeSnippet: string;
    hint: string;
    options: { id: string; text: string }[];
  };
};
export type PracticeResult = {
  correct: boolean;
  selectedOptionId: string;
  correctOptionId: string;
  explanation: string;
  saved: boolean;
  verified: false;
};
export type PracticeSummary = {
  completedProblems: number;
  completedProblemIds: string[];
  skills: {
    id: string;
    name: string;
    technology: string | null;
    solvedProblems: number;
  }[];
  recentProblems: { id: string; title: string; completedAt: string }[];
};

export const practiceApi = {
  start: (problemId: string) =>
    apiRequest<PracticeSession>(
      `/me/practice/${encodeURIComponent(problemId)}/start`,
      { method: 'POST' },
    ),
  answer: (problemId: string, session: string, optionId: string) =>
    apiRequest<PracticeResult>(
      `/me/practice/${encodeURIComponent(problemId)}/answer`,
      {
        method: 'POST',
        body: JSON.stringify({ session, optionId }),
      },
    ),
  summary: () => apiRequest<PracticeSummary>('/me/practice/summary'),
};
