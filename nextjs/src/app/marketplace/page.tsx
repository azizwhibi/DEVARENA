import { Suspense } from 'react';
import type { Metadata } from 'next';
import { MarketplaceGate } from '@/components/marketplace/MarketplaceGate';
import { isMarketplaceOpen } from '@/lib/marketplace/flags';

export const metadata: Metadata = { title: 'Marketplace | DevArena' };

type MarketplacePageProps = {
  searchParams: Promise<{ view?: string | string[] }>;
};

async function MarketplaceContent({ searchParams }: MarketplacePageProps) {
  const params = await searchParams;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  return <MarketplaceGate view={view === 'inventory' ? 'inventory' : 'shop'} />;
}

export default function MarketplacePage(props: MarketplacePageProps) {
  if (!isMarketplaceOpen()) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Bientôt disponible</h1>
      </main>
    );
  }
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16" aria-busy="true">
          <p role="status" className="text-sm text-zinc-400">Chargement de la session…</p>
        </main>
      }
    >
      <MarketplaceContent {...props} />
    </Suspense>
  );
}
