/* 오늘풍산 PWA Service Worker (GitHub Pages용 - 최신반영 안정화 버전) */

const CACHE_VERSION = "v4";   // 🔥 수정할 때마다 숫자 올리기
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;

// HTML은 캐시하지 않는다 (업데이트 문제 방지)
const CORE_ASSETS = [
  "./manifest.json",
  "./android/Android-launchericon-512-512.png"
];

/* ============================= */
/* 설치 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

/* ============================= */
/* 활성화 - 이전 캐시 삭제 */
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

/* ============================= */
/* fetch 전략 */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 같은 origin만 처리
  if (url.origin !== self.location.origin) return;

  // 🔥 index.html은 항상 네트워크 우선 (캐시 저장 안함)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("./index.html"))
    );
    return;
  }

  // 그 외 정적 파일은 캐시 우선
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
