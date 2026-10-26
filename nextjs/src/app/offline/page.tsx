import { OfflineDashboard } from '@/components/pwa/OfflineDashboard';

export const metadata = { title: 'Offline | DevArena' };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-5 py-12 gap-6">
      <OfflineDashboard />
      <div className="text-center">
        <a href="/offline.html" className="btn btn-secondary text-sm">
          Open Offline Reading Library &rarr;
        </a>
      </div>
    </main>
  );
}
