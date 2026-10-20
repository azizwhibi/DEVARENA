'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { AiCoachCard } from '@/components/skills/profile/AiCoachCard';
import { ApiService } from '@/lib/skills/api';
import type { CoachRecommendation, SkillProgress } from '@/lib/skills/types';
import styles from './dashboard.module.css';
export default function DashboardPage() {
    const [skills, setSkills] = useState<SkillProgress[]>([]);
    const [coach, setCoach] = useState<CoachRecommendation | null>(null);
    const [skillsLoading, setSkillsLoading] = useState(true);
    const [coachLoading, setCoachLoading] = useState(true);
    useEffect(() => {
        let active = true;
        void ApiService.getMySkills().then(value => { if (active)
            setSkills(value); })
            .catch(() => { }).finally(() => { if (active)
            setSkillsLoading(false); });
        void ApiService.getCoachRecommendation().then(value => { if (active)
            setCoach(value); })
            .catch(() => { }).finally(() => { if (active)
            setCoachLoading(false); });
        return () => { active = false; };
    }, []);
    const evaluated = skills.filter(skill => skill.levelScore !== null);
    const average = evaluated.length ? Math.round(evaluated.reduce((sum, skill) => sum + skill.levelScore!, 0) / evaluated.length) : null;
    const recentSkills = [...skills].sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '')).slice(0, 5);
    const stats = [
        { label: 'Compétences', value: skills.length, hint: 'Dans votre référentiel' },
        { label: 'Évaluées', value: evaluated.length, hint: 'Avec un score validé' },
        { label: 'Score moyen', value: average === null ? '—' : `${average}%`, hint: 'Sur les compétences évaluées' },
    ];
    function refreshCoach() {
        setCoachLoading(true);
        void ApiService.getCoachRecommendation(true).then(setCoach).catch(() => { }).finally(() => setCoachLoading(false));
    }
    return <div className={styles.dashboard}>
    <header className={styles.heading}><h1 className={styles.title}>Tableau de bord</h1>
      {skills.length > 0 && <Link href="/arena" className={styles.primaryAction}>{evaluated.length ? 'S’entraîner' : 'Commencer un défi'}<WorkspaceIcon name="arrow" size={16}/></Link>}
    </header>
    {skillsLoading ? <div className="analysis-skeleton" role="status" aria-label="Chargement du tableau de bord"><div className="skeleton skeleton-label"/><div className="skeleton skeleton-line"/><div className="skeleton skeleton-panel"/></div>
            : !skills.length ? <section className="empty-state"><WorkspaceIcon name="practice" size={20}/><h2>Votre progression commence ici</h2><p>Terminez un défi pour découvrir vos compétences.</p><Link href="/arena" className="btn btn-primary">Commencer un défi</Link></section> : <>
        <dl className={styles.stats}>{stats.map(stat => <div key={stat.label} className={styles.stat}><dt className={styles.statLabel}>{stat.label}</dt><dd className={styles.statValue}>{stat.value}</dd></div>)}</dl>
        <div className={styles.content} data-single={evaluated.length === 0}>
          <section className={styles.progress} aria-labelledby="progress-title">
            <div className={styles.sectionHeader}><h2 id="progress-title" className={styles.sectionTitle}>Compétences récentes</h2><Link href="/my-skills" className={styles.textLink}>Tout voir<WorkspaceIcon name="arrow" size={16}/></Link></div>
            {recentSkills.map(skill => <Link href={`/skills/${skill.skillId}`} key={skill.skillId} className={styles.skill}><div className={styles.skillHeading}><div><h3 className={styles.skillName}>{skill.name}</h3><p className={styles.skillMeta}>{skill.technology || skill.category || 'Général'}</p></div>
              {skill.levelScore === null ? <span className={styles.unevaluated}>Non évaluée</span> : <span className={styles.score}>{skill.levelScore}%</span>}</div>
              {skill.levelScore !== null && <div className={styles.track} aria-hidden="true"><div className={styles.fill} style={{ width: `${Math.max(0, Math.min(100, skill.levelScore))}%` }}/></div>}
            </Link>)}
          </section>
          {evaluated.length > 0 && <aside className={styles.rail} aria-label="Conseil"><AiCoachCard recommendation={coach} isLoading={coachLoading} onRefresh={refreshCoach}/></aside>}
        </div>
      </>}
  </div>;
}
