'use client';

import { Check, Download, LoaderCircle } from 'lucide-react';
import { useInstall } from './InstallProvider';
import styles from './Install.module.css';

export function InstallButton({ className = '' }: { className?: string }) {
  const { installed, busy, error, message, requestInstall } = useInstall();
  const Icon = installed ? Check : busy ? LoaderCircle : Download;
  return (
    <div className={styles.buttonGroup}>
      <button
        type="button"
        className={`${styles.button} ${className}`.trim()}
        disabled={busy || installed}
        aria-busy={busy || undefined}
        onClick={(event) => { void requestInstall(event.currentTarget); }}
      >
        <Icon size={18} strokeWidth={1.5} aria-hidden="true" className={busy ? styles.spinner : undefined} />
        {installed ? 'App installed' : busy ? 'Opening installation…' : 'Install DevArena'}
      </button>
      {error ? <p className={styles.error} role="alert">{error}</p> : null}
      {message && !error ? <p className={styles.feedback} role="status">{message}</p> : null}
    </div>
  );
}
