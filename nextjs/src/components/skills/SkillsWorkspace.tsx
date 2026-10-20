'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createContext, useContext, useEffect, useState } from 'react';
import { apiRequest } from '@/lib/api';
import type { AuthUser } from '@/lib/api-core';
import { WorkspaceIcon } from './WorkspaceIcon';
import styles from './workspace.module.css';
type Account = AuthUser & {
    username: string;
};
const AccountContext = createContext<Account | null>(null);
export function useSkillsAccount() {
    const account = useContext(AccountContext);
    if (!account)
        throw new Error('Skills account is unavailable');
    return account;
}
const navigation = [
    { href: '/dashboard', label: 'Tableau de bord', icon: 'overview' },
    { href: '/my-skills', label: 'Compétences', icon: 'skills' },
    { href: '/discover', label: 'Technologies', icon: 'layers' },
    { href: '/arena', label: 'Défis', icon: 'practice' },
    { href: '/coach', label: 'Coach IA', icon: 'coach' },
    { href: '/knowledge', label: 'Connaissances', icon: 'knowledge' },
    { href: '/marketplace', label: 'Marketplace', icon: 'marketplace' },
] as const;
const administration = [
    { href: '/admin/knowledge', label: 'Ressources', icon: 'knowledge' },
    { href: '/admin/skills', label: 'Gestion des compétences', icon: 'layers' },
    { href: '/admin/skill-associations', label: 'Associations', icon: 'links' },
    { href: '/admin/users', label: 'Utilisateurs', icon: 'users' },
] as const;
export function SkillsWorkspace({ children }: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const [account, setAccount] = useState<Account | null>(null);
    const [failure, setFailure] = useState('');
    const [menuOpen, setMenuOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        void apiRequest<Account>('/me/profile', { signal: controller.signal })
            .then(value => { if (!controller.signal.aborted)
            setAccount(value); })
            .catch(() => { if (!controller.signal.aborted)
            setFailure('Compte indisponible. Réessayez.'); });
        const onFailure = (event: Event) => setFailure((event as CustomEvent<string>).detail);
        window.addEventListener('skills-request-error', onFailure);
        return () => { controller.abort(); window.removeEventListener('skills-request-error', onFailure); };
    }, []);
    useEffect(() => {
        document.documentElement.dataset.sidebarCollapsed = String(collapsed);
        return () => { delete document.documentElement.dataset.sidebarCollapsed; };
    }, [collapsed]);
    useEffect(() => {
        if (!menuOpen)
            return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [menuOpen]);
    const adminRoute = pathname.startsWith('/admin/');
    const groups = account?.role === 'admin' ? [{ title: '', links: navigation }, { title: 'Administration', links: administration }] : [{ title: '', links: navigation }];
    return <div className="skills-workspace">
    <AccountContext.Provider value={account}>
      <div className="app-shell">
        <div className={styles.mobileBar}><button type="button" className={styles.toggle} aria-label="Ouvrir la navigation" aria-controls="workspace-navigation" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><WorkspaceIcon name="menu"/></button></div>
        {menuOpen && <button type="button" className={styles.backdrop} aria-label="Fermer la navigation" onClick={() => setMenuOpen(false)}/>}
        <aside id="workspace-navigation" className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${menuOpen ? styles.open : ''}`} onKeyDown={event => { if (event.key === 'Escape')
        setMenuOpen(false); }}>
          <div className={styles.tools}>
            <button type="button" className={`${styles.toggle} ${styles.desktopToggle}`} aria-label={collapsed ? 'Développer la navigation' : 'Réduire la navigation'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}><WorkspaceIcon name={collapsed ? 'expand' : 'collapse'}/></button>
            <button type="button" className={`${styles.toggle} ${styles.mobileToggle}`} aria-label="Fermer la navigation" onClick={() => setMenuOpen(false)}><WorkspaceIcon name="collapse"/></button>
          </div>
          <nav className={styles.navigation} aria-label="Navigation principale">
            {groups.map(group => <div className={styles.group} key={group.title}>
              {group.title && <p className={styles.groupTitle}>{group.title}</p>}
              {group.links.map(link => {
                const active = pathname === link.href || (link.href === '/my-skills' && pathname.startsWith('/skills/')) || ((link.href === '/knowledge' || link.href === '/admin/knowledge') && pathname.startsWith(link.href + '/'));
                return <Link key={link.href} href={link.href} aria-current={active ? 'page' : undefined} aria-label={link.label} title={link.label} onClick={() => setMenuOpen(false)} className={`${styles.link} ${active ? styles.active : ''}`}><WorkspaceIcon name={link.icon}/><span className={styles.label}>{link.label}</span></Link>;
            })}
            </div>)}
          </nav>
          <div className={styles.footer}><Link href="/profile/settings" className={styles.link} aria-label="Paramètres du profil" title="Paramètres du profil" onClick={() => setMenuOpen(false)}><WorkspaceIcon name="settings"/><span className={styles.label}>Paramètres du profil</span></Link></div>
        </aside>
        <main className={styles.main}>
          {failure && <div role="alert" className="workspace-alert">{failure}<button type="button" className="btn btn-ghost" onClick={() => window.location.reload()}>Réessayer</button></div>}
          {!account ? (!failure && <div className="page-container" role="status" aria-label="Chargement du compte"><div className="skeleton skeleton-title"/><div className="skeleton skeleton-panel"/></div>)
            : adminRoute && account.role !== 'admin' ? <div className="page-container"><h1 className="page-title">Accès réservé</h1><Link href="/dashboard" className="btn btn-ghost">Retour au tableau de bord</Link></div> : children}
        </main>
      </div>
    </AccountContext.Provider>
  </div>;
}
