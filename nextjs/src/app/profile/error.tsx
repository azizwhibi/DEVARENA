'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Profile error:', error);
  }, [error]);

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <div className="rounded-xl border border-rose-800/40 bg-[#111827] p-8 shadow-lg">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-950/60 text-rose-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="mt-4 text-xl font-semibold text-zinc-100">Unable to load profile</h2>
        <p className="mt-2 text-sm text-[#8B93A7]">
          {error.message || 'An unexpected error occurred while communicating with the server.'}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => reset()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-lg border border-white/[0.12] bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-600"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}
