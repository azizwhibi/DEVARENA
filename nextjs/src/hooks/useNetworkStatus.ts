'use client';

import { useEffect, useState } from 'react';

/**
 * Hook de détection de connectivité réseau du navigateur.
 * Écoute les événements 'online' et 'offline' de l'objet window.
 * Initialisé avec `typeof navigator !== 'undefined' ? navigator.onLine : true`.
 */
export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Synchronisation défensive avec l'état courant
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
