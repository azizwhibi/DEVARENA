'use client';
import Link from 'next/link';
import { usePracticeSummary } from '../usePracticeSummary';
import styles from './PracticeProgress.module.css';

export function PracticeProgress() {
  const { summary, error, retry } = usePracticeSummary();
  return (
    <section
      className={`ui-card ${styles.panel}`}
      aria-label="Practice progress"
    >
      <header className={styles.heading}>
        <h2 className="ui-label">Practice progress</h2>
        {summary && (
          <strong>
            {summary.completedProblems} completed{' '}
            {summary.completedProblems === 1 ? 'problem' : 'problems'}
          </strong>
        )}
      </header>
      {error ? (
        <p role="alert">
          {error}{' '}
          <button className="ui-button" onClick={retry}>
            Retry
          </button>
        </p>
      ) : !summary ? (
        <div
          role="status"
          className="skeleton skeleton-title"
          aria-label="Loading practice progress"
        />
      ) : !summary.completedProblems ? (
        <p className={styles.muted}>
          Complete a practice quiz to see your skills here.
        </p>
      ) : (
        <>
          <p className={styles.muted}>
            Practice activity is separate from verified proficiency.
          </p>
          {summary.skills.length > 0 && (
            <ul className={styles.skills} aria-label="Practised skills">
              {summary.skills.map((skill) => (
                <li key={skill.id}>
                  <Link
                    href={'/skills/' + skill.id}
                    title={skill.technology ?? undefined}
                  >
                    {skill.name}
                    <span>×{skill.solvedProblems}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <ul
            className={styles.problems}
            aria-label="Recently completed practice problems"
          >
            {summary.recentProblems.map((problem) => (
              <li key={problem.id}>
                <Link href={'/arena?q=' + encodeURIComponent(problem.title)}>
                  {problem.title}
                </Link>
                <span>Completed in practice</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
