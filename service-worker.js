const CACHE_VERSION = 'v78-start-fix';
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;
const PRESERVED_CACHE_PREFIXES = ['opoong-offline-dictionary-'];

const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './pwa-update.js',
  './O.poong.png',
  './logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const item of APP_SHELL) {
      try {
        const response = await fetch(item, { cache: 'no-store' });
        if (response.ok) await cache.put(item, response);
      } catch (_) {}
    }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => {
      const keep = key === CACHE_NAME || PRESERVED_CACHE_PREFIXES.some((prefix) => key.startsWith(prefix));
      return keep ? Promise.resolve() : caches.delete(key);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(navigateNetworkFirst(request));
    return;
  }

  if (url.pathname.includes('/data/schedule/') && url.pathname.endsWith('.json')) {
    event.respondWith(networkFirst(request, url.pathname));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function navigateNetworkFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  let response;

  try {
    response = await fetch(request, { cache: 'no-store' });
    if (response && response.ok) {
      await cache.put('./index.html', response.clone());
      await cache.put('./', response.clone());
    }
  } catch (_) {
    response = await cache.match('./index.html', { ignoreSearch: true }) || await cache.match('./', { ignoreSearch: true });
  }

  if (!response) {
    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }

  return injectStartupRepair(response);
}

async function injectStartupRepair(response) {
  if (!response || !response.ok) return response;
  const type = response.headers.get('content-type') || '';
  if (!type.includes('text/html')) return response;

  let html = await response.text();
  if (!html.includes('pwa-update.js')) {
    const tag = '<script src="./pwa-update.js?v=20260902-startfix" defer></script>';
    html = html.includes('</body>') ? html.replace('</body>', `${tag}\n</body>`) : `${html}\n${tag}`;
  }

  const headers = new Headers(response.headers);
  headers.delete('content-length');
  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

async function networkFirst(request, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(request, { cache: 'no-store' });
    if (fresh && fresh.ok) await cache.put(cacheKey, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await cache.match(cacheKey, { ignoreSearch: true }) || await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const network = fetch(request, { cache: 'no-store' })
    .then(async (response) => {
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    network.catch(() => {});
    return cached;
  }

  const response = await network;
  if (response) return response;
  return new Response('', { status: 504 });
}
