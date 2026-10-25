'use client';

import { useEffect, useState } from 'react';
import { useOffline } from 'next/offline';

export function OfflineBanner() {
  const nextOffline = useOffline();
  const [browserOffline, setBrowserOffline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateStatus = () => {
      setBrowserOffline(!navigator.onLine);
    };

    updateStatus();
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  const isOffline = nextOffline || browserOffline;
  if (!isOffline) return null;

  return (
    <p
      role="status"
      className="arena-enter bg-accent px-5 py-2 text-center text-sm font-medium text-zinc-950"
    >
      You're offline. Cached assets are active; navigation will resume when you reconnect.
    </p>
  );
}
