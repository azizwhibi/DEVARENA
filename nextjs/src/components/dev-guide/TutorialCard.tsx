'use client';
import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { X, ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { guideCopy as c, tutorialSteps } from './tutorialSteps';
import type { GuideEvent, GuideState } from './guideMachine';
import styles from './dev-guide.module.css';
import type { Direction } from './types';

export function TutorialCard({ state, dispatch, mascot, centered, bottom, restoreFocus, onMascotPosition }: { state: GuideState; dispatch(event: GuideEvent): void; mascot: ReactNode; centered: boolean; bottom: number; restoreFocus(): void; onMascotPosition(position: Direction): void }) {
  const title = useRef<HTMLHeadingElement>(null);
  const mascotElement = useRef<HTMLDivElement>(null);
  const invitation = state.mode === 'invitation', step = tutorialSteps[state.step];
  const waiting = !invitation && !['ready', 'failed'].includes(state.phase);
  const last = state.step === tutorialSteps.length - 1;
  useEffect(() => {
    // A non-modal dialog: no focus trap, so highlighted controls remain keyboard accessible.
    title.current?.focus({ preventScroll: true });
  }, [state.step, state.mode]);
  useEffect(() => {
    const element = mascotElement.current;
    if (!element) return;
    function measure() {
      const rect = element!.getBoundingClientRect();
      onMascotPosition({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
    }
    const observer = new ResizeObserver(measure); observer.observe(element);
    const card = element.closest('[data-dev-guide-card]');
    card?.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure); measure();
    return () => { observer.disconnect(); card?.removeEventListener('scroll', measure); window.removeEventListener('resize', measure); };
  }, [onMascotPosition, bottom, centered, state.step, state.phase]);
  function close() { dispatch({ type: 'CLOSE' }); restoreFocus(); }
  return <section role="dialog" aria-modal="false" aria-labelledby="byte-guide-title" aria-describedby="byte-guide-description" data-dev-guide-card className={`${styles.card} ${centered ? styles.centered : ''}`} style={{ bottom: `calc(${bottom}px + env(safe-area-inset-bottom, 0px))`, maxHeight: `calc(100dvh - ${bottom + 88}px - env(safe-area-inset-bottom, 0px))` }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(); } }}>
    <div className={styles.cardTop}><span className={styles.eyebrow}>{c.name} <span>{c.optional}</span></span><button className={styles.iconButton} type="button" aria-label={c.close} onClick={close}><X size={18} strokeWidth={1.5} /></button></div>
    <div className={styles.presentation}><div className={styles.mascot} ref={mascotElement} aria-hidden="true">{mascot}</div><div className={styles.text}>
      <h2 ref={title} tabIndex={-1} id="byte-guide-title">{invitation ? c.launcher : step.title}</h2>
      <p id="byte-guide-description">{invitation ? c.invitation : step.description}</p>
    </div></div>
    {!invitation && <><div className={styles.progress} aria-hidden="true">{tutorialSteps.map((item, index) => <span key={item.id} data-done={index <= state.step} />)}</div><p className={styles.status} role="status" aria-live="polite" aria-atomic="true">{c.progress} {state.step + 1} {c.of} {tutorialSteps.length}{waiting ? ` · ${state.phase === 'navigating' ? c.loading : c.locating}` : ''}</p>
      {state.phase === 'failed' ? <p className={styles.notice}>{c.routeFailed} <button type="button" className={styles.textButton} onClick={() => dispatch({ type: 'RETRY' })}>{c.retry}</button></p> : state.missing && <p className={styles.notice}>{c.missing}</p>}
    </>}
    <div className={styles.actions}>{invitation ? <><button type="button" className={styles.secondary} onClick={close}>{c.later}</button><button type="button" className={styles.primary} onClick={() => dispatch({ type: 'ACCEPT' })}>{c.start}<ArrowRight size={16} strokeWidth={1.5} /></button></> : <>
      <button type="button" className={styles.secondary} disabled={waiting || state.step === 0} onClick={() => dispatch({ type: 'BACK' })}><ArrowLeft size={16} strokeWidth={1.5} />{c.back}</button>
      <button type="button" className={styles.primary} disabled={waiting} onClick={() => { if (last) { dispatch({ type: 'FINISH' }); restoreFocus(); } else dispatch({ type: 'NEXT' }); }}>{last ? c.finish : c.next}<ArrowRight size={16} strokeWidth={1.5} /></button>
    </>}</div>
    {!invitation && <div className={styles.extraActions}><button type="button" className={styles.textButton} onClick={close}>{c.skip}</button><button type="button" className={styles.textButton} onClick={() => dispatch({ type: 'REPLAY' })}><RotateCcw size={16} strokeWidth={1.5} />{c.replay}</button>{last && !waiting && <Link href="/profile/settings" className={styles.textButton} onClick={() => dispatch({ type: 'FINISH' })}>{c.settings}</Link>}</div>}
    <label className={styles.motion}>{c.motion}<select value={state.preferences.motion} onChange={event => dispatch({ type: 'MOTION', value: event.target.value as GuideState['preferences']['motion'] })}><option value="system">{c.system}</option><option value="reduced">{c.reduced}</option><option value="full">{c.full}</option></select></label>
  </section>;
}
