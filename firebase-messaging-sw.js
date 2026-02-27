importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyA9BFOVG0xGYzbuhHDEydMgu2q46_9Zm4Q",
  authDomain: "opoong-9e2f1.firebaseapp.com",
  projectId: "opoong-9e2f1",
  messagingSenderId: "284175533008",
  appId: "1:284175533008:web:f484ad8d1ad2413f47efd5"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  var noti = payload && payload.notification ? payload.notification : {};
  var title = noti.title ? noti.title : "O.Poong";
  var body = noti.body ? noti.body : "알림 테스트";

  self.registration.showNotification(title, {
    body: body,
    icon: "/android/android-launchericon-192-192.png"
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow("/"));
});
