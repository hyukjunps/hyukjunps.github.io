const CACHE_VERSION = "v38"; // 수정할 때마다 올리기
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./tools.html",
  "./manifest.json",
  "./android/launchericon-512-512.png",
  "./game-hearts.js",
  "./game-heart-retries.js",
  "./notice-override.js",
  "./qr-menu.js",
  "./tools-image.js",
  "./tools-image-cleanup.js",
  "./pwa-update.js",
  "./onway.html",
  "./onway-manifest.json",
  "./onway-shop-shortcut.js"
];

function withInjectedScripts(response, requestUrl) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  return (async () => {
    let html = await response.text();
    const tags = [];
    const url = new URL(requestUrl || self.location.href);
    const isToolsPage = url.pathname.endsWith("/tools.html");
    const isOnwayInstaller = url.pathname.endsWith("/onway.html");

    if (!html.includes("pwa-update.js") && !isOnwayInstaller) {
      tags.push('<script src="./pwa-update.js?v=20260819-1" defer></script>');
    }

    if (!isToolsPage && !isOnwayInstaller) {
      if (!html.includes("game-hearts.js")) tags.push('<script src="./game-hearts.js?v=20260818-1" defer></script>');
      if (!html.includes("game-heart-retries.js")) tags.push('<script src="./game-heart-retries.js?v=20260817" defer></script>');
      if (!html.includes("notice-override.js")) tags.push('<script src="./notice-override.js?v=20260817" defer></script>');
      if (!html.includes("qr-menu.js")) tags.push('<script src="./qr-menu.js?v=20260819-5" defer></script>');
      if (!html.includes("onway-shop-shortcut.js")) tags.push('<script src="./onway-shop-shortcut.js?v=20260819-1" defer></script>');
    } else if (isToolsPage) {
      if (!html.includes("tools-image.js")) tags.push('<script src="./tools-image.js?v=20260819-1" defer></script>');
      if (!html.includes("tools-image-cleanup.js")) tags.push('<script src="./tools-image-cleanup.js?v=20260819-1" defer></script>');
    }

    if (tags.length) {
      const joined = tags.join("\n");
      html = html.includes("</body>") ? html.replace("</body>", `${joined}\n</body>`) : `${html}\n${joined}`;
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, {status: response.status,statusText: response.statusText,headers});
  })();
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.includes("/data/schedule/") && url.pathname.endsWith(".json")) {
    event.respondWith(networkFirst(req, `${url.origin}${url.pathname}`));
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const isToolsPage = url.pathname.endsWith("/tools.html");
      const isOnwayInstaller = url.pathname.endsWith("/onway.html");
      const cacheKey = isToolsPage ? "./tools.html" : isOnwayInstaller ? "./onway.html" : "./index.html";
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        if (fresh.ok) {
          await cache.put(cacheKey, fresh.clone());
          if (!isToolsPage && !isOnwayInstaller) await cache.put("./", fresh.clone());
        }
        return withInjectedScripts(fresh, req.url);
      } catch (_) {
        const cached = (await cache.match(cacheKey, { ignoreSearch: true })) || (!isToolsPage && !isOnwayInstaller ? await cache.match("./", { ignoreSearch: true }) : null) || (await caches.match(cacheKey, { ignoreSearch: true }));
        return cached ? withInjectedScripts(cached, req.url) : cached;
      }
    })());
    return;
  }

  const freshPaths = new Set([
    "/qr-menu.js",
    "/tools-image.js",
    "/tools-image-cleanup.js",
    "/pwa-update.js",
    "/manifest.json",
    "/onway.html",
    "/onway-manifest.json",
    "/onway-shop-shortcut.js"
  ]);
  if (freshPaths.has(url.pathname)) {
    event.respondWith(networkFirst(req, url.pathname));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) {
      fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); }).catch(()=>{});
      return cached;
    }
    const res = await fetch(req);
    if (res && res.ok) cache.put(req, res.clone());
    return res;
  })());
});

async function networkFirst(req, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh && fresh.ok) await cache.put(cacheKey, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await cache.match(cacheKey, { ignoreSearch: true }) || await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}