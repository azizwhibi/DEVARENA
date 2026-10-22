import type { TutorialStep } from './types';

export const guideCopy = {
  launcher: 'DevArena Guide',
  name: 'BYTE',
  invitation: 'Welcome to DevArena! I am BYTE. Ready for a quick tour?',
  start: 'Start',
  later: 'Later',
  back: 'Back',
  next: 'Next',
  skip: 'Skip tour',
  close: 'Close guide',
  finish: 'Finish',
  replay: 'Restart',
  resume: 'Resume',
  settings: 'Profile settings',
  loading: 'Opening section…',
  locating: 'Finding the target…',
  missing: 'This target is unavailable. You can continue the tour.',
  routeFailed: 'This section could not be opened. Retry or continue.',
  retry: 'Retry',
  motion: 'Animation',
  system: 'System preference',
  reduced: 'Still image',
  full: 'Gentle animation',
  progress: 'Step',
  of: 'of',
  optional: 'Optional tour',
  paused: 'Guide paused',
  fallback: 'BYTE, your DevArena guide',
  storage: 'The guide remains available without local storage.',
} as const;

export const tutorialSteps: readonly TutorialStep[] = [
  {
    id: 'overview',
    route: '/dashboard',
    title: 'Your dashboard',
    target: 'workspace-content',
    gesture: 'wave',
    description:
      'Track your measured progress. Skills and scores may be empty before your first assessment.',
  },
  {
    id: 'skills',
    route: '/my-skills',
    title: 'Your skills',
    target: 'nav-my-skills',
    gesture: 'point',
    description:
      'View your assigned skills and measured scores. Unassessed means no score is available yet.',
  },
  {
    id: 'technologies',
    route: '/discover',
    title: 'Technologies',
    target: 'nav-discover',
    gesture: 'explain',
    description:
      'Explore technologies and their associated skills. If the catalogue is unavailable, try again later.',
  },
  {
    id: 'challenges',
    route: '/arena',
    title: 'Technical challenges',
    target: 'nav-arena',
    gesture: 'point',
    description:
      'Choose a challenge to practice. This guide never starts challenges or submits answers.',
  },
  {
    id: 'library',
    route: '/knowledge',
    title: 'The library',
    target: 'nav-knowledge',
    gesture: 'explain',
    description:
      'Search published courses, tutorials, and documents. Results depend on available resources and your filters.',
  },
  {
    id: 'saved',
    route: '/knowledge/saved',
    title: 'Your saved resources',
    target: 'knowledge-saved',
    gesture: 'point',
    description:
      'Find resources you have saved. Completing a resource records your learning progress and does not change measured skill scores.',
  },
  {
    id: 'marketplace',
    route: '/marketplace',
    title: 'Marketplace',
    target: 'nav-marketplace',
    gesture: 'explain',
    description:
      'Browse published icons, animations, and hints. Find purchases in your inventory. Each purchase requires confirmation and uses your credits. This guide spends nothing.',
  },
  {
    id: 'battle',
    route: '/duel',
    title: 'Battle Code',
    target: 'nav-duel',
    gesture: 'point',
    description:
      'Join an online 1v1 quiz battle or practice with DevBot. Battle points stay separate from verified skill scores. The guide never joins a queue.',
  },
  {
    id: 'finish',
    route: '/marketplace',
    title: 'You are ready',
    target: 'profile-settings',
    gesture: 'celebrate',
    description:
      'Continue exploring or open your profile settings. BYTE remains available from the DevArena Guide button.',
  },
];
