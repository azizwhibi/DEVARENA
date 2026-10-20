'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';

type Account = { id: string; username: string; role: AuthUser['role'] };

export function AuthHeader() {
  const pathname = usePathname();
  const { user, loading, signOut } = useAuth();
  const marketplaceCurrent = pathname === '/marketplace' || pathname.startsWith('/marketplace/');
  const [account, setAccount] = useState<Account | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();

    async function load() {
      try {
        const profile = await apiRequest<{
          id: string;
          username: string;
          role: AuthUser['role'];
        }>('/me/profile', { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (profile.id !== userId || typeof profile.username !== 'string') {
          throw new Error('Account could not be loaded');
        }
        setAccount({ id: profile.id, username: profile.username, role: profile.role });
        setFailure(null);
      } catch (error) {
        if (controller.signal.aborted) return;
        setAccount(null);
        setFailure({
          id: userId!,
          message:
            error instanceof ApiError && error.problem.code === 'account_suspended'
              ? 'Account suspended'
              : 'Account unavailable. Try again shortly.',
        });
      }
    }

    void load();

    function handleProfileUpdated(e: Event) {
      const customEvent = e as CustomEvent<{ id: string; username: string; role: AuthUser['role'] }>;
      if (customEvent.detail && customEvent.detail.id === userId) {
        setAccount({
          id: customEvent.detail.id,
          username: customEvent.detail.username,
          role: customEvent.detail.role,
        });
        setFailure(null);
      }
    }

    window.addEventListener('profile-updated', handleProfileUpdated);

    return () => {
      controller.abort();
      window.removeEventListener('profile-updated', handleProfileUpdated);
    };
  }, [userId, retryKey]);

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
  const linkClass = 'rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary';
  return (
    <header className="border-b border-zinc-800 bg-zinc-950 px-5 py-4">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm">
        <Link href="/" className={`${linkClass} text-lg font-semibold tracking-tight text-primary`}>DevArena</Link>
        {loading ? <span role="status" className="text-zinc-400">Checking session…</span> : user ? (
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/marketplace" aria-current={marketplaceCurrent ? 'page' : undefined} className={`${linkClass} inline-flex min-h-11 items-center px-2 ${marketplaceCurrent ? 'font-semibold text-primary underline decoration-primary underline-offset-4' : ''}`}>Marketplace</Link>
            {current ? <Link href="/profile" className={`${linkClass} break-all`}>{current.username} · {current.role}</Link>
              : <span className="text-zinc-400">{message ? 'Account unavailable' : 'Loading account…'}</span>}
            {current?.role === 'admin' && <Link href="/admin/users" className={linkClass}>Administration</Link>}
            <button type="button" onClick={logout} disabled={leaving} className="min-h-11 rounded-lg border border-zinc-600 px-4 hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60">{leaving ? 'Signing out…' : 'Sign out'}</button>
            {message && (
              <div role="alert" className="flex w-full items-center gap-3 text-red-200">
                <span>{message}</span>
                <button
                  type="button"
                  onClick={() => {
                    setFailure(null);
                    setRetryKey((k) => k + 1);
                  }}
                  className="text-xs underline hover:text-red-100"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        ) : <Link href="/login" className={`${linkClass} inline-flex min-h-11 items-center px-2`}>Sign in</Link>}
      </nav>
    </header>
  );
}
