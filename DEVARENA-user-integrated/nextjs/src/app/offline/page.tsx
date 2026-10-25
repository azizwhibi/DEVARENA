import { OfflineDashboard } from '@/components/pwa/OfflineDashboard';

export const metadata = { title: 'Offline | DevArena' };

export default function OfflinePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <OfflineDashboard />
    </main>
  );
}
