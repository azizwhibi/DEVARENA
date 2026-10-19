// Dependency-free PWA checks: service-worker routing policy + manifest shape.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const origin = 'https://app.test';
const ctx = vm.createContext({ URL, self: undefined });
vm.runInContext(readFileSync('public/sw.js', 'utf8'), ctx);
const classify = (url, init = {}) => ctx.classify({ url, method: 'GET', mode: 'cors', ...init }, origin);

assert.equal(classify(`${origin}/_next/static/chunks/a.js`), 'static');
assert.equal(classify(`${origin}/profile`, { mode: 'navigate' }), 'navigate');
assert.equal(classify(`${origin}/auth/callback?code=x`, { mode: 'navigate' }), null, 'auth callback untouched');
assert.equal(classify('http://localhost:3000/me'), null, 'API untouched');
assert.equal(classify('https://x.supabase.co/auth/v1/token'), null, 'Supabase untouched');
assert.equal(classify(`${origin}/profile?_rsc=1`), null, 'RSC fetch (non-navigate) untouched');
assert.equal(classify(`${origin}/_next/static/a.js`, { method: 'POST' }), null, 'non-GET untouched');

const sw = readFileSync('public/sw.js', 'utf8');
assert.match(sw, /caches\.match\('\/offline'\)/, 'offline fallback');
assert.ok(!/cache\.put\([^)]*navigate/i.test(sw), 'navigations never stored');

const manifestSrc = readFileSync('src/app/manifest.ts', 'utf8');
for (const needle of ["display: 'standalone'", "start_url: '/'", "purpose: 'maskable'", '192x192', '512x512']) {
  assert.ok(manifestSrc.includes(needle), `manifest has ${needle}`);
}
console.log('PASS: service-worker routing policy and manifest checks');
