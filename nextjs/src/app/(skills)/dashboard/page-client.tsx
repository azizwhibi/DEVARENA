'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
import { useSkillSummary } from '@/components/skills/useSkillSummary';
import { HistoryChart } from '@/components/skills/profile/HistoryChart';
import { ApiService } from '@/lib/skills/api';
import { marketplaceApi } from '@/lib/marketplace/api';
import styles from './dashboard.module.css';
export default function DashboardPage() {
  const account = useSkillsAccount();
  const { skills, evaluated, average, history, pending, error, available } =
    useSkillSummary();
  const [balance, setBalance] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<
    Awaited<ReturnType<typeof ApiService.getPracticeChallenges>>[number] | null
  >(null);
  const [catalogFailure, setCatalogFailure] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    let active = true;
    // The date is calculated after hydration so server and browser time zones cannot disagree.
    const timer = window.setTimeout(() => setToday(new Date()), 0);
    void marketplaceApi
      .getBalance()
      .then((value) => {
        if (active) setBalance(value);
      })
      .catch(() => {});
    void ApiService.getPracticeChallenges()
      .then((items) => {
        if (active)
          setChallenge(
            items.find((c) => c.state !== 'validated') ?? items[0] ?? null,
          );
      })
      .catch(() => {
        if (active) setCatalogFailure(true);
      });
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);
  const hour = today?.getHours() ?? 12;
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <div className={styles.dashboard}>
      <header className={styles.heading}>
        <div>
          <p className="ui-label">
            {today
              ? today.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Your workspace'}
          </p>
          <h1 className={styles.title}>
            {greeting}, {account.username}
          </h1>
          <p className={styles.subtitle}>Keep building your next skill.</p>
        </div>
      </header>
      {error && (
        <p className="workspace-alert" role="alert">
          {error}
        </p>
      )}
      {pending ? (
        <div
          className="analysis-skeleton"
          role="status"
          aria-label="Loading dashboard"
        >
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-panel" />
        </div>
      ) : (
        <>
          <div className={styles.content}>
            <section
              className={'ui-card ' + styles.scoreCard}
              aria-labelledby="score-title"
            >
              <div className={styles.cardBody}>
                <h2 id="score-title" className="ui-label">
                  Average skill proficiency
                </h2>
                <div className={styles.scoreValue}>
                  {average === null ? '—' : average}
                  <span>{average !== null ? '%' : ''}</span>
                </div>
                <p className={styles.subtitle}>
                  {evaluated.length
                    ? 'Based on assessed skills'
                    : 'No verified assessments yet'}
                </p>
                <div className={styles.chartHeading}>
                  <span className="ui-label">Assessment history</span>
                  {evaluated[0] && <span>{evaluated[0].name}</span>}
                </div>
                <HistoryChart
                  history={history}
                  label={
                    'Assessment history' +
                    (evaluated[0] ? ' for ' + evaluated[0].name : '')
                  }
                />
              </div>
              <dl className="ui-metrics">
                <div>
                  <dt>Assigned</dt>
                  <dd>{available ? skills.length : '—'}</dd>
                </div>
                <div>
                  <dt>Assessed</dt>
                  <dd>{available ? evaluated.length : '—'}</dd>
                </div>
                <div>
                  <dt>Assessments</dt>
                  <dd>
                    {available
                      ? skills.reduce((sum, s) => sum + s.validatedAttempts, 0)
                      : '—'}
                  </dd>
                </div>
              </dl>
            </section>
            <section className={'ui-card ' + styles.challengeCard}>
              <span className={styles.cardIcon}>
                <WorkspaceIcon name="practice" />
              </span>
              <h2 className="ui-label">Practice next</h2>
              <h3>
                {challenge?.title ??
                  (catalogFailure
                    ? 'Challenges unavailable'
                    : 'Start with a challenge')}
              </h3>
              <p className={styles.subtitle}>
                {challenge
                  ? 'Practice a published challenge at your own pace.'
                  : 'Explore the challenge catalogue to find your next practice session.'}
              </p>
              {challenge && (
                <>
                  <span className={styles.difficulty}>
                    {challenge.difficulty}
                  </span>
                  <ul className={styles.tags}>
                    {challenge.challenge_skills.map((link) => (
                      <li key={link.skill.id}>{link.skill.name}</li>
                    ))}
                  </ul>
                </>
              )}
              <Link href="/arena" className="ui-button ui-button-primary">
                {challenge ? 'Explore challenge' : 'Browse challenges'}
                <WorkspaceIcon name="arrow" />
              </Link>
            </section>
          </div>
          <Link href="/marketplace" className={styles.marketplace}>
            <span className={styles.cardIcon}>
              <WorkspaceIcon name="marketplace" />
            </span>
            <span>
              <strong>Make it yours</strong>
              <small>Profile cosmetics and challenge hints</small>
            </span>
            <span className={styles.balance}>
              {balance === null
                ? 'Balance unavailable'
                : balance.toLocaleString('en-US') + ' credits'}
            </span>
            <WorkspaceIcon name="arrow" />
          </Link>
          <div className={styles.insights}>
            <section className="ui-card">
              <h2 className="ui-label">Recent skill activity</h2>
              {evaluated.length ? (
                evaluated.slice(0, 3).map((skill) => (
                  <Link
                    key={skill.skillId}
                    href={'/skills/' + skill.skillId}
                    className={styles.activity}
                  >
                    <span>
                      {skill.name}
                      <small>
                        {skill.updatedAt
                          ? new Date(skill.updatedAt).toLocaleDateString(
                              'en-US',
                            )
                          : 'Assessed'}
                      </small>
                    </span>
                    <WorkspaceIcon name="arrow" />
                  </Link>
                ))
              ) : (
                <div className="ui-empty">
                  <strong>Your progress starts here</strong>
                  <span>Validated assessments will appear here.</span>
                </div>
              )}
            </section>
            <section className="ui-card">
              <h2 className="ui-label">Ready to assess</h2>
              <p className={styles.insightValue}>
                {available
                  ? skills.filter((s) => s.levelScore === null).length
                  : '—'}
              </p>
              <p className={styles.subtitle}>
                Assigned skills awaiting a first assessment.
              </p>
              <Link href="/my-skills" className="ui-button">
                View your skills
                <WorkspaceIcon name="arrow" />
              </Link>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
