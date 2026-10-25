'use client';
import { usePathname } from 'next/navigation';
import { SkillsWorkspace } from '@/components/skills/SkillsWorkspace';

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const workspace = [
    '/dashboard',
    '/my-skills',
    '/skills',
    '/discover',
    '/arena',
    '/duel',
    '/knowledge',
    '/community',
    '/marketplace',
    '/profile',
    '/admin',
    '/recruiter',
  ].some((path) => pathname === path || pathname.startsWith(path + '/'));
  return workspace ? <SkillsWorkspace>{children}</SkillsWorkspace> : children;
}
