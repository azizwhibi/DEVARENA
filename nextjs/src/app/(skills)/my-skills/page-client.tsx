'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiService } from '@/lib/skills/api';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import Link from 'next/link';
import { SkillProgress } from '@/lib/skills/types';
import { SkillCard } from '@/components/skills/profile/SkillCard';
import { RadarChart } from '@/components/skills/profile/RadarChart';
import { useRouter } from 'next/navigation';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
export default function ProfilePage() {
  const account = useSkillsAccount();
  const router = useRouter();

  useEffect(() => {
    if (account.role === 'admin') {
      router.replace('/admin/users');
    } else if (account.role === 'recruiter') {
      router.replace('/recruiter');
    }
  }, [account.role, router]);

  const [error, setError] = useState('');
  const [skills, setSkills] = useState<SkillProgress[]>([]);
  const [isLoadingSkills, setIsLoadingSkills] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<
    'all' | 'evaluated' | 'to_improve'
  >('all');
  const [viewMode, setViewMode] = useState<'cards' | 'radar'>('cards');
  const loadData = useCallback(async () => {
    if (account.role !== 'developer') {
      setIsLoadingSkills(false);
      return;
    }
    setIsLoadingSkills(true);
    setError('');
    try {
      const skillsData = await ApiService.getMySkills();
      setSkills(skillsData);
    } catch {
      setError('Unable to load your skills.');
    } finally {
      setIsLoadingSkills(false);
    }
  }, [account.role]);
  useEffect(() => {
    async function initialize() {
      await loadData();
    }
    void initialize();
  }, [loadData]);

  if (account.role !== 'developer') {
    return (
      <div className="page-container">
        <p role="status">Redirecting to your workspace…</p>
      </div>
    );
  }
  const filteredSkills = useMemo(() => {
    switch (selectedFilter) {
      case 'evaluated':
        return skills.filter((s) => s.levelScore !== null);
      case 'to_improve':
        return skills.filter((s) => s.levelScore === null || s.levelScore < 70);
      default:
        return skills;
    }
  }, [skills, selectedFilter]);
  const evaluatedSkills = skills.filter((s) => s.levelScore !== null);
  const avgScore =
    evaluatedSkills.length > 0
      ? Math.round(
          evaluatedSkills.reduce((acc, s) => acc + (s.levelScore ?? 0), 0) /
            evaluatedSkills.length,
        )
      : 0;
  return (
    <div
      className="page-container"
      aria-label={`Skills for ${account.username}`}
      aria-busy={isLoadingSkills}
    >
      <header className="page-header">
        <h1 className="page-title">Skills</h1>
        <p className="page-subtitle">
          Built automatically from validated problem results.
        </p>
      </header>
      {error && (
        <p role="alert">
          {error}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setError('');
              void loadData();
            }}
          >
            Retry
          </button>
        </p>
      )}
      {isLoadingSkills ? (
        <div className="grid-3" role="status" aria-label="Loading skills">
          {[0, 1, 2].map((item) => (
            <div key={item} className="skeleton skeleton-panel" />
          ))}
        </div>
      ) : error ? null : !skills.length ? (
        <section className="empty-state">
          <WorkspaceIcon name="skills" size={20} />
          <h2>No demonstrated skills yet</h2>
          <p>
            Skills appear after a linked problem receives a validated result.
          </p>
          <Link href="/arena" className="btn btn-primary">
            Start a problem
          </Link>
        </section>
      ) : (
        <>
          <dl className="metric-row">
            <div>
              <dt>Skills</dt>
              <dd>{skills.length}</dd>
            </div>
            <div>
              <dt>Average score</dt>
              <dd>{evaluatedSkills.length ? `${avgScore}%` : '—'}</dd>
            </div>
          </dl>
          <div className="toolbar">
            <label className="filter-label">
              Show
              <select
                className="input"
                value={selectedFilter}
                onChange={(event) =>
                  setSelectedFilter(event.target.value as typeof selectedFilter)
                }
              >
                <option value="all">All</option>
                <option value="evaluated">Assessed</option>
                <option value="to_improve">Needs practice</option>
              </select>
            </label>
            {evaluatedSkills.length >= 3 && (
              <div className="view-toggle" aria-label="Skill view">
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-pressed={viewMode === 'cards'}
                  onClick={() => setViewMode('cards')}
                >
                  <WorkspaceIcon name="grid" />
                  Grid
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  aria-pressed={viewMode === 'radar'}
                  onClick={() => setViewMode('radar')}
                >
                  <WorkspaceIcon name="skills" />
                  Radar
                </button>
              </div>
            )}
          </div>
          {viewMode === 'radar' && evaluatedSkills.length >= 3 ? (
            <div className="card chart-card">
              <RadarChart skills={skills} />
            </div>
          ) : (
            <div className="grid-3">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.skillId}
                  skill={skill}
                  onStartChallenge={(skillId) =>
                    router.push('/skills/' + skillId)
                  }
                />
              ))}
            </div>
          )}
          {!filteredSkills.length && viewMode === 'cards' && (
            <p className="filter-empty">No skills match this filter.</p>
          )}
        </>
      )}
    </div>
  );
}
