import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getMessaging, getToken } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-messaging.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9BFOVG0xGYzbuhHDEydMgu2q46_9Zm4Q",
  authDomain: "opoong-9e2f1.firebaseapp.com",
  projectId: "opoong-9e2f1",
  storageBucket: "opoong-9e2f1.firebasestorage.app",
  messagingSenderId: "284175533008",
  appId: "1:284175533008:web:f484ad8d1ad2413f47efd5",
};

const VAPID_KEY = "BO4RUsKY5Vo9r4L1XglCPbr-367L-R7RHJIcKRl8KTYAPAkCQsU5zGhrB0WUfEWrjTSduQbCL1aBRdPi80_VAUA";

export async function enablePush() {
  // ✅ 루트 배포이므로 반드시 이 경로
  const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("알림 권한 거부됨");

  const app = initializeApp(firebaseConfig);
  const messaging = getMessaging(app);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: swReg,
  });

  if (!token) throw new Error("토큰 발급 실패");

  return token;
}
