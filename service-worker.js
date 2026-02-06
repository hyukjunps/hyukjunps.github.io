/* 오늘풍산 PWA Service Worker (GitHub Pages용) */
const CACHE_VERSION = "v1";
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;

// 최소 캐시(필수 정적 파일)
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./Android-launchericon-512-512.png"
];

// 설치 시 기본 파일 캐시
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// 활성화: 이전 캐시 정리
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))
      )
    )
  );
  self.clients.claim();
});

// fetch 전략
// - 페이지 이동(navigate): 네트워크 우선(최신 반영), 실패 시 캐시 폴백
// - 정적 자원: 캐시 우선, 없으면 네트워크 후 캐시 저장
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 같은 origin만 처리(NEIS 등 외부 API는 브라우저가 직접 처리)
  if (url.origin !== self.location.origin) return;

  // HTML 네비게이션
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // 그 외(아이콘/manifest 등)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
