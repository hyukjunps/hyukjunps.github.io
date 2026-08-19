(() => {
  if (!('serviceWorker' in navigator)) return;

  /*
   * 업데이트 중인 서비스워커가 활성화돼도 현재 화면을 강제로 새로고침하지 않는다.
   * 게임·집중모드·입력 작업 도중 갑자기 화면이 초기화되는 문제를 막기 위함이다.
   * 새 워커는 즉시 제어권을 가져가고, 다음 일반 탐색/새로고침부터 최신 앱 셸을 사용한다.
   */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      window.dispatchEvent(new CustomEvent('opoong-sw-updated'));
    } catch (_) {}
    console.info('O.Poong 업데이트가 적용됐어요. 현재 화면은 유지합니다.');
  });

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      await reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (e) {
      console.warn('O.Poong PWA update check:', e);
    }
  });
})();