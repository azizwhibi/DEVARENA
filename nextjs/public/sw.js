// DevArena service worker. Caches ONLY the offline page, icons and hashed /_next/static assets.
// Navigations are network-first and never stored; API, Supabase, auth and RSC requests are untouched.
const CACHE = 'devarena-v1';
const PRECACHE = ['/offline', '/icons/192', '/icons/512', '/icons/maskable'];

// Returns 'static' | 'navigate' | null (null = leave the request alone).
function classify(request, origin) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== origin) return null;
  if (url.pathname.startsWith('/_next/static/')) return 'static';
  if (request.mode === 'navigate' && !url.pathname.startsWith('/auth/')) return 'navigate';
  return null;
}

if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
  });
  self.addEventListener('activate', event => {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()),
    );
  });
  self.addEventListener('fetch', event => {
    const kind = classify(event.request, self.location.origin);
    if (kind === 'static') {
      event.respondWith(caches.match(event.request).then(hit => hit || fetch(event.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(event.request, copy)); }
        return res;
      })));
    } else if (kind === 'navigate') {
      event.respondWith(fetch(event.request).catch(() => caches.match('/offline')));
    }
  });
}
