'use client';

import { useAuth } from '@/hooks/useAuth';
import { MarketplaceApp } from '@/components/marketplace/MarketplaceApp';

export function MarketplaceGate({ view }: { view: 'shop' | 'inventory' }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16" aria-busy="true">
        <p role="status" className="text-sm text-zinc-400">Chargement de la session…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-16">
        <h1 className="text-3xl font-bold tracking-tight">Marketplace</h1>
        <p className="mt-3 text-sm text-zinc-400">Connecte-toi pour ouvrir la boutique.</p>
      </main>
    );
  }

  return <MarketplaceApp userId={user.id} view={view} />;
}
