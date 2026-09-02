/* O.Poong emergency PWA recovery worker
 * Purpose: remove stale app caches/service workers so the installed app
 * opens the live GitHub Pages site directly. Offline caching is temporarily
 * disabled until launch reliability is confirmed.
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

    try {
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of clients) {
        try { client.postMessage({ type: 'OPOONG_SW_RECOVERED' }); } catch (_) {}
      }
    } catch (_) {}

    try { await self.registration.unregister(); } catch (_) {}
  })());
});

// Intentionally no fetch handler.
// Once this worker activates, navigation goes straight to the network.
