/** Remove a previous production worker before using Next.js development assets. */
export async function clearDevelopmentServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const origin = window.location.origin;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      const owned = [
        registration.active,
        registration.waiting,
        registration.installing,
      ].some((worker) => {
        if (!worker) return false;
        const script = new URL(worker.scriptURL);
        return script.origin === origin && script.pathname === '/sw.js';
      });
      if (owned) await registration.unregister();
    }),
  );

  if (typeof caches === 'undefined') return;
  const names = await caches.keys();
  await Promise.all(
    names
      .filter((name) => name.startsWith('devarena-'))
      .map(async (name) => {
        const cache = await caches.open(name);
        const requests = await cache.keys();
        await Promise.all(
          requests
            .filter((request) => {
              const url = new URL(request.url);
              return (
                url.origin === origin &&
                url.pathname.startsWith('/_next/static/')
              );
            })
            .map((request) => cache.delete(request)),
        );
      }),
  );
}
