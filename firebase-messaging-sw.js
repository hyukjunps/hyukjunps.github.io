/* O.Poong Firebase Cloud Messaging service worker */
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA9BFOVG0xGYzbuhHDEydMgu2q46_9Zm4Q",
  authDomain: "opoong-9e2f1.firebaseapp.com",
  projectId: "opoong-9e2f1",
  storageBucket: "opoong-9e2f1.firebasestorage.app",
  messagingSenderId: "284175533008",
  appId: "1:284175533008:web:f484ad8d1ad2413f47efd5"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};
  const title = notification.title || data.title || "O.Poong 알림";

  return self.registration.showNotification(title, {
    body: notification.body || data.body || "새 알림이 도착했어요.",
    icon: notification.icon || data.icon || "/android/launchericon-192-192.png",
    badge: data.badge || "/android/launchericon-192-192.png",
    tag: data.tag || "opoong-fcm",
    data: { url: data.url || "/" }
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "/";
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        if ("navigate" in client) await client.navigate(targetUrl).catch(() => {});
        return client.focus();
      }
    }
    if (clients.openWindow) return clients.openWindow(targetUrl);
  })());
});
