/* O.Poong stable service worker
 * Network-first and cache-free.
 * Enhances the main navigation with O.drop and applies QR reliability fixes
 * without modifying the large HTML files directly.
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
const ODROP_QR_FIX_SCRIPT = '<script src="/drop/string-mode.js?v=20260905-qr4"></script>';

const ODROP_SDP_COMPACTOR = `
function compactSdpForQr(sdp){
  const lines=String(sdp||'').split(/\\r?\\n/);
  const seen=new Set();
  const out=[];
  for(const line of lines){
    if(!line) continue;
    if(line.startsWith('a=extmap-allow-mixed')) continue;
    if(line.startsWith('a=msid-semantic:')) continue;
    if(line.startsWith('a=ice-options:')) continue;
    if(line.startsWith('a=candidate:')){
      const typ=(line.match(/ typ ([a-z0-9]+)/i)||[])[1]||'other';
      const proto=(line.match(/ a=candidate:[^ ]+ [0-9]+ ([A-Z]+)/i)||[])[1]||'other';
      const key=(typ+':'+proto).toLowerCase();
      if(seen.has(key)) continue;
      seen.add(key);
    }
    out.push(line);
  }
  return out.join('\\r\\n')+'\\r\\n';
}
`;

function enhanceHomeHtml(html){
  if (!html) return html;
  let next = html;

  if (!next.includes('href="/drop/"') && next.includes(ODROP_NAV_MARKER)) {
    next = next.replace(
      ODROP_NAV_MARKER,
      ODROP_NAV_ITEM + '\n        ' + ODROP_NAV_MARKER
    );
  }

  if (!next.includes('id="odrop-mobile-nav-style"')) {
    next = next.replace('</head>', ODROP_MOBILE_STYLE + '\n</head>');
  }
  return next;
}

function enhanceDropHtml(html){
  if (!html) return html;
  let next = html;

  if (!next.includes('function compactSdpForQr(')) {
    next = next.replace(
      "const MAX_FILE_SIZE=100*1024*1024;",
      ODROP_SDP_COMPACTOR + "\nconst MAX_FILE_SIZE=100*1024*1024;"
    );
  }

  next = next.replace(
    's:sendPc.localDescription.sdp',
    's:compactSdpForQr(sendPc.localDescription.sdp)'
  );
  next = next.replace(
    's:receivePc.localDescription.sdp',
    's:compactSdpForQr(receivePc.localDescription.sdp)'
  );

  if (!next.includes('/drop/string-mode.js?v=20260905-qr4')) {
    next = next.replace('</body>', ODROP_QR_FIX_SCRIPT + '\n</body>');
  }
  return next;
}

async function transformedNavigation(request, transform){
  try {
    const response = await fetch(request, {cache:'no-store'});
    if (!response.ok) return response;

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) return response;

    const html = await response.clone().text();
    const enhanced = transform(html);
    if (enhanced === html) return response;

    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('content-encoding');
    headers.delete('etag');
    headers.set('cache-control','no-store');

    return new Response(enhanced, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (_) {
    return fetch(request);
  }
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.mode !== 'navigate') return;

  let url;
  try { url = new URL(request.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;

  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(transformedNavigation(request, enhanceHomeHtml));
    return;
  }

  if (url.pathname === '/drop/' || url.pathname === '/drop/index.html') {
    event.respondWith(transformedNavigation(request, enhanceDropHtml));
  }
});
