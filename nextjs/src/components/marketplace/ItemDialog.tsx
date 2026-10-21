'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { EquippedMotion } from '@/components/marketplace/EquippedBadge';
import {
  describeOffer,
  marketplaceApi,
  marketplaceMessage,
  type Inventory,
  type MarketplaceItem,
  type PurchaseResult,
} from '@/lib/marketplace/api';

function messageOf(error: unknown): string {
  return marketplaceMessage(error);
}

const kindLabel = { icon: 'Icône', animation: 'Animation', hint: 'Indice' } as const;

export function ItemDialog({
  itemId,
  balance,
  onClose,
  onPurchased,
  onInventory,
}: {
  itemId: string;
  balance: number;
  onClose: () => void;
  onPurchased: (result: PurchaseResult) => void;
  onInventory: (inventory: Inventory) => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [item, setItem] = useState<MarketplaceItem | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PurchaseResult | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [motionToken, setMotionToken] = useState(0);
  const playedMotion = useRef<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    const onCancel = (event: Event) => {
      event.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', onCancel);
    return () => dialog.removeEventListener('cancel', onCancel);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    setItem(null);
    setError(null);
    setResult(null);
    setHint(null);
    void marketplaceApi.getItem(itemId).then(
      (next) => {
        if (!cancelled) setItem(next);
      },
      (caught: unknown) => {
        if (!cancelled) setError(messageOf(caught));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  useEffect(() => {
    if (!item || item.kind !== 'animation' || !item.equipped) return;
    if (playedMotion.current === item.id) return;
    playedMotion.current = item.id;
    setMotionToken((token) => token + 1);
  }, [item]);

  async function buy() {
    setPending(true);
    setError(null);
    try {
      const purchase = await marketplaceApi.purchase(itemId);
      setResult(purchase);
      setItem(purchase.item);
      if (purchase.hint_content) setHint(purchase.hint_content);
      onPurchased(purchase);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  async function equip() {
    setPending(true);
    setError(null);
    try {
      const inventory = await marketplaceApi.equip(itemId);
      onInventory(inventory);
      const next = inventory.items.find((entry) => entry.id === itemId);
      if (next) setItem(next);
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  async function readHint() {
    setPending(true);
    setError(null);
    try {
      setHint(await marketplaceApi.getHintContent(itemId));
    } catch (caught) {
      setError(messageOf(caught));
    } finally {
      setPending(false);
    }
  }

  const offer = item ? describeOffer(item, balance) : null;
  const canEquip = item && (item.kind === 'icon' || item.kind === 'animation') && (offer?.state === 'owned' || offer?.state === 'equipped');

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(100%-2rem,32rem)] rounded-2xl border border-zinc-800 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-zinc-950/80"
    >
      <div className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold">{item?.title ?? 'Article'}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-700 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Fermer
          </button>
        </div>
        {!item && !error ? <p role="status" className="text-sm text-zinc-400">Chargement…</p> : null}
        {item ? (
          <>
            <p className="flex h-24 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 font-mono text-3xl text-primary">
              <EquippedMotion
                preview={item.preview}
                animationKey={item.kind === 'animation' && item.equipped ? item.animation_key : undefined}
                playToken={item.kind === 'animation' && item.equipped ? motionToken : 0}
              />
            </p>
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              {kindLabel[item.kind]} · {item.price_credits} crédits
              {item.status === 'archived' ? ' · retiré' : ''}
            </p>
            <p className="text-sm leading-6 text-zinc-300">{item.description}</p>
            {item.challenge_title ? (
              <p className="text-sm text-zinc-400">Défi : {item.challenge_title}</p>
            ) : null}
            {result?.already_owned ? <p role="status">Tu possèdes déjà cet article. Aucun crédit n’a été retiré.</p> : null}
            {hint ? (
              <p role="status" className="rounded-xl border border-primary/40 bg-zinc-900 p-4 text-sm leading-6">
                {hint}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {offer?.state === 'buy' ? (
                <button type="button" onClick={() => void buy()} disabled={pending} className="arena-btn inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-zinc-950 hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">
                  {pending ? 'Achat…' : 'Acheter'}
                </button>
              ) : null}
              {offer?.state === 'insufficient' ? (
                <button type="button" disabled className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 text-zinc-400">
                  Il manque {offer.missing_credits} crédits
                </button>
              ) : null}
              {offer?.state === 'archived' && !item.owned ? (
                <p>Article retiré de la boutique.</p>
              ) : null}
              {item.kind === 'hint' && item.owned ? (
                <button type="button" onClick={() => void readHint()} disabled={pending} className="arena-btn inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">
                  Lire l’indice
                </button>
              ) : null}
              {canEquip && offer?.state === 'owned' ? (
                <button type="button" onClick={() => void equip()} disabled={pending} className="arena-btn inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">
                  Équiper
                </button>
              ) : null}
              {offer?.state === 'equipped' ? <p role="status" className="inline-flex min-h-8 items-center rounded-full border border-green-700 bg-green-950 px-3 text-sm font-medium text-green-50">Équipé</p> : null}
              {offer?.state === 'owned' && item.kind === 'hint' ? <p className="inline-flex min-h-8 items-center rounded-full border border-zinc-600 bg-zinc-800 px-3 text-sm font-medium text-zinc-100">Possédé</p> : null}
            </div>
          </>
        ) : null}
        {error ? <p role="alert" className="text-sm text-red-200">{error}</p> : null}
      </div>
    </dialog>
  );
}
