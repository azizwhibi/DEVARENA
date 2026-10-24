'use client';

import { useEffect, useState } from 'react';

export function RegisterSW() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const isEnabled =
      process.env.NODE_ENV === 'production' ||
      process.env.NEXT_PUBLIC_ENABLE_SW === 'true' ||
      window.location.search.includes('sw=1') ||
      (() => {
        try {
          return localStorage.getItem('devarena_enable_sw') === '1';
        } catch {
          return false;
        }
      })();

    if (!isEnabled) return;

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then(reg => {
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
        }

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
            }
          });
        });
      })
      .catch(() => {
        /* SW registration non-fatal */
      });
  }, []);

  function handleUpdate() {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  if (!waitingWorker) return null;

  return (
    <aside
      aria-label="App update available"
      className="arena-enter fixed bottom-20 right-4 z-50 flex items-center gap-3 rounded-xl border border-primary/40 bg-card px-4 py-3 text-sm shadow-xl"
    >
      <span className="font-mono text-xs text-primary">$ new version ready</span>
      <button
        type="button"
        onClick={handleUpdate}
        className="arena-btn rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Update Now
      </button>
    </aside>
  );
}
