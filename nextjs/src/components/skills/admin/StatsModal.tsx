'use client';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import React, { useEffect, useState } from 'react';
import { ApiService } from '@/lib/skills/api';
import { SkillStats } from '@/lib/skills/types';
interface StatsModalProps {
  skillId: string;
  skillName: string;
  onClose: () => void;
}
export const StatsModal: React.FC<StatsModalProps> = ({
  skillId,
  skillName,
  onClose,
}) => {
  const [stats, setStats] = useState<SkillStats | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await ApiService.getSkillStats(skillId);
        setStats(data);
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [skillId]);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="modal-box"
        role="dialog"
        aria-modal="true"
        aria-labelledby="skill-stats-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <h2 id="skill-stats-title">{skillName}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close statistics"
          >
            <WorkspaceIcon name="close" />
          </button>
        </header>
        <div className="modal-body">
          {loading ? (
            <div role="status" aria-label="Loading statistics">
              <div className="skeleton skeleton-line" />
              <div className="skeleton skeleton-panel" />
            </div>
          ) : stats ? (
            <>
              <dl className="metric-row">
                <div>
                  <dt>Participants</dt>
                  <dd>{stats.totalUsersEngaged}</dd>
                </div>
                <div>
                  <dt>Average score</dt>
                  <dd>
                    {stats.avgScore === null ? '—' : stats.avgScore + '%'}
                  </dd>
                </div>
                <div>
                  <dt>Completion</dt>
                  <dd>{stats.completionRate}%</dd>
                </div>
              </dl>
              <h3 className="section-title section-gap">Level distribution</h3>
              <div className="distribution">
                {Object.entries(stats.levelDistribution || {}).map(
                  ([level, count]) => {
                    const total =
                      Object.values(stats.levelDistribution).reduce(
                        (sum, value) => sum + value,
                        0,
                      ) || 1;
                    const percentage = Math.round((count / total) * 100);
                    return (
                      <div key={level}>
                        <div className="distribution-label">
                          <span>
                            {{
                              beginner: 'Beginner',
                              intermediate: 'Intermediate',
                              advanced: 'Advanced',
                              expert: 'Expert',
                            }[level] ?? level}
                          </span>
                          <span>
                            {count} · {percentage}%
                          </span>
                        </div>
                        <div className="progress-track">
                          <div
                            className="progress-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  },
                )}
              </div>
            </>
          ) : (
            <p className="muted">Statistics unavailable.</p>
          )}
        </div>
        <footer className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
};
