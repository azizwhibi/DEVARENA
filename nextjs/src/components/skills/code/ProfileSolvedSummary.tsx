'use client';
import { useId, useState } from 'react';
import { languageNames } from '@/lib/skills/code-languages';
import type { CodeReviewSummary } from '@/lib/skills/code-review';
import styles from './profile-solved.module.css';

type Skill = CodeReviewSummary['skills'][number];
const groupNames = [
  ['advanced', 'Advanced'],
  ['intermediate', 'Intermediate'],
  ['fundamental', 'Fundamental'],
  ['other', 'Other skills'],
] as const;

function SkillTags({ group, label, skills }: { group: string; label: string; skills: Skill[] }) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? skills : skills.slice(0, 5);
  return <section className={styles.group} data-group={group} aria-label={group === 'other' ? label : label + ' skills'}>
    <h3>{label}</h3>
    <ul id={id} className={styles.tags}>
      {visible.map(skill => <li key={skill.id} title={`${skill.solvedProblems} distinct solved ${skill.solvedProblems === 1 ? 'problem' : 'problems'}`}>
        <span className={styles.tag}>{skill.name}</span>
        <span className={styles.multiplier}><span aria-hidden="true">×{skill.solvedProblems}</span><span className="sr-only">{skill.solvedProblems} solved {skill.solvedProblems === 1 ? 'problem' : 'problems'}</span></span>
      </li>)}
    </ul>
    {skills.length > 5 && <button className={styles.more} aria-expanded={expanded} aria-controls={id} onClick={() => setExpanded(v => !v)}>
      {expanded ? 'Show less' : 'Show more'}<span className="sr-only"> {label.toLowerCase()}{group === 'other' ? '' : ' skills'}</span>
    </button>}
  </section>;
}

export function ProfileSolvedSummary({ summary }: { summary: CodeReviewSummary }) {
  const languages = summary.languages ?? [];
  return <div className={styles.summary}>
    <section className={styles.languages} aria-label="Solved problems by language">
      <div className={styles.heading}><h2>Languages</h2><span className={styles.badge} title={`Gemini-reviewed solutions scoring at least ${summary.threshold}%. Code was not executed against tests.`}>AI-reviewed</span></div>
      {languages.length ? <ul className={styles.languageList}>
        {languages.map(item => <li key={item.language}>
          <span className={styles.tag}>{languageNames[item.language]}</span>
          <span><strong>{item.solvedProblems}</strong> {item.solvedProblems === 1 ? 'problem' : 'problems'} solved</span>
        </li>)}
      </ul> : <p className={styles.empty}>Solve a problem to start your language history.</p>}
    </section>
    <section className={styles.skills} aria-label="Skills used in solved problems">
      <h2>Skills</h2>
      {summary.skills.length ? <>
        <p className={styles.caption}>Grouped by topic complexity.</p>
        {groupNames.map(([group, label]) => {
          const items = summary.skills.filter(skill => (skill.group ?? 'other') === group)
            .sort((a, b) => b.solvedProblems - a.solvedProblems || a.name.localeCompare(b.name));
          return items.length ? <SkillTags key={group} group={group} label={label} skills={items} /> : null;
        })}
      </> : <p className={styles.empty}>{summary.solvedProblems ? 'Your solved problems have no linked skills yet.' : 'Skills from solved problems will appear here.'}</p>}
    </section>
  </div>;
}
