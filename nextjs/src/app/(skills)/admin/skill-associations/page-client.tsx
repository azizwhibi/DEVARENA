'use client';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@/lib/skills/api';
import { AdminSkill, SkillProgress } from '@/lib/skills/types';
export default function AssociationsPage() {
    const [skills, setSkills] = useState<AdminSkill[]>([]);
    const [challenges, setChallenges] = useState<{
        id: string;
        title: string;
    }[]>([]);
    const [selectedChallengeId, setSelectedChallengeId] = useState('');
    const [selectedSkillId, setSelectedSkillId] = useState('');
    const [weight, setWeight] = useState(2);
    const [challengeAssociations, setChallengeAssociations] = useState<{
        challengeId: string;
        challengeTitle: string;
        skillId: string;
        skillName: string;
        weight: number;
    }[]>([]);
    // Developer progress
    const [userProgress, setUserProgress] = useState<SkillProgress[]>([]);
    const [skillToAttachId, setSkillToAttachId] = useState('');
    const [toastMsg, setToastMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAttaching, setIsAttaching] = useState(false);
    const showToast = (msg: string) => {
        setToastMsg(msg);
        setTimeout(() => setToastMsg(null), 4000);
    };
    const loadData = useCallback(async () => {
        try {
            const [skillsList, devSkills, chs] = await Promise.all([
                ApiService.getAdminSkills(),
                ApiService.getMySkills(),
                ApiService.getChallenges(),
            ]);
            setSkills(skillsList);
            setUserProgress(devSkills);
            setChallenges(chs);
            if (chs.length > 0) {
                setSelectedChallengeId(previous => previous || chs[0].id);
            }
            if (skillsList.length > 0) {
                setSelectedSkillId(previous => previous || skillsList[0].id);
                setSkillToAttachId(previous => previous || skillsList[0].id);
            }
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    useEffect(() => {
        async function initialize() { await loadData(); }
        void initialize();
    }, [loadData]);
    useEffect(() => {
        if (!selectedChallengeId)
            return;
        let active = true;
        void ApiService.getChallengeSkills(selectedChallengeId).then(result => {
            if (!active)
                return;
            const challengeTitle = challenges.find(challenge => challenge.id === selectedChallengeId)?.title ?? selectedChallengeId;
            setChallengeAssociations(previous => [
                ...previous.filter(link => link.challengeId !== selectedChallengeId),
                ...result.skills.map(skill => ({ challengeId: selectedChallengeId, challengeTitle, skillId: skill.id, skillName: skill.name, weight: skill.weight })),
            ]);
        }).catch(() => { });
        return () => { active = false; };
    }, [selectedChallengeId, challenges]);
    // ── PARTIE A : Lier Compétence à un Défi ────────────────────────
    const handleAssociateToChallenge = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedChallengeId || !selectedSkillId)
            return;
        setIsSubmitting(true);
        try {
            // 1. Call real backend endpoint PUT /admin/challenges/:id/skills
            await ApiService.setChallengeSkills(selectedChallengeId, [
                { skillId: selectedSkillId, weight: Number(weight) },
            ]);
            const chTitle = challenges.find((c) => c.id === selectedChallengeId)?.title || selectedChallengeId;
            const skName = skills.find((s) => s.id === selectedSkillId)?.name || selectedSkillId;
            const newAssoc = {
                challengeId: selectedChallengeId,
                challengeTitle: chTitle,
                skillId: selectedSkillId,
                skillName: skName,
                weight: Number(weight),
            };
            setChallengeAssociations((prev) => [
                newAssoc,
                ...prev.filter((a) => !(a.challengeId === selectedChallengeId && a.skillId === selectedSkillId)),
            ]);
            // 2. Also automatically associate/initialize progress for developer so it appears in PARTIE B!
            await ApiService.recalculateProgress(selectedSkillId);
            const updatedProgress = await ApiService.getMySkills();
            setUserProgress(updatedProgress);
            showToast(` Succ\u00E8s : "${skName}" liée au défi "${chTitle}" (Poids: ${weight}) et rattachée à la progression du développeur !`);
        }
        catch {
            showToast('Erreur lors de la liaison au défi.');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    // ── PARTIE B : Rattacher Compétence au Développeur ─────────────
    const handleAttachSkillToDeveloper = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!skillToAttachId)
            return;
        setIsAttaching(true);
        try {
            const skName = skills.find((s) => s.id === skillToAttachId)?.name || skillToAttachId;
            await ApiService.recalculateProgress(skillToAttachId);
            const updated = await ApiService.getMySkills();
            setUserProgress(updated);
            showToast(` "${skName}" est désormais rattachée au développeur avec calcul de niveau initialisé !`);
        }
        catch {
            showToast('Erreur lors du rattachement au développeur.');
        }
        finally {
            setIsAttaching(false);
        }
    };
    const handleRecalculateUser = async (skillId: string, skillName: string) => {
        try {
            await ApiService.recalculateProgress(skillId);
            showToast(` Progression recalcul\u00E9e pour "${skillName}" !`);
            const updated = await ApiService.getMySkills();
            setUserProgress(updated);
        }
        catch {
            showToast('Erreur lors du recalcul.');
        }
    };
    const handleSimulateValidation = async (challengeId: string, challengeLabel: string) => {
        try {
            await ApiService.simulateValidatedChallenge(challengeId);
            showToast(`Simulation termin?e pour ? ${challengeLabel} ?.`);
            const updated = await ApiService.getMySkills();
            setUserProgress(updated);
        }
        catch {
            showToast('Erreur lors de la simulation.');
        }
    };
    return <div className="page-container">
    {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    <header className="page-header"><h1 className="page-title">Associations</h1></header>
    <div className="grid-2">
      <section className="card"><h2 className="section-title">Défis et compétences</h2>
        <form className="stack-form" onSubmit={handleAssociateToChallenge}>
          <label>Défi<select className="input" value={selectedChallengeId} onChange={event => setSelectedChallengeId(event.target.value)} required>{challenges.map(challenge => <option key={challenge.id} value={challenge.id}>{challenge.title}</option>)}</select></label>
          <label>Compétence<select className="input" value={selectedSkillId} onChange={event => setSelectedSkillId(event.target.value)} required>{skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
          <label>Poids<input type="number" className="input" value={weight} min={1} max={3} onChange={event => setWeight(Number(event.target.value))} required/></label>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}><WorkspaceIcon name="links"/>{isSubmitting ? 'Enregistrement…' : 'Associer'}</button>
        </form>
      </section>
      <section className="card"><h2 className="section-title">Progression</h2>
        <form className="stack-form" onSubmit={handleAttachSkillToDeveloper}><label>Compétence<select className="input" value={skillToAttachId} onChange={event => setSkillToAttachId(event.target.value)} required>{skills.map(skill => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
          <button type="submit" className="btn btn-secondary" disabled={isAttaching}><WorkspaceIcon name="plus"/>{isAttaching ? 'Ajout…' : 'Ajouter à ma progression'}</button></form>
        {challenges.length > 0 && <details className="simulation-tools"><summary>Outils de simulation</summary><div className="stack-form">{challenges.slice(0, 3).map(challenge => <button type="button" key={challenge.id} className="btn btn-ghost" onClick={() => handleSimulateValidation(challenge.id, challenge.title)}><WorkspaceIcon name="play"/>{challenge.title}</button>)}</div></details>}
      </section>
    </div>
    {challengeAssociations.length > 0 && <section className="section-block"><h2 className="section-title section-gap">Associations existantes</h2><div className="card table-card"><table><thead><tr><th>Défi</th><th>Compétence</th><th>Poids</th></tr></thead><tbody>{challengeAssociations.map((association, index) => <tr key={`${association.challengeId}-${association.skillId}-${index}`}><td>{association.challengeTitle}</td><td>{association.skillName}</td><td>{association.weight}</td></tr>)}</tbody></table></div></section>}
    {userProgress.length > 0 && <section className="section-block"><h2 className="section-title section-gap">Mes niveaux</h2><div className="card table-card"><table><thead><tr><th>Compétence</th><th>Score</th><th>Défis validés</th><th className="text-right">Action</th></tr></thead><tbody>{userProgress.map(progress => <tr key={progress.skillId}><td>{progress.name}</td><td>{progress.levelScore === null ? 'Non évaluée' : `${progress.levelScore}%`}</td><td>{progress.validatedAttempts}</td><td className="text-right"><button type="button" className="btn btn-ghost" onClick={() => handleRecalculateUser(progress.skillId, progress.name)}><WorkspaceIcon name="refresh" size={16}/>Recalculer</button></td></tr>)}</tbody></table></div></section>}
  </div>;
}
