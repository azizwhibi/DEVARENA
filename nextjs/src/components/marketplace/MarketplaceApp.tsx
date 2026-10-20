'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';
import { ItemDialog } from '@/components/marketplace/ItemDialog';
import {
  describeOffer,
  isMarketplaceMock,
  marketplaceApi,
  marketplaceDemo,
  marketplaceMessage,
  type Inventory,
  type InventoryItem,
  type MarketplaceItem,
  type MarketplaceKind,
  type PurchaseResult,
} from '@/lib/marketplace/api';

const kindLabel = { icon: 'Icône', animation: 'Animation', hint: 'Indice' } as const;
const filters: Array<{ id: 'all' | MarketplaceKind; label: string }> = [
  { id: 'all', label: 'Tout' },
  { id: 'icon', label: 'Icônes' },
  { id: 'animation', label: 'Animations' },
  { id: 'hint', label: 'Indices' },
];

function messageOf(error: unknown): string {
  return marketplaceMessage(error);
}

export function MarketplaceApp({ userId, view }: { userId: string; view: 'shop' | 'inventory' }) {
  const [balance, setBalance] = useState<number | null>(null);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [admin, setAdmin] = useState(false);
  const [faults, setFaults] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void apiRequest<AuthUser>('/me')
      .then((me) => {
        if (!cancelled) setAdmin(me.role === 'admin');
      })
      .catch(() => {
        if (!cancelled) setAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        if (isMarketplaceMock()) await marketplaceDemo.bindUser(userId);
        const [nextBalance, nextItems, nextInventory] = await Promise.all([
          marketplaceApi.getBalance(),
          marketplaceApi.listItems(),
          marketplaceApi.getInventory(),
        ]);
        if (cancelled) return;
        setBalance(nextBalance);
        setItems(nextItems);
        setInventory(nextInventory);
      } catch (caught) {
        if (!cancelled) setError(messageOf(caught));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  function applyPurchase(result: PurchaseResult) {
    setBalance(result.credits_balance);
    setItems((current) => current.map((item) => (item.id === result.item.id ? result.item : item)));
    setReloadKey((key) => key + 1);
  }

  function applyInventory(next: Inventory) {
    setInventory(next);
    setItems((current) => current.map((item) => next.items.find((owned) => owned.id === item.id) ?? { ...item, equipped: false }));
  }

  async function reset() {
    setResetting(true);
    setNotice(null);
    try {
      await marketplaceDemo.resetDemo();
      setSelectedId(null);
      setReloadKey((key) => key + 1);
      setNotice('Démo réinitialisée.');
    } catch (caught) {
      setNotice(messageOf(caught));
    } finally {
      setResetting(false);
    }
  }

  async function toggleFaults() {
    const next = !faults;
    setFaults(next);
    try {
      await marketplaceDemo.setNetworkErrors(next);
    } catch (caught) {
      setFaults(!next);
      setError(messageOf(caught));
    }
  }

  async function remove(slot: 'icon' | 'animation') {
    setError(null);
    try {
      applyInventory(await marketplaceApi.unequip(slot));
    } catch (caught) {
      setError(messageOf(caught));
    }
  }

  const visible = items.filter((item) => filter === 'all' || item.kind === filter);
  const tabClass = (current: boolean) =>
    `inline-flex min-h-11 items-center rounded-lg px-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${current ? 'bg-primary font-semibold text-zinc-950' : 'border border-zinc-700 hover:bg-zinc-800'}`;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:py-10">
      {isMarketplaceMock() ? (
        <p role="status" className="arena-card rounded-xl border border-zinc-700 bg-card px-4 py-3 text-sm text-accent">
          Données de démonstration
        </p>
      ) : null}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-primary">BOUTIQUE</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Marketplace</h1>
          <p className="mt-2 text-sm text-zinc-400" aria-live="polite">
            {balance === null ? 'Solde…' : `${balance} crédits`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {admin ? (
            <Link href="/admin/marketplace" className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
              Gérer les articles
            </Link>
          ) : null}
          {isMarketplaceMock() ? (
            <button type="button" onClick={() => void reset()} disabled={resetting} className="arena-btn inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">
              {resetting ? 'Réinitialisation…' : 'Réinitialiser la démo'}
            </button>
          ) : null}
        </div>
      </header>
      <nav aria-label="Vues de la marketplace" className="flex flex-wrap gap-2">
        <Link href="/marketplace" aria-current={view === 'shop' ? 'page' : undefined} className={tabClass(view === 'shop')}>Boutique</Link>
        <Link href="/marketplace?view=inventory" aria-current={view === 'inventory' ? 'page' : undefined} className={tabClass(view === 'inventory')}>Inventaire</Link>
      </nav>
      {isMarketplaceMock() ? (
        <label className="flex min-h-11 w-fit items-center gap-3 text-sm text-zinc-300">
          <input type="checkbox" checked={faults} onChange={() => void toggleFaults()} className="size-4 accent-primary" />
          Simuler des erreurs réseau
        </label>
      ) : null}
      {notice ? <p role="status">{notice}</p> : null}
      {error ? <p role="alert" className="text-sm text-red-200">{error}</p> : null}
      {loading ? <p role="status" aria-busy="true" className="text-sm text-zinc-400">Chargement de la boutique…</p> : null}

      {!loading && view === 'shop' ? (
        <section aria-labelledby="shop-title" className="flex flex-col gap-4">
          <h2 id="shop-title" className="sr-only">Articles en vente</h2>
          <div role="group" aria-label="Filtrer par type" className="flex flex-wrap gap-2">
            {filters.map((entry) => (
              <button
                key={entry.id}
                type="button"
                aria-pressed={filter === entry.id}
                onClick={() => setFilter(entry.id)}
                className={tabClass(filter === entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {visible.length === 0 ? <p>Aucun article dans cette catégorie.</p> : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => {
              const offer = balance === null ? null : describeOffer(item, balance);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className="arena-card flex h-full w-full flex-col gap-3 rounded-2xl border border-zinc-800 bg-card p-5 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  >
                    <span className="flex h-16 items-center justify-center rounded-xl bg-zinc-950 font-mono text-2xl text-primary" aria-hidden="true">{item.preview}</span>
                    <span className="font-mono text-xs tracking-widest text-muted-foreground">{kindLabel[item.kind]}</span>
                    <span className="text-lg font-semibold">{item.title}</span>
                    <span className="text-sm text-zinc-400">{item.price_credits} crédits</span>
                    <span className="text-sm text-primary">
                      {offer?.state === 'buy' ? 'Acheter' : null}
                      {offer?.state === 'insufficient' ? `Il manque ${offer.missing_credits} crédits` : null}
                      {offer?.state === 'owned' ? 'Possédé' : null}
                      {offer?.state === 'equipped' ? 'Équipé' : null}
                      {offer?.state === 'archived' ? 'Retiré' : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!loading && view === 'inventory' && inventory ? (
        <section aria-labelledby="inventory-title" className="flex flex-col gap-5">
          <h2 id="inventory-title" className="text-xl font-semibold">Inventaire</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EquippedSlot label="Icône équipée" item={inventory.equipped.icon} onRemove={() => void remove('icon')} />
            <EquippedSlot label="Animation équipée" item={inventory.equipped.animation} onRemove={() => void remove('animation')} />
          </div>
          {inventory.items.length === 0 ? <p>Tu n’as encore rien acheté.</p> : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {inventory.items.map((item: InventoryItem) => (
              <li key={item.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-800 bg-card p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold">{item.title}</h3>
                  <span className="font-mono text-xs text-muted-foreground">{kindLabel[item.kind]}</span>
                </div>
                <p className="text-sm text-zinc-400">{item.description}</p>
                <p className="text-sm text-zinc-400">Payé {item.price_paid} crédits</p>
                {item.status === 'archived' ? <p className="text-sm text-accent">Retiré de la boutique, toujours dans ton inventaire.</p> : null}
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setSelectedId(item.id)} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                    Détail
                  </button>
                  {item.equipped ? <span className="inline-flex min-h-11 items-center text-sm text-primary">Équipé</span> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {selectedId && balance !== null ? (
        <ItemDialog
          itemId={selectedId}
          balance={balance}
          onClose={() => setSelectedId(null)}
          onPurchased={applyPurchase}
          onInventory={applyInventory}
        />
      ) : null}
    </main>
  );
}

function EquippedSlot({
  label,
  item,
  onRemove,
}: {
  label: string;
  item: MarketplaceItem | null;
  onRemove: () => void;
}) {
  return (
    <article className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
      <h3 className="font-mono text-xs tracking-widest text-muted-foreground">{label}</h3>
      {item ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p><span className="font-mono text-primary" aria-hidden="true">{item.preview} </span>{item.title}</p>
          <button type="button" onClick={onRemove} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
            Retirer
          </button>
        </div>
      ) : <p className="mt-3 text-sm text-zinc-400">Aucun article équipé.</p>}
    </article>
  );
}
