'use client';
import { usePathname } from 'next/navigation';
import { SkillsWorkspace } from '@/components/skills/SkillsWorkspace';
import { useAccount } from '@/components/AccountProvider';
import { RankPromotionToast } from '@/components/rankings/RankPromotionToast';

export function ApplicationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { account } = useAccount();
  const workspace = [
    '/dashboard',
    '/my-skills',
    '/skills',
    '/discover',
    '/arena',
    '/duel',
    '/rankings',
    '/knowledge',
    '/marketplace',
    '/profile',
    '/admin',
    '/recruiter',
    '/invitations',
    '/messages',
  ].some((path) => pathname === path || pathname.startsWith(path + '/'));
  return <>
    {pathname === '/rankings' && !account ? <div className="skills-workspace">{children}</div> : workspace ? <SkillsWorkspace>{children}</SkillsWorkspace> : children}
    {account && <RankPromotionToast key={account.id} />}
  </>;
}
