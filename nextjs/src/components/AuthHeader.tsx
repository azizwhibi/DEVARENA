'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, ApiError } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import styles from './auth-header.module.css';

type Account = { id: string; username: string; role: AuthUser['role'] };

export function AuthHeader() {
  const { user, loading, signOut } = useAuth();
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
  const displayName = current?.username ?? user?.email ?? 'Compte';
  return <header className={styles.header}>
    <nav aria-label="Navigation du compte" className={styles.nav}>
      <Link href="/" className={styles.brand} aria-label="DevArena — accueil"><WorkspaceIcon name="practice" size={20} /><span className={styles.brandText}>DevArena</span></Link>
      <div className={styles.right}>
        {loading ? <span role="status" aria-label="Chargement du compte" className={styles.skeleton} /> : user ? <details className={styles.account} onKeyDown={event => {
          if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); }
        }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) event.currentTarget.open = false; }}>
          <summary className={styles.trigger} aria-label={`Menu du compte ${displayName}`}><span className={styles.avatar}>{displayName.slice(0, 2)}</span><WorkspaceIcon name="chevron" size={16} /></summary>
          <div className={styles.dropdown}>
            <Link href="/profile" className={styles.item} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); }}><WorkspaceIcon name="user" />Mon profil</Link>
            {(current?.role === 'recruiter' || current?.role === 'admin') && <Link href="/recruiter" className={styles.item} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); }}><WorkspaceIcon name="users" />Recruiter Portal</Link>}
            <button type="button" className={styles.item} onClick={logout} disabled={leaving}><WorkspaceIcon name="logout" />{leaving ? 'Déconnexion…' : 'Se déconnecter'}</button>
          </div>
        </details> : <Link href="/login" className={styles.login}>Se connecter</Link>}
      </div>
    </nav>
    {message && <div role="alert" className={styles.error}><span>{message}</span><button type="button" className={styles.retry} onClick={() => { setFailure(null); setRetryKey(key => key + 1); }}>Réessayer</button></div>}
  </header>;
}
