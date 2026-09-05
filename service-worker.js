/* O.Poong stable service worker
 * Network-first and cache-free.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch (_) {}
    try { await self.clients.claim(); } catch (_) {}
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.mode !== 'navigate') return;

  event.respondWith((async () => {
    try {
      return await fetch(request, { cache: 'no-store' });
    } catch (_) {
      return fetch(request);
    }
  })());
});
