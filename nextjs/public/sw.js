// DevArena service worker. Caches the offline page, shell assets, icons, workers and hashed /_next/static assets.
// Navigations are network-first with /offline fallback and never stored; API, Supabase, auth and RSC requests are untouched.
const CACHE = 'devarena-v2';
const PRECACHE = [
  '/offline',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/apple-icon',
  '/icons/192',
  '/icons/512',
  '/icons/maskable',
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/vercel.svg',
  '/window.svg',
  '/workers/code-runner.worker.js',
];

// Returns 'static' | 'navigate' | null (null = leave the request alone).
function classify(request, origin) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== origin) return null;
  if (url.pathname.startsWith('/_next/static/')) return 'static';
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/workers/') ||
    url.pathname === '/apple-icon' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/manifest.webmanifest' ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.worker.js')
  ) {
    return 'static';
  }
  if (request.mode === 'navigate' && !url.pathname.startsWith('/auth/')) return 'navigate';
  return null;
}

if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('install', event => {
    event.waitUntil(
      caches.open(CACHE).then(cache =>
        Promise.all(
          PRECACHE.map(url =>
            cache.add(url).catch(() => {
              /* non-fatal fallback for optional shell assets */
            }),
          ),
        ),
      ).then(() => self.skipWaiting()),
    );
  });

  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))),
      ).then(() => self.clients.claim()),
    );
  });

  self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    }
  });

  self.addEventListener('fetch', event => {
    const kind = classify(event.request, self.location.origin);
    if (kind === 'static') {
      event.respondWith(
        caches.match(event.request).then(hit =>
          hit ||
          fetch(event.request).then(res => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then(c => c.put(event.request, copy));
            }
            return res;
          }),
        ),
      );
    } else if (kind === 'navigate') {
      event.respondWith(fetch(event.request).catch(() => caches.match('/offline')));
    }
  });
}
