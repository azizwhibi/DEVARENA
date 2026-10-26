// Cache only the standalone public reading shell. Next.js owns its chunk cache:
// development chunk URLs are mutable and must never be served cache-first here.
// Bump this version whenever the public offline shell or its scripts change.
const CACHE = 'devarena-offline-v5';
const PRECACHE = [
  '/offline.html',
  '/offline-reader.css',
  '/offline-store.js',
  '/offline-reader.js',
];

// Returns 'shell' | 'navigate' | null (null = leave the request alone).
function classify(request, origin) {
  const url = new URL(request.url);
  if (
    request.method !== 'GET' ||
    url.origin !== origin ||
    url.searchParams.has('_rsc') ||
    request.headers?.get('RSC') === '1' ||
    request.headers?.get('Next-Router-Prefetch')
  )
    return null;
  if (PRECACHE.includes(url.pathname)) return 'shell';
  if (url.pathname.startsWith('/_next/')) return null;
  if (request.mode === 'navigate' && !/^\/(auth|api)(\/|$)/.test(url.pathname))
    return 'navigate';
  return null;
}

if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('install', (event) => {
    event.waitUntil(
      (async () => {
        const responses = await Promise.all(
          PRECACHE.map(async (path) => {
            const response = await fetch(path, {
              cache: 'reload',
              credentials: 'omit',
              redirect: 'error',
            });
            if (!response.ok || response.redirected)
              throw new Error('Offline shell unavailable: ' + path);
            return [path, response];
          }),
        );
        const cache = await caches.open(CACHE);
        await Promise.all(
          responses.map(([path, response]) => cache.put(path, response)),
        );
      })(),
    );
  });
  self.addEventListener('message', (event) => {
    if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting();
  });
  self.addEventListener('activate', (event) => {
    event.waitUntil(
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((k) => k.startsWith('devarena-') && k !== CACHE)
              .map((k) => caches.delete(k)),
          ),
        )
        .then(() => self.clients.claim()),
    );
  });
  self.addEventListener('fetch', (event) => {
    const kind = classify(event.request, self.location.origin);
    if (kind === 'shell') {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE),
            hit = await cache.match(event.request);
          if (hit) return hit;
          const response = await fetch(event.request);
          if (response.ok && !response.redirected && response.type === 'basic')
            event.waitUntil(cache.put(event.request, response.clone()));
          return response;
        })(),
      );
    } else if (kind === 'navigate') {
      event.respondWith(
        fetch(event.request).catch(
          async () =>
            (await (await caches.open(CACHE)).match('/offline.html')) ||
            new Response(
              '<h1>DevArena is offline</h1><p>Reconnect once to prepare the offline library.</p>',
              {
                status: 503,
                headers: { 'Content-Type': 'text/html; charset=utf-8' },
              },
            ),
        ),
      );
    }
  });
}
