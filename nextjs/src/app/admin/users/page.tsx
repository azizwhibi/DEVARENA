import { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { apiRequest } from '@/lib/api-server';
import { ApiError, type AuthUser } from '@/lib/api-core';
import { UsersTable } from '@/components/admin/UsersTable';

export const metadata = { title: 'User Administration | DevArena' };

async function AdminUsersContent() {
  await connection();
  let user: AuthUser | null = null;
  let shouldRedirectLogin = false;

  try {
    user = await apiRequest<AuthUser>('/me');
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      shouldRedirectLogin = true;
    } else {
      throw err;
    }
  }

  if (shouldRedirectLogin || !user) {
    redirect('/login?next=/admin/users');
  }

  if (user.role !== 'admin') {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-red-500/40 bg-zinc-950 p-8 text-center shadow-2xl backdrop-blur-md"
      >
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-500/40 bg-red-950/40 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-red-400 font-mono">Not authorized</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Admin access is required to view this page.
        </p>
        <div className="mt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-mono font-medium text-zinc-200 transition-all hover:bg-zinc-800 hover:text-white"
          >
            ← Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  return <UsersTable currentUserId={user.id} />;
}

export default function AdminUsersPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Suspense
        fallback={
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400"
            aria-busy="true"
          >
            Checking admin access…
          </div>
        }
      >
        <AdminUsersContent />
      </Suspense>
    </main>
  );
}
