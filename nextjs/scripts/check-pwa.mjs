// Dependency-free PWA checks: service-worker routing policy + manifest shape.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const origin = 'https://app.test';
const ctx = vm.createContext({ URL, self: undefined });
vm.runInContext(readFileSync('public/sw.js', 'utf8'), ctx);
const classify = (url, init = {}) =>
  ctx.classify({ url, method: 'GET', mode: 'cors', ...init }, origin);

assert.equal(
  classify(`${origin}/_next/static/chunks/a.js`),
  null,
  'Next owns chunk caching',
);
assert.equal(
  classify(`${origin}/_next/static/chunks/app/page.js?v=123`),
  null,
  'mutable dev chunks bypass the worker',
);
assert.equal(
  classify(`${origin}/_next/webpack-hmr`),
  null,
  'HMR bypasses the worker',
);
assert.equal(
  classify(`${origin}/_next/static/chunks/a1b2c3.js`, { mode: 'navigate' }),
  null,
);
assert.equal(classify(`${origin}/profile`, { mode: 'navigate' }), 'navigate');
assert.equal(
  classify(`${origin}/auth/callback?code=x`, { mode: 'navigate' }),
  null,
  'auth callback untouched',
);
assert.equal(classify('http://localhost:3000/me'), null, 'API untouched');
assert.equal(
  classify('https://x.supabase.co/auth/v1/token'),
  null,
  'Supabase untouched',
);
assert.equal(
  classify(`${origin}/profile?_rsc=1`),
  null,
  'RSC fetch (non-navigate) untouched',
);
assert.equal(
  classify(`${origin}/_next/static/a.js`, { method: 'POST' }),
  null,
  'non-GET untouched',
);

const sw = readFileSync('public/sw.js', 'utf8');
assert.match(sw, /match\('\/offline\.html'\)/, 'standalone reading fallback');
assert.equal(classify(`${origin}/offline-store.js`), 'shell');
assert.equal(
  classify(`${origin}/dashboard?_rsc=1`, { mode: 'navigate' }),
  null,
);
assert.equal(classify(`${origin}/api/private`, { mode: 'navigate' }), null);
assert.equal(
  classify(`${origin}/_next/static/a.js`, {
    headers: new Headers({ RSC: '1' }),
  }),
  null,
);
assert.match(
  sw,
  /k\.startsWith\('devarena-'\)/,
  'only owned caches are removed',
);
assert.ok(!/cache\.put\([^)]*navigate/i.test(sw), 'navigations never stored');

const manifestSrc = readFileSync('src/app/manifest.ts', 'utf8');
for (const needle of [
  "display: 'standalone'",
  "start_url: '/'",
  "purpose: 'maskable'",
  '192x192',
  '512x512',
]) {
  assert.ok(manifestSrc.includes(needle), `manifest has ${needle}`);
}
console.log('PASS: service-worker routing policy and manifest checks');

// A previously installed production worker can survive a switch to next dev.
// Cleanup must remove only our worker and stale chunks, preserving offline data.
const unregistered = [],
  deleted = [];
const oldChunk = { url: origin + '/_next/static/chunks/app/page.js' };
const offlineFile = { url: origin + '/offline-store.js' };
const makeRegistration = (scriptURL) => ({
  active: { scriptURL },
  unregister: async () => {
    unregistered.push(scriptURL);
    return true;
  },
});
const cacheFiles = {
  'devarena-offline-v4': [oldChunk, offlineFile],
  'another-app': [oldChunk],
};
const cleanupContext = vm.createContext({
  exports: {},
  URL,
  window: { location: { origin } },
  navigator: {
    serviceWorker: {
      getRegistrations: async () => [
        makeRegistration(origin + '/sw.js'),
        makeRegistration(origin + '/other-worker.js'),
      ],
    },
  },
  caches: {
    keys: async () => Object.keys(cacheFiles),
    open: async (name) => ({
      keys: async () => cacheFiles[name],
      delete: async (request) => {
        deleted.push([name, request.url]);
        return true;
      },
    }),
  },
});
vm.runInContext(
  ts.transpileModule(
    readFileSync('src/lib/pwa/development-cleanup.ts', 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  cleanupContext,
);
await cleanupContext.exports.clearDevelopmentServiceWorker();
assert.deepEqual(unregistered, [origin + '/sw.js']);
assert.deepEqual(deleted, [['devarena-offline-v4', oldChunk.url]]);
console.log(
  'PASS: development cleanup removes the owned worker and stale chunks, preserving offline shell and unrelated workers/caches',
);
