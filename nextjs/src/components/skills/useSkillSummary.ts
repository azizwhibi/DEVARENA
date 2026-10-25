'use client';
import { useCallback, useEffect, useState } from 'react';
import { ApiService } from '@/lib/skills/api';
import type { SkillHistoryPoint, SkillProgress } from '@/lib/skills/types';

export function useSkillSummary() {
  const [skills, setSkills] = useState<SkillProgress[]>([]);
  const [history, setHistory] = useState<SkillHistoryPoint[]>([]);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState('');
  const [available, setAvailable] = useState(false);
  const [revision, setRevision] = useState(0);

  const reload = useCallback(() => setRevision((r) => r + 1), []);

  useEffect(() => {
    const handleUpdate = () => reload();
    window.addEventListener('skill-progress-updated', handleUpdate);
    return () => {
      window.removeEventListener('skill-progress-updated', handleUpdate);
    };
  }, [reload]);

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
  }, [revision]);

  const evaluated = skills
    .filter((s) => s.levelScore !== null)
    .sort((a, b) => a.levelScore! - b.levelScore!);

  let devScore: number | null = null;
  if (evaluated.length > 0) {
    const mid = Math.floor(evaluated.length / 2);
    devScore =
      evaluated.length % 2 !== 0
        ? evaluated[mid].levelScore!
        : Math.round(
            (evaluated[mid - 1].levelScore! + evaluated[mid].levelScore!) / 2,
          );
  }

  const tier =
    devScore === null
      ? null
      : devScore >= 85
        ? 'Expert'
        : devScore >= 65
          ? 'Advanced'
          : devScore >= 35
            ? 'Intermediate'
            : 'Beginner';

  const average = devScore;

  return {
    skills,
    evaluated,
    average,
    devScore,
    tier,
    history,
    pending,
    error,
    available,
    reload,
  };
}
