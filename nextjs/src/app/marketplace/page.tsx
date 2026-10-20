import type { Metadata } from 'next';
import { MarketplaceGate } from '@/components/marketplace/MarketplaceGate';

export const metadata: Metadata = { title: 'Marketplace | DevArena' };

type MarketplacePageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

export default async function MarketplacePage({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  return <MarketplaceGate view={view === 'inventory' ? 'inventory' : 'shop'} />;
}
