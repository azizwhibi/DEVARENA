'use client';
import { useEffect, useState } from 'react';
import { codeReviewApi, type CodeReviewSummary } from '@/lib/skills/code-review';

export function useCodeReviewSummary() {
  const [summary, setSummary] = useState<CodeReviewSummary | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void codeReviewApi.summary().then(value => {
      if (active) { setSummary(value); setError(''); }
    }).catch((e: unknown) => {
      if (active) setError(e instanceof Error ? e.message : 'Code review progress is unavailable.');
    });
    const refresh = () => setRevision(v => v + 1);
    window.addEventListener('code-review-completed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('code-review-completed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [revision]);
  return { summary, error, retry: () => setRevision(v => v + 1) };
}
