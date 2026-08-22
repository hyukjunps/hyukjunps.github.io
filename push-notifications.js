(() => {
  const WORKER_URL = "https://opoong-push.yyhhjj1068-c2c.workers.dev";
  const VAPID_PUBLIC_KEY = "BMqh_J8rA6Z4-njgff7OoygUeJM13dm7QndVqO-ET663RPftcEjI9MQWN2CkpqdgG4wWdz5xGoy3YiIUcKLmVP8";

  function isInstalledPwa() {
    return window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
  }

  function toUint8Array(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function getRegistration() {
    if (!("serviceWorker" in navigator)) throw new Error("Service Worker를 지원하지 않는 브라우저예요.");
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) registration = await navigator.serviceWorker.register("./service-worker.js");
    return navigator.serviceWorker.ready;
  }

  async function saveSubscription(subscription) {
    const response = await fetch(WORKER_URL + "/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON())
    });
    if (!response.ok) throw new Error("구독 저장 실패 (" + response.status + ")");
  }

  async function removeSubscription(subscription) {
    const response = await fetch(WORKER_URL + "/unsubscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    if (!response.ok) throw new Error("구독 해제 실패 (" + response.status + ")");
    const removed = await subscription.unsubscribe();
    if (!removed) throw new Error("브라우저 구독을 해제하지 못했어요.");
  }

  async function subscribe() {
    if (!isInstalledPwa()) throw new Error("O.Poong 앱을 설치한 뒤 앱에서 알림을 켜 주세요.");
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("이 브라우저는 웹 푸시 알림을 지원하지 않아요.");
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("브라우저에서 알림 권한을 허용해 주세요.");
    }
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription() ||
      await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(VAPID_PUBLIC_KEY)
      });
    await saveSubscription(subscription);
    return subscription;
  }

  async function getSubscription() {
    const registration = await getRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return { registration, subscription };
  }

  async function showDeviceTestNotification() {
    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("알림 권한을 먼저 허용해 주세요.");
    }
    const { registration, subscription } = await getSubscription();
    if (!subscription) throw new Error("먼저 아침 알림을 켜 주세요.");
    await registration.showNotification("O.Poong 테스트 알림", {
      body: "이 알림이 보이면 PWA와 기기 알림 표시 기능은 정상입니다.",
      icon: "./android/launchericon-192-192.png",
      badge: "./android/launchericon-192-192.png",
      tag: "opoong-device-test",
      data: { url: "./" }
    });
  }

  function syncTestButton(testButton, subscribed) {
    if (!testButton) return;
    testButton.hidden = !subscribed;
  }

  async function updateButton(button, testButton) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      button.textContent = "알림 미지원";
      button.disabled = true;
      syncTestButton(testButton, false);
      return;
    }
    const { subscription } = await getSubscription();
    if (subscription) await saveSubscription(subscription);
    const subscribed = Boolean(subscription);
    button.textContent = subscribed ? "🔕 아침 알림 끄기" : "🔔 아침 알림 켜기";
    button.dataset.subscribed = subscribed ? "true" : "false";
    button.style.background = subscribed ? "#475569" : "#2563eb";
    syncTestButton(testButton, subscribed);
  }

  function makeFloatingButton(id, bottom, background) {
    const button = document.createElement("button");
    button.id = id;
    button.type = "button";
    Object.assign(button.style, {
      position: "fixed",
      right: "16px",
      bottom,
      zIndex: "9998",
      border: "0",
      borderRadius: "999px",
      padding: "11px 16px",
      background,
      color: "#fff",
      fontWeight: "800",
      boxShadow: "0 6px 18px rgba(0,0,0,.2)",
      cursor: "pointer"
    });
    return button;
  }

  function mountButton() {
    if (!isInstalledPwa()) return;
    if (document.getElementById("opoongPushButton")) return;

    const button = makeFloatingButton("opoongPushButton", "76px", "#2563eb");
    button.setAttribute("aria-label", "매일 오전 8시 아침 알림 켜기 또는 끄기");
    button.textContent = "🔔 아침 알림 켜기";

    const testButton = makeFloatingButton("opoongPushTestButton", "126px", "#0f766e");
    testButton.setAttribute("aria-label", "O.Poong 기기 알림 테스트");
    testButton.textContent = "🧪 기기 알림 테스트";
    testButton.hidden = true;

    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        if (button.dataset.subscribed === "true") {
          if (!confirm("매일 오전 8시 아침 알림을 끌까요?")) return;
          button.textContent = "해제 중…";
          const { subscription } = await getSubscription();
          if (subscription) await removeSubscription(subscription);
          button.dataset.subscribed = "false";
          button.textContent = "🔔 아침 알림 켜기";
          button.style.background = "#2563eb";
          syncTestButton(testButton, false);
          alert("아침 알림을 껐어요.");
        } else {
          button.textContent = "설정 중…";
          await subscribe();
          button.dataset.subscribed = "true";
          button.textContent = "🔕 아침 알림 끄기";
          button.style.background = "#475569";
          syncTestButton(testButton, true);
          alert("아침 알림을 켰어요. 매일 오전 8시에 받을 수 있습니다.");
        }
      } catch (error) {
        await updateButton(button, testButton).catch(() => {});
        alert(error.message || "알림 설정 중 오류가 발생했어요.");
      } finally {
        button.disabled = false;
      }
    });

    testButton.addEventListener("click", async () => {
      testButton.disabled = true;
      const oldText = testButton.textContent;
      testButton.textContent = "테스트 중…";
      try {
        await showDeviceTestNotification();
      } catch (error) {
        alert(error.message || "테스트 알림을 표시하지 못했어요.");
      } finally {
        testButton.textContent = oldText;
        testButton.disabled = false;
      }
    });

    document.body.appendChild(testButton);
    document.body.appendChild(button);
    updateButton(button, testButton).catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton, { once: true });
  } else {
    mountButton();
  }
})();
