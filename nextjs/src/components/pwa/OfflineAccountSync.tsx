'use client';
import { useEffect } from 'react';
import { useAccount } from '@/components/AccountProvider';
import { apiRequest, ApiError } from '@/lib/api';
import { offlineStore, type OfflineSnapshot } from '@/lib/offline-reading';
export function OfflineAccountSync() {
  const { user, loading } = useAccount();
  useEffect(() => {
    if (loading) return;
    let stopped = false;
    const controller = new AbortController();
    async function synchronize() {
      try {
        const store = await offlineStore();
        if (stopped) return;
        if (!user) {
          await store.clear();
          return;
        }
        await store.activate(user.id);
        if (!navigator.onLine) return;
        for (const copy of await store.list()) {
          if (stopped) return;
          try {
            const value = await apiRequest<OfflineSnapshot>(
              '/knowledge/resources/' + copy.id + '/offline',
              {
                signal: AbortSignal.any([
                  controller.signal,
                  AbortSignal.timeout(10000),
                ]),
              },
            );
            if (!stopped) await store.revalidate(copy.id, value.updated_at);
          } catch (error) {
            if (
              !stopped &&
              error instanceof ApiError &&
              [403, 404].includes(error.status)
            )
              await store.revalidate(copy.id, '', true);
          }
        }
      } catch {
        /* Download UI reports storage errors; ordinary navigation stays usable. */
      }
    }
    void synchronize();
    window.addEventListener('online', synchronize);
    return () => {
      stopped = true;
      controller.abort();
      window.removeEventListener('online', synchronize);
    };
  }, [user, loading]);
  return null;
}
