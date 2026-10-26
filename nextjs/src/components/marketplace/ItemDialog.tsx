'use client';

import { useMarketplaceOnline } from './useMarketplaceOnline';
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

const kindLabel = {
  icon: 'Icon',
  animation: 'Animation',
  hint: 'Hint',
} as const;

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
  const online = useMarketplaceOnline();
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset protected details before loading a different remote item
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
    if (!navigator.onLine || pending) return;
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
  const canEquip =
    item &&
    (item.kind === 'icon' || item.kind === 'animation') &&
    (offer?.state === 'owned' || offer?.state === 'equipped');

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      className="w-[min(calc(100%_-_2rem),32rem)] rounded-2xl border border-[#252C3A] bg-[#090C11] p-0 text-zinc-100 shadow-2xl backdrop:bg-[#090C11]"
    >
      <div
        data-marketplace
        className="flex max-h-[85vh] flex-col gap-4 overflow-y-auto p-5 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold">
            {item?.title ?? 'Article'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-zinc-700 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            Close
          </button>
        </div>
        {!item && !error ? (
          <p role="status" className="text-sm text-zinc-400">
            Loading…
          </p>
        ) : null}
        {item ? (
          <>
            <p className="flex h-24 items-center justify-center rounded-xl border border-[#252C3A] bg-[#0F141D] font-mono text-3xl text-[#C4B5FD]">
              <EquippedMotion
                preview={item.preview}
                animationKey={
                  item.kind === 'animation' && item.equipped
                    ? item.animation_key
                    : undefined
                }
                playToken={
                  item.kind === 'animation' && item.equipped ? motionToken : 0
                }
                large
              />
            </p>
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              {kindLabel[item.kind]} · {item.price_credits} credits
              {item.status === 'archived' ? ' · removed' : ''}
            </p>
            <p className="text-sm leading-6 text-zinc-300">
              {item.description}
            </p>
            {item.challenge_title ? (
              <p className="text-sm text-zinc-400">
                Challenge: {item.challenge_title}
              </p>
            ) : null}
            {result?.already_owned ? (
              <p role="status">
                You already own this item. No credits were deducted.
              </p>
            ) : null}
            {hint ? (
              <p
                role="status"
                className="rounded-xl border border-primary/40 bg-[#0F141D] p-4 text-sm leading-6"
              >
                {hint}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-3">
              {offer?.state === 'buy' ? (
                <button
                  type="button"
                  onClick={() => void buy()}
                  disabled={pending || !online}
                  className="arena-btn inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-semibold text-white hover:bg-primary/80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60"
                >
                  {pending ? 'Purchasing…' : 'Confirm purchase'}
                </button>
              ) : null}
              {offer?.state === 'insufficient' ? (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-11 items-center rounded-lg border border-zinc-700 px-4 text-zinc-400"
                >
                  Missing {offer.missing_credits} credits
                </button>
              ) : null}
              {offer?.state === 'archived' && !item.owned ? (
                <p>This item was removed from the shop.</p>
              ) : null}
              {item.kind === 'hint' && item.owned ? (
                <button
                  type="button"
                  onClick={() => void readHint()}
                  disabled={pending}
                  className="arena-btn inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60"
                >
                  Read hint
                </button>
              ) : null}
              {canEquip && offer?.state === 'owned' ? (
                <button
                  type="button"
                  onClick={() => void equip()}
                  disabled={pending}
                  className="arena-btn inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-4 hover:bg-[#151925] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60"
                >
                  Equip
                </button>
              ) : null}
              {offer?.state === 'equipped' ? (
                <p
                  role="status"
                  className="inline-flex min-h-8 items-center rounded-full border border-green-700 bg-green-950 px-3 text-sm font-medium text-green-50"
                >
                  Equipped
                </p>
              ) : null}
              {offer?.state === 'owned' && item.kind === 'hint' ? (
                <p className="inline-flex min-h-8 items-center rounded-full border border-zinc-600 bg-[#151925] px-3 text-sm font-medium text-zinc-100">
                  Owned
                </p>
              ) : null}
            </div>
          </>
        ) : null}
        {!online && (
          <p role="status">You are offline. Reconnect, then retry.</p>
        )}
        {error ? (
          <p role="alert" className="text-sm text-red-200">
            {error}
          </p>
        ) : null}
      </div>
    </dialog>
  );
}
