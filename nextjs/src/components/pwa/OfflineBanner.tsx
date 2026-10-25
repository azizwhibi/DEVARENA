'use client';

import { useOffline } from 'next/offline';

export function OfflineBanner() {
  const offline = useOffline();
  if (!offline) return null;
  return (
    <p
      role="status"
      className="arena-enter bg-accent px-5 py-2 text-center text-sm font-medium text-white"
    >
      You’re offline. Online actions require a connection.{' '}
      <a href="/offline.html" className="underline font-semibold">Open offline library</a>
    </p>
  );
}
