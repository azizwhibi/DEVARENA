'use client';

import { useOffline } from 'next/offline';

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return <p data-guide-obstacle role="status" className="arena-enter bg-accent px-5 py-2 text-center text-sm font-medium text-zinc-950">You’re offline. Navigation will resume when you reconnect.</p>;
}
