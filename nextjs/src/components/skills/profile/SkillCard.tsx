'use client';
import Link from 'next/link';
import type { SkillProgress } from '@/lib/skills/types';
import { WorkspaceIcon } from '../WorkspaceIcon';
interface SkillCardProps {
    skill: SkillProgress;
    onStartChallenge?: (skillId: string) => void;
}
export function SkillCard({ skill, onStartChallenge }: SkillCardProps) {
    const isEvaluated = skill.levelScore !== null;
    const score = skill.levelScore ?? 0;
    return <article className="card skill-card">
    <div className="skill-card-head"><div><h3>{skill.name}</h3><span className="skill-tech">{skill.technology || skill.category || 'Général'}</span></div>
      <span className="skill-score">{isEvaluated ? `${score}%` : 'Non évaluée'}</span></div>
    <div className="progress-track" aria-hidden="true"><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, score))}%` }}/></div>
    {skill.description && <p className="skill-description">{skill.description}</p>}
    <div className="skill-card-meta"><span>{skill.validatedAttempts} défis validés</span>
      {skill.delta30d !== null && skill.delta30d !== undefined && <span>{skill.delta30d >= 0 ? '+' : ''}{skill.delta30d}% sur 30 jours</span>}</div>
    <div className="skill-card-footer"><Link href={`/skills/${skill.skillId}`} className="btn btn-ghost">Historique<WorkspaceIcon name="arrow" size={16}/></Link>
      {onStartChallenge && <button type="button" className="btn btn-secondary" onClick={() => onStartChallenge(skill.skillId)}>S’entraîner</button>}</div>
  </article>;
}
