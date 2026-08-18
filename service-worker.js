const CACHE_VERSION = "v31"; // 수정할 때마다 올리기
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./android/launchericon-512-512.png",
  "./game-hearts.js",
  "./game-heart-retries.js",
  "./notice-override.js",
];

function withGameHearts(response) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  return (async () => {
    let html = await response.text();
    const tags = [];
    if (!html.includes("game-hearts.js")) {
      tags.push('<script src="./game-hearts.js?v=20260818-1" defer></script>');
    }
    if (!html.includes("game-heart-retries.js")) {
      tags.push('<script src="./game-heart-retries.js?v=20260817" defer></script>');
    }
    if (!html.includes("notice-override.js")) {
      tags.push('<script src="./notice-override.js?v=20260817" defer></script>');
    }

    if (tags.length) {
      const joined = tags.join("\n");
      html = html.includes("</body>")
        ? html.replace("</body>", `${joined}\n</body>`)
        : `${html}\n${joined}`;
    }

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
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

/* 페이지에서 업데이트 적용을 원하면 SKIP_WAITING */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 같은 origin만 처리
  if (url.origin !== self.location.origin) return;

  // 학사일정 JSON은 항상 네트워크를 먼저 확인한다.
  if (url.pathname.includes("/data/schedule/") && url.pathname.endsWith(".json")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = new Request(`${url.origin}${url.pathname}`);

      try {
        const fresh = await fetch(req, { cache: "no-store" });
        if (fresh.ok) await cache.put(cacheKey, fresh.clone());
        return fresh;
      } catch (error) {
        const cached = await cache.match(cacheKey);
        if (cached) return cached;
        throw error;
      }
    })());
    return;
  }

  // 1) HTML(navigate): 온라인이면 최신 HTML을 받고 확장 스크립트 삽입 / 오프라인이면 캐시된 index로
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const fresh = await fetch(req, { cache: "no-store" });
        if (fresh.ok) {
          await cache.put("./index.html", fresh.clone());
          await cache.put("./", fresh.clone());
        }
        return withGameHearts(fresh);
      } catch (_) {
        const cached =
          (await cache.match("./index.html", { ignoreSearch: true })) ||
          (await cache.match("./", { ignoreSearch: true })) ||
          (await caches.match("./index.html", { ignoreSearch: true })) ||
          (await caches.match("./", { ignoreSearch: true }));
        return cached ? withGameHearts(cached) : cached;
      }
    })());
    return;
  }

  // 2) 정적 파일: 캐시 우선 + 온라인이면 뒤에서 갱신
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) {
      fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
      }).catch(()=>{});
      return cached;
    }

    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (_) {
      throw _;
    }
  })());
});