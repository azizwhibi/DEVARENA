export type OfflineResource = {
  id: string;
  userId: string;
  title: string;
  content: string;
  version: string;
  downloadedAt: string;
  availability: 'available' | 'stale' | 'unavailable';
};
export type OfflineSnapshot = {
  id: string;
  title: string;
  content: string;
  status: 'published';
  updated_at: string;
  description: string;
  source: string;
  attribution: string;
  tags: string[];
  skills: { id: string; name: string }[];
  topics: { id: string; name: string }[];
};
type Store = {
  owner(): string | null;
  activate(userId: string): Promise<void>;
  clear(): Promise<void>;
  save(userId: string, snapshot: OfflineSnapshot): Promise<void>;
  list(): Promise<OfflineResource[]>;
  remove(id: string): Promise<void>;
  revalidate(id: string, version: string, unavailable?: boolean): Promise<void>;
};
declare global {
  interface Window {
    DevArenaOffline?: Store;
  }
}
let pending: Promise<Store> | undefined;
export function offlineStore(): Promise<Store> {
  if (window.DevArenaOffline) return Promise.resolve(window.DevArenaOffline);
  if (!pending)
    pending = new Promise<Store>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/offline-store.js';
      script.onload = () =>
        window.DevArenaOffline
          ? resolve(window.DevArenaOffline)
          : reject(new Error('Offline storage unavailable.'));
      script.onerror = () => {
        script.remove();
        pending = undefined;
        reject(
          new Error('Unable to prepare offline storage. Reconnect and retry.'),
        );
      };
      document.head.append(script);
    });
  return pending;
}
export async function clearOfflineReading() {
  // Remove the account marker synchronously even if storage loading fails.
  try {
    localStorage.removeItem('devarena-reading-owner');
  } catch {
    /* restricted browser */
  }
  await (await offlineStore()).clear();
}
