'use client';
import Link from 'next/link';
import { useSkillSummary } from '@/components/skills/useSkillSummary';
import { RadarChart } from '@/components/skills/profile/RadarChart';

export function ProfileProgress({ createdAt }: { createdAt: string }) {
  const { skills, evaluated, average, pending, error, available } =
    useSkillSummary();
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
      <dl className="ui-metrics profile-statistics">
        <div>
          <dt>Assigned skills</dt>
          <dd>{available ? skills.length : '—'}</dd>
        </div>
        <div>
          <dt>Assessed skills</dt>
          <dd>{available ? evaluated.length : '—'}</dd>
        </div>
        <div>
          <dt>Average proficiency</dt>
          <dd>{average === null ? '—' : average + '%'}</dd>
        </div>
      </dl>
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
          <div className="identity-detail">
            <span>Assessment</span>
            <strong>
              {evaluated.length ? 'Measured proficiency' : 'Not yet assessed'}
            </strong>
          </div>
          <Link href="/my-skills" className="ui-button">
            View skills
          </Link>
        </section>
        <section className="ui-card">
          <h2 className="ui-label">Developer DNA</h2>
          {evaluated.length >= 3 ? (
            <RadarChart skills={evaluated} />
          ) : (
            <div className="ui-empty">
              <strong>Your skill profile is taking shape</strong>
              <span>At least three assessed skills are needed.</span>
            </div>
          )}
        </section>
        <section className="ui-card">
          <h2 className="ui-label">Skill performance</h2>
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
                Assigned skills stay unassessed until a validated assessment.
              </span>
              <Link href="/arena" className="ui-button">
                Explore challenges
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
