'use client';
import { useState } from 'react';
import { useAccount } from '@/components/AccountProvider';
import { apiRequest } from '@/lib/api';
import { offlineStore, type OfflineSnapshot } from '@/lib/offline-reading';
export function OfflineDownload({ id }: { id: string }) {
  const { user } = useAccount();
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function download() {
    if (!user || busy) return;
    setBusy(true);
    setMessage('');
    try {
      if (!navigator.onLine)
        throw new Error('Reconnect to download this resource.');
      if (
        !('serviceWorker' in navigator) ||
        !navigator.serviceWorker.controller
      )
        throw new Error(
          'Offline reading is not ready. Use the production app on HTTPS or localhost, then reload.',
        );
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting || !(await caches.match('/offline.html')))
        throw new Error('Finish the app update and reload before downloading.');
      const store = await offlineStore();
      if (store.owner() !== user.id)
        throw new Error('Your account changed or storage is not ready. Reload and retry.');
      const snapshot = await apiRequest<OfflineSnapshot>(
        '/knowledge/resources/' + id + '/offline',
        { signal: AbortSignal.timeout(15000) },
      );
      await store.save(user.id, snapshot);
      setMessage('Downloaded. Open the offline library to read this copy.');
    } catch (error) {
      setMessage(
        error instanceof DOMException && error.name === 'QuotaExceededError'
          ? 'Storage is full. Delete a downloaded copy and retry.'
          : error instanceof Error
            ? error.message
            : 'Download failed. Allow browser storage and retry.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card">
      <div className="toolbar">
        <button
          className="btn btn-secondary"
          disabled={busy || !user}
          onClick={download}
        >
          {busy ? 'Downloading…' : 'Download for offline reading'}
        </button>
        <a className="btn btn-secondary" href="/offline.html">
          Offline library
        </a>
      </div>
      <p className="muted">
        Written content only. External videos and websites need a connection.
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
