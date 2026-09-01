const CACHE_VERSION = "v75";
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;
const PRESERVED_CACHE_PREFIXES = ["opoong-offline-dictionary-"];

const APP_SHELL = [
  "./",
  "./index.html",
  "./tools.html",
  "./manifest.json",
  "./android/launchericon-512-512.png",
  "./notice-override.js",
  "./qr-menu.js",
  "./hwp-beta.js",
  "./point-shop-fix.js",
  "./opoong-shop-expansion.js",
  "./opoong-avatar-gacha.js",
  "./opoong-gacha-owned-fix.js",
  "./opoong-pet-expansion.js",
  "./opoong-avatar-autoequip.js",
  "./memo-classroom.js",
  "./offline-dictionary.js",
  "./tools-image.js",
  "./tools-image-cleanup.js",
  "./tools-image-compress.js",
  "./pwa-update.js"
];

const GAME_SCRIPT_PATTERN = /<script\b[^>]*\bsrc=["'][^"']*(?:fishing-timing-fix|game-(?:count|extra|heart-purchase|heart-retries|heart-router|hearts|result-share)|minesweeper-fix|stack-tuning|opoong-(?:candy|classics|crossing|fishing|fresh-core|game-juice|game-pack|ghost(?:-share)?|helix|marble|pipe|pizza|progression|pungtal|racing|ramen|run|ttt-2p|village(?:-airport)?))\.js(?:\?[^"']*)?["'][^>]*>\s*<\/script>/gi;

function stripGameFeaturesFromHtml(source) {
  let html = String(source || "");
  html = html.replace(GAME_SCRIPT_PATTERN, "");
  html = html.replace(/<a\b[^>]*data-view=["']game["'][\s\S]*?<\/a>/gi, "");
  html = html.replace(/<section\b[^>]*id=["']view-game["'][^>]*>[\s\S]*?<\/section>\s*(?=<section\b[^>]*id=["']view-onway["'][^>]*>)/i, "");
  return html;
}

function withInjectedScripts(response, requestUrl) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  return (async () => {
    let html = stripGameFeaturesFromHtml(await response.text());
    const tags = [];
    const url = new URL(requestUrl || self.location.href);
    const isToolsPage = url.pathname.endsWith("/tools.html");

    if (!html.includes("pwa-update.js")) {
      tags.push('<script src="./pwa-update.js?v=20260901-1" defer></script>');
    }

    if (!isToolsPage) {
      if (!html.includes("notice-override.js")) tags.push('<script src="./notice-override.js?v=20260817" defer></script>');
      if (!html.includes("qr-menu.js")) tags.push('<script src="./qr-menu.js?v=20260819-5" defer></script>');
      if (!html.includes("hwp-beta.js")) tags.push('<script src="./hwp-beta.js?v=20260820-1" defer></script>');
      if (!html.includes("point-shop-fix.js")) tags.push('<script src="./point-shop-fix.js?v=20260901-1" defer></script>');
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
    "/notice-override.js",
    "/qr-menu.js",
    "/hwp-beta.js",
    "/point-shop-fix.js",
    "/opoong-shop-expansion.js",
    "/opoong-avatar-gacha.js",
    "/opoong-gacha-owned-fix.js",
    "/opoong-pet-expansion.js",
    "/opoong-avatar-autoequip.js",
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
