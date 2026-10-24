'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '@/lib/skills/api';
import { useAccount } from '@/components/AccountProvider';
import { ChallengeModal } from '@/components/skills/arena/ChallengeModal';
type Challenge = Awaited<
  ReturnType<typeof ApiService.getPracticeChallenges>
>[number];
export default function ArenaPage() {
  const { account } = useAccount();
  const router = useRouter();
  const [items, setItems] = useState<Challenge[]>([]),
    [practice, setPractice] = useState<Challenge | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [retry, setRetry] = useState(0);

  useEffect(() => {
    if (account?.role === 'recruiter') {
      router.replace('/recruiter');
    } else if (account?.role === 'admin') {
      router.replace('/admin/users');
    }
  }, [account?.role, router]);

  useEffect(() => {
    if (account && account.role !== 'developer') {
      setLoading(false);
      return;
    }
    let active = true;
    void ApiService.getPracticeChallenges()
      .then((data) => {
        if (active) {
          setItems(data);
          setError('');
        }
      })
      .catch(() => {
        if (active) setError('Unable to load challenges.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [retry, account]);

  if (account && account.role !== 'developer') {
    return (
      <div className="page-container">
        <p role="status">Redirecting to your workspace…</p>
      </div>
    );
  }
  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Challenges</h1>
      </header>
      <p className="muted">Browser practice does not change verified scores.</p>
      {loading ? (
        <p role="status">Loading challenges…</p>
      ) : error ? (
        <p role="alert">
          {error}
          <button
            className="btn btn-secondary"
            onClick={() => {
              setLoading(true);
              setRetry((r) => r + 1);
            }}
          >
            Retry
          </button>
        </p>
      ) : !items.length ? (
        <section className="empty-state">
          <h2>No published challenges</h2>
        </section>
      ) : (
        <div className="grid-3">
          {items.map((c) => (
            <article className="card" key={c.id}>
              <h2>{c.title}</h2>
              <p>
                {c.difficulty} ·{' '}
                {c.state === 'validated'
                  ? 'Validated assessment'
                  : 'Not started'}
              </p>
              <ul>
                {c.challenge_skills.map(
                  (link) =>
                    link.skill && (
                      <li key={link.skill.id}>
                        <Link
                          className="btn btn-ghost"
                          href={'/skills/' + link.skill.id}
                        >
                          {link.skill.name}
                        </Link>
                      </li>
                    ),
                )}
              </ul>
              <button
                className="btn btn-primary"
                onClick={() => setPractice(c)}
              >
                Practice
              </button>
            </article>
          ))}
        </div>
      )}
      {practice && (
        <ChallengeModal
          challengeId={practice.id}
          challengeTitle={practice.title}
          onClose={() => setPractice(null)}
        />
      )}
    </div>
  );
}
