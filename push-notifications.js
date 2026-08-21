(() => {
  const WORKER_URL = "https://opoong-push.yyhhjj1068-c2c.workers.dev";
  const VAPID_PUBLIC_KEY = "BMqh_J8rA6Z4-njgff7OoygUeJM13dm7QndVqO-ET663RPftcEjI9MQWN2CkpqdgG4wWdz5xGoy3YiIUcKLmVP8";

  function toUint8Array(value) {
    const padding = "=".repeat((4 - value.length % 4) % 4);
    const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64);
    return Uint8Array.from(raw, char => char.charCodeAt(0));
  }

  async function getRegistration() {
    const existing = await navigator.serviceWorker.getRegistration();
    return existing || navigator.serviceWorker.register("./service-worker.js");
  }

  async function saveSubscription(subscription) {
    const response = await fetch(WORKER_URL + "/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(subscription.toJSON())
    });
    if (!response.ok) throw new Error("구독 저장 실패 (" + response.status + ")");
  }

  async function subscribe() {
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

  async function updateButton(button) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      button.textContent = "알림 미지원";
      button.disabled = true;
      return;
    }
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    button.textContent = subscription ? "🔔 아침 알림 켜짐" : "🔔 아침 알림 켜기";
    button.dataset.subscribed = subscription ? "true" : "false";
  }

  function mountButton() {
    if (document.getElementById("opoongPushButton")) return;
    const button = document.createElement("button");
    button.id = "opoongPushButton";
    button.type = "button";
    button.setAttribute("aria-label", "매일 오전 7시 아침 알림 켜기");
    Object.assign(button.style, {
      position: "fixed",
      right: "16px",
      bottom: "76px",
      zIndex: "9998",
      border: "0",
      borderRadius: "999px",
      padding: "11px 16px",
      background: "#2563eb",
      color: "#fff",
      fontWeight: "800",
      boxShadow: "0 6px 18px rgba(0,0,0,.2)",
      cursor: "pointer"
    });
    button.textContent = "🔔 아침 알림 켜기";
    button.addEventListener("click", async () => {
      if (button.dataset.subscribed === "true") {
        alert("아침 알림이 이미 켜져 있어요. 매일 오전 7시에 전송됩니다.");
        return;
      }
      button.disabled = true;
      button.textContent = "설정 중…";
      try {
        await subscribe();
        button.dataset.subscribed = "true";
        button.textContent = "🔔 아침 알림 켜짐";
        alert("아침 알림을 켰어요. 매일 오전 7시에 받을 수 있습니다.");
      } catch (error) {
        button.textContent = "🔔 아침 알림 켜기";
        alert(error.message || "알림 설정 중 오류가 발생했어요.");
      } finally {
        button.disabled = false;
      }
    });
    document.body.appendChild(button);
    updateButton(button).catch(() => {});
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton, { once: true });
  } else {
    mountButton();
  }
})();
