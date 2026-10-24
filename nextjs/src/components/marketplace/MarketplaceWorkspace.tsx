'use client';
import { useSearchParams } from 'next/navigation';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
import { MarketplaceApp } from './MarketplaceApp';
export function MarketplaceWorkspace() {
  const account = useSkillsAccount();
  const params = useSearchParams();
  return (
    <MarketplaceApp
      key={account.id}
      userId={account.id}
      view={params.get('view') === 'inventory' ? 'inventory' : 'shop'}
    />
  );
}
