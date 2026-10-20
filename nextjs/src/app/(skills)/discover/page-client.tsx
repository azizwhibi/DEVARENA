'use client';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiService } from '@/lib/skills/api';
import type { SkillProgress } from '@/lib/skills/types';
export default function DiscoverPage() {
    const [skills, setSkills] = useState<SkillProgress[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => { void ApiService.getMySkills().then(setSkills).catch(() => { }).finally(() => setLoading(false)); }, []);
    const technologies = [...new Set(skills.map(skill => skill.technology).filter(Boolean))];
    return <div className="page-container"><header className="page-header"><h1 className="page-title">Technologies</h1></header>
    {loading ? <div className="grid-3" role="status" aria-label="Chargement des technologies">{[0, 1, 2].map(item => <div key={item} className="skeleton skeleton-panel"/>)}</div>
            : !technologies.length ? <section className="empty-state"><WorkspaceIcon name="layers" size={20}/><h2>Aucune technologie</h2><p>Le catalogue est vide pour le moment.</p></section>
                : <div className="grid-3">{technologies.map(technology => <section className="card technology-card" key={technology}><h2>{technology}</h2><ul>{skills.filter(skill => skill.technology === technology).map(skill => <li key={skill.skillId}><Link href={`/skills/${skill.skillId}`}>{skill.name}<WorkspaceIcon name="arrow" size={16}/></Link></li>)}</ul></section>)}</div>}
  </div>;
}
