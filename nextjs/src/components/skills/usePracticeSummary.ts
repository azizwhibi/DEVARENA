'use client';
import { useEffect, useState } from 'react';
import { practiceApi, type PracticeSummary } from '@/lib/skills/practice';

export function usePracticeSummary() {
  const [summary, setSummary] = useState<PracticeSummary | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void practiceApi
      .summary()
      .then((value) => {
        if (active) {
          setSummary(value);
          setError('');
        }
      })
      .catch((error) => {
        if (active)
          setError(
            error instanceof Error
              ? error.message
              : 'Practice progress is unavailable.',
          );
      });
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('practice-completed', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      active = false;
      window.removeEventListener('practice-completed', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [revision]);
  return { summary, error, retry: () => setRevision((value) => value + 1) };
}
