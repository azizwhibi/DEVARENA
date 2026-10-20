import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

registerHooks({ resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts')) {
    const candidate = new URL(`${specifier}.ts`, context.parentURL);
    if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
  }
  return nextResolve(specifier, context);
} });
const { defaults, initialState, guideReducer: reduce, readPreferences, savePreferences, guideStorageKey, routeMatches } = await import('../src/components/dev-guide/guideMachine.ts');
const { tutorialSteps: steps } = await import('../src/components/dev-guide/tutorialSteps.ts');
const { boundedTargetRect, waitForTarget } = await import('../src/components/dev-guide/tourTarget.ts');
const { gestureDuration } = await import('../src/components/dev-guide/gestureConfig.ts');
let checks = 0;
function check(name, run) { run(); checks++; console.log(`PASS: ${name}`); }
const load = (preferences = defaults, invite = true) => reduce(initialState, { type: 'LOAD', preferences, invite });
const route = state => reduce(state, { type: 'ROUTE_READY', stepId: steps[state.step].id });
const ready = state => reduce(route(state), { type: 'TARGET_READY', stepId: steps[state.step].id });
check('First visit invites without starting navigation', () => assert.equal(load().mode, 'invitation'));
check('Administration never auto-invites', () => assert.equal(load(defaults, false).mode, 'closed'));
check('Dismissal is remembered; opening resumes deliberately', () => {
  const dismissed = reduce(load(), { type: 'CLOSE' }); assert.equal(load(dismissed.preferences).mode, 'closed');
  assert.equal(reduce(dismissed, { type: 'OPEN' }).mode, 'tour');
});
check('Next cannot race ahead of route or target', () => {
  const started = reduce(load(), { type: 'ACCEPT' }); assert.equal(started.phase, 'navigating');
  assert.equal(reduce(started, { type: 'NEXT' }), started);
  const targeted = route(started); assert.equal(reduce(targeted, { type: 'NEXT' }), targeted);
  assert.equal(reduce(ready(started), { type: 'NEXT' }).step, 1);
});
check('Stale route and target notifications cannot unlock another step', () => {
  const s = reduce(ready(reduce(load(), { type: 'ACCEPT' })), { type: 'NEXT' });
  assert.equal(reduce(s, { type: 'ROUTE_READY', stepId: steps[0].id }), s);
  assert.equal(reduce(route(s), { type: 'TARGET_READY', stepId: steps[0].id }).phase, 'targeting');
});
check('Missing targets settle and allow continuing', () => {
  const s = route(reduce(load(), { type: 'ACCEPT' }));
  const missing = reduce(s, { type: 'TARGET_READY', stepId: steps[0].id, missing: true });
  assert.equal(missing.missing, true); assert.equal(reduce(missing, { type: 'NEXT' }).step, 1);
});
check('Route timeouts unlock retry or skipping without claiming success', () => {
  const s = reduce(reduce(load(), { type: 'ACCEPT' }), { type: 'ROUTE_TIMEOUT', stepId: steps[0].id });
  assert.equal(s.phase, 'failed'); assert.equal(reduce(s, { type: 'RETRY' }).phase, 'navigating');
  assert.equal(reduce(s, { type: 'NEXT' }).step, 1);
});
check('Back, completion and replay use valid boundaries', () => {
  let s = ready(reduce(load(), { type: 'ACCEPT' })); assert.equal(reduce(s, { type: 'BACK' }), s);
  assert.equal(reduce(s, { type: 'FINISH' }), s);
  for (let i = 1; i < steps.length; i++) s = ready(reduce(s, { type: 'NEXT' }));
  s = reduce(s, { type: 'FINISH' }); assert.equal(s.preferences.completed, true); assert.equal(s.mode, 'closed');
  assert.equal(load(s.preferences).mode, 'closed'); assert.equal(reduce(s, { type: 'OPEN' }).step, 0);
});
const values = new Map(); const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
check('Preferences are versioned and isolated by account ID', () => {
  const prefs = { ...defaults, stepId: 'saved', motion: 'reduced', dismissed: true };
  assert.equal(savePreferences(storage, 'alice', prefs), true);
  assert.deepEqual(readPreferences(storage, 'alice'), prefs); assert.deepEqual(readPreferences(storage, 'bob'), defaults);
  assert.notEqual(guideStorageKey('a:b'), guideStorageKey('a%3Ab'));
  assert.deepEqual(Object.keys(JSON.parse(values.get(guideStorageKey('alice')))).sort(), ['completed', 'dismissed', 'motion', 'stepId', 'version']);
});
check('Corrupt, wrong-version and invalid progress never break onboarding', () => {
  for (const value of ['{', '{}', JSON.stringify({ ...defaults, version: 2 }), JSON.stringify({ ...defaults, stepId: 'unknown' }), JSON.stringify({ ...defaults, motion: 'unexpected' })]) {
    storage.setItem(guideStorageKey('broken'), value); assert.deepEqual(readPreferences(storage, 'broken'), defaults);
  }
});
check('Storage access failures gracefully fall back to memory', () => {
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('denied'); } };
  assert.deepEqual(readPreferences(denied, 'a'), defaults); assert.equal(savePreferences(denied, 'a', defaults), false);
});
check('Exact route matching cannot mistake resource detail for catalogue', () => {
  assert.equal(routeMatches('/knowledge/', '/knowledge'), true); assert.equal(routeMatches('/knowledge/saved', '/knowledge'), false);
});
check('Spotlights clamp to viewport and ignore invisible targets', () => {
  assert.equal(boundedTargetRect({ left: -300, top: 100, width: 240, height: 40 }, { width: 390, height: 800 }), null);
  const rect = boundedTargetRect({ left: 10, top: 40, width: 1000, height: 1500 }, { width: 390, height: 800 });
  assert.ok(rect.left >= 6 && rect.top >= 68 && rect.left + rect.width <= 384 && rect.top + rect.height <= 794);
});
check('One-shot gesture durations are finite; idle can loop', () => {
  for (const [gesture, duration] of Object.entries(gestureDuration)) assert.equal(Number.isFinite(duration), gesture !== 'idle');
});
assert.equal(await waitForTarget(() => null, new AbortController().signal, 15), null); checks++;
const controller = new AbortController(); const aborted = waitForTarget(() => null, controller.signal, 1000); controller.abort(); assert.equal(await aborted, null); checks++;
const element = { id: 'late-target' }; let available = false;
const late = waitForTarget(() => available ? element : null, new AbortController().signal, 500);
setTimeout(() => { available = true; }, 10); assert.equal(await late, element); checks++;
console.log(`PASS: ${checks} BYTE checks, including bounded target waiting, cancellation and late mounting.`);
