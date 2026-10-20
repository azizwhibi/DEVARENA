import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { apiRequest } from '@/lib/api-server';
import { ApiError, type AuthUser } from '@/lib/api-core';
import { RecruiterDashboard } from '@/components/recruiter/RecruiterDashboard';

export const metadata = { title: 'Recruiter Candidate Hub | DevArena' };

async function RecruiterContent() {
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
    redirect('/login?next=/recruiter');
  }

  if (user.role !== 'recruiter' && user.role !== 'admin') {
    return (
      <div role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-8 text-center">
        <h1 className="text-xl font-bold text-red-400">Not authorized</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Recruiter access is required to view this talent portal.
        </p>
      </div>
    );
  }

  return <RecruiterDashboard currentUserId={user.id} role={user.role} />;
}

export default function RecruiterPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <Suspense
        fallback={
          <div
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center text-sm text-zinc-400"
            aria-busy="true"
          >
            Checking recruiter access…
          </div>
        }
      >
        <RecruiterContent />
      </Suspense>
    </main>
  );
}
