/* eslint-disable @typescript-eslint/no-require-imports -- Node-only worker event harness. */
const assert = require('node:assert/strict'),
  vm = require('node:vm'),
  fs = require('node:fs');
const events = {},
  data = new Map(),
  origin = 'https://review.test';
let skip = 0,
  offline = false,
  missing = false;
const key = (value) =>
  new URL(typeof value === 'string' ? value : value.url, origin).href;
const caches = {
  async keys() {
    return [...data.keys()];
  },
  async delete(name) {
    return data.delete(name);
  },
  async open(name) {
    if (!data.has(name)) data.set(name, new Map());
    const store = data.get(name);
    return {
      async match(request) {
        const response = store.get(key(request));
        return response?.clone();
      },
      async put(request, response) {
        store.set(key(request), response.clone());
      },
    };
  },
};
const context = vm.createContext({
  URL,
  Response,
  caches,
  self: {
    location: { origin },
    clients: { claim: async () => {} },
    skipWaiting: () => {
      skip++;
    },
    addEventListener: (name, handler) => (events[name] = handler),
  },
  fetch: async (request) => {
    if (offline) throw Error('Disconnected');
    const path = new URL(key(request)).pathname;
    const response = new Response(
      path === '/offline.html' ? '<h1>Offline library</h1>' : 'Public fixture',
      { status: missing && path === '/offline-store.js' ? 404 : 200 },
    );
    Object.defineProperty(response, 'type', { value: 'basic' });
    return response;
  },
});
vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), context);
async function dispatch(name, request) {
  let response;
  const work = [];
  events[name]({
    request,
    waitUntil: (promise) => work.push(promise),
    respondWith: (promise) => {
      response = promise;
    },
  });
  const result = await response;
  await Promise.all(work);
  return result;
}
(async () => {
  missing = true;
  await assert.rejects(dispatch('install'));
  assert.equal(
    data.size,
    0,
    'Missing precache asset cannot leave a half-installed cache',
  );
  missing = false;
  await dispatch('install');
  assert.equal(
    skip,
    0,
    'Updates never activate during a form without user action',
  );
  const cache = [...data.values()][0];
  assert.equal(cache.size, 4);
  data.set('another-app-cache', new Map());
  data.set('devarena-old-test', new Map());
  await dispatch('activate');
  assert.ok(data.has('another-app-cache'));
  assert.ok(!data.has('devarena-old-test'));
  const request = (path, mode = 'cors', headers = new Headers()) => ({
    url: origin + path,
    mode,
    method: 'GET',
    headers,
  });
  await dispatch('fetch', request('/profile', 'navigate'));
  assert.equal(
    cache.has(origin + '/profile'),
    false,
    'Personalized HTML never cached',
  );
  for (const input of [
    request('/auth/callback?code=secret', 'navigate'),
    request('/api/private'),
    request('/profile?_rsc=x'),
    request('/_next/static/a.js', 'cors', new Headers({ RSC: '1' })),
  ])
    assert.equal(
      await dispatch('fetch', input),
      undefined,
      'Excluded traffic must remain untouched',
    );
  offline = true;
  const response = await dispatch('fetch', request('/knowledge', 'navigate'));
  assert.match(await response.text(), /Offline library/);
  assert.equal(cache.has(origin + '/knowledge'), false);
  events.message({ data: { type: 'ACTIVATE_UPDATE' } });
  assert.equal(skip, 1);
  console.log(
    'PASS: worker install failure, atomic public precache, private/RSC exclusions, offline navigation, owned-cache cleanup and controlled updates',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
