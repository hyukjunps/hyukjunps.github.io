const CACHE_VERSION = "v69";
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;
const PRESERVED_CACHE_PREFIXES = ["opoong-offline-dictionary-"];

const APP_SHELL = [
  "./",
  "./index.html",
  "./tools.html",
  "./manifest.json",
  "./android/launchericon-512-512.png",
  "./game-hearts.js",
  "./game-heart-retries.js",
  "./game-heart-purchase.js",
  "./game-extra.js",
  "./opoong-marble.js",
  "./opoong-run.js",
  "./opoong-ramen.js",
  "./opoong-village.js",
  "./opoong-village-airport.js",
  "./opoong-ghost.js",
  "./game-result-share.js",
  "./opoong-fresh-core.js",
  "./opoong-fishing.js",
  "./opoong-pizza.js",
  "./opoong-pungtal.js",
  "./opoong-ttt-2p.js",
  "./opoong-ghost-share.js",
  "./opoong-game-pack.js",
  "./opoong-progression.js",
  "./game-count.js",
  "./opoong-classics.js",
  "./game-heart-router.js",
  "./stack-tuning.js",
  "./notice-override.js",
  "./qr-menu.js",
  "./hwp-beta.js",
  "./point-shop-fix.js",
  "./memo-classroom.js",
  "./offline-dictionary.js",
  "./tools-image.js",
  "./tools-image-cleanup.js",
  "./tools-image-compress.js",
  "./pwa-update.js"
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

    if (!html.includes("pwa-update.js")) {
      tags.push('<script src="./pwa-update.js?v=20260822-1" defer></script>');
    }

    if (!isToolsPage) {
      if (!html.includes("game-hearts.js")) tags.push('<script src="./game-hearts.js?v=20260820-1" defer></script>');
      if (!html.includes("game-heart-retries.js")) tags.push('<script src="./game-heart-retries.js?v=20260817" defer></script>');
      if (!html.includes("game-heart-purchase.js")) tags.push('<script src="./game-heart-purchase.js?v=20260820-1" defer></script>');
      if (!html.includes("game-extra.js")) tags.push('<script src="./game-extra.js?v=20260822-2" defer></script>');
      if (!html.includes("opoong-marble.js")) tags.push('<script src="./opoong-marble.js?v=20260827-1" defer></script>');
      if (!html.includes("opoong-run.js")) tags.push('<script src="./opoong-run.js?v=20260822-2" defer></script>');
      if (!html.includes("opoong-ramen.js")) tags.push('<script src="./opoong-ramen.js?v=20260822-2" defer></script>');
      if (!html.includes("opoong-village.js")) tags.push('<script src="./opoong-village.js?v=20260822-4" defer></script>');
      if (!html.includes("opoong-village-airport.js")) tags.push('<script src="./opoong-village-airport.js?v=20260822-1" defer></script>');
      if (!html.includes("opoong-ghost.js")) tags.push('<script src="./opoong-ghost.js?v=20260822-1" defer></script>');
      if (!html.includes("game-result-share.js")) tags.push('<script src="./game-result-share.js?v=20260822-2" defer></script>');
      if (!html.includes("opoong-fresh-core.js")) tags.push('<script src="./opoong-fresh-core.js?v=20260823-1" defer></script>');
      if (!html.includes("opoong-fishing.js")) tags.push('<script src="./opoong-fishing.js?v=20260823-1" defer></script>');
      if (!html.includes("opoong-pizza.js")) tags.push('<script src="./opoong-pizza.js?v=20260823-1" defer></script>');
      if (!html.includes("opoong-pungtal.js")) tags.push('<script src="./opoong-pungtal.js?v=20260823-1" defer></script>');
      if (!html.includes("opoong-ttt-2p.js")) tags.push('<script src="./opoong-ttt-2p.js?v=20260823-1" defer></script>');
      if (!html.includes("opoong-ghost-share.js")) tags.push('<script src="./opoong-ghost-share.js?v=20260822-1" defer></script>');
      if (!html.includes("opoong-game-pack.js")) tags.push('<script src="./opoong-game-pack.js?v=20260822-1" defer></script>');
      if (!html.includes("opoong-progression.js")) tags.push('<script src="./opoong-progression.js?v=20260822-1" defer></script>');
      if (!html.includes("game-count.js")) tags.push('<script src="./game-count.js?v=20260822-1" defer></script>');
      if (!html.includes("opoong-classics.js")) tags.push('<script src="./opoong-classics.js?v=20260822-1" defer></script>');
      if (!html.includes("game-heart-router.js")) tags.push('<script src="./game-heart-router.js?v=20260822-1" defer></script>');
      if (!html.includes("stack-tuning.js")) tags.push('<script src="./stack-tuning.js?v=20260820-2" defer></script>');
      if (!html.includes("notice-override.js")) tags.push('<script src="./notice-override.js?v=20260817" defer></script>');
      if (!html.includes("qr-menu.js")) tags.push('<script src="./qr-menu.js?v=20260819-5" defer></script>');
      if (!html.includes("hwp-beta.js")) tags.push('<script src="./hwp-beta.js?v=20260820-1" defer></script>');
      if (!html.includes("point-shop-fix.js")) tags.push('<script src="./point-shop-fix.js?v=20260820-1" defer></script>');
      if (!html.includes("memo-classroom.js")) tags.push('<script src="./memo-classroom.js?v=20260822-2" defer></script>');
      if (!html.includes("offline-dictionary.js")) tags.push('<script src="./offline-dictionary.js?v=20260823-1" defer></script>');
    } else {
      if (!html.includes("tools-image.js")) tags.push('<script src="./tools-image.js?v=20260819-1" defer></script>');
      if (!html.includes("tools-image-cleanup.js")) tags.push('<script src="./tools-image-cleanup.js?v=20260819-2" defer></script>');
      if (!html.includes("tools-image-compress.js")) tags.push('<script src="./tools-image-compress.js?v=20260822-1" defer></script>');
    }

    if (tags.length) {
      const joined = tags.join("\n");
      html = html.includes("</body>") ? html.replace("</body>", `${joined}\n</body>`) : `${html}\n${joined}`;
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, { status: response.status, statusText: response.statusText, headers });
  })();
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    for (const item of APP_SHELL) {
      try { await cache.add(item); } catch (_) {}
    }
  })());
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => {
      const keep = k === CACHE_NAME || PRESERVED_CACHE_PREFIXES.some((prefix) => k.startsWith(prefix));
      return keep ? null : caches.delete(k);
    }));
    await self.clients.claim();
  })());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
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
      const cacheKey = isToolsPage ? "./tools.html" : "./index.html";
      try {
        const fresh = await fetch(req, { cache: "no-store" });
        if (fresh.ok) {
          await cache.put(cacheKey, fresh.clone());
          if (!isToolsPage) await cache.put("./", fresh.clone());
        }
        return withInjectedScripts(fresh, req.url);
      } catch (_) {
        const cached = await cache.match(cacheKey, { ignoreSearch: true }) || (!isToolsPage ? await cache.match("./", { ignoreSearch: true }) : null);
        return cached ? withInjectedScripts(cached, req.url) : new Response("Offline", { status: 503 });
      }
    })());
    return;
  }

  const freshPaths = new Set([
    "/game-hearts.js",
    "/game-heart-retries.js",
    "/game-heart-purchase.js",
    "/game-extra.js",
    "/opoong-marble.js",
    "/opoong-run.js",
    "/opoong-ramen.js",
    "/opoong-village.js",
    "/opoong-village-airport.js",
    "/opoong-ghost.js",
    "/game-result-share.js",
    "/opoong-fresh-core.js",
    "/opoong-fishing.js",
    "/opoong-pizza.js",
    "/opoong-pungtal.js",
    "/opoong-ttt-2p.js",
    "/opoong-ghost-share.js",
    "/opoong-game-pack.js",
    "/opoong-progression.js",
    "/game-count.js",
    "/opoong-classics.js",
    "/game-heart-router.js",
    "/stack-tuning.js",
    "/qr-menu.js",
    "/hwp-beta.js",
    "/point-shop-fix.js",
    "/memo-classroom.js",
    "/offline-dictionary.js",
    "/tools-image.js",
    "/tools-image-cleanup.js",
    "/tools-image-compress.js",
    "/pwa-update.js",
    "/manifest.json"
  ]);
  if (freshPaths.has(url.pathname)) {
    event.respondWith(networkFirst(req, url.pathname));
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) {
      fetch(req, { cache: "no-store" }).then((res) => { if (res?.ok) cache.put(req, res.clone()); }).catch(() => {});
      return cached;
    }
    const res = await fetch(req, { cache: "no-store" });
    if (res?.ok) cache.put(req, res.clone());
    return res;
  })());
});

async function networkFirst(req, cacheKey) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const fresh = await fetch(req, { cache: "no-store" });
    if (fresh?.ok) await cache.put(cacheKey, fresh.clone());
    return fresh;
  } catch (error) {
    const cached = await cache.match(cacheKey, { ignoreSearch: true }) || await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    throw error;
  }
}