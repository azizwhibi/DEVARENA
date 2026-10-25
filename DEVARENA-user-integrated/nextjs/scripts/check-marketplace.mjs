import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/client') return { url: 'mock:marketplace-session', shortCircuit: true };
    if (specifier.startsWith('@/')) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts')) return nextResolve(new URL(`${specifier}.ts`, context.parentURL).href, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'mock:marketplace-session') return { format: 'module', shortCircuit: true, source: "export function createClient(){return {auth:{getSession:async()=>({data:{session:{access_token:'test-session'}}})}}}" };
    return nextLoad(url, context);
  },
});
const { marketplaceHttp: api } = await import('../src/lib/marketplace/api.http.ts');
const originalFetch = globalThis.fetch, originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
const originalUrl = process.env.NEXT_PUBLIC_API_URL;
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
let calls = 0;
try {
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  globalThis.fetch = async (url, init) => {
    calls++; assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer test-session'); assert.equal(init.cache, 'no-store');
    assert.equal(new URL(url).pathname, '/marketplace/items/test-item/purchase'); assert.equal(init.method, 'POST'); assert.ok(!init.body);
    return Response.json({ credits_balance: 60, already_owned: false, item: { id: 'test-item', owned: true } });
  };
  const result = await api.purchase('test-item'); assert.equal(result.credits_balance,60); assert.equal(result.item.owned,true);
  globalThis.fetch = async () => Response.json({ status: 409, code: 'insufficient_credits', detail: 'Crédits insuffisants' }, { status: 409 });
  await assert.rejects(api.purchase('test-item'), error => error.code === 'insufficient_credits');
  globalThis.fetch = async () => Response.json({ status: 403, code: 'forbidden', detail: 'Accès refusé' }, { status: 403 });
  await assert.rejects(api.equip('test-item'), error => error.code === 'forbidden');
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
  const before = calls; globalThis.fetch = async () => { calls++; throw Error('Must not fetch offline'); };
  await assert.rejects(api.purchase('test-item'), error => error.code === 'network'); assert.equal(calls,before);
  console.log('PASS: Marketplace real session wrapper, private fetch, trusted purchase payload, failure mapping and no offline mutation/queue.');
} finally {
  globalThis.fetch = originalFetch;
  if (originalNavigator) Object.defineProperty(globalThis, 'navigator', originalNavigator); else delete globalThis.navigator;
  if (originalUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL; else process.env.NEXT_PUBLIC_API_URL = originalUrl;
}
