const CACHE_VERSION = "v28"; // 수정할 때마다 올리기
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./android/launchericon-512-512.png",
  "./game-hearts.js",
];

function withGameHearts(response) {
  if (!response || !response.ok) return response;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("text/html")) return response;

  return (async () => {
    const html = await response.text();
    if (html.includes("game-hearts.js")) {
      return new Response(html, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    }

    const tag = '<script src="./game-hearts.js?v=20260817" defer></script>';
    const patched = html.includes("</body>")
      ? html.replace("</body>", `${tag}\n</body>`)
      : `${html}\n${tag}`;

    const headers = new Headers(response.headers);
    headers.delete("content-length");
    return new Response(patched, {
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
  // 쿼리 문자열을 무시한 cache-first 정책이 과거의 깨진 JSON을 계속
  // 반환하지 않도록 경로만으로 된 단일 키에 마지막 정상 응답을 저장한다.
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

  // 1) HTML(navigate): 온라인이면 최신 HTML을 받고 하트 시스템을 삽입 / 오프라인이면 캐시된 index로
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

  // 2) 정적 파일: 캐시 우선(오프라인 안정) + 온라인이면 뒤에서 갱신
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) {
      // 뒤에서 갱신(실패해도 무시)
      fetch(req).then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
      }).catch(()=>{});
      return cached;
    }

    // 캐시에 없으면 네트워크 시도, 실패 시 브라우저가 네트워크 실패로 처리하도록 둠
    try {
      const res = await fetch(req);
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    } catch (_) {
      throw _;
    }
  })());
});
