export type LearningPlatform = {
  id: string;
  name: string;
  logoSrc: string;
  logoWidth: number;
  logoHeight: number;
  href: string;
  relationship: 'confirmed-partner' | 'prospective-platform';
};

// Add real entries here. Change relationship only after a partnership is confirmed.
export const learningPlatforms: readonly LearningPlatform[] = [
  {
    id: 'coursera',
    name: 'Coursera',
    logoSrc: '/images/partners/coursera.png',
    logoWidth: 1446,
    logoHeight: 467,
    href: 'https://www.coursera.org/',
    relationship: 'prospective-platform',
  },
  {
    id: 'edx',
    name: 'edX',
    logoSrc: '/images/partners/edx-white.png',
    logoWidth: 597,
    logoHeight: 312,
    href: 'https://www.edx.org/',
    relationship: 'prospective-platform',
  },
  {
    id: 'udemy',
    name: 'Udemy',
    logoSrc: '/images/partners/udemy.png',
    logoWidth: 910,
    logoHeight: 340,
    href: 'https://www.udemy.com/',
    relationship: 'prospective-platform',
  },
  {
    id: 'codecademy',
    name: 'Codecademy',
    logoSrc: '/images/partners/codecademy-transparent.png',
    logoWidth: 1020,
    logoHeight: 217,
    href: 'https://www.codecademy.com/',
    relationship: 'prospective-platform',
  },
  {
    id: 'udacity',
    name: 'Udacity',
    logoSrc: '/images/partners/udacity.png',
    logoWidth: 240,
    logoHeight: 240,
    href: 'https://www.udacity.com/',
    relationship: 'prospective-platform',
  },
];
