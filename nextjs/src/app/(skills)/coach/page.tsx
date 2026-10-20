'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@/lib/skills/api';
import { CoachRecommendation, SkillProgress } from '@/lib/skills/types';
import { ChallengeModal } from '@/components/skills/arena/ChallengeModal';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { RadarChart } from '@/components/skills/profile/RadarChart';
import Link from 'next/link';
export default function CoachPage() {
    const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);
    const [skills, setSkills] = useState<SkillProgress[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeChallengeModal, setActiveChallengeModal] = useState<{
        id: string;
        title: string;
        skillId?: string;
    } | null>(null);
    const fetchData = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        try {
            const [coachData, skillsData] = await Promise.all([
                ApiService.getCoachRecommendation(forceRefresh),
                ApiService.getMySkills(),
            ]);
            setRecommendation(coachData);
            setSkills(skillsData);
        }
        catch {
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        async function initialize() { await fetchData(false); }
        void initialize();
    }, [fetchData]);
    const [skillView, setSkillView] = useState<'grid' | 'radar'>('grid');
    const isAi = recommendation?.source === 'ai';
    // Target skill diagnosed by the Coach
    const targetSkill = skills.find((s) => s.skillId === recommendation?.skillId) ||
        skills.find((s) => s.name.toLowerCase() === recommendation?.skillName?.toLowerCase()) ||
        [...skills].filter((s) => s.levelScore !== null).sort((a, b) => (a.levelScore ?? 0) - (b.levelScore ?? 0))[0];
    const evaluatedSkills = skills.filter(skill => skill.levelScore !== null);
    return <div className="page-container">
    <header className="page-header">
      <h1 className="page-title">Coach IA</h1>
      <button type="button" onClick={() => fetchData(true)} className="btn btn-secondary" disabled={loading} id="btn-refresh-coach-ai"><WorkspaceIcon name="refresh"/>{loading ? 'Analyse en cours' : 'Relancer l’analyse'}</button>
    </header>

    {loading ? <section className="analysis-skeleton" role="status" aria-label="Analyse en cours"><div className="skeleton skeleton-label"/><div className="skeleton skeleton-line"/><div className="skeleton skeleton-line skeleton-short"/></section>
            : evaluatedSkills.length === 0 ? <section className="empty-state">
        <WorkspaceIcon name="practice" size={20}/><h2>Votre première analyse</h2>
        <p>Terminez un défi pour découvrir vos points forts.</p>
        <Link href="/arena" className="btn btn-primary">Commencer un défi<WorkspaceIcon name="arrow"/></Link>
      </section> : <>
        <section className="card analysis-card">
          <div className="analysis-meta"><span className="status-pill" tabIndex={0} aria-describedby="coach-source-details">{isAi ? 'Analyse IA' : 'Analyse locale'}
            <span id="coach-source-details" role="tooltip" className="status-tooltip">{isAi ? 'Conseil généré par le modèle IA à partir de vos résultats.' : 'Conseil calculé à partir de vos résultats, sans service IA externe.'}</span></span>
          </div>
          {recommendation?.observation && <p className="analysis-observation">{recommendation.observation}</p>}
          {targetSkill && <div className="analysis-target"><div><span className="section-title">Prochaine étape</span>
            {recommendation?.reason && <p>{recommendation.reason}</p>}</div>
            <button type="button" id="btn-lancer-defi-coach" className="btn btn-primary" onClick={() => setActiveChallengeModal({
                        id: recommendation?.challengeId || `ch-${targetSkill.slug || 'skill'}-1`,
                        title: `Défi : ${targetSkill.name}`, skillId: targetSkill.skillId,
                    })}>S’entraîner<WorkspaceIcon name="arrow"/></button>
          </div>}
        </section>
        <section className="section-block" aria-labelledby="coach-skills-title">
          <div className="section-header"><h2 id="coach-skills-title" className="section-title">Compétences analysées</h2>
            {evaluatedSkills.length >= 3 && <button type="button" className="btn btn-ghost" onClick={() => setSkillView(skillView === 'grid' ? 'radar' : 'grid')} aria-pressed={skillView === 'radar'}><WorkspaceIcon name={skillView === 'grid' ? 'skills' : 'grid'}/>{skillView === 'grid' ? 'Vue radar' : 'Vue grille'}</button>}
          </div>
          {skillView === 'radar' && evaluatedSkills.length >= 3 ? <div className="card chart-card"><RadarChart skills={evaluatedSkills}/></div>
                    : <div className="grid-3">{evaluatedSkills.map(skill => <article key={skill.skillId} className="card compact-skill"><div className="compact-skill-heading"><h3>{skill.name}</h3><span>{skill.levelScore}%</span></div>
              <div className="progress-track" aria-hidden="true"><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, skill.levelScore!))}%` }}/></div>
            </article>)}</div>}
        </section>
      </>}
    {activeChallengeModal && <ChallengeModal challengeId={activeChallengeModal.id} challengeTitle={activeChallengeModal.title} skillId={activeChallengeModal.skillId} onClose={() => setActiveChallengeModal(null)} onSuccess={() => { fetchData(true); }} onFailure={() => { fetchData(true); }}/>}
  </div>;
}
