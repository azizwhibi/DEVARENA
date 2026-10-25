'use client';
import { forwardRef } from 'react';
import { ByteFallback } from './ByteFallback';
import { guideCopy as c } from './tutorialSteps';
import styles from './dev-guide.module.css';
export const GuideLauncher = forwardRef<HTMLButtonElement, { open(): void; bottom: number; blocked: boolean }>(function GuideLauncher({ open, bottom, blocked }, ref) {
  return <button type="button" ref={ref} onClick={open} disabled={blocked} className={styles.launcher} style={{ bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))` }} aria-label={blocked ? c.paused : c.launcher} title={blocked ? c.paused : c.launcher}><span className={styles.launcherArt} aria-hidden="true"><ByteFallback /></span><span>{c.launcher}</span></button>;
});
