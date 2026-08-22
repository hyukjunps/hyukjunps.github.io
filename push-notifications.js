(() => {
  if (window.__opoongFcmLoaded) return;
  window.__opoongFcmLoaded = true;
  import("./fcm-notifications.js?v=20260822-2").catch((error) => {
    console.warn("O.Poong FCM loader failed", error);
  });
})();
