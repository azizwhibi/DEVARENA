'use client';
import dynamic from 'next/dynamic';
import { usePathname, useRouter } from 'next/navigation';
import { Component, useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { guideReducer, initialState, readPreferences, routeMatches, savePreferences, defaults } from './guideMachine';
import { guideCopy, tutorialSteps } from './tutorialSteps';
import { boundedTargetRect, waitForTarget } from './tourTarget';
import { useGuideEnvironment } from './useGuideEnvironment';
import { ByteFallback } from './ByteFallback';
import { GuideLauncher } from './GuideLauncher';
import { TutorialCard } from './TutorialCard';
import { TutorialSpotlight } from './TutorialSpotlight';
import type { TargetRect, Direction } from './types';

const GuideCanvas = dynamic(() => import('./GuideCanvas'), { ssr: false, loading: () => <ByteFallback /> });
class MascotBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ByteFallback /> : this.props.children; }
}
export function DevGuide({ userId }: { userId: string }) {
  const pathname = usePathname(), router = useRouter();
  const [state, dispatch] = useReducer(guideReducer, initialState);
  const [target, setTarget] = useState<{ stepId: string; rect: TargetRect } | null>(null);
  const [mascotPosition, setMascotPosition] = useState<Direction>({ x: 0, y: 0 });
  const onMascotPosition = useCallback((position: Direction) => setMascotPosition(current => Math.abs(current.x - position.x) < .5 && Math.abs(current.y - position.y) < .5 ? current : position), []);
  const launcher = useRef<HTMLButtonElement>(null), previousFocus = useRef<HTMLElement | null>(null), focusFrame = useRef(0);
  const environment = useGuideEnvironment();
  const initialPath = useRef(pathname);
  const step = tutorialSteps[state.step];
  const adminPage = pathname.startsWith('/admin');
  const active = state.mode === 'tour' && !adminPage;
  const open = (state.mode === 'invitation' || active) && !adminPage && !environment.blocked;
  const reduced = state.preferences.motion === 'reduced' || (state.preferences.motion === 'system' && environment.reduced);
  const rect = active && state.phase === 'ready' && target?.stepId === step.id && routeMatches(pathname, step.route) ? target.rect : null;

  useEffect(() => {
    let preferences = { ...defaults };
    try { preferences = readPreferences(window.localStorage, userId); } catch { /* Private mode may deny localStorage access. */ }
    dispatch({ type: 'LOAD', preferences, invite: !initialPath.current.startsWith('/admin') });
  }, [userId]);
  useEffect(() => {
    if (state.mode === 'boot') return;
    try { savePreferences(window.localStorage, userId, state.preferences); } catch { /* The tour still works in memory. */ }
  }, [userId, state.preferences, state.mode]);
  useEffect(() => () => cancelAnimationFrame(focusFrame.current), []);
  const restoreFocus = useCallback(() => {
    cancelAnimationFrame(focusFrame.current);
    focusFrame.current = requestAnimationFrame(() => {
      const prior = previousFocus.current;
      (prior?.isConnected && prior !== document.body ? prior : launcher.current)?.focus({ preventScroll: true });
    });
  }, []);
  useEffect(() => {
    if (!open) return;
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !environment.blocked) { dispatch({ type: 'CLOSE' }); restoreFocus(); }
    }
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [open, environment.blocked, restoreFocus]);

  useEffect(() => {
    if (!active || state.phase !== 'navigating' || environment.blocked) return;
    if (routeMatches(pathname, step.route)) { dispatch({ type: 'ROUTE_READY', stepId: step.id }); return; }
    // Navigation is requested once per transition; Next stays disabled until route + target settle.
    router.push(step.route, { scroll: false });
    const timer = setTimeout(() => dispatch({ type: 'ROUTE_TIMEOUT', stepId: step.id }), 8000);
    return () => clearTimeout(timer);
  }, [active, state.phase, step, pathname, router, environment.blocked]);
  useEffect(() => {
    if (state.mode !== 'tour') return;
    // Following a real control is allowed. Don't pull the user back to the previous tour route.
    if (adminPage || (state.phase === 'ready' && !routeMatches(pathname, step.route))) dispatch({ type: 'CLOSE' });
  }, [pathname, step, state.mode, state.phase, adminPage]);

  useEffect(() => {
    if (!active || !routeMatches(pathname, step.route) || !['targeting', 'ready'].includes(state.phase) || environment.blocked) return;
    const controller = new AbortController();
    let resize: ResizeObserver | undefined, mutations: MutationObserver | undefined, frame = 0;
    function find() {
      const element = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      // A mobile drawer is intentionally not opened by the tutorial. Use a centered card.
      return bounds.width > 0 && bounds.height > 0 && bounds.left + bounds.width > 0 && bounds.left < innerWidth && getComputedStyle(element).visibility !== 'hidden' ? element : null;
    }
    function update() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const element = find();
        const rect = element && boundedTargetRect(element.getBoundingClientRect(), { width: innerWidth, height: innerHeight });
        setTarget(current => {
          if (!rect) return current === null ? current : null;
          if (current?.stepId === step.id && Object.keys(rect).every(key => Math.abs(current.rect[key as keyof TargetRect] - rect[key as keyof TargetRect]) < .5)) return current;
          return { stepId: step.id, rect };
        });
      });
    }
    void waitForTarget(find, controller.signal).then(element => {
      if (controller.signal.aborted) return;
      if (element) {
        element.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: reduced ? 'instant' : 'smooth' });
        resize = new ResizeObserver(update); resize.observe(element);
      }
      mutations = new MutationObserver(update); mutations.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden'] });
      dispatch({ type: 'TARGET_READY', stepId: step.id, missing: !element });
      update();
    });
    window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
    return () => { controller.abort(); resize?.disconnect(); mutations?.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [active, state.phase, step, pathname, environment.blocked, reduced]);

  if (state.mode === 'boot' || adminPage) return null;
  const dx = rect ? rect.left + rect.width / 2 - mascotPosition.x : 0;
  const dy = rect ? mascotPosition.y - rect.top - rect.height / 2 : .2;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const direction = { x: dx / distance, y: dy / distance };
  return <>
    {!open && <GuideLauncher ref={launcher} bottom={environment.bottom} blocked={environment.blocked} open={() => { previousFocus.current = document.activeElement as HTMLElement; dispatch({ type: 'OPEN' }); }} />}
    {open && <>
      <TutorialSpotlight rect={rect} />
      <TutorialCard state={state} dispatch={dispatch} centered={state.mode === 'tour' && (state.phase === 'failed' || (state.phase === 'ready' && !rect))} bottom={environment.bottom} restoreFocus={restoreFocus} onMascotPosition={onMascotPosition} mascot={state.mode === 'invitation' || reduced || !environment.visible ? <ByteFallback /> : <MascotBoundary><GuideCanvas gesture={step.gesture} direction={direction} active={open && environment.visible} /></MascotBoundary>} />
    </>}
    <span className="sr-only" aria-live="polite">{environment.blocked && state.mode === 'tour' ? guideCopy.paused : ''}</span>
  </>;
}
