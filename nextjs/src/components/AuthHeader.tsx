'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';
import { createClient } from '@/lib/supabase/client';

type Account = { id: string; username: string; role: AuthUser['role'] };

export function AuthHeader() {
  const { user, loading, signOut } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    async function load() {
      try {
        const [me, profile] = await Promise.all([
          apiRequest<AuthUser>('/me', { signal: controller.signal }),
          // /me intentionally has no username; this read is restricted by owner RLS.
          createClient().from('profiles').select('username').eq('id', userId!).abortSignal(controller.signal).maybeSingle(),
        ]);
        if (controller.signal.aborted) return;
        if (me.id !== userId || me.status !== 'active' || profile.error || typeof profile.data?.username !== 'string') {
          throw new Error('Account could not be loaded');
        }
        setAccount({ id: me.id, username: profile.data.username, role: me.role });
        setFailure(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setAccount(null);
        setFailure({ id: userId!, message: error instanceof ApiError && error.problem.code === 'account_suspended'
          ? 'Account suspended' : 'Account unavailable. Try again shortly.' });
      }
    }
    void load();
    return () => controller.abort();
  }, [userId]);

  async function logout() {
    setLeaving(true);
    try {
      await signOut();
      setAccount(null);
      setFailure(null);
    } catch {
      if (userId) setFailure({ id: userId, message: 'Unable to sign out. Check your connection and try again.' });
    } finally {
      setLeaving(false);
    }
  }

  const current = account?.id === userId ? account : null;
  const message = failure?.id === userId ? failure?.message : undefined;
  const linkClass = 'rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400';
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-5 py-4">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm">
        <Link href="/" className={`${linkClass} text-lg font-semibold tracking-tight text-emerald-300`}>DevArena</Link>
        {loading ? <span role="status" className="text-zinc-400">Checking session…</span> : user ? (
          <div className="flex flex-wrap items-center gap-4">
            {current ? <Link href="/profile" className={`${linkClass} break-all`}>{current.username} · {current.role}</Link>
              : <span className="text-zinc-400">{message ? 'Account unavailable' : 'Loading account…'}</span>}
            {current?.role === 'admin' && <Link href="/admin" className={linkClass}>Administration</Link>}
            <button type="button" onClick={logout} disabled={leaving} className="min-h-11 rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-400 disabled:opacity-60">{leaving ? 'Signing out…' : 'Sign out'}</button>
            {message && <p role="alert" className="w-full text-red-200">{message}</p>}
          </div>
        ) : <Link href="/login" className={`${linkClass} inline-flex min-h-11 items-center px-2`}>Sign in</Link>}
      </nav>
    </header>
  );
}
