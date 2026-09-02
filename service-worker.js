/* O.Poong emergency PWA recovery worker
 * Removes stale caches and unregisters itself so the installed app opens
 * the live GitHub Pages site directly. Offline caching is temporarily off.
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

    let windows = [];
    try {
      windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    } catch (_) {}

    try { await self.registration.unregister(); } catch (_) {}

    for (const client of windows) {
      try {
        const url = new URL(client.url || self.location.origin + '/');
        url.pathname = '/';
        url.search = '?appRecovery=20260902-1901';
        url.hash = '';
        await client.navigate(url.toString());
      } catch (_) {}
    }
  })());
});

// Intentionally no fetch handler: all requests go directly to the network.
