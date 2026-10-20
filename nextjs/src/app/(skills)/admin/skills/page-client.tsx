'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { ApiService } from '@/lib/skills/api';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import type { AdminTechnology } from '@/lib/skills/api';
import { AdminSkill } from '@/lib/skills/types';
import { SkillFormModal } from '@/components/skills/admin/SkillFormModal';
import { StatsModal } from '@/components/skills/admin/StatsModal';
export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<'skills' | 'technologies'>('skills');
    // Skills state
    const [skills, setSkills] = useState<AdminSkill[]>([]);
    const [loadingSkills, setLoadingSkills] = useState(true);
    const [searchSkill, setSearchSkill] = useState('');
    const [isSkillModalOpen, setIsSkillModalOpen] = useState(false);
    const [editingSkill, setEditingSkill] = useState<AdminSkill | undefined>();
    const [statsSkill, setStatsSkill] = useState<{
        id: string;
        name: string;
    } | null>(null);
    // Technologies state
    const [technologies, setTechnologies] = useState<AdminTechnology[]>([]);
    const [loadingTechs, setLoadingTechs] = useState(true);
    const [searchTech, setSearchTech] = useState('');
    const [newTechName, setNewTechName] = useState('');
    const [isAddingTech, setIsAddingTech] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const fetchSkills = useCallback(async () => {
        try {
            const data = await ApiService.getAdminSkills();
            setSkills(data);
        }
        catch {
        }
        finally {
            setLoadingSkills(false);
        }
    }, []);
    const fetchTechnologies = useCallback(async () => {
        try {
            const techs = await ApiService.getAdminTechnologies(true);
            setTechnologies(techs);
        }
        catch {
        }
        finally {
            setLoadingTechs(false);
        }
    }, []);
    useEffect(() => {
        async function initialize() { await Promise.all([fetchSkills(), fetchTechnologies()]); }
        void initialize();
    }, [fetchSkills, fetchTechnologies]);
    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3500);
    };
    // Toggle skill
    const handleToggleSkillActive = async (skill: AdminSkill) => {
        const updated = await ApiService.toggleSkillActive(skill.id, !skill.isActive);
        if (updated) {
            setSkills((prev) => prev.map((s) => (s.id === skill.id ? { ...s, isActive: !s.isActive } : s)));
            showToast(`Statut de "${skill.name}" mis à jour (${!skill.isActive ? 'Actif' : 'Inactif'}).`);
        }
    };
    // Toggle tech
    const handleToggleTechActive = async (tech: AdminTechnology) => {
        const updated = await ApiService.toggleTechnologyActive(tech.id, !tech.is_active);
        if (updated) {
            setTechnologies((prev) => prev.map((t) => (t.id === tech.id ? { ...t, is_active: !tech.is_active } : t)));
            showToast(`Technologie "${tech.name}" mise à jour (${!tech.is_active ? 'Actif' : 'Inactif'}).`);
        }
    };
    // Create technology
    const handleCreateTech = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTechName.trim())
            return;
        setIsAddingTech(true);
        try {
            const created = await ApiService.createTechnology({
                name: newTechName.trim(),
                icon: newTechName.trim().toLowerCase().replace(/[^a-z0-9]/g, ''),
            });
            if (created) {
                setTechnologies((prev) => [created, ...prev]);
                setNewTechName('');
                showToast(`Technologie "${created.name}" créée et enregistrée en base !`);
            }
        }
        catch {
            showToast('Erreur lors de la création de la technologie.');
        }
        finally {
            setIsAddingTech(false);
        }
    };
    const handleRecalculate = async (skillId: string, name: string) => {
        try {
            await ApiService.recalculateProgress(skillId);
            showToast(` Recalcul imm\u00E9diat du score pour "${name}" validé !`);
        }
        catch {
            showToast(`Erreur lors du recalcul pour "${name}"`);
        }
    };
    const filteredSkills = skills.filter((s) => s.name.toLowerCase().includes(searchSkill.toLowerCase()) ||
        s.category.toLowerCase().includes(searchSkill.toLowerCase()) ||
        s.technology.toLowerCase().includes(searchSkill.toLowerCase()));
    const filteredTechs = technologies.filter((t) => t.name.toLowerCase().includes(searchTech.toLowerCase()));
    return <div className="page-container" aria-busy={loadingSkills || loadingTechs}>
    {toastMessage && <div className="toast" role="status">{toastMessage}</div>}
    <header className="page-header"><h1 className="page-title">Gestion des compétences</h1>{activeTab === 'skills' && <button type="button" id="btn-ajouter-competence" className="btn btn-primary" onClick={() => { setEditingSkill(undefined); setIsSkillModalOpen(true); }}><WorkspaceIcon name="plus"/>Nouvelle compétence</button>}</header>
    <div className="tabs" role="tablist" aria-label="Catalogue"><button type="button" role="tab" aria-selected={activeTab === 'skills'} onClick={() => setActiveTab('skills')}>Compétences</button><button type="button" role="tab" aria-selected={activeTab === 'technologies'} onClick={() => setActiveTab('technologies')}>Technologies</button></div>
    {activeTab === 'skills' ? <>
      <div className="toolbar"><div className="search-field"><WorkspaceIcon name="search" size={16}/><input className="input" aria-label="Rechercher une compétence" placeholder="Rechercher une compétence" value={searchSkill} onChange={event => setSearchSkill(event.target.value)}/></div></div>
      {loadingSkills ? <div className="skeleton skeleton-panel" role="status" aria-label="Chargement du catalogue"/> : <div className="card table-card"><table><thead><tr><th>Compétence</th><th>Catégorie</th><th>Technologie</th><th>Défis</th><th>Statut</th><th className="text-right">Actions</th></tr></thead><tbody>
        {filteredSkills.map(skill => <tr key={skill.id}><td>{skill.name}</td><td>{skill.category}</td><td className="muted">{skill.technology}</td><td>{skill.challengesCount}</td><td><button type="button" className={`badge ${skill.isActive ? 'badge-emerald' : 'badge-muted'}`} onClick={() => handleToggleSkillActive(skill)} title={skill.isActive ? 'Désactiver' : 'Activer'}>{skill.isActive ? 'Actif' : 'Inactif'}</button></td>
          <td><div className="row-actions"><button type="button" className="btn btn-ghost" aria-label={`Modifier ${skill.name}`} onClick={() => { setEditingSkill(skill); setIsSkillModalOpen(true); }}><WorkspaceIcon name="settings" size={16}/>Modifier</button><button type="button" className="btn btn-ghost" onClick={() => setStatsSkill({ id: skill.id, name: skill.name })}><WorkspaceIcon name="skills" size={16}/>Statistiques</button><button type="button" className="btn btn-ghost" onClick={() => handleRecalculate(skill.id, skill.name)}><WorkspaceIcon name="refresh" size={16}/>Recalculer</button></div></td></tr>)}
        {!filteredSkills.length && <tr><td colSpan={6} className="filter-empty">Aucune compétence.</td></tr>}
      </tbody></table></div>}
    </> : <>
      <div className="toolbar"><div className="search-field"><WorkspaceIcon name="search" size={16}/><input className="input" aria-label="Rechercher une technologie" placeholder="Rechercher une technologie" value={searchTech} onChange={event => setSearchTech(event.target.value)}/></div>
        <form className="inline-form" onSubmit={handleCreateTech}><input className="input" aria-label="Nouvelle technologie" placeholder="Nom de la technologie" value={newTechName} onChange={event => setNewTechName(event.target.value)} required/><button type="submit" className="btn btn-primary" disabled={isAddingTech || !newTechName.trim()}><WorkspaceIcon name="plus"/>{isAddingTech ? 'Ajout…' : 'Ajouter'}</button></form></div>
      {loadingTechs ? <div className="skeleton skeleton-panel" role="status" aria-label="Chargement des technologies"/> : <div className="card table-card"><table><thead><tr><th>Technologie</th><th>Compétences</th><th>Statut</th><th className="text-right">Action</th></tr></thead><tbody>
        {filteredTechs.map(tech => <tr key={tech.id}><td>{tech.name}</td><td>{tech.skillCount ?? 0}</td><td><span className={`badge ${tech.is_active ? 'badge-emerald' : 'badge-muted'}`}>{tech.is_active ? 'Actif' : 'Inactif'}</span></td><td className="text-right"><button type="button" className="btn btn-ghost" onClick={() => handleToggleTechActive(tech)}>{tech.is_active ? 'Désactiver' : 'Activer'}</button></td></tr>)}
        {!filteredTechs.length && <tr><td colSpan={4} className="filter-empty">Aucune technologie.</td></tr>}
      </tbody></table></div>}
    </>}
    {isSkillModalOpen && <SkillFormModal key={editingSkill?.id ?? 'new'} skill={editingSkill} onClose={() => { setIsSkillModalOpen(false); setEditingSkill(undefined); }} onSuccess={newSkill => { void fetchSkills(); showToast(`Compétence « ${newSkill.name} » ${editingSkill ? 'modifiée' : 'ajoutée'}.`); }}/>}
    {statsSkill && <StatsModal skillId={statsSkill.id} skillName={statsSkill.name} onClose={() => setStatsSkill(null)}/>}
  </div>;
}
