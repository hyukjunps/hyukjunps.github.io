/* O.Poong Firebase Cloud Messaging service worker
 * This worker is registered under a dedicated scope so it can coexist
 * with O.Poong's main PWA service worker during the FCM migration.
 */
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

// Initializing Messaging is enough for Firebase notification messages to be
// received while the PWA is in the background or closed.
firebase.messaging();
