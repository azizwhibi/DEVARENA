'use client';
import Link from 'next/link';
import { useSkillSummary } from '@/components/skills/useSkillSummary';
import { RadarChart } from '@/components/skills/profile/RadarChart';
import { PracticeProgress } from '@/components/skills/profile/PracticeProgress';
import { CodeReviewProgress } from '@/components/skills/code/CodeReviewProgress';

export function ProfileProgress({ createdAt }: { createdAt: string }) {
  const {
    skills,
    evaluated,
    average,
    devScore,
    tier,
    pending,
    error,
    available,
  } = useSkillSummary();
  if (pending)
    return (
      <div
        className="analysis-skeleton"
        role="status"
        aria-label="Loading skill progress"
      >
        <div className="skeleton skeleton-panel" />
      </div>
    );
  return (
    <>
      {error && (
        <p role="alert" className="workspace-alert">
          {error}
        </p>
      )}
      <CodeReviewProgress layout="profile" />
      {!!evaluated.length && <dl className="ui-metrics profile-statistics" aria-label="Verified proficiency">
        <div>
          <dt>Demonstrated skills</dt>
          <dd>{available ? skills.length : '—'}</dd>
        </div>
        <div>
          <dt>Assessed skills</dt>
          <dd>{available ? evaluated.length : '—'}</dd>
        </div>
        <div>
          <dt>Dev Score (Median)</dt>
          <dd>
            {devScore === null
              ? '—'
              : `${devScore}%${tier ? ` (${tier})` : ''}`}
          </dd>
        </div>
      </dl>}
      <PracticeProgress />
      <div className="profile-panels">
        <section className="ui-card">
          <h2 className="ui-label">Developer identity</h2>
          <div className="identity-detail">
            <span>Member since</span>
            <strong>
              {new Date(createdAt).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </strong>
          </div>
          {!!evaluated.length && <div className="identity-detail">
            <span>Assessment</span>
            <strong>
              {tier
                ? `${tier} Tier`
                : evaluated.length
                  ? 'Measured proficiency'
                  : 'Not yet assessed'}
            </strong>
          </div>}
          <Link href="/my-skills" className="ui-button">
            View skills
          </Link>
        </section>
        {evaluated.length >= 3 && <section className="ui-card">
          <h2 className="ui-label">Developer DNA</h2>
          {evaluated.length >= 3 ? (
            <RadarChart skills={evaluated} />
          ) : (
            <div className="ui-empty">
              <strong>Your skill profile is taking shape</strong>
              <span>At least three assessed skills are needed.</span>
            </div>
          )}
        </section>}
        {!!evaluated.length && <section className="ui-card">
          <h2 className="ui-label">Verified skill proficiency</h2>
          {evaluated.length ? (
            evaluated.slice(0, 5).map((skill) => (
              <Link
                key={skill.skillId}
                className="performance-skill"
                href={'/skills/' + skill.skillId}
              >
                <span>
                  {skill.name}
                  <strong>{skill.levelScore}%</strong>
                </span>
                <div className="ui-progress">
                  <span style={{ width: skill.levelScore + '%' }} />
                </div>
              </Link>
            ))
          ) : (
            <div className="ui-empty">
              <strong>No verified scores yet</strong>
              <span>
                Verified proficiency comes from validated problem results.
              </span>
              <Link href="/arena" className="ui-button">
                Explore problems
              </Link>
            </div>
          )}
        </section>}
      </div>
    </>
  );
}
