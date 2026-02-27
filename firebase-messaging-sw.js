importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging-compat.js");
// Your web app's Firebase configuration
firebase.initializeApp({
  apiKey: "AIzaSyA9BFOVG0xGYzbuhHDEydMgu2q46_9Zm4Q",
  authDomain: "opoong-9e2f1.firebaseapp.com",
  projectId: "opoong-9e2f1",
  storageBucket: "opoong-9e2f1.firebasestorage.app",
  messagingSenderId: "284175533008",
  appId: "1:284175533008:web:f484ad8d1ad2413f47efd5",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "O.Poong";
  const options = {
    body: payload?.notification?.body || "알림 테스트 ",
    icon: "/android/android-launchericon-192-192.png",
  };
  self.registration.showNotification(title, options);
});
