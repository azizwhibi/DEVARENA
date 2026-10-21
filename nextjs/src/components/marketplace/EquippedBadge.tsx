'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { isMarketplaceMock, isMarketplaceOpen, marketplaceApi, marketplaceDemo } from '@/lib/marketplace/api';
import type { MarketplaceItem } from '@/lib/marketplace/types';

const MOTION: Record<string, string> = {
  scanline: 'equipped-scan',
  pulse: 'equipped-pulse',
  matrix: 'equipped-matrix',
  confetti: 'equipped-drift',
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(media.matches);
    apply();
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, []);
  return reduced;
}

export function EquippedMotion({
  preview,
  animationKey,
  playToken,
}: {
  preview: string;
  animationKey?: string;
  playToken: number;
}) {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (playToken === 0 || reduced || !animationKey) return;
    setRunning(true);
    const timer = window.setTimeout(() => setRunning(false), 3000);
    return () => window.clearTimeout(timer);
  }, [playToken, reduced, animationKey]);
  const name = animationKey ? MOTION[animationKey] ?? 'equipped-pulse' : undefined;
  return (
    <>
      <style>{`
        @keyframes equipped-scan { from { transform: translateY(6px); opacity: 0.45; } to { transform: translateY(-6px); opacity: 1; } }
        @keyframes equipped-pulse { 0%, 100% { transform: scale(1); opacity: 0.75; } 50% { transform: scale(1.12); opacity: 1; } }
        @keyframes equipped-matrix { from { opacity: 0.35; } to { opacity: 1; letter-spacing: 0.12em; } }
        @keyframes equipped-drift { from { transform: translateY(0); } to { transform: translateY(-8px); opacity: 0.55; } }
        @media (prefers-reduced-motion: reduce) { .equipped-motion { animation: none !important; } }
      `}</style>
      <span
        aria-hidden="true"
        className={running ? 'equipped-motion inline-flex' : 'inline-flex'}
        style={running && name ? { animation: `${name} 3s ease-out 1` } : undefined}
      >
        {preview}
      </span>
    </>
  );
}

export function EquippedBadge({ replay = false }: { replay?: boolean }) {
  const open = isMarketplaceOpen();
  const { user } = useAuth();
  const reduced = useReducedMotion();
  const [icon, setIcon] = useState<MarketplaceItem | null>(null);
  const [animation, setAnimation] = useState<MarketplaceItem | null>(null);
  const [playToken, setPlayToken] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!open || !userId) return;
    const id = userId;
    let cancelled = false;
    async function load() {
      try {
        if (isMarketplaceMock()) await marketplaceDemo.bindUser(id);
        const inventory = await marketplaceApi.getInventory();
        if (cancelled) return;
        setIcon(inventory.equipped.icon);
        setAnimation(inventory.equipped.animation);
      } catch {
        if (!cancelled) {
          setIcon(null);
          setAnimation(null);
        }
      }
    }
    void load();
    const onChange = () => void load();
    window.addEventListener('marketplace-equipped', onChange);
    return () => {
      cancelled = true;
      window.removeEventListener('marketplace-equipped', onChange);
    };
  }, [open, userId]);

  if (!open || (!icon && !(replay && animation))) return null;
  return (
    <span className="inline-flex items-center gap-2">
      {icon ? (
        <span role="img" aria-label={`Icône équipée : ${icon.title}`} className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-700 bg-zinc-900 font-mono text-xs text-primary">
          {icon.preview}
        </span>
      ) : null}
      {replay && animation ? (
        <>
          <EquippedMotion preview={animation.preview} animationKey={animation.animation_key} playToken={playToken} />
          <button type="button" onClick={() => setPlayToken((token) => token + 1)} disabled={reduced} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-3 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">
            Rejouer
          </button>
        </>
      ) : null}
    </span>
  );
}
