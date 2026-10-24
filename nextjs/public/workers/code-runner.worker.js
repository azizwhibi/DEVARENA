/**
 * DevArena Client-Side Code Runner Web Worker
 * Executes JavaScript snippets in an isolated worker thread for offline challenge evaluation.
 */
self.addEventListener('message', event => {
  const { id, code, context = {} } = event.data || {};
  if (!id || typeof code !== 'string') return;

  const logs = [];
  const fakeConsole = {
    log: (...args) => logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    warn: (...args) => logs.push('[WARN] ' + args.join(' ')),
    error: (...args) => logs.push('[ERROR] ' + args.join(' ')),
  };

  const start = performance.now();
  try {
    // Create isolated runner function with sandboxed console and parameters
    const keys = ['console', ...Object.keys(context)];
    const values = [fakeConsole, ...Object.values(context)];
    const fn = new Function(...keys, `"use strict"; return (${code});`);
    const result = fn(...values);
    const durationMs = Math.round((performance.now() - start) * 100) / 100;

    self.postMessage({
      id,
      success: true,
      result,
      logs,
      durationMs,
    });
  } catch (err) {
    const durationMs = Math.round((performance.now() - start) * 100) / 100;
    self.postMessage({
      id,
      success: false,
      error: err instanceof Error ? err.message : String(err),
      logs,
      durationMs,
    });
  }
});
