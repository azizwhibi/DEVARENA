'use client';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import React, { useState, useCallback } from 'react';
import { ChallengeModal } from '@/components/skills/arena/ChallengeModal';
import { ChallengeCategory } from '@/lib/skills/types';
interface ArenaChallenge {
    id: string;
    title: string;
    category: ChallengeCategory;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    timeEstimate: string;
    state: 'validated' | 'in_progress' | 'not_started';
    description: string;
}
const ALL_CHALLENGES: ArenaChallenge[] = [
    {
        id: 'ch-nest-1',
        title: 'Global Exception Filter avec formatage RFC-7807',
        category: 'Debugging',
        difficulty: 'medium',
        points: 80,
        timeEstimate: '5 min',
        state: 'validated',
        description: 'Capture toutes les HttpException et génère un payload de réponse standardisé avec timestamp et trace.',
    },
    {
        id: 'ch-ts-1',
        title: 'DeepPartial & DeepReadonly générique récursif',
        category: 'Logic',
        difficulty: 'medium',
        points: 70,
        timeEstimate: '4 min',
        state: 'validated',
        description: 'Construire un utilitaire de type qui rend tous les sous-objets optionnels et protégés contre les mutations.',
    },
    {
        id: 'ch-nest-3',
        title: 'Interceptor de logging de performance & métriques RxJS',
        category: 'Code Assembly',
        difficulty: 'medium',
        points: 90,
        timeEstimate: '6 min',
        state: 'in_progress',
        description: 'Calculer la durée de réponse via RxJS tap() et publier les alertes de latence > 500ms.',
    },
    {
        id: 'ch-sql-1',
        title: 'Optimisation de jointure latérale & index composite GIN',
        category: 'SQL',
        difficulty: 'hard',
        points: 130,
        timeEstimate: '8 min',
        state: 'not_started',
        description: 'Remplacer une sous-requête corrélée par un JOIN LATERAL et indexer les colonnes JSONB pour diviser le coût d’exécution par 10.',
    },
    {
        id: 'ch-trap-1',
        title: 'Neutralisation de Prompt Injection avec délimiteurs stricts',
        category: 'AI Trap',
        difficulty: 'hard',
        points: 120,
        timeEstimate: '7 min',
        state: 'not_started',
        description: 'Concevoir un garde-fou résistant à 5 vecteurs de bypass (jailbreak, role-switch, context leakage).',
    },
    {
        id: 'ch-ts-2',
        title: 'Parser de routes typées à partir de template literal types',
        category: 'Logic',
        difficulty: 'hard',
        points: 140,
        timeEstimate: '9 min',
        state: 'validated',
        description: 'Extraire les slugs de routing "/posts/:id/comments/:cid" en signature d’arguments fortement typée.',
    },
    {
        id: 'ch-nest-4',
        title: 'Custom Param Decorator @CurrentUser()',
        category: 'Code Assembly',
        difficulty: 'easy',
        points: 50,
        timeEstimate: '3 min',
        state: 'validated',
        description: 'Décorateur réutilisable extrayant l’entité utilisateur connectée depuis l’ExecutionContext.',
    },
];
export default function ArenaPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeChallenge, setActiveChallenge] = useState<ArenaChallenge | null>(null);
    const [challengeStates, setChallengeStates] = useState<Record<string, ArenaChallenge['state']>>({});
    const [scorePopup, setScorePopup] = useState<{
        challengeId: string;
        points: number;
    } | null>(null);
    const handleChallengeSuccess = useCallback((challenge: ArenaChallenge, points: number) => {
        // Mark the challenge as validated in local state
        setChallengeStates(prev => ({ ...prev, [challenge.id]: 'validated' }));
        // Show a floating score popup
        setScorePopup({ challengeId: challenge.id, points });
        setTimeout(() => setScorePopup(null), 3000);
        // Close modal
        setActiveChallenge(null);
    }, []);
    const categories = ['All', 'Debugging', 'Logic', 'Code Assembly', 'SQL', 'AI Trap'];
    const filteredChallenges = ALL_CHALLENGES.filter((ch) => {
        const matchesCategory = selectedCategory === 'All' || ch.category === selectedCategory;
        const matchesSearch = ch.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            ch.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });
    return <div className="page-container">
    <header className="page-header"><h1 className="page-title">Défis</h1><span className="badge">Entraînement non classé</span></header>
    <div className="toolbar"><div className="search-field"><WorkspaceIcon name="search" size={16}/><input className="input" aria-label="Rechercher un défi" placeholder="Rechercher un défi" value={searchQuery} onChange={event => setSearchQuery(event.target.value)}/></div>
      <div className="category-filters">{categories.map(category => <button type="button" key={category} className="btn btn-ghost" aria-pressed={selectedCategory === category} onClick={() => setSelectedCategory(category)}>{category === 'All' ? 'Tous' : category}</button>)}</div></div>
    {scorePopup && <div className="toast" role="status">Défi terminé · {scorePopup.points} points</div>}
    {!filteredChallenges.length && <p className="filter-empty">Aucun défi ne correspond à cette recherche.</p>}
    <div className="grid-3">{filteredChallenges.map(challenge => {
            const state = challengeStates[challenge.id] || challenge.state;
            const isValidated = state === 'validated';
            return <article key={challenge.id} className="card challenge-card"><div className="challenge-meta"><span>{challenge.category}</span><span>{challenge.difficulty === 'easy' ? 'Facile' : challenge.difficulty === 'medium' ? 'Intermédiaire' : 'Avancé'}</span></div>
        <h2>{challenge.title}</h2><p>{challenge.description}</p>
        <div className="challenge-footer"><span className="muted"><WorkspaceIcon name="clock" size={16}/>{challenge.timeEstimate}</span><button type="button" className="btn btn-secondary" onClick={() => setActiveChallenge(challenge)}>{isValidated ? 'Recommencer' : 'Commencer'}<WorkspaceIcon name="arrow" size={16}/></button></div>
      </article>;
        })}</div>
    {activeChallenge && <ChallengeModal challengeId={activeChallenge.id} challengeTitle={activeChallenge.title} category={activeChallenge.category} difficulty={activeChallenge.difficulty} points={activeChallenge.points} onClose={() => setActiveChallenge(null)} onSuccess={points => handleChallengeSuccess(activeChallenge, points)}/>}
  </div>;
}
