import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { apiRequest } from '@/lib/api-server';
import { ApiError, type AuthUser } from '@/lib/api-core';
import { InvitationsManager } from '@/components/invitations/InvitationsManager';

export const metadata = { title: 'Interview Requests | DevArena' };

async function InvitationsContent() {
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
    redirect('/login?next=/invitations');
  }

  return <InvitationsManager role={user.role} />;
}

export default function InvitationsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <Suspense
        fallback={
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400"
            aria-busy="true"
          >
            Loading interview requests…
          </div>
        }
      >
        <InvitationsContent />
      </Suspense>
    </main>
  );
}
