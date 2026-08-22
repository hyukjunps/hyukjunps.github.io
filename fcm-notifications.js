(() => {
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA9BFOVG0xGYzbuhHDEydMgu2q46_9Zm4Q",
    authDomain: "opoong-9e2f1.firebaseapp.com",
    projectId: "opoong-9e2f1",
    storageBucket: "opoong-9e2f1.firebasestorage.app",
    messagingSenderId: "284175533008",
    appId: "1:284175533008:web:f484ad8d1ad2413f47efd5"
  };
  const VAPID_KEY = "BO4RUsKY5Vo9r4L1XglCPbr-367L-R7RHJIcKRl8KTYAPAkCQsU5zGhrB0WUfEWrjTSduQbCL1aBRdPi80_VAUA";
  const TOKEN_KEY = "opoongFcmToken";

  function isInstalledPwa() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  async function loadFirebase() {
    const [{ initializeApp, getApps }, { getMessaging, getToken, onMessage, isSupported }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js")
    ]);
    if (!(await isSupported())) throw new Error("이 브라우저에서는 Firebase 알림을 지원하지 않아요.");
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    return { messaging: getMessaging(app), getToken, onMessage };
  }

  async function getFcmRegistration() {
    if (!("serviceWorker" in navigator)) throw new Error("Service Worker를 지원하지 않는 브라우저예요.");
    return navigator.serviceWorker.register("./firebase-messaging-sw.js", {
      scope: "./firebase-cloud-messaging-push-scope/"
    });
  }

  async function createFcmToken() {
    if (!isInstalledPwa()) throw new Error("O.Poong 앱에서 FCM을 연결해 주세요.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("알림 권한을 허용해 주세요.");

    const [{ messaging, getToken }, registration] = await Promise.all([
      loadFirebase(),
      getFcmRegistration()
    ]);

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration
    });
    if (!token) throw new Error("FCM 등록 토큰을 발급받지 못했어요.");
    localStorage.setItem(TOKEN_KEY, token);
    return token;
  }

  async function copyToken(token) {
    try {
      await navigator.clipboard.writeText(token);
      return true;
    } catch (_) {
      window.prompt("아래 FCM 등록 토큰을 복사하세요.", token);
      return false;
    }
  }

  async function listenForegroundMessages() {
    try {
      const { messaging, onMessage } = await loadFirebase();
      onMessage(messaging, async (payload) => {
        const notification = payload.notification || {};
        const data = payload.data || {};
        const mainRegistration = await navigator.serviceWorker.getRegistration();
        if (!mainRegistration || Notification.permission !== "granted") return;
        await mainRegistration.showNotification(notification.title || data.title || "O.Poong 알림", {
          body: notification.body || data.body || "새 알림이 도착했어요.",
          icon: notification.icon || data.icon || "./android/launchericon-192-192.png",
          badge: data.badge || "./android/launchericon-192-192.png",
          tag: data.tag || "opoong-fcm-foreground",
          data: { url: data.url || "./" }
        });
      });
    } catch (_) {}
  }

  function mountFcmButton() {
    if (!isInstalledPwa() || document.getElementById("opoongFcmButton")) return;

    const button = document.createElement("button");
    button.id = "opoongFcmButton";
    button.type = "button";
    button.textContent = localStorage.getItem(TOKEN_KEY) ? "🔥 FCM 토큰 복사" : "🔥 FCM 연결";
    Object.assign(button.style, {
      position: "fixed",
      right: "16px",
      bottom: "176px",
      zIndex: "9998",
      border: "0",
      borderRadius: "999px",
      padding: "11px 16px",
      background: "#f97316",
      color: "#fff",
      fontWeight: "800",
      boxShadow: "0 6px 18px rgba(0,0,0,.2)",
      cursor: "pointer"
    });

    button.addEventListener("click", async () => {
      button.disabled = true;
      const oldText = button.textContent;
      button.textContent = "FCM 연결 중…";
      try {
        const token = await createFcmToken();
        await copyToken(token);
        button.textContent = "🔥 FCM 토큰 복사";
        alert("FCM 연결 완료! 등록 토큰을 복사했어요. Firebase Console의 테스트 메시지에 붙여넣으면 됩니다.");
      } catch (error) {
        button.textContent = oldText;
        alert(error.message || "FCM 연결 중 오류가 발생했어요.");
      } finally {
        button.disabled = false;
      }
    });

    document.body.appendChild(button);
  }

  listenForegroundMessages();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFcmButton, { once: true });
  } else {
    mountFcmButton();
  }
})();
