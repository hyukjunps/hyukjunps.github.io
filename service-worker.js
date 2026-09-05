/* O.Poong stable service worker
 * Keeps the app network-first and cache-free, while adding the O.drop
 * shortcut to the main navigation without touching the large index file.
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

const ODROP_NAV_MARKER = '<a class="navBtn" href="https://classroom.google.com/" target="_blank" rel="noopener noreferrer">';
const ODROP_NAV_ITEM = '<a class="navBtn" href="/drop/" aria-label="O.drop 파일 전송"><span class="left"><span class="icon">드</span><span><span class="title">O.drop</span><br><span class="hint">QR 직접 전송</span></span></span><span>›</span></a>';
const ODROP_MOBILE_STYLE = '<style id="odrop-mobile-nav-style">@media (max-width:760px){.navGrid{grid-template-columns:repeat(10,minmax(0,1fr))!important}}</style>';

function enhanceHomeHtml(html){
  if (!html || html.includes('href="/drop/"')) return html;
  if (!html.includes(ODROP_NAV_MARKER)) return html;

  let next = html.replace(
    ODROP_NAV_MARKER,
    ODROP_NAV_ITEM + '\n        ' + ODROP_NAV_MARKER
  );

  if (!next.includes('id="odrop-mobile-nav-style"')) {
    next = next.replace('</head>', ODROP_MOBILE_STYLE + '\n</head>');
  }
  return next;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  let url;
  try { url = new URL(request.url); } catch (_) { return; }

  const isHomeNavigation =
    request.mode === 'navigate' &&
    url.origin === self.location.origin &&
    (url.pathname === '/' || url.pathname === '/index.html');

  if (!isHomeNavigation) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (!response.ok) return response;

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html')) return response;

      const html = await response.clone().text();
      const enhanced = enhanceHomeHtml(html);
      if (enhanced === html) return response;

      const headers = new Headers(response.headers);
      headers.delete('content-length');
      headers.delete('content-encoding');
      headers.delete('etag');

      return new Response(enhanced, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch (_) {
      return fetch(request);
    }
  })());
});
