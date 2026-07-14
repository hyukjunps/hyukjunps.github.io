const CACHE_VERSION = "v15"; // 수정할 때마다 올리기
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;

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

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { body: event.data ? event.data.text() : "새로운 날씨 안내가 있어요." };
  }

  const severity = String(data.severity || "normal");
  const options = {
    body: data.body || "풍산고 날씨와 기상특보를 확인해 주세요.",
    icon: "./android/launchericon-512-512.png",
    badge: "./android/launchericon-512-512.png",
    tag: data.tag || "opoong-weather",
    renotify: severity === "danger" || severity === "warning",
    requireInteraction: severity === "danger",
    data: { url: data.url || "/?page=weather" },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "O.Poong 날씨 알림", options),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/?page=weather", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("navigate" in client) await client.navigate(target);
      return client.focus();
    }
    return self.clients.openWindow(target);
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

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
