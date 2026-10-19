'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest, ApiError } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

interface DangerZoneProps {
  currentUsername: string;
}

export function DangerZone({ currentUsername }: DangerZoneProps) {
  const router = useRouter();
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (confirmInput !== currentUsername) {
      setError(`Please type "${currentUsername}" exactly to confirm.`);
      return;
    }

    setLoading(true);
    try {
      await apiRequest('/me', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmUsername: confirmInput }),
      });

      // Sign out from Supabase to clear session cookies and redirect home
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/');
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.problem.detail ?? 'Failed to delete account.');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred while deleting account.');
      }
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-red-900/50 bg-red-950/20 p-6">
      <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
      <p className="mt-2 text-sm text-zinc-300">
        Deleting your account is permanent and cannot be undone.
      </p>
      <ul className="mt-2 list-disc list-inside text-xs text-zinc-400 space-y-1">
        <li>Your profile, credentials, and uploaded avatar will be permanently erased.</li>
        <li>
          Past challenge attempts are preserved anonymously for platform statistics, with
          your identity, submitted code, and free-text answers completely scrubbed.
        </li>
      </ul>

      <form onSubmit={handleDelete} className="mt-6 flex flex-col gap-4">
        <div>
          <label
            htmlFor="confirm-delete-username"
            className="block text-sm font-medium text-zinc-200"
          >
            To confirm, type your username{' '}
            <span className="font-mono font-bold text-red-300">{currentUsername}</span>:
          </label>
          <input
            id="confirm-delete-username"
            type="text"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            disabled={loading}
            placeholder={currentUsername}
            className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
            required
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <div>
          <button
            type="submit"
            disabled={loading || confirmInput !== currentUsername}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting account...' : 'Permanently delete account'}
          </button>
        </div>
      </form>
    </section>
  );
}
