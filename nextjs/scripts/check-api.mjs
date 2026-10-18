import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

// Exercise the actual client module, substituting only its external auth SDK.
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === '@/lib/supabase/client') return { url: 'mock:supabase-client', shortCircuit: true };
    if (specifier === '@/lib/supabase/server') return { url: 'mock:supabase-server', shortCircuit: true };
    if (specifier === 'server-only') return { url: 'mock:server-only', shortCircuit: true };
    if (specifier.startsWith('@/')) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url === 'mock:supabase-client') return {
      format: 'module', shortCircuit: true,
      source: 'export function createClient() { return globalThis.authTestClient; }',
    };
    if (url === 'mock:supabase-server') return {
      format: 'module', shortCircuit: true,
      source: 'export async function createClient() { return globalThis.authTestClient; }',
    };
    if (url === 'mock:server-only') return { format: 'module', source: '', shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { request, ApiError } = await import('../src/lib/api-core.ts');
const { apiRequest } = await import('../src/lib/api.ts');
const { apiRequest: serverRequest } = await import('../src/lib/api-server.ts');
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalApiUrl = process.env.NEXT_PUBLIC_API_URL;
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
let scenarios = 0;
try {
  globalThis.fetch = async (url, init) => {
    assert.equal(String(url), 'http://localhost:3000/me');
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer access-a');
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    return Response.json({ id: 'user-a' });
  };
  assert.deepEqual(await request('/me', 'access-a'), { id: 'user-a' });
  scenarios++;

  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init.headers).has('Authorization'), false);
    return new Response(null, { status: 204 });
  };
  assert.equal(await request('/me', undefined, { headers: { Authorization: 'untrusted' } }), undefined);
  scenarios++;

  globalThis.fetch = async () => Response.json({ type: 'about:blank', status: 403, detail: 'Account suspended', code: 'account_suspended' }, { status: 403 });
  await assert.rejects(request('/me', 'access-a'), error => error instanceof ApiError && error.status === 403 && error.problem.code === 'account_suspended' && error.message === 'Account suspended');
  scenarios++;
  globalThis.fetch = async () => new Response('Gateway failed', { status: 502 });
  await assert.rejects(request('/me'), error => error instanceof ApiError && error.status === 502);
  scenarios++;
  for (const path of ['https://evil.com/me', '//evil.com/me', '/\\evil.com/me']) {
    await assert.rejects(request(path, 'access-a'), TypeError);
  }
  scenarios++;

  let refreshes = 0;
  let sessions = 0;
  const redirects = [];
  globalThis.window = { location: { origin: 'http://localhost:3001', pathname: '/profile', search: '?x=1', assign: value => redirects.push(value) } };
  globalThis.authTestClient = { auth: {
    getSession: async () => { sessions++; return { data: { session: { access_token: 'expired' } }, error: null }; },
    refreshSession: async () => { refreshes++; return { data: { session: { access_token: 'fresh' } }, error: null }; },
  } };
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    calls++;
    const token = new Headers(init.headers).get('Authorization');
    if (calls === 1) { assert.equal(token, 'Bearer expired'); return Response.json({ status: 401 }, { status: 401 }); }
    assert.equal(token, 'Bearer fresh');
    return Response.json({ id: 'user-a' });
  };
  assert.deepEqual(await apiRequest('/me'), { id: 'user-a' });
  assert.equal(refreshes, 1);
  assert.equal(calls, 2);
  assert.equal(sessions, 1);
  assert.equal(redirects.length, 0);
  scenarios++;

  calls = 0;
  refreshes = 0;
  globalThis.fetch = async () => { calls++; return Response.json({ status: 401 }, { status: 401 }); };
  await assert.rejects(apiRequest('/me'), ApiError);
  assert.equal(refreshes, 1);
  assert.equal(calls, 2);
  assert.equal(redirects.at(-1), 'http://localhost:3001/login?next=%2Fprofile%3Fx%3D1');
  scenarios++;

  calls = 0;
  refreshes = 0;
  globalThis.authTestClient.auth.refreshSession = async () => { refreshes++; return { data: { session: null }, error: { message: 'Expired' } }; };
  await assert.rejects(apiRequest('/me'), ApiError);
  assert.equal(refreshes, 1);
  assert.equal(calls, 1);
  assert.equal(redirects.length, 2);
  scenarios++;

  refreshes = 0;
  globalThis.fetch = async () => Response.json({ status: 403, code: 'account_suspended' }, { status: 403 });
  await assert.rejects(apiRequest('/me'), error => error instanceof ApiError && error.status === 403);
  assert.equal(refreshes, 0);
  assert.equal(redirects.length, 2);
  scenarios++;

  refreshes = 0;
  calls = 0;
  globalThis.authTestClient.auth.refreshSession = async () => { refreshes++; return { data: { session: { access_token: 'fresh' } }, error: null }; };
  globalThis.fetch = async () => { calls++; return Response.json({ status: calls === 1 ? 401 : 500 }, { status: calls === 1 ? 401 : 500 }); };
  await assert.rejects(apiRequest('/me'), error => error instanceof ApiError && error.status === 500);
  assert.equal(refreshes, 1);
  assert.equal(calls, 2);
  assert.equal(redirects.length, 2);
  scenarios++;
  calls = 0;
  refreshes = 0;
  globalThis.authTestClient.auth.refreshSession = async () => { refreshes++; throw new Error('Auth transport unavailable'); };
  globalThis.fetch = async () => { calls++; return Response.json({ status: 401 }, { status: 401 }); };
  await assert.rejects(apiRequest('/me'), ApiError);
  assert.equal(refreshes, 1);
  assert.equal(calls, 1);
  assert.equal(redirects.length, 3);
  scenarios++;

  globalThis.authTestClient.auth.getSession = async () => ({ data: { session: { access_token: 'server-access' } }, error: null });
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init.headers).get('Authorization'), 'Bearer server-access');
    return Response.json({ id: 'server-user' });
  };
  assert.deepEqual(await serverRequest('/me'), { id: 'server-user' });
  scenarios++;
  globalThis.authTestClient.auth.getSession = async () => ({ data: { session: null }, error: { message: 'Invalid session' } });
  globalThis.fetch = async (_url, init) => {
    assert.equal(new Headers(init.headers).has('Authorization'), false);
    return Response.json({ status: 401 }, { status: 401 });
  };
  await assert.rejects(serverRequest('/me'), error => error instanceof ApiError && error.status === 401);
  scenarios++;

  console.log(`PASS: ${scenarios} API scenarios (real wrapper, SDK/network mocked)`);
} finally {
  hooks.deregister();
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalApiUrl === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = originalApiUrl;
  delete globalThis.authTestClient;
}
