import { tutorialSteps } from './tutorialSteps';
import type { MotionPreference } from './types';

export type Preferences = { version: 1; completed: boolean; dismissed: boolean; stepId: string; motion: MotionPreference };
export type GuideState = { mode: 'boot' | 'closed' | 'invitation' | 'tour'; phase: 'navigating' | 'targeting' | 'ready' | 'failed'; step: number; missing: boolean; preferences: Preferences };
export type GuideEvent =
  | { type: 'LOAD'; preferences: Preferences; invite: boolean }
  | { type: 'OPEN' | 'ACCEPT' | 'CLOSE' | 'NEXT' | 'BACK' | 'REPLAY' | 'FINISH' | 'RETRY' }
  | { type: 'ROUTE_READY' | 'ROUTE_TIMEOUT' | 'TARGET_READY'; stepId: string; missing?: boolean }
  | { type: 'MOTION'; value: MotionPreference };
export const defaults: Preferences = { version: 1, completed: false, dismissed: false, stepId: tutorialSteps[0].id, motion: 'system' };
export const initialState: GuideState = { mode: 'boot', phase: 'navigating', step: 0, missing: false, preferences: defaults };
export function guideStorageKey(userId: string) { return `devarena:byte:v1:${encodeURIComponent(userId)}`; }
type StorageReader = { getItem(key: string): string | null };
type StorageWriter = { setItem(key: string, value: string): void };
export function readPreferences(storage: StorageReader, userId: string): Preferences {
  try {
    const data = JSON.parse(storage.getItem(guideStorageKey(userId)) ?? 'null');
    if (!data || data.version !== 1 || typeof data.completed !== 'boolean' || typeof data.dismissed !== 'boolean' || !tutorialSteps.some(step => step.id === data.stepId) || !['system', 'reduced', 'full'].includes(data.motion)) return { ...defaults };
    return { version: 1, completed: data.completed, dismissed: data.dismissed, stepId: data.stepId, motion: data.motion };
  } catch { return { ...defaults }; }
}
export function savePreferences(storage: StorageWriter, userId: string, preferences: Preferences) {
  try { storage.setItem(guideStorageKey(userId), JSON.stringify(preferences)); return true; } catch { return false; }
}
export function routeMatches(pathname: string, route: string) { return pathname.replace(/\/$/, '') === route; }
export function guideReducer(state: GuideState, event: GuideEvent): GuideState {
  function move(step: number): GuideState {
    return { ...state, mode: 'tour', phase: 'navigating', step, missing: false, preferences: { ...state.preferences, stepId: tutorialSteps[step].id, dismissed: true } };
  }
  switch (event.type) {
    case 'LOAD': return { ...initialState, step: tutorialSteps.findIndex(step => step.id === event.preferences.stepId), preferences: event.preferences, mode: event.invite && !event.preferences.dismissed && !event.preferences.completed ? 'invitation' : 'closed' };
    case 'OPEN': return move(state.preferences.completed ? 0 : state.step);
    case 'ACCEPT': case 'REPLAY': return move(0);
    case 'CLOSE': return { ...state, mode: 'closed', preferences: { ...state.preferences, dismissed: true } };
    case 'MOTION': return { ...state, preferences: { ...state.preferences, motion: event.value } };
    case 'FINISH': return state.mode === 'tour' && state.step === tutorialSteps.length - 1 && ['ready', 'failed'].includes(state.phase) ? { ...state, mode: 'closed', preferences: { ...state.preferences, completed: true, dismissed: true } } : state;
    case 'NEXT': return state.mode === 'tour' && ['ready', 'failed'].includes(state.phase) && state.step < tutorialSteps.length - 1 ? move(state.step + 1) : state;
    case 'BACK': return state.mode === 'tour' && ['ready', 'failed'].includes(state.phase) && state.step > 0 ? move(state.step - 1) : state;
    case 'RETRY': return state.mode === 'tour' ? move(state.step) : state;
    case 'ROUTE_READY': return state.mode === 'tour' && state.phase === 'navigating' && tutorialSteps[state.step].id === event.stepId ? { ...state, phase: 'targeting' } : state;
    case 'ROUTE_TIMEOUT': return state.mode === 'tour' && state.phase === 'navigating' && tutorialSteps[state.step].id === event.stepId ? { ...state, phase: 'failed', missing: true } : state;
    case 'TARGET_READY': return state.mode === 'tour' && state.phase === 'targeting' && tutorialSteps[state.step].id === event.stepId ? { ...state, phase: 'ready', missing: Boolean(event.missing) } : state;
  }
}
