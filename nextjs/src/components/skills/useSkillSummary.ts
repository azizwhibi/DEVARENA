'use client';
import { useEffect, useState } from 'react';
import { ApiService } from '@/lib/skills/api';
import type { SkillHistoryPoint, SkillProgress } from '@/lib/skills/types';

export function useSkillSummary() {
  const [skills, setSkills] = useState<SkillProgress[]>([]);
  const [history, setHistory] = useState<SkillHistoryPoint[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    void ApiService.getMySkills()
      .then(async (value) => {
        if (!active) return;
        setSkills(value);
        setAvailable(true);
        const latest = value
          .filter((s) => s.levelScore !== null)
          .sort((a, b) =>
            (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''),
          )[0];
        if (latest) {
          try {
            const points = await ApiService.getSkillHistory(latest.skillId);
            if (active) setHistory(points);
          } catch {
            if (active) setError('Assessment history is unavailable.');
          }
        }
      })
      .catch(() => {
        if (active) setError('Skill progress is unavailable. Please retry.');
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const evaluated = skills
    .filter((s) => s.levelScore !== null)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));
  const average = evaluated.length
    ? Math.round(
        evaluated.reduce((sum, s) => sum + s.levelScore!, 0) / evaluated.length,
      )
    : null;
  return { skills, evaluated, average, history, pending, error, available };
}
