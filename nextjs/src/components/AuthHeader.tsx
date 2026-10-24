'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Zap } from 'lucide-react';
import { useAccount } from './AccountProvider';
import { AccountAvatar } from './AccountAvatar';
import { WorkspaceIcon } from '@/components/skills/WorkspaceIcon';
import styles from './auth-header.module.css';
export function AuthHeader() {
  const { user, loading, account, signOut, failure, retry } = useAccount();
  const [leaving, setLeaving] = useState(false);
  const [logoutFailure, setLogoutFailure] = useState('');
  const displayName = account?.username ?? user?.email ?? 'Account';
  async function logout() {
    setLeaving(true);
    try {
      await signOut();
    } catch {
      setLogoutFailure(
        'Unable to sign out. Check your connection and try again.',
      );
    } finally {
      setLeaving(false);
    }
  }
  return (
    <header className={styles.header}>
      <nav aria-label="Account navigation" className={styles.nav}>
        <Link
          href={user ? '/dashboard' : '/'}
          className={styles.brand}
          aria-label="DevArena home"
        >
          <span className={styles.brandMark}>
            <Zap size={20} strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className={styles.brandText}>DEVARENA</span>
        </Link>
        <div className={styles.status}>
          {account ? 'Your developer workspace' : 'Build. Practice. Progress.'}
        </div>
        <div className={styles.right}>
          {loading ? (
            <span
              role="status"
              aria-label="Loading account"
              className={styles.skeleton}
            />
          ) : user ? (
            <details
              className={styles.account}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.currentTarget.open = false;
                  event.currentTarget.querySelector('summary')?.focus();
                }
              }}
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                  event.currentTarget.open = false;
              }}
            >
              <summary
                className={styles.trigger}
                aria-label={'Account menu for ' + displayName}
              >
                <AccountAvatar account={account} name={displayName} className={styles.avatar} />
                <WorkspaceIcon name="chevron" size={16} />
              </summary>
              <div
                className={styles.dropdown}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a'))
                    event.currentTarget
                      .closest('details')
                      ?.removeAttribute('open');
                }}
              >
                <Link href="/profile" className={styles.item}>
                  <WorkspaceIcon name="user" />
                  My profile
                </Link>
                <Link href="/profile/settings" className={styles.item}>
                  <WorkspaceIcon name="settings" />
                  Settings
                </Link>
                {(account?.role === 'recruiter' ||
                  account?.role === 'admin') && (
                  <Link href="/recruiter" className={styles.item}>
                    <WorkspaceIcon name="users" />
                    Candidate hub
                  </Link>
                )}
                <button
                  type="button"
                  className={styles.item}
                  onClick={logout}
                  disabled={leaving}
                >
                  <WorkspaceIcon name="logout" />
                  {leaving ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </details>
          ) : (
            <Link href="/login" className={styles.login}>
              Sign in
            </Link>
          )}
        </div>
      </nav>
      {(failure || logoutFailure) && (
        <div role="alert" className={styles.error}>
          <span>{logoutFailure || failure}</span>
          <button
            type="button"
            className={styles.retry}
            onClick={() => {
              setLogoutFailure('');
              retry();
            }}
          >
            Retry
          </button>
        </div>
      )}
    </header>
  );
}
