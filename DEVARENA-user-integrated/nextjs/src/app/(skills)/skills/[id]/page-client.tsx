'use client';
import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ApiService } from '@/lib/skills/api';
import { skillLevelLabels } from '@/lib/skills/types';
import type {
  SkillProgress,
  SkillHistoryPoint,
  SkillChallengesResponse,
  ChallengeSummary,
} from '@/lib/skills/types';
import { ChallengeModal } from '@/components/skills/arena/ChallengeModal';
type Detail = {
  id: string;
  skill?: SkillProgress;
  history: SkillHistoryPoint[];
  challenges: SkillChallengesResponse;
};
function SkillDetailContent() {
  const { id } = useParams<{
    id: string;
  }>();
  const [detail, setDetail] = useState<Detail | null>(null);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [practice, setPractice] = useState<ChallengeSummary | null>(null);
  useEffect(() => {
    let active = true;
    void Promise.all([
      ApiService.getSkillDetail(id),
      ApiService.getSkillHistory(id),
      ApiService.getSkillChallenges(id),
    ])
      .then(([skill, history, challenges]) => {
        if (active) setDetail({ id, skill, history, challenges });
      })
      .catch(() => {
        if (active) setFailedId(id);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (failedId === id)
    return (
      <div className="page-container">
        <h1 className="page-title">Skill unavailable</h1>
        <Link href="/my-skills">Back to skills</Link>
      </div>
    );
  if (!detail || detail.id !== id)
    return (
      <div className="page-container" role="status">
        Loading skill…
      </div>
    );
  const { skill, history, challenges } = detail;
  const score = skill?.levelScore;
  return (
    <div className="page-container">
      <Link href="/my-skills" style={{ color: 'var(--indigo-light)' }}>
        Back to skills
      </Link>
      <section
        className="card card-elevated"
        style={{ margin: '24px 0', padding: 28 }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {skill?.technology && (
                <span className="badge badge-indigo">{skill.technology}</span>
              )}
              {skill?.category && (
                <span className="badge badge-purple">{skill.category}</span>
              )}
              {skill?.isActive === false && (
                <span className="badge badge-muted">Archived</span>
              )}
            </div>
            <h1 className="page-title">
              {skill?.name ?? challenges.skillName}
            </h1>
            <p className="page-subtitle">
              {skill?.description ?? 'Your measured progress in this skill.'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <strong style={{ fontSize: 28, color: 'var(--indigo-light)' }}>
              {score == null ? '—' : `${score}%`}
            </strong>
            <p className="page-subtitle">
              {score == null ? 'Unassessed' : skillLevelLabels[skill!.status]}
            </p>
          </div>
        </div>
      </section>
      <section style={{ marginBottom: 28 }}>
        <h2 className="section-title">Progress history</h2>
        <div className="card">
          {!history.length ? (
            <p>No assessments recorded yet.</p>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 12,
                minHeight: 200,
                overflowX: 'auto',
              }}
            >
              {history.map((point, index) => (
                <div
                  key={`${point.recordedAt}-${index}`}
                  style={{ flex: 1, minWidth: 65, textAlign: 'center' }}
                >
                  <strong style={{ color: 'var(--indigo-light)' }}>
                    {point.levelScore}%
                  </strong>
                  <div
                    style={{
                      height: Math.max(2, point.levelScore * 1.2),
                      background: 'var(--indigo)',
                      borderRadius: '6px 6px 0 0',
                      margin: '6px 0',
                    }}
                  />
                  <time
                    dateTime={point.recordedAt}
                    style={{ fontSize: 11, color: 'var(--text-secondary)' }}
                  >
                    {new Date(point.recordedAt).toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                    })}
                  </time>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <section>
        <h2 className="section-title">
          Related challenges · {challenges.validated} validated of{' '}
          {challenges.total}
        </h2>
        {!challenges.challenges.length && (
          <p className="card">No challenges linked to this skill yet.</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {challenges.challenges.map((challenge) => (
            <div
              className="card"
              key={challenge.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
              }}
            >
              <div>
                <span className="badge badge-indigo">
                  {challenge.difficulty}
                </span>
                <h3 style={{ fontWeight: 600, marginTop: 8 }}>
                  {challenge.title}
                </h3>
                <p className="page-subtitle">
                  {challenge.state === 'validated'
                    ? 'Validated'
                    : challenge.state === 'in_progress'
                      ? 'In progress'
                      : 'Not started'}{' '}
                  · {challenge.attemptsCount} attempts
                </p>
              </div>
              {skill?.isActive !== false && (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setPractice(challenge)}
                >
                  Practice
                </button>
              )}
            </div>
          ))}
        </div>
      </section>
      {practice && (
        <ChallengeModal
          challengeId={practice.id}
          challengeTitle={practice.title}
          category={practice.category}
          difficulty={practice.difficulty}
          skillId={id}
          onClose={() => setPractice(null)}
        />
      )}
    </div>
  );
}
export default function SkillDetailPage() {
  return (
    <Suspense fallback={<p className="page-container">Loading…</p>}>
      <SkillDetailContent />
    </Suspense>
  );
}
