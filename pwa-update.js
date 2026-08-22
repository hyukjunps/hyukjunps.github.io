(() => {
  if (!('serviceWorker' in navigator)) return;

  const FIRST_SETUP_FRESH_RELOAD = 'opoong_first_setup_fresh_reload_v1';
  const FRESH_QUERY = '__opoongFresh';

  function cleanFreshQuery(){
    try{
      const url = new URL(location.href);
      if(!url.searchParams.has(FRESH_QUERY)) return;
      url.searchParams.delete(FRESH_QUERY);
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }catch(_){ }
  }

  function showUpdatingCover(){
    if(document.getElementById('opoongFirstSetupUpdating')) return;
    const cover = document.createElement('div');
    cover.id = 'opoongFirstSetupUpdating';
    cover.setAttribute('role','status');
    cover.setAttribute('aria-live','polite');
    cover.style.cssText = 'position:fixed;z-index:99999;inset:0;display:grid;place-items:center;padding:24px;background:var(--bg,#f5f7fb);color:var(--text,#0f172a);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;';
    cover.innerHTML = '<div style="max-width:420px"><div style="font-size:32px;font-weight:1000;letter-spacing:-1px">O.Poong</div><div style="margin-top:12px;font-size:15px;font-weight:900">최신 버전을 적용하고 있어요.</div><div style="margin-top:7px;color:var(--muted,#64748b);font-size:12.5px;font-weight:800;line-height:1.6">초기 설정은 저장됐습니다. 화면이 자동으로 한 번 새로 열려요.</div></div>';
    document.body.appendChild(cover);
  }

  async function reloadFreshAfterFirstSetup(){
    try{
      if(sessionStorage.getItem(FIRST_SETUP_FRESH_RELOAD) === '1') return;
      sessionStorage.setItem(FIRST_SETUP_FRESH_RELOAD, '1');
    }catch(_){ }

    showUpdatingCover();

    try{
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg) await reg.unregister();
    }catch(e){
      console.warn('O.Poong first setup SW cleanup:', e);
    }

    try{
      if('caches' in window){
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('todaypoongsan-')).map(key => caches.delete(key)));
      }
    }catch(e){
      console.warn('O.Poong first setup cache cleanup:', e);
    }

    try{
      const url = new URL(location.href);
      url.searchParams.set(FRESH_QUERY, String(Date.now()));
      location.replace(url.toString());
    }catch(_){
      location.reload();
    }
  }

  function wrapFirstSetupFinish(){
    const original = window.finishFirstSetup;
    if(typeof original !== 'function' || original.__opoongFreshAfterSetup) return false;

    const wrapped = function(){
      const wasPending = Boolean(document.body && document.body.classList.contains('setup-pending'));
      const result = original.apply(this, arguments);

      window.setTimeout(() => {
        const completed = wasPending && document.body && !document.body.classList.contains('setup-pending');
        if(completed) reloadFreshAfterFirstSetup();
      }, 0);

      return result;
    };
    wrapped.__opoongFreshAfterSetup = true;
    wrapped.__original = original;
    window.finishFirstSetup = wrapped;
    return true;
  }

  cleanFreshQuery();
  wrapFirstSetupFinish();
  document.addEventListener('DOMContentLoaded', wrapFirstSetupFinish, { once:true });

  /*
   * 일반 업데이트에서는 게임·집중모드·입력 작업을 보호하기 위해 현재 화면을
   * 강제로 새로고침하지 않는다. 단, 첫 설정을 완료한 직후에는 위 래퍼가 캐시와
   * 이전 서비스워커를 정리한 뒤 최신 앱을 자동으로 한 번 다시 연다.
   */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      window.dispatchEvent(new CustomEvent('opoong-sw-updated'));
    } catch (_) {}
    console.info('O.Poong 업데이트가 적용됐어요. 현재 화면은 유지합니다.');
  });

  window.addEventListener('load', async () => {
    wrapFirstSetupFinish();
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