'use client';
import type { TargetRect } from './types';
import styles from './dev-guide.module.css';
export function TutorialSpotlight({ rect }: { rect: TargetRect | null }) {
  if (!rect) return null;
  // Pointer-events remain off: the actual highlighted control stays usable.
  return <div aria-hidden="true" className={styles.spotlight} style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />;
}
