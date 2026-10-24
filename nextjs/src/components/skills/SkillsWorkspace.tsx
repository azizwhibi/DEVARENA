'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAccount } from '@/components/AccountProvider';
import { AccountAvatar } from '@/components/AccountAvatar';
import { WorkspaceIcon } from './WorkspaceIcon';
import styles from './workspace.module.css';
import { DevGuideProvider } from '@/components/dev-guide/DevGuideProvider';
import { useWorkspaceDialogs } from './useWorkspaceDialogs';
export function useSkillsAccount() {
  const { account } = useAccount();
  if (!account) throw new Error('Skills account is unavailable');
  return account;
}
const navigation = [
  { href: '/dashboard', label: 'Dashboard', icon: 'overview' },
  { href: '/my-skills', label: 'Skills', icon: 'skills' },
  { href: '/discover', label: 'Technologies', icon: 'layers' },
  { href: '/arena', label: 'Challenges', icon: 'practice' },
  { href: '/knowledge', label: 'Knowledge', icon: 'knowledge' },
  { href: '/marketplace', label: 'Marketplace', icon: 'marketplace' },
  { href: '/duel', label: 'Battle Code', icon: 'battle' },
] as const;
const administration = [
  { href: '/admin/marketplace', label: 'Marketplace', icon: 'marketplace' },
  { href: '/admin/knowledge', label: 'Resources', icon: 'knowledge' },
  { href: '/admin/skills', label: 'Skill management', icon: 'layers' },
  { href: '/admin/skill-associations', label: 'Associations', icon: 'links' },
  { href: '/admin/users', label: 'Users', icon: 'users' },
] as const;
const recruiterNavigation = [
  { href: '/recruiter', label: 'Candidate Hub', icon: 'users' },
  { href: '/invitations', label: 'Interview Requests', icon: 'links' },
  { href: '/messages', label: 'Live Messages', icon: 'chat' },
] as const;
export function SkillsWorkspace({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  useWorkspaceDialogs();
  const { account, failure: accountFailure, retry } = useAccount();
  const [failure, setFailure] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    const onFailure = (event: Event) =>
      setFailure((event as CustomEvent<string>).detail);
    window.addEventListener('skills-request-error', onFailure);
    return () => {
      window.removeEventListener('skills-request-error', onFailure);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = String(collapsed);
    return () => {
      delete document.documentElement.dataset.sidebarCollapsed;
    };
  }, [collapsed]);
  const adminRoute = pathname.startsWith('/admin');
  const groups =
    account?.role === 'admin'
      ? [{ title: 'Administration', links: administration }]
      : account?.role === 'recruiter'
        ? [{ title: 'Talent & Recruiting', links: recruiterNavigation }]
        : [{ title: '', links: navigation }];
  return (
    <div className="skills-workspace">
      <div className="app-shell">
        <div className={styles.mobileBar}>
          <button
            type="button"
            className={styles.toggle}
            aria-label="Open navigation"
            aria-controls="workspace-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <WorkspaceIcon name="menu" />
          </button>
        </div>
        {menuOpen && (
          <button
            type="button"
            className={styles.backdrop}
            aria-label="Close navigation"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <aside
          id="workspace-navigation"
          role={menuOpen ? 'dialog' : undefined}
          aria-modal={menuOpen || undefined}
          aria-label="Main navigation"
          data-guide-modal={menuOpen ? 'true' : undefined}
          className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${menuOpen ? styles.open : ''}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setMenuOpen(false);
          }}
        >
          <div className={styles.tools}>
            <button
              type="button"
              className={`${styles.toggle} ${styles.desktopToggle}`}
              aria-label={
                collapsed ? 'Expand navigation' : 'Collapse navigation'
              }
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
            >
              <WorkspaceIcon name={collapsed ? 'expand' : 'collapse'} />
            </button>
            <button
              type="button"
              className={`${styles.toggle} ${styles.mobileToggle}`}
              aria-label="Close navigation"
              onClick={() => setMenuOpen(false)}
            >
              <WorkspaceIcon name="collapse" />
            </button>
          </div>
          <nav className={styles.navigation} aria-label="Main navigation">
            {groups.map((group) => (
              <div className={styles.group} key={group.title}>
                {group.title && (
                  <p className={styles.groupTitle}>{group.title}</p>
                )}
                {group.links.map((link) => {
                  const active =
                    pathname === link.href ||
                    (link.href === '/my-skills' &&
                      pathname.startsWith('/skills/')) ||
                    ((link.href === '/knowledge' ||
                      link.href === '/admin/knowledge') &&
                      pathname.startsWith(link.href + '/'));
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      data-tour={`nav-${link.href.slice(1)}`}
                      aria-current={active ? 'page' : undefined}
                      aria-label={link.label}
                      title={link.label}
                      onClick={() => setMenuOpen(false)}
                      className={`${styles.link} ${active ? styles.active : ''}`}
                    >
                      <WorkspaceIcon name={link.icon} />
                      <span className={styles.label}>{link.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
          <div className={styles.footer}>
            {account?.role === 'admin' && (
              <Link href="/recruiter" className={styles.link}>
                <WorkspaceIcon name="users" />
                <span className={styles.label}>Candidate hub</span>
              </Link>
            )}
            <Link
              href="/profile/settings"
              data-tour="profile-settings"
              className={styles.link}
              onClick={() => setMenuOpen(false)}
            >
              <WorkspaceIcon name="settings" />
              <span className={styles.label}>Profile settings</span>
            </Link>
            {account && (
              <Link
                href="/profile"
                className={styles.identity}
                onClick={() => setMenuOpen(false)}
                aria-label="Your profile"
              >
                <AccountAvatar
                  account={account}
                  name={account.username}
                  className={styles.avatar}
                />
                <span className={styles.label}>
                  <strong>{account.username}</strong>
                  <small>{account.role}</small>
                </span>
              </Link>
            )}
          </div>
        </aside>
        <main className={styles.main} data-tour="workspace-content">
          {(failure || accountFailure) && (
            <div role="alert" className="workspace-alert">
              {failure || accountFailure}
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setFailure('');
                  retry();
                }}
              >
                Retry
              </button>
            </div>
          )}
          {!account ? (
            !(failure || accountFailure) && (
              <div
                className="page-container"
                role="status"
                aria-label="Loading account"
              >
                <div className="skeleton skeleton-title" />
                <div className="skeleton skeleton-panel" />
              </div>
            )
          ) : adminRoute && account.role !== 'admin' ? (
            <div className="page-container">
              <h1 className="page-title">Access restricted</h1>
              <Link
                href={
                  account.role === 'recruiter' ? '/recruiter' : '/dashboard'
                }
                className="btn btn-ghost"
              >
                {account.role === 'recruiter'
                  ? 'Back to candidate hub'
                  : 'Back to dashboard'}
              </Link>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      {account && <DevGuideProvider account={account} />}
    </div>
  );
}
