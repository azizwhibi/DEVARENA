import { Suspense } from 'react';
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
      <div role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-8 text-center">
        <h1 className="text-xl font-bold text-red-400">Not authorized</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Admin access is required to view this page.
        </p>
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
