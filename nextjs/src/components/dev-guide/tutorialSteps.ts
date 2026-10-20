import type { TutorialStep } from './types';

export const guideCopy = {
  launcher: 'Guide DevArena', name: 'BYTE', invitation: 'Bienvenue sur DevArena ! Je suis BYTE. On fait le tour ?',
  start: 'Commencer', later: 'Plus tard', back: 'Retour', next: 'Suivant', skip: 'Passer le tutoriel', close: 'Fermer le guide',
  finish: 'Terminer', replay: 'Recommencer', resume: 'Reprendre', settings: 'Paramètres du profil',
  loading: 'Ouverture de la section…', locating: 'Recherche du repère…', missing: 'Le repère est indisponible. Vous pouvez poursuivre le tour.',
  routeFailed: 'La section ne s’est pas ouverte. Réessayez ou passez à la suite.', retry: 'Réessayer',
  motion: 'Animation', system: 'Selon le système', reduced: 'Image fixe', full: 'Animation douce',
  progress: 'Étape', of: 'sur', optional: 'Visite facultative', paused: 'Guide en pause',
  fallback: 'BYTE, votre guide DevArena', storage: 'Le guide reste utilisable sans stockage local.',
} as const;

export const tutorialSteps: readonly TutorialStep[] = [
  { id: 'overview', route: '/dashboard', title: 'Votre tableau de bord', target: 'workspace-content', gesture: 'wave', description: 'Retrouvez votre progression réelle. Sans défi terminé, les compétences et les scores peuvent encore être vides.' },
  { id: 'skills', route: '/my-skills', title: 'Vos compétences', target: 'nav-my-skills', gesture: 'point', description: 'Consultez vos compétences et leurs scores mesurés. « Non évaluée » signifie qu’aucun score n’est encore disponible.' },
  { id: 'technologies', route: '/discover', title: 'Les technologies', target: 'nav-discover', gesture: 'explain', description: 'Explorez les technologies et leurs compétences associées. Si le catalogue est vide ou ne se charge pas, revenez plus tard.' },
  { id: 'challenges', route: '/arena', title: 'Les défis techniques', target: 'nav-arena', gesture: 'point', description: 'Choisissez vous-même un défi pour vous entraîner. Ce guide ne lance aucun défi et ne soumet aucune réponse.' },
  { id: 'coach', route: '/coach', title: 'Votre Coach IA', target: 'nav-coach', gesture: 'think', description: 'Le coach analyse les informations disponibles pour proposer une prochaine étape. Ses conseils dépendent des compétences et des scores déjà mesurés.' },
  { id: 'library', route: '/knowledge', title: 'La bibliothèque', target: 'nav-knowledge', gesture: 'explain', description: 'Recherchez des cours, tutoriels et documents publiés. Les résultats dépendent des ressources disponibles et de vos filtres.' },
  { id: 'saved', route: '/knowledge/saved', title: 'Vos ressources enregistrées', target: 'knowledge-saved', gesture: 'point', description: 'Retrouvez les ressources que vous avez enregistrées. Terminer une ressource indique votre apprentissage déclaré : cela ne modifie pas les scores techniques mesurés.' },
  { id: 'marketplace', route: '/marketplace', title: 'La Marketplace', target: 'nav-marketplace', gesture: 'explain', description: 'La Marketplace n’a actuellement aucune offre disponible. Aucun achat ni dépense de crédits n’est effectué pendant cette visite.' },
  { id: 'finish', route: '/marketplace', title: 'À vous de jouer', target: 'profile-settings', gesture: 'celebrate', description: 'Le tour est terminé. Poursuivez votre exploration ou ouvrez les paramètres de votre profil. BYTE reste disponible depuis le bouton Guide DevArena.' },
];
