'use client';
import Link from 'next/link';
import type { CoachRecommendation } from '@/lib/skills/types';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import styles from './coach-card.module.css';
interface AiCoachCardProps {
    recommendation: CoachRecommendation | null;
    isLoading: boolean;
    onRefresh: () => void;
    onStartChallenge?: (challengeId: string) => void;
}
export function AiCoachCard({ recommendation, isLoading, onRefresh, onStartChallenge }: AiCoachCardProps) {
    return <section className={styles.card} aria-label="Coach IA" aria-busy={isLoading}>
    <div className={styles.header}><h2 className={styles.title}><WorkspaceIcon name="coach"/>Coach IA</h2>
      <button type="button" onClick={onRefresh} disabled={isLoading} className={styles.refresh} aria-label="Actualiser le conseil" title="Actualiser le conseil"><WorkspaceIcon name="refresh" size={15}/></button></div>
    {isLoading ? <div role="status" aria-label="Analyse en cours"><div className="skeleton skeleton-line"/><div className="skeleton skeleton-line skeleton-short"/></div>
            : recommendation ? <>
        <p className={styles.observation}>{recommendation.observation}</p>
        {recommendation.reason && recommendation.reason !== recommendation.observation && <p className={styles.reason}>{recommendation.reason}</p>}
        {recommendation.challengeId && onStartChallenge ? <button type="button" className={styles.action} onClick={() => onStartChallenge(recommendation.challengeId!)}>Commencer un défi<WorkspaceIcon name="arrow" size={15}/></button>
                    : recommendation.skillId ? <Link href={`/skills/${recommendation.skillId}`} className={styles.action}>Voir la compétence<WorkspaceIcon name="arrow" size={15}/></Link> : null}
      </> : <p className={styles.loading}>Votre conseil est indisponible pour le moment. Actualisez pour réessayer.</p>}
  </section>;
}
