const CACHE_VERSION = "v9"; // 수정할 때마다 올리기
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;
const SCHEDULE_PROXY_HOST = "gkrtkdlfwjd.yyhhjj1068-c2c.workers.dev";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./android/launchericon-512-512.png",
];

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

async function scheduleJsonResponse(yyyymm) {
  const staticUrl = new URL(`./data/schedule/${yyyymm}.json`, self.location.href);
  staticUrl.searchParams.set("v", Date.now().toString());

  const res = await fetch(staticUrl.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`schedule json HTTP ${res.status}`);

  const body = await res.text();
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 학사일정은 GitHub Actions가 매시간 갱신한 JSON을 우선 사용하고, 없으면 기존 프록시로 폴백합니다.
  if (url.hostname === SCHEDULE_PROXY_HOST) {
    const yyyymm = String(url.searchParams.get("ym") || "").replace(/[^0-9]/g, "");
    if (/^20\d{4}$/.test(yyyymm)) {
      event.respondWith(scheduleJsonResponse(yyyymm).catch(() => fetch(req)));
      return;
    }
  }

  // 같은 origin만 처리
  if (url.origin !== self.location.origin) return;

  // 1) HTML(navigate): 온라인이면 무조건 최신(no-store) / 오프라인이면 캐시된 index로
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);

      try {
        const fresh = await fetch(req, { cache: "no-store" });
        await cache.put("./index.html", fresh.clone());
        await cache.put("./", fresh.clone());
        return fresh;
      } catch (_) {
        // 오프라인 폴백(앱 셸)
        return (
          (await cache.match("./index.html", { ignoreSearch: true })) ||
          (await cache.match("./", { ignoreSearch: true })) ||
          (await caches.match("./index.html", { ignoreSearch: true })) ||
          (await caches.match("./", { ignoreSearch: true }))
        );
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
