/* 오늘풍산 PWA Service Worker - v2 강제 업데이트 버전 */
const CACHE_VERSION = "v2"; // 버전을 올려서 브라우저가 새 SW를 인식하게 합니다.
const CACHE_NAME = `todaypoongsan-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json?v=2", // 쿼리 스트링으로 매니페스트 갱신 강제
  "android/android-launchericon-512-512.png?v=2" // 파일명 소문자 확인 필수!
];

self.addEventListener("install", (event) => {
  self.skipWaiting(); // 새로운 서비스 워커가 발견되면 즉시 활성화
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log("Old cache deleted:", k);
            return caches.delete(k);
          }
        })
      )
    )
  );
  self.clients.claim(); // 즉시 모든 탭 제어권을 가져옴
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) return;

  // 업데이트 핵심: manifest.json이나 아이콘은 네트워크에서 먼저 확인하도록 전략 변경
  if (url.pathname.includes('manifest.json') || url.pathname.includes('launchericon')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // 기본 전략: 캐시 우선 (성능 최적화)
  event.respondWith(
    caches.match(req).then((cached) => {
      return cached || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        return res;
      });
    })
  );
});
