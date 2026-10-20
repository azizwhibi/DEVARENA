'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ApiService } from '@/lib/skills/api';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import Link from 'next/link';
import { SkillProgress, CoachRecommendation } from '@/lib/skills/types';
import { AiCoachCard } from '@/components/skills/profile/AiCoachCard';
import { SkillCard } from '@/components/skills/profile/SkillCard';
import { RadarChart } from '@/components/skills/profile/RadarChart';
import { ChallengeModal } from '@/components/skills/arena/ChallengeModal';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
export default function ProfilePage() {
    const account = useSkillsAccount();
    const [skills, setSkills] = useState<SkillProgress[]>([]);
    const [recommendation, setRecommendation] = useState<CoachRecommendation | null>(null);
    const [isLoadingSkills, setIsLoadingSkills] = useState(true);
    const [isLoadingCoach, setIsLoadingCoach] = useState(true);
    const [selectedFilter, setSelectedFilter] = useState<'all' | 'evaluated' | 'to_improve'>('all');
    const [viewMode, setViewMode] = useState<'cards' | 'radar'>('cards');
    const [activeChallengeId, setActiveChallengeId] = useState<string | null>(null);
    const [activeChallengeSkillId, setActiveChallengeSkillId] = useState<string | null>(null);
    const loadData = useCallback(async () => {
        try {
            const [skillsData, coachData] = await Promise.all([
                ApiService.getMySkills(),
                ApiService.getCoachRecommendation(),
            ]);
            setSkills(skillsData);
            setRecommendation(coachData);
        }
        catch {
            // fallback
        }
        finally {
            setIsLoadingSkills(false);
            setIsLoadingCoach(false);
        }
    }, []);
    useEffect(() => {
        async function initialize() { await loadData(); }
        void initialize();
    }, [loadData]);
    const refreshCoach = async () => {
        setIsLoadingCoach(true);
        try {
            const coachData = await ApiService.getCoachRecommendation(true);
            setRecommendation(coachData);
        }
        catch {
        }
        finally {
            setIsLoadingCoach(false);
        }
    };
    const filteredSkills = useMemo(() => {
        switch (selectedFilter) {
            case 'evaluated':
                return skills.filter((s) => s.levelScore !== null);
            case 'to_improve':
                return skills.filter((s) => s.levelScore === null || s.levelScore < 70);
            default:
                return skills;
        }
    }, [skills, selectedFilter]);
    const evaluatedSkills = skills.filter((s) => s.levelScore !== null);
    const avgScore = evaluatedSkills.length > 0
        ? Math.round(evaluatedSkills.reduce((acc, s) => acc + (s.levelScore ?? 0), 0) /
            evaluatedSkills.length)
        : 0;
    const totalValidated = skills.reduce((acc, s) => acc + s.validatedAttempts, 0);
    return <div className="page-container" aria-label={`Compétences de ${account.username}`} aria-busy={isLoadingSkills}>
    <header className="page-header"><h1 className="page-title">Compétences</h1></header>
    {isLoadingSkills ? <div className="grid-3" role="status" aria-label="Chargement des compétences">{[0, 1, 2].map(item => <div key={item} className="skeleton skeleton-panel"/>)}</div>
            : !skills.length ? <section className="empty-state"><WorkspaceIcon name="skills" size={20}/><h2>Aucune compétence</h2><p>Commencez un défi pour suivre votre progression.</p><Link href="/arena" className="btn btn-primary">Commencer un défi</Link></section> : <>
        <dl className="metric-row"><div><dt>Compétences</dt><dd>{skills.length}</dd></div><div><dt>Score moyen</dt><dd>{evaluatedSkills.length ? `${avgScore}%` : '—'}</dd></div><div><dt>Défis validés</dt><dd>{totalValidated}</dd></div></dl>
        <div className="toolbar"><label className="filter-label">Afficher<select className="input" value={selectedFilter} onChange={event => setSelectedFilter(event.target.value as typeof selectedFilter)}><option value="all">Toutes</option><option value="evaluated">Évaluées</option><option value="to_improve">À travailler</option></select></label>
          {evaluatedSkills.length >= 3 && <div className="view-toggle" aria-label="Vue des compétences"><button type="button" className="btn btn-ghost" aria-pressed={viewMode === 'cards'} onClick={() => setViewMode('cards')}><WorkspaceIcon name="grid"/>Grille</button><button type="button" className="btn btn-ghost" aria-pressed={viewMode === 'radar'} onClick={() => setViewMode('radar')}><WorkspaceIcon name="skills"/>Radar</button></div>}
        </div>
        {viewMode === 'radar' && evaluatedSkills.length >= 3 ? <div className="card chart-card"><RadarChart skills={skills}/></div>
                    : <div className="grid-3">{filteredSkills.map(skill => <SkillCard key={skill.skillId} skill={skill} onStartChallenge={skillId => { setActiveChallengeId(`${skillId}-1`); setActiveChallengeSkillId(skillId); }}/>)}</div>}
        {!filteredSkills.length && viewMode === 'cards' && <p className="filter-empty">Aucune compétence ne correspond à ce filtre.</p>}
        {evaluatedSkills.length > 0 && (recommendation || isLoadingCoach) && <div className="section-block"><AiCoachCard recommendation={recommendation} isLoading={isLoadingCoach} onRefresh={refreshCoach} onStartChallenge={challengeId => { setActiveChallengeId(challengeId); }}/></div>}
      </>}
    {activeChallengeId && <ChallengeModal challengeId={activeChallengeId} challengeTitle={`Défi Ciblé : ${skills.find(skill => skill.skillId === activeChallengeSkillId)?.name ?? activeChallengeId}`} skillId={activeChallengeSkillId ?? undefined} onClose={() => { setActiveChallengeId(null); setActiveChallengeSkillId(null); }} onSuccess={async () => { await loadData(); await refreshCoach(); }} onFailure={async () => { await loadData(); await refreshCoach(); }}/>}
  </div>;
}
