import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { AdminMarketplace } from '@/components/marketplace/AdminMarketplace';
import { apiRequest } from '@/lib/api-server';
import { ApiError, type AuthUser } from '@/lib/api-core';
export const metadata = { title: 'Marketplace admin | DevArena' };

async function AdminMarketplaceContent() {
  await connection();

  let user: AuthUser | null = null;
  let shouldRedirectLogin = false;
  try {
    user = await apiRequest<AuthUser>('/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) shouldRedirectLogin = true;
    else throw err;
  }

  if (shouldRedirectLogin || !user) redirect('/login?next=/admin/marketplace');
  if (user.role !== 'admin') {
    return (
      <div role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-8 text-center">
        <h1 className="text-xl font-bold text-red-400">Not authorized</h1>
        <p className="mt-2 text-sm text-zinc-300">Admin access is required to view this page.</p>
      </div>
    );
  }

  return <AdminMarketplace />;
}

export default function AdminMarketplacePage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
      <Suspense fallback={<p role="status" aria-busy="true" className="text-sm text-zinc-400">Checking admin access…</p>}>
        <AdminMarketplaceContent />
      </Suspense>
    </main>
  );
}
