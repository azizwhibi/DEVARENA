'use client';
import { useSyncExternalStore } from 'react';
function subscribe(change: () => void) {
  window.addEventListener('online', change);
  window.addEventListener('offline', change);
  return () => {
    window.removeEventListener('online', change);
    window.removeEventListener('offline', change);
  };
}
export function useMarketplaceOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => false,
  );
}
