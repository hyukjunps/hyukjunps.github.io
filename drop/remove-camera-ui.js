(() => {
  function cleanup() {
    document.querySelectorAll('#odropCameraPicker,#odropCameraSelectWrap,.odrop-camera-select').forEach(el => el.remove());
    document.querySelectorAll('script[src*="/drop/camera-selector.js"]').forEach(el => el.remove());
    try {
      localStorage.removeItem('odrop-camera-id-v1');
      localStorage.removeItem('odrop-camera-id-v2');
    } catch (_) {}
  }

  cleanup();
  const observer = new MutationObserver(cleanup);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (!document.querySelector('script[data-odrop-qr-loader]')) {
    const script = document.createElement('script');
    script.src = '/drop/string-mode.js?v=20260905-qr6';
    script.dataset.odropQrLoader = '1';
    document.body.appendChild(script);
  }

  setTimeout(() => {
    cleanup();
    observer.disconnect();
  }, 5000);
})();