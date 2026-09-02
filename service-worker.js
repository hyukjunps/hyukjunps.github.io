/* O.Poong stable service worker
 * Kept intentionally inert to avoid reload/navigation loops.
 * The app loads live network content directly.
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

// No fetch handler, no client.navigate(), no unregister().
// This prevents installed O.Poong from entering a startup reload loop.
