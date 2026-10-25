'use client';

import { useEffect, useState } from 'react';
import { clearDevelopmentServiceWorker } from '@/lib/pwa/development-cleanup';

export function RegisterSW() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      void clearDevelopmentServiceWorker().catch(() => {
        console.warn(
          'Unable to clear the previous DevArena worker. Unregister /sw.js in browser developer tools and reload.',
        );
      });
      return;
    }
    let cleanup = () => {};
    let disposed = false;
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      void navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
          if (disposed) return;
          const listeners: (() => void)[] = [];
          function check() {
            if (disposed) return;
            if (registration.waiting && navigator.serviceWorker.controller)
              setWaiting(registration.waiting);
          }
          const update = () => {
            const worker = registration.installing;
            if (!worker) return;
            const changed = () => {
              if (disposed) return;
              if (worker.state === 'redundant')
                setError(
                  'Offline setup or update failed. Reconnect and reload to retry.',
                );
              check();
            };
            worker.addEventListener('statechange', changed);
            listeners.push(() =>
              worker.removeEventListener('statechange', changed),
            );
          };
          check();
          update();
          registration.addEventListener('updatefound', update);
          cleanup = () => {
            registration.removeEventListener('updatefound', update);
            listeners.forEach((remove) => remove());
          };
        })
        .catch(() =>
          setError('Offline setup failed. Reconnect and reload to retry.'),
        );
    }
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  if (!waiting && !error) return null;
  return (
    <aside className="pwa-notice" aria-label="App update">
      <p role="status">
        {error ||
          'An update is ready. Finish any form, purchase or battle before reloading.'}
      </p>
      <button
        className="btn btn-secondary"
        onClick={() => {
          if (!waiting) {
            window.location.reload();
            return;
          }
          navigator.serviceWorker.addEventListener(
            'controllerchange',
            () => window.location.reload(),
            { once: true },
          );
          waiting.postMessage({ type: 'ACTIVATE_UPDATE' });
        }}
      >
        {waiting ? 'Update and reload' : 'Reload'}
      </button>
    </aside>
  );
}
