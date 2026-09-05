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
  setTimeout(() => {
    cleanup();
    observer.disconnect();
  }, 5000);
})();