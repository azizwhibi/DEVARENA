'use client';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import { useEffect, useState, type FormEvent } from 'react';
import { ApiService } from '@/lib/skills/api';
import type { AdminSkill } from '@/lib/skills/types';

type Reference = { id: string; name: string };
type Props = { skill?: AdminSkill; onClose: () => void; onSuccess: (skill: AdminSkill) => void };

export function SkillFormModal({ skill, onClose, onSuccess }: Props) {
  const [name, setName] = useState(skill?.name ?? '');
  const [description, setDescription] = useState(skill?.description ?? '');
  const [categoryId, setCategoryId] = useState(skill?.categoryId ?? '');
  const [technologyId, setTechnologyId] = useState(skill?.technologyId ?? '');
  const [categories, setCategories] = useState<Reference[]>([]);
  const [technologies, setTechnologies] = useState<Reference[]>([]);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    void ApiService.getSkillMeta().then(meta => {
      if (!active) return;
      const categories = [...meta.categories];
      const technologies = [...meta.technologies];
      // Preserve existing inactive references until the administrator changes them.
      if (skill?.categoryId && !categories.some(item => item.id === skill.categoryId)) {
        categories.push({ id: skill.categoryId, name: skill.category, slug: '' });
      }
      if (skill?.technologyId && !technologies.some(item => item.id === skill.technologyId)) {
        technologies.push({ id: skill.technologyId, name: skill.technology, slug: '' });
      }
      setCategories(categories);
      setTechnologies(technologies);
      if (!skill) setCategoryId(categories[0]?.id ?? '');
      setReady(true);
    }).catch(() => {
      if (active) setError('Impossible de charger les catégories et technologies.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [skill]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || submitting || name.trim().length < 2 || !categoryId) return;
    setSubmitting(true);
    setError('');
    try {
      const values = { name: name.trim(), categoryId, description: description.trim() };
      const saved = skill
        ? await ApiService.updateSkill(skill.id, { ...values, technologyId: technologyId || null })
        : await ApiService.createSkill({ ...values, technologyId: technologyId || undefined });
      onSuccess({
        ...saved,
        categoryId,
        technologyId: technologyId || null,
        category: categories.find(item => item.id === categoryId)?.name ?? '',
        technology: technologies.find(item => item.id === technologyId)?.name ?? '',
        challengesCount: skill?.challengesCount ?? saved.challengesCount,
      });
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Impossible d’enregistrer la compétence.');
    } finally {
      setSubmitting(false);
    }
  }

  function close() { if (!submitting) onClose(); }
  return (
    <div className="modal-overlay" onClick={close}>
      <section className="modal-box" role="dialog" aria-modal="true" aria-labelledby="skill-form-title"
        onClick={event => event.stopPropagation()} onKeyDown={event => { if (event.key === 'Escape') close(); }}>
        <header className="modal-header">
          <h2 id="skill-form-title">{skill ? 'Modifier la compétence' : 'Nouvelle compétence'}</h2>
          <button type="button" className="icon-button" onClick={close} disabled={submitting} aria-label="Fermer le formulaire"><WorkspaceIcon name="close" /></button>
        </header>
        <form onSubmit={handleSubmit}>
          <div className="modal-body stack-form">
            {error && <p role="alert" className="form-error">{error}</p>}
            {loading && <div className="skeleton skeleton-panel" role="status" aria-label="Chargement du formulaire" />}
            <fieldset className="stack-form" disabled={!ready || submitting}>
              <label>Nom<input className="input" value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} required /></label>
              <div className="grid-2">
                <label>Catégorie<select className="input" value={categoryId} onChange={event => setCategoryId(event.target.value)} required>
                  {!categoryId && <option value="">Choisir une catégorie</option>}
                  {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select></label>
                <label>Technologie<select className="input" value={technologyId} onChange={event => setTechnologyId(event.target.value)}>
                  <option value="">Aucune</option>
                  {technologies.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select></label>
              </div>
              <label>Description<textarea className="input" rows={3} maxLength={300} value={description} onChange={event => setDescription(event.target.value)} /></label>
            </fieldset>
          </div>
          <footer className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={close} disabled={submitting}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={!ready || submitting || name.trim().length < 2 || !categoryId}>
              {submitting ? 'Enregistrement…' : skill ? 'Enregistrer' : 'Créer la compétence'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
