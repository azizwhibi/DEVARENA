'use client';

import { useEffect, useState } from 'react';

export function OfflineDashboard() {
  const [online, setOnline] = useState(false);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStatus = () => {
      setOnline(navigator.onLine);
      if (navigator.onLine) {
        setFeedback('Connection re-established!');
      }
    };

    setOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  async function handleRetry() {
    setChecking(true);
    setFeedback(null);

    try {
      // Test same-origin ping
      const res = await fetch('/manifest.webmanifest', { cache: 'no-cache', method: 'HEAD' });
      if (res.ok) {
        setOnline(true);
        setFeedback('Connected! Reloading...');
        setTimeout(() => window.location.reload(), 600);
        return;
      }
    } catch {
      /* still offline */
    }

    setChecking(false);
    setFeedback(navigator.onLine ? 'Network available, refreshing...' : 'Still offline. Check your connection.');
  }

  return (
    <div className="w-full max-w-lg space-y-6">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-card shadow-2xl">
        {/* Terminal Window Chrome */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 bg-zinc-950/40 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/80" />
          <span className="h-3 w-3 rounded-full bg-amber-500/80" />
          <span className="h-3 w-3 rounded-full bg-primary/80" />
          <span className="ml-2 font-mono text-xs text-muted-foreground">devarena-cli — offline mode</span>
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex items-center justify-between">
            <p className="font-mono text-3xl font-bold tracking-tight text-accent">$ offline_</p>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-medium ${
                online
                  ? 'border border-primary/30 bg-primary/10 text-primary'
                  : 'border border-accent/30 bg-accent/10 text-accent'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${online ? 'bg-primary' : 'bg-accent'} animate-pulse`} />
              {online ? 'Online' : 'Disconnected'}
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-foreground">
            {online ? 'Connection Restored' : 'The Arena is Offline'}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {online
              ? 'Your internet connection is back. Ready to rejoin the coding arena.'
              : 'Local cached assets are running. Network operations and live competitions are paused until reconnected.'}
          </p>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={checking}
              className="arena-btn min-h-11 rounded-lg bg-primary px-5 font-semibold text-zinc-950 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              {checking ? 'Checking network...' : online ? 'Reload Arena' : 'Retry Connection'}
            </button>
            <button
              type="button"
              onClick={() => window.history.back()}
              className="min-h-11 rounded-lg border border-zinc-700 bg-zinc-900/50 px-4 text-sm font-medium text-foreground hover:bg-zinc-800"
            >
              Go Back
            </button>
          </div>

          {feedback && (
            <p className="mt-3 font-mono text-xs text-muted-foreground" role="status">
              &gt; {feedback}
            </p>
          )}

          {/* Status Breakdown Table */}
          <div className="mt-8 border-t border-zinc-800 pt-6">
            <h2 className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Offline Capabilities Matrix
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs text-muted-foreground font-mono">
              <li className="flex items-center justify-between">
                <span>UI Shell & Token Design</span>
                <span className="text-primary font-semibold">Cached & Ready ✔</span>
              </li>
              <li className="flex items-center justify-between">
                <span>PWA Service Worker</span>
                <span className="text-primary font-semibold">Active (devarena-v2) ✔</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Local Web Worker Sandbox</span>
                <span className="text-primary font-semibold">Ready for eval ✔</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Live Rankings & Leaderboards</span>
                <span className="text-accent font-semibold">Paused (Offline) ⏸</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Recruiter Messaging & Chat</span>
                <span className="text-accent font-semibold">Paused (Offline) ⏸</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
