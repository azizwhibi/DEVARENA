import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as duelState from '../src/lib/duelState.ts';
import { DEFAULT_DUEL_QUESTIONS } from '../src/lib/duelQuestions.ts';

// Execute the actual hook and its effects; Auth and sockets never leave this process.
const compiled = ts.transpileModule(
  readFileSync(new URL('../src/hooks/useQuizDuel.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

function mount() {
  const slots = [], effects = [], sockets = [], timers = new Map();
  let cursor = 0, timerId = 0, dirty = false, value;
  const same = (a, b) => a?.length === b?.length && a.every((item, i) => item === b[i]);
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => {
        const updated = typeof next === 'function' ? next(slots[index]) : next;
        dirty ||= updated !== slots[index];
        slots[index] = updated;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      slots[index] ??= { current: initial };
      return slots[index];
    },
    useCallback(callback, dependencies) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies)) slots[index] = { dependencies, callback };
      return slots[index].callback;
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      if (!same(slots[index]?.dependencies, dependencies)) {
        slots[index]?.cleanup?.();
        effects.push(() => { slots[index] = { dependencies, cleanup: effect() }; });
      }
    },
  };
  class LocalSocket {
    static OPEN = 1;
    readyState = 0;
    constructor() { sockets.push(this); }
    send() {}
    close() { this.readyState = 3; }
    open() { this.readyState = 1; this.onopen?.(); }
    message(type, payload) { this.onmessage?.({ data: JSON.stringify({ type, payload }) }); }
    disconnect() { this.readyState = 3; this.onclose?.({ code: 1006 }); }
  }
  const schedule = (callback, delay) => {
    const id = ++timerId;
    timers.set(id, { callback, delay });
    return id;
  };
  const cancel = (id) => timers.delete(id);
  const sandbox = {
    exports: {}, URL, Date,
    process: { env: { NEXT_PUBLIC_API_URL: 'http://localhost:3000' } },
    navigator: { onLine: true }, WebSocket: LocalSocket,
    window: { setTimeout: schedule, setInterval: schedule },
    clearTimeout: cancel, clearInterval: cancel,
    require(name) {
      if (name === 'react') return react;
      if (name === '@/lib/duelState') return duelState;
      if (name === '@/lib/duelQuestions') return { DEFAULT_DUEL_QUESTIONS };
      if (name === '@/lib/rankings') return { parseRankPromotion: () => null };
      if (name === '@/lib/supabase/client') return {
        createClient: () => ({ auth: { getSession: async () => ({
          data: { session: { access_token: 'isolated-test-session' } }, error: null,
        }) } }),
      };
      throw new Error(`Unexpected hook dependency: ${name}`);
    },
  };
  vm.runInNewContext(compiled, sandbox);
  const render = () => {
    let passes = 0;
    do {
      assert.ok(++passes < 20, 'Hook effects settle without a render loop');
      dirty = false;
      cursor = 0;
      value = sandbox.exports.useQuizDuel('alice', 'Alice');
      while (effects.length) effects.shift()();
    } while (dirty);
    return value;
  };
  render();
  return {
    render, timers,
    async connect() {
      await value.startOnline();
      render();
      const socket = sockets.at(-1);
      assert.ok(socket, 'An authenticated local socket was created');
      socket.open();
      socket.message('DUEL_AUTHENTICATED', { playerId: 'alice' });
      render();
      return socket;
    },
    finish(socket, duelId) {
      socket.message('DUEL_MATCH_FOUND', {
        duelId, player: { id: 'alice', name: 'Alice' }, opponent: { id: 'bob', name: 'Bob' },
      });
      render();
      socket.message('DUEL_MATCH_END', {
        duelId, winnerId: 'alice', finalStats: {
          player: duelState.emptyStats('Alice'), opponent: duelState.emptyStats('Bob'),
        },
      });
      return render().state;
    },
    timer() {
      const entry = [...timers.entries()].find(([, timer]) => timer.delay === 30_000);
      assert.ok(entry, 'A pending finished duel has a bounded 30-second ranking wait');
      return { id: entry[0], ...entry[1] };
    },
    fire(timer) {
      timers.delete(timer.id);
      timer.callback();
      return render().state;
    },
    unmount() {
      for (const slot of slots) slot?.cleanup?.();
      assert.equal(timers.size, 0, 'Unmount clears all ranking lifecycle timers');
    },
  };
}
const rating = (duelId) => ({ duelId, delta: 20, rating: 1220, competitivePoints: 732 });

const timeout = mount();
const firstSocket = await timeout.connect();
assert.equal(timeout.finish(firstSocket, 'first').ratingStatus, 'pending');
assert.equal(timeout.fire(timeout.timer()).ratingStatus, 'failed', 'A stalled ranking leaves pending');
firstSocket.message('DUEL_RATING_UPDATED', rating('first'));
assert.equal(timeout.render().state.ratingStatus, 'saved', 'Late authoritative success recovers after timeout');
assert.equal(timeout.render().state.ratingUpdate.rating, 1220);
timeout.unmount();

const stale = mount();
const secondSocket = await stale.connect();
stale.finish(secondSocket, 'old');
const oldTimer = stale.timer();
stale.finish(secondSocket, 'new');
assert.equal(stale.timers.has(oldTimer.id), false, 'A newer match cancels the older ranking timer');
oldTimer.callback(); // Also cover an already queued callback after cleanup.
assert.equal(stale.render().state.duelId, 'new');
assert.equal(stale.render().state.ratingStatus, 'pending', 'An old queued callback cannot fail the new match');
assert.equal(stale.fire(stale.timer()).ratingStatus, 'failed', 'The new match retains its own timeout');
stale.unmount();

const disconnected = mount();
const thirdSocket = await disconnected.connect();
disconnected.finish(thirdSocket, 'disconnect-pending');
thirdSocket.disconnect();
assert.equal(disconnected.render().state.ratingStatus, 'failed', 'Disconnect resolves pending ranking honestly');
assert.equal(disconnected.render().state.phase, 'finished', 'Disconnect preserves the match outcome');
assert.equal(disconnected.timers.size, 0, 'Disconnect cancels the ranking timeout');
disconnected.unmount();

const saved = mount();
const fourthSocket = await saved.connect();
saved.finish(fourthSocket, 'disconnect-saved');
fourthSocket.message('DUEL_RATING_UPDATED', rating('disconnect-saved'));
assert.equal(saved.render().state.ratingStatus, 'saved');
fourthSocket.disconnect();
assert.equal(saved.render().state.ratingStatus, 'saved', 'Disconnect cannot undo persisted success');
assert.equal(saved.render().state.ratingUpdate.rating, 1220);
saved.unmount();

console.log('PASS: actual duel hook timeout, late success, stale timer isolation, pending/saved disconnect and cleanup.');
