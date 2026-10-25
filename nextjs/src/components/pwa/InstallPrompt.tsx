'use client';

import { usePathname } from 'next/navigation';
import { InstallButton } from './InstallButton';
import { useInstall } from './InstallProvider';
import styles from './Install.module.css';

export function InstallPrompt() {
  const pathname = usePathname();
  const { installed, available, platform, bannerDismissed, busy, error, message, dismissBanner } = useInstall();
  if (pathname === '/' || installed || bannerDismissed) return null;
  if (!available && platform === 'browser' && !busy && !error && !message) return null;
  return (
    <aside aria-label="Install DevArena" className="pwa-install">
      <p className="flex-1 leading-6">
        Keep DevArena one tap away. Install it from your browser.
      </p>
      <InstallButton />
      <button
        type="button"
        onClick={dismissBanner}
        className={styles.dismissButton}
      >
        Dismiss
      </button>
    </aside>
  );
}
