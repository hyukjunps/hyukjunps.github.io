(() => {
  const WORKER_URL = "https://opoong-push.yyhhjj1068-c2c.workers.dev";
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
  const ENABLED_KEY = "opoongFcmEnabled";

  function isInstalledPwa() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  async function loadFirebase() {
    const [{ initializeApp, getApps }, { getMessaging, getToken, deleteToken, onMessage, isSupported }] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging.js")
    ]);
    if (!(await isSupported())) throw new Error("이 브라우저에서는 Firebase 알림을 지원하지 않아요.");
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    return { messaging: getMessaging(app), getToken, deleteToken, onMessage };
  }

  async function getFcmRegistration() {
    if (!("serviceWorker" in navigator)) throw new Error("Service Worker를 지원하지 않는 브라우저예요.");
    return navigator.serviceWorker.register("./firebase-messaging-sw.js", {
      scope: "./firebase-cloud-messaging-push-scope/"
    });
  }

  async function postToken(path, token) {
    const response = await fetch(WORKER_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token })
    });
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      const detail = data?.error ? `: ${data.error}` : "";
      throw new Error(`FCM 서버 연결 실패 (${response.status})${detail}`);
    }
    return data;
  }

  async function createFcmToken() {
    if (!isInstalledPwa()) throw new Error("O.Poong 앱을 설치한 뒤 앱에서 알림을 켜 주세요.");
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
    return token;
  }

  async function cleanupLegacyWebPush() {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (registration.active?.scriptURL?.includes("firebase-messaging-sw.js")) continue;
        const subscription = await registration.pushManager?.getSubscription?.();
        if (!subscription) continue;
        try {
          await fetch(WORKER_URL + "/unsubscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: subscription.endpoint })
          });
        } catch (_) {}
        await subscription.unsubscribe().catch(() => {});
      }
    } catch (_) {}
  }

  async function enableMorningFcm() {
    const token = await createFcmToken();
    await postToken("/fcm/subscribe", token);
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(ENABLED_KEY, "true");
    await cleanupLegacyWebPush();
    return token;
  }

  async function disableMorningFcm() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await postToken("/fcm/unsubscribe", token).catch(() => {});
    try {
      const { messaging, deleteToken } = await loadFirebase();
      await deleteToken(messaging);
    } catch (_) {}
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ENABLED_KEY);
  }

  async function sendServerTest() {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token) token = await enableMorningFcm();
    return postToken("/fcm/test", token);
  }

  async function refreshTokenRegistration() {
    if (localStorage.getItem(ENABLED_KEY) !== "true") return;
    try {
      const token = await createFcmToken();
      await postToken("/fcm/subscribe", token);
      localStorage.setItem(TOKEN_KEY, token);
      await cleanupLegacyWebPush();
    } catch (error) {
      console.warn("O.Poong FCM token refresh failed", error);
    }
  }

  async function listenForegroundMessages() {
    try {
      const { messaging, onMessage } = await loadFirebase();
      onMessage(messaging, async (payload) => {
        const notification = payload.notification || {};
        const data = payload.data || {};
        const registration = await getFcmRegistration();
        if (Notification.permission !== "granted") return;
        await registration.showNotification(notification.title || data.title || "O.Poong 알림", {
          body: notification.body || data.body || "새 알림이 도착했어요.",
          icon: notification.icon || data.icon || "./android/launchericon-192-192.png",
          badge: data.badge || "./android/launchericon-192-192.png",
          tag: data.tag || "opoong-fcm-foreground",
          data: { url: data.url || "./" }
        });
      });
    } catch (_) {}
  }

  function makeButton(id, bottom, background) {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    Object.assign(button.style, {
      position: "fixed", right: "16px", bottom, zIndex: "9998", border: "0",
      borderRadius: "999px", padding: "11px 16px", background, color: "#fff",
      fontWeight: "800", boxShadow: "0 6px 18px rgba(0,0,0,.2)", cursor: "pointer"
    });
    return button;
  }

  function mountButtons() {
    if (!isInstalledPwa() || document.getElementById("opoongFcmButton")) return;

    const mainButton = makeButton("opoongFcmButton", "76px", "#2563eb");
    const testButton = makeButton("opoongFcmTestButton", "126px", "#0f766e");
    const sync = () => {
      const enabled = localStorage.getItem(ENABLED_KEY) === "true";
      mainButton.dataset.enabled = enabled ? "true" : "false";
      mainButton.textContent = enabled ? "🔕 오전 8시 알림 끄기" : "🔔 오전 8시 알림 켜기";
      mainButton.style.background = enabled ? "#475569" : "#2563eb";
      testButton.hidden = !enabled;
    };

    testButton.textContent = "🧪 오늘 알림 테스트";
    testButton.hidden = true;

    mainButton.addEventListener("click", async () => {
      mainButton.disabled = true;
      try {
        if (mainButton.dataset.enabled === "true") {
          if (!confirm("매일 오전 8시 학사일정·점심·저녁 알림을 끌까요?")) return;
          mainButton.textContent = "해제 중…";
          await disableMorningFcm();
          alert("오전 8시 알림을 껐어요.");
        } else {
          mainButton.textContent = "연결 중…";
          await enableMorningFcm();
          alert("매일 오전 8시에 학사일정·점심·저녁 알림을 받을 수 있습니다.");
        }
      } catch (error) {
        alert(error.message || "FCM 알림 설정 중 오류가 발생했어요.");
      } finally {
        mainButton.disabled = false;
        sync();
      }
    });

    testButton.addEventListener("click", async () => {
      testButton.disabled = true;
      const old = testButton.textContent;
      testButton.textContent = "오늘 알림 전송 중…";
      try {
        const result = await sendServerTest();
        alert(`오늘의 실제 알림 ${result?.sent || 3}개를 전송했어요. 학사일정·점심·저녁 알림을 확인하세요.`);
      } catch (error) {
        alert(error.message || "오늘 알림 전송에 실패했어요.");
      } finally {
        testButton.textContent = old;
        testButton.disabled = false;
      }
    });

    document.body.appendChild(testButton);
    document.body.appendChild(mainButton);
    sync();
    refreshTokenRegistration();
  }

  listenForegroundMessages();
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountButtons, { once: true });
  else mountButtons();
})();
