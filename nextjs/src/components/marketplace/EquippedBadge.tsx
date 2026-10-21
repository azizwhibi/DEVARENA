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
  large = false,
}: {
  preview: string;
  animationKey?: string;
  playToken: number;
  large?: boolean;
}) {
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (playToken === 0 || reduced || !animationKey) return;
    setRunning(true);
    const timer = window.setTimeout(() => setRunning(false), 3000);
    return () => window.clearTimeout(timer);
  }, [playToken, reduced, animationKey]);
  const effect = animationKey ? MOTION[animationKey] ?? 'equipped-pulse' : undefined;
  const frame = large
    ? 'relative flex h-full w-full items-center justify-center overflow-hidden text-3xl'
    : 'relative inline-flex size-10 items-center justify-center overflow-hidden rounded-lg border border-primary/50 bg-zinc-950 text-sm';
  return (
    <>
      <style>{`
        @keyframes equipped-scan { from { top: -10%; } to { top: 110%; } }
        @keyframes equipped-pulse { from { transform: scale(0.55); opacity: 0.9; } to { transform: scale(1.2); opacity: 0; } }
        @keyframes equipped-matrix { from { transform: translateY(-120%); opacity: 0; } to { transform: translateY(120%); opacity: 0.85; } }
        @keyframes equipped-drift { from { transform: translateY(6px); opacity: 0; } to { transform: translateY(-14px); opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .equipped-motion { animation: none !important; } }
      `}</style>
      <span aria-hidden="true" className={`${frame} font-mono text-primary`}>
        {preview}
        {running && effect === 'equipped-scan' ? <span className="equipped-motion pointer-events-none absolute inset-x-1 h-0.5 bg-primary shadow-[0_0_12px_rgb(34,197,94)]" style={{ animation: 'equipped-scan 1.5s linear 2' }} /> : null}
        {running && effect === 'equipped-pulse' ? <span className="equipped-motion pointer-events-none absolute inset-1 rounded-full border-2 border-primary" style={{ animation: 'equipped-pulse 1.5s ease-out 2' }} /> : null}
        {running && effect === 'equipped-matrix' ? <span className="equipped-motion pointer-events-none absolute inset-x-2 text-[10px] tracking-widest text-primary" style={{ animation: 'equipped-matrix 1.5s linear 2' }}>01</span> : null}
        {running && effect === 'equipped-drift' ? <span className="equipped-motion pointer-events-none absolute text-xs text-primary" style={{ animation: 'equipped-drift 1.5s ease-out 2' }}>•</span> : null}
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
        <span role="img" aria-label={`Icône équipée : ${icon.title}`} className="inline-flex size-10 items-center justify-center rounded-lg border border-primary/60 bg-zinc-950 font-mono text-base text-primary shadow-[0_0_16px_rgb(34,197,94,0.25)]">
          {icon.preview}
        </span>
      ) : null}
      {replay && animation ? (
        <>
          <EquippedMotion preview={animation.preview} animationKey={animation.animation_key} playToken={playToken} />
          <button type="button" onClick={() => setPlayToken((token) => token + 1)} disabled={reduced} aria-label={`Rejouer l'animation ${animation.title}`} className="inline-flex min-h-11 items-center rounded-lg border border-zinc-600 px-3 text-sm hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">
            Rejouer
          </button>
        </>
      ) : null}
    </span>
  );
}
