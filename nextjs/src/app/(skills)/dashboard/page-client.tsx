'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
import { useSkillSummary } from '@/components/skills/useSkillSummary';
import { HistoryChart } from '@/components/skills/profile/HistoryChart';
import { PracticeProgress } from '@/components/skills/profile/PracticeProgress';
import { CodeReviewProgress } from '@/components/skills/code/CodeReviewProgress';
import { ApiService } from '@/lib/skills/api';
import { marketplaceApi } from '@/lib/marketplace/api';
import { listReceivedInvitations, type InvitationItem } from '@/lib/messaging';
import styles from './dashboard.module.css';
export default function DashboardPage() {
  const account = useSkillsAccount();
  const router = useRouter();

  useEffect(() => {
    if (account.role === 'admin') {
      router.replace('/admin/users');
    } else if (account.role === 'recruiter') {
      router.replace('/recruiter');
    }
  }, [account.role, router]);

  const {
    skills,
    evaluated,
    average,
    devScore,
    tier,
    history,
    pending,
    error,
    available,
  } = useSkillSummary();
  const [balance, setBalance] = useState<number | null>(null);
  const [challenge, setChallenge] = useState<
    Awaited<ReturnType<typeof ApiService.getPracticeChallenges>>[number] | null
  >(null);
  const [pendingInvitations, setPendingInvitations] = useState<InvitationItem[]>([]);
  const [catalogFailure, setCatalogFailure] = useState(false);
  const [today, setToday] = useState<Date | null>(null);
  useEffect(() => {
    if (account.role !== 'developer') return;
    let active = true;
    // The date is calculated after hydration so server and browser time zones cannot disagree.
    const timer = window.setTimeout(() => setToday(new Date()), 0);
    void marketplaceApi
      .getBalance()
      .then((value) => {
        if (active) setBalance(value);
      })
      .catch(() => {});
    void listReceivedInvitations()
      .then((invites) => {
        if (active) {
          setPendingInvitations(
            (invites || []).filter((i) => i.status === 'pending'),
          );
        }
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

  if (account.role !== 'developer') {
    return (
      <div className="p-8 text-center" role="status">
        Redirecting to your workspace…
      </div>
    );
  }

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
      <CodeReviewProgress />
      {error && (
        <p className="workspace-alert" role="alert">
          {error}
        </p>
      )}
      {pendingInvitations.length > 0 && (
        <section
          className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-5 flex flex-wrap items-center justify-between gap-4"
          aria-labelledby="invitations-alert-title"
        >
          <div>
            <h2
              id="invitations-alert-title"
              className="text-base font-semibold text-zinc-100 flex items-center gap-2"
            >
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
              {pendingInvitations.length} Pending Interview Request
              {pendingInvitations.length > 1 ? 's' : ''}
            </h2>
            <p className="mt-1 text-xs text-zinc-300">
              Recruiters are interested in your profile. Review their requests and
              connect.
            </p>
          </div>
          <Link
            href="/invitations"
            className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
          >
            Review Requests →
          </Link>
        </section>
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
          <div className={styles.content} data-single={!evaluated.length || undefined}>
            {!!evaluated.length && <section
              className={'ui-card ' + styles.scoreCard}
              aria-labelledby="score-title"
            >
              <div className={styles.cardBody}>
                <h2 id="score-title" className="ui-label">
                  Dev Score & Tier
                </h2>
                <div className={styles.scoreValue}>
                  {devScore === null ? '—' : devScore}
                  <span>{devScore !== null ? '%' : ''}</span>
                </div>
                <p className={styles.subtitle}>
                  {tier
                    ? `${tier} Tier • Median proficiency across assessed skills`
                    : evaluated.length
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
                  <dt>Demonstrated</dt>
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
            </section>}
            <section className={'ui-card ' + styles.challengeCard}>
              <span className={styles.cardIcon}>
                <WorkspaceIcon name="practice" />
              </span>
              <h2 className="ui-label">Practice next</h2>
              <h3>
                {challenge?.title ??
                  (catalogFailure
                    ? 'Problems unavailable'
                    : 'Start with a problem')}
              </h3>
              <p className={styles.subtitle}>
                {challenge
                  ? 'Practice a published problem at your own pace.'
                  : 'Explore the problem catalogue to find your next practice session.'}
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
                {challenge ? 'Explore problem' : 'Browse problems'}
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
          {!!evaluated.length && <div className={styles.insights}>
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
                Skills awaiting proficiency calculation.
              </p>
              <Link href="/my-skills" className="ui-button">
                View your skills
                <WorkspaceIcon name="arrow" />
              </Link>
            </section>
          </div>}
        </>
      )}
      <PracticeProgress />
    </div>
  );
}
