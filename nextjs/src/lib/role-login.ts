import { safeNext } from '@/lib/safe-next';
import type { AuthUser } from './api-core';

export interface DemoAccount {
  role: 'admin' | 'recruiter' | 'developer';
  label: string;
  email: string;
  password: string;
  badge: string;
  target: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'admin',
    label: 'Sign in as Admin',
    email: 'admin@devarena.test',
    password: 'DevArenaAdmin2026!',
    badge: 'Moderation & Roles',
    target: '/admin/users',
  },
  {
    role: 'recruiter',
    label: 'Sign in as Recruiter',
    email: 'recruiter@devarena.test',
    password: 'DevArenaRecruiter2026!',
    badge: 'Candidate Hub',
    target: '/recruiter',
  },
  {
    role: 'developer',
    label: 'Sign in as Developer',
    email: 'developer@devarena.test',
    password: 'DevArenaDev2026!',
    badge: 'Coding Arena',
    target: '/profile',
  },
];

export async function resolveRoleDestination(
  rawNext: string | undefined | null,
  fetchRole?: () => Promise<AuthUser['role'] | undefined>,
): Promise<string> {
  const safe = safeNext(rawNext);
  if (safe !== '/') {
    return safe;
  }
  if (!fetchRole) return '/';
  try {
    const role = await fetchRole();
    if (role === 'admin') return '/admin/users';
    if (role === 'recruiter') return '/recruiter';
    if (role === 'developer') return '/profile';
    return '/';
  } catch {
    return '/';
  }
}
