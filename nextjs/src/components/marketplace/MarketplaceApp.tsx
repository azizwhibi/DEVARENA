'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSkillsAccount } from '@/components/skills/SkillsWorkspace';
import { ItemDialog } from '@/components/marketplace/ItemDialog';
import {
  describeOffer,
  marketplaceApi,
  marketplaceMessage,
  type Inventory,
  type InventoryItem,
  type MarketplaceItem,
  type MarketplaceKind,
  type PurchaseResult,
} from '@/lib/marketplace/api';

const kindLabel = {
  icon: 'Icon',
  animation: 'Animation',
  hint: 'Hint',
} as const;
const detailButtonClass =
  'inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';
const actionButtonClass =
  'arena-btn inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';

function StatusPill({
  tone,
  children,
}: {
  tone: 'owned' | 'equipped';
  children: string;
}) {
  const toneClass =
    tone === 'equipped'
      ? 'border-green-700 bg-green-950 text-green-50'
      : 'border-zinc-600 bg-[#151925] text-zinc-100';
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-full border px-3 text-sm font-medium ${toneClass}`}
    >
      {children}
    </span>
  );
}
const filters: Array<{ id: 'all' | MarketplaceKind; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'icon', label: 'Icons' },
  { id: 'animation', label: 'Animations' },
  { id: 'hint', label: 'Hints' },
];

function messageOf(error: unknown): string {
  return marketplaceMessage(error);
}

export function MarketplaceApp({
  userId,
  view,
}: {
  userId: string;
  view: 'shop' | 'inventory';
}) {
  const [balance, setBalance] = useState<number | null>(null);
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [inventory, setInventory] = useState<Inventory | null>(null);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const admin = useSkillsAccount().role === 'admin';

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset pending UI when refreshing external Marketplace data
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [nextBalance, nextItems, nextInventory] = await Promise.all([
          marketplaceApi.getBalance(),
          marketplaceApi.listItems(),
          marketplaceApi.getInventory(),
        ]);
        if (cancelled) return;
        setBalance(nextBalance);
        setItems(nextItems);
        setInventory(nextInventory);
        window.dispatchEvent(
          new CustomEvent('marketplace-equipped', {
            detail: { preview: nextInventory.equipped.icon?.preview ?? null },
          }),
        );
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
    setItems((current) =>
      current.map((item) => (item.id === result.item.id ? result.item : item)),
    );
    setReloadKey((key) => key + 1);
  }

  function applyInventory(next: Inventory) {
    setInventory(next);
    setItems((current) =>
      current.map(
        (item) =>
          next.items.find((owned) => owned.id === item.id) ?? {
            ...item,
            equipped: false,
          },
      ),
    );
    window.dispatchEvent(
      new CustomEvent('marketplace-equipped', {
        detail: { preview: next.equipped.icon?.preview ?? null },
      }),
    );
  }

  async function wear(itemId: string) {
    setError(null);
    try {
      applyInventory(await marketplaceApi.equip(itemId));
    } catch (caught) {
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

  const visible = items.filter(
    (item) => filter === 'all' || item.kind === filter,
  );
  const tabClass = (current: boolean) =>
    `inline-flex min-h-11 items-center rounded-lg px-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${current ? 'bg-primary/15 font-semibold text-violet-200 ring-1 ring-violet-400/30' : 'border border-zinc-700 hover:bg-[#151925]'}`;

  return (
    <div
      data-marketplace
      data-tour="marketplace-catalogue"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 py-8 sm:py-10"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-mono text-xs tracking-widest text-[#C4B5FD]">
            SHOP
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Marketplace
          </h1>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <p
            aria-live="polite"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-primary/60 bg-[#0F141D] px-4 text-sm font-semibold text-zinc-100"
          >
            {balance === null ? (
              'Loading balance…'
            ) : (
              <>
                <span className="font-mono text-lg text-[#C4B5FD]">
                  {balance}
                </span>{' '}
                credits
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            {admin ? (
              <Link
                href="/admin/marketplace"
                className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
              >
                Manage items
              </Link>
            ) : null}
          </div>
        </div>
      </header>
      <nav aria-label="Marketplace views" className="flex flex-wrap gap-2">
        <Link
          href="/marketplace"
          aria-current={view === 'shop' ? 'page' : undefined}
          className={tabClass(view === 'shop')}
        >
          Shop
        </Link>
        <Link
          href="/marketplace?view=inventory"
          aria-current={view === 'inventory' ? 'page' : undefined}
          className={tabClass(view === 'inventory')}
        >
          Inventory
        </Link>
      </nav>

      {error ? (
        <div role="alert" className="text-sm text-red-200">
          {error}{' '}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      ) : null}
      {loading ? (
        <p role="status" aria-busy="true" className="text-sm text-zinc-400">
          Loading shop…
        </p>
      ) : null}

      {!loading && view === 'shop' ? (
        <section aria-labelledby="shop-title" className="flex flex-col gap-4">
          <h2 id="shop-title" className="sr-only">
            Items for sale
          </h2>
          <div
            role="group"
            aria-label="Filter by type"
            className="flex flex-wrap gap-2"
          >
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
          {visible.length === 0 ? <p>No items in this category.</p> : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => {
              const offer =
                balance === null ? null : describeOffer(item, balance);
              return (
                <li key={item.id}>
                  <article className="arena-card flex h-full flex-col gap-3 rounded-2xl border border-[#252C3A] bg-card p-5">
                    <span
                      className="flex h-16 items-center justify-center rounded-xl bg-[#090C11] font-mono text-2xl text-[#C4B5FD]"
                      aria-hidden="true"
                    >
                      {item.preview}
                    </span>
                    <span className="font-mono text-xs tracking-widest text-muted-foreground">
                      {kindLabel[item.kind]}
                    </span>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm text-zinc-400">
                      {item.price_credits} credits
                    </p>
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {offer?.state === 'buy' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedId(item.id)}
                          className={actionButtonClass}
                        >
                          Buy
                        </button>
                      ) : null}
                      {offer?.state === 'insufficient' ? (
                        <p className="text-sm text-zinc-300">
                          Missing {offer.missing_credits} credits
                        </p>
                      ) : null}
                      {offer?.state === 'owned' ? (
                        <StatusPill tone="owned">Owned</StatusPill>
                      ) : null}
                      {offer?.state === 'equipped' ? (
                        <StatusPill tone="equipped">Equipped</StatusPill>
                      ) : null}
                      {offer?.state === 'archived' ? (
                        <p className="text-sm text-zinc-300">Removed</p>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setSelectedId(item.id)}
                        className={detailButtonClass}
                      >
                        Details
                      </button>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {!loading && view === 'inventory' && inventory ? (
        <section
          aria-labelledby="inventory-title"
          className="flex flex-col gap-5"
        >
          <h2 id="inventory-title" className="text-xl font-semibold">
            Inventory
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <EquippedSlot
              label="Equipped icon"
              item={inventory.equipped.icon}
              onRemove={() => void remove('icon')}
            />
            <EquippedSlot
              label="Equipped animation"
              item={inventory.equipped.animation}
              onRemove={() => void remove('animation')}
            />
          </div>
          {inventory.items.length === 0 ? (
            <p>Your inventory is empty.</p>
          ) : null}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {inventory.items.map((item: InventoryItem) => {
              const slot =
                item.kind === 'icon' || item.kind === 'animation'
                  ? item.kind
                  : null;
              return (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-[#252C3A] bg-card p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{item.title}</h3>
                    <span className="font-mono text-xs text-muted-foreground">
                      {kindLabel[item.kind]}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">{item.description}</p>
                  <p className="text-sm text-zinc-400">
                    Paid {item.price_paid} credits
                  </p>
                  {item.status === 'archived' ? (
                    <p className="text-sm text-accent">
                      Removed from the shop. Still available in your inventory.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2">
                    {slot ? (
                      item.equipped ? (
                        <button
                          type="button"
                          onClick={() => void remove(slot)}
                          className={actionButtonClass}
                        >
                          Remove
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void wear(item.id)}
                          className={actionButtonClass}
                        >
                          Equip
                        </button>
                      )
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={detailButtonClass}
                    >
                      Details
                    </button>
                    {item.equipped ? (
                      <StatusPill tone="equipped">Equipped</StatusPill>
                    ) : (
                      <StatusPill tone="owned">Owned</StatusPill>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {selectedId && balance !== null ? (
        <ItemDialog
          key={selectedId}
          itemId={selectedId}
          balance={balance}
          onClose={() => setSelectedId(null)}
          onPurchased={applyPurchase}
          onInventory={applyInventory}
        />
      ) : null}
    </div>
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
    <article className="rounded-2xl border border-[#252C3A] bg-[#090C11] p-5">
      <h3 className="font-mono text-xs tracking-widest text-muted-foreground">
        {label}
      </h3>
      {item ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p>
            <span className="font-mono text-[#C4B5FD]" aria-hidden="true">
              {item.preview}{' '}
            </span>
            {item.title}
          </p>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Remove
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-400">No equipped items.</p>
      )}
    </article>
  );
}
