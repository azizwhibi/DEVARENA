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
  const [account, setAccount] = useState<Account | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
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

    async function loadPendingRequests() {
      try {
        const invs = await apiRequest<Array<{ status: string }>>('/invitations', {
          signal: controller.signal,
        });
        if (!controller.signal.aborted && Array.isArray(invs)) {
          const count = invs.filter((i) => i.status === 'pending').length;
          setPendingRequestsCount(count);
        }
      } catch {
        // non-fatal
      }
    }

    void load();
    void loadPendingRequests();

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

    function handleInvitationEvent() {
      void loadPendingRequests();
    }

    window.addEventListener('profile-updated', handleProfileUpdated);
    window.addEventListener('invitation-received', handleInvitationEvent);
    window.addEventListener('invitation-status-changed', handleInvitationEvent);

    return () => {
      controller.abort();
      window.removeEventListener('profile-updated', handleProfileUpdated);
      window.removeEventListener('invitation-received', handleInvitationEvent);
      window.removeEventListener('invitation-status-changed', handleInvitationEvent);
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

  function isActive(path: string) {
    if (path === '/') return pathname === '/';
    return pathname === path || pathname.startsWith(`${path}/`);
  }

  const navLinkClass = (path: string) =>
    `rounded-lg px-3 py-1.5 text-xs font-medium transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
      isActive(path)
        ? 'bg-zinc-800/90 text-zinc-100 font-semibold border border-zinc-700/70 shadow-xs'
        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
    }`;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md px-5 py-3 transition-all">
      <nav aria-label="Main navigation" className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm">
        {loading ? (
          <div className="flex w-full items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight text-primary">DevArena</Link>
            <span role="status" className="text-xs text-zinc-500 animate-pulse">Checking session…</span>
          </div>
        ) : !user ? (
          /* ================= GUEST NAVIGATION ================= */
          <div className="flex w-full items-center justify-between">
            <Link href="/" className="text-lg font-semibold tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-primary">
              &lt;/&gt; DevArena
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/login" className="rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white transition-colors">
                Sign in
              </Link>
              <Link href="/register" className="rounded-lg bg-primary px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-primary/90 transition-colors">
                Get Started
              </Link>
            </div>
          </div>
        ) : current?.role === 'recruiter' ? (
          /* ================= RECRUITER NAVIGATION ================= */
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/recruiter" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-primary">
                <span>DevArena</span>
              </Link>
              <span className="inline-flex items-center rounded-full bg-indigo-950/90 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300 border border-indigo-700/80 shadow-xs">
                👔 Recruiter Portal
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link href="/recruiter" className={navLinkClass('/recruiter')}>
                Candidates
              </Link>
              <Link href="/invitations" className={`${navLinkClass('/invitations')} flex items-center gap-1.5`}>
                <span>Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="rounded-full bg-indigo-500/20 px-1.5 py-0.2 text-[10px] font-bold text-indigo-300 border border-indigo-500/30">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>
              <Link href="/messages" className={navLinkClass('/messages')}>
                Messages
              </Link>
              <Link href="/profile" className={navLinkClass('/profile')}>
                Company Profile
              </Link>

              {/* User Identity Chip */}
              <div className="ml-1 sm:ml-2 flex items-center gap-2 pl-2 border-l border-zinc-800">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
                >
                  <span className="h-5 w-5 rounded-full bg-indigo-950 text-indigo-400 border border-indigo-800/60 flex items-center justify-center font-bold text-[10px]">
                    {current.username.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[110px] truncate font-medium">@{current.username}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  disabled={leaving}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-900/80 hover:bg-red-950/30 hover:text-red-300 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {leaving ? 'Leaving…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        ) : current?.role === 'developer' ? (
          /* ================= DEVELOPER NAVIGATION ================= */
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-primary">
                <span className="font-mono text-primary font-black">&lt;/&gt;</span>
                <span>DevArena</span>
              </Link>
              <span className="inline-flex items-center rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-800/80">
                💻 Developer
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link href="/profile" className={navLinkClass('/profile')}>
                Profile
              </Link>
              <Link href="/invitations" className={`${navLinkClass('/invitations')} flex items-center gap-1.5`}>
                <span>Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 animate-pulse">
                    {pendingRequestsCount} new
                  </span>
                )}
              </Link>
              <Link href="/messages" className={navLinkClass('/messages')}>
                Messages
              </Link>
              <Link href="/profile/settings" className={navLinkClass('/profile/settings')}>
                Settings
              </Link>

              {/* User Identity Chip */}
              <div className="ml-1 sm:ml-2 flex items-center gap-2 pl-2 border-l border-zinc-800">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-lg bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 text-xs text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
                >
                  <span className="h-5 w-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 flex items-center justify-center font-bold text-[10px]">
                    {current.username.charAt(0).toUpperCase()}
                  </span>
                  <span className="max-w-[110px] truncate font-medium">@{current.username}</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  disabled={leaving}
                  className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-900/80 hover:bg-red-950/30 hover:text-red-300 transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {leaving ? 'Leaving…' : 'Sign out'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* ================= ADMIN / FALLBACK NAVIGATION ================= */
          <div className="flex w-full flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-lg font-semibold tracking-tight text-primary focus-visible:outline-2 focus-visible:outline-primary">
                DevArena
              </Link>
              {current?.role === 'admin' && (
                <span className="inline-flex items-center rounded-full bg-amber-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 border border-amber-800/80">
                  🛡️ Admin
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {current ? (
                <Link href="/profile" className={navLinkClass('/profile')}>
                  @{current.username}
                </Link>
              ) : (
                <span className="text-xs text-zinc-400">{message ? 'Account unavailable' : 'Loading account…'}</span>
              )}
              {current?.role === 'admin' && (
                <Link href="/admin/users" className={navLinkClass('/admin/users')}>
                  Administration
                </Link>
              )}
              {current?.role === 'admin' && (
                <Link href="/recruiter" className={navLinkClass('/recruiter')}>
                  Recruiter Portal
                </Link>
              )}
              <Link href="/invitations" className={`${navLinkClass('/invitations')} flex items-center gap-1.5`}>
                <span>Requests</span>
                {pendingRequestsCount > 0 && (
                  <span className="rounded-full bg-primary/20 px-1.5 py-0.2 text-[10px] font-bold text-primary">
                    {pendingRequestsCount}
                  </span>
                )}
              </Link>
              <Link href="/messages" className={navLinkClass('/messages')}>
                Messages
              </Link>
              <button
                type="button"
                onClick={logout}
                disabled={leaving}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-400 hover:border-red-900/80 hover:bg-red-950/30 hover:text-red-300 transition-colors disabled:opacity-50"
              >
                {leaving ? 'Leaving…' : 'Sign out'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div role="alert" className="flex w-full items-center gap-3 text-xs text-red-300 mt-2 bg-red-950/40 border border-red-900/60 p-2 rounded-lg">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => {
                setFailure(null);
                setRetryKey((k) => k + 1);
              }}
              className="underline hover:text-red-100"
            >
              Retry
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
