'use client';
import Link from 'next/link';
import { useCodeReviewSummary } from '../useCodeReviewSummary';
import styles from './code-review.module.css';
import { ProfileSolvedSummary } from './ProfileSolvedSummary';

export function CodeReviewProgress({ layout = 'overview' }: { layout?: 'profile' | 'overview' }) {
  const { summary, error, retry } = useCodeReviewSummary();
  if (layout === 'profile') return <section className={`ui-card ${styles.panel}`} aria-label="Languages and skills">
    {error ? <p role="alert">{error} <button className="ui-button" onClick={retry}>Retry</button></p> : !summary ?
      <div className="skeleton skeleton-panel" role="status" aria-label="Loading languages and skills" /> :
      <ProfileSolvedSummary summary={summary} />}
  </section>;
  return <section className={`ui-card ${styles.panel}`} aria-label="AI-reviewed skill performance">
    <header className={styles.panelHeader}><h2 className="ui-label">Skill performance</h2><span className={styles.pill}>AI-reviewed</span></header>
    {error ? <p role="alert">{error} <button className="ui-button" onClick={retry}>Retry</button></p> : !summary ?
      <div className="skeleton skeleton-title" role="status" aria-label="Loading AI-reviewed skills" /> : <>
      <dl className={styles.metrics}><div><dt>Solved problems</dt><dd>{summary.solvedProblems}</dd></div><div><dt>Skills used</dt><dd>{summary.skills.length}</dd></div></dl>
      <p className={styles.note}>Solutions reviewed by Gemini. Solved at {summary.threshold}% or higher. These scores are AI estimates.</p>
      {summary.skills.length > 0 && <div className={styles.skills}>
        {summary.skills.map(skill => <article className={styles.skill} key={skill.id}>
          <div><Link href={'/skills/' + skill.id}>{skill.name}</Link><strong>{skill.reviewScore}%</strong></div>
          <div className={styles.bar} role="meter" aria-label={`${skill.name} average AI review score`} aria-valuenow={skill.reviewScore} aria-valuemin={0} aria-valuemax={100}><span style={{ width: skill.reviewScore + '%' }} /></div>
          <small>{skill.solvedProblems} {skill.solvedProblems === 1 ? 'solved problem' : 'solved problems'}</small>
        </article>)}
      </div>}
      {summary.recentProblems.length > 0 ? <ul className={styles.recent} aria-label="AI-reviewed solved problems">{summary.recentProblems.map(problem =>
        <li key={problem.id}><Link href={'/arena?problem=' + problem.id}>{problem.title}</Link><span>{problem.score}%</span></li>)}</ul> :
        <Link className="ui-button" href="/arena">Solve a problem</Link>}
      {!!summary.solvedProblems && !summary.skills.length && <p className={styles.note}>These problems have no linked skills yet.</p>}
    </>}
  </section>;
}
