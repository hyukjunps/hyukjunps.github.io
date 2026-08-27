(() => {
  const STARTUP_SURVEY_STORAGE_KEY = 'opoong_startup_survey_closed_forever_v1';
  const LEGACY_STARTUP_SURVEY_SESSION_KEY = 'opoong_startup_survey_closed_20260827_v1';
  const STARTUP_SURVEY_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSdhPHvtVg18vATZeCusUeahFpFTSpu_NV5qUoEf2qwpBh-Hhg/viewform?embedded=true';

  function isStartupSurveyDismissed(){
    try{
      if(localStorage.getItem(STARTUP_SURVEY_STORAGE_KEY) === '1') return true;
      if(sessionStorage.getItem(LEGACY_STARTUP_SURVEY_SESSION_KEY) === '1'){
        localStorage.setItem(STARTUP_SURVEY_STORAGE_KEY, '1');
        return true;
      }
      return false;
    }catch(_){return false;}
  }

  function rememberStartupSurveyDismissal(){
    try{localStorage.setItem(STARTUP_SURVEY_STORAGE_KEY, '1');}
    catch(_){ }
  }

  function showStartupSurveyPopup(){
    try{
      if(location.pathname.endsWith('/tools.html')) return;
      if(document.getElementById('opoongStartupSurveyBack')) return;
      if(isStartupSurveyDismissed()) return;

      const back = document.createElement('div');
      back.id = 'opoongStartupSurveyBack';
      back.setAttribute('role', 'dialog');
      back.setAttribute('aria-modal', 'true');
      back.setAttribute('aria-labelledby', 'opoongStartupSurveyTitle');
      back.style.cssText = [
        'position:fixed',
        'z-index:120000',
        'inset:0',
        'display:grid',
        'place-items:center',
        'padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))',
        'background:rgba(2,6,23,.72)',
        'backdrop-filter:blur(10px)',
        '-webkit-backdrop-filter:blur(10px)'
      ].join(';');

      const card = document.createElement('section');
      card.style.cssText = [
        'width:min(720px,100%)',
        'height:min(923px,calc(100dvh - 24px))',
        'max-height:calc(100vh - 24px)',
        'display:flex',
        'flex-direction:column',
        'overflow:hidden',
        'border:1px solid var(--line,#e2e8f0)',
        'border-radius:26px',
        'background:var(--card,#fff)',
        'box-shadow:0 30px 100px rgba(0,0,0,.5)'
      ].join(';');

      const head = document.createElement('div');
      head.style.cssText = [
        'flex:0 0 auto',
        'display:flex',
        'align-items:center',
        'justify-content:space-between',
        'gap:12px',
        'padding:14px 15px',
        'border-bottom:1px solid var(--line,#e2e8f0)',
        'background:var(--card,#fff)',
        'color:var(--text,#0f172a)'
      ].join(';');

      const titleWrap = document.createElement('div');
      titleWrap.style.cssText = 'min-width:0;display:flex;flex-direction:column;gap:4px';

      const title = document.createElement('strong');
      title.id = 'opoongStartupSurveyTitle';
      title.textContent = 'O.Poong 설문';
      title.style.cssText = 'font-size:16px;font-weight:1000;letter-spacing:-.3px';

      const notice = document.createElement('span');
      notice.textContent = '이 설문은 한 번만 표시되며, 닫으면 이 기기에서는 다시 나타나지 않습니다.';
      notice.style.cssText = 'color:var(--muted,#64748b);font-size:11.5px;font-weight:800;line-height:1.45';

      titleWrap.append(title, notice);

      const close = document.createElement('button');
      close.type = 'button';
      close.setAttribute('aria-label', '설문 팝업 닫기');
      close.textContent = '닫기';
      close.style.cssText = [
        'min-width:58px',
        'height:38px',
        'padding:0 13px',
        'border:1px solid var(--line,#e2e8f0)',
        'border-radius:13px',
        'background:var(--card2,#f8fbff)',
        'color:var(--text,#0f172a)',
        'font:inherit',
        'font-size:13px',
        'font-weight:950',
        'cursor:pointer'
      ].join(';');

      const frame = document.createElement('iframe');
      frame.src = STARTUP_SURVEY_URL;
      frame.title = 'O.Poong Google 설문';
      frame.loading = 'eager';
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('marginheight', '0');
      frame.setAttribute('marginwidth', '0');
      frame.style.cssText = 'display:block;flex:1 1 auto;width:100%;min-height:0;border:0;background:#fff';

      head.append(titleWrap, close);
      card.append(head, frame);
      back.appendChild(card);
      document.body.appendChild(back);

      const previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';

      const closePopup = () => {
        rememberStartupSurveyDismissal();
        document.documentElement.style.overflow = previousOverflow;
        document.removeEventListener('keydown', onKeyDown);
        back.remove();
      };
      const onKeyDown = (event) => {
        if(event.key === 'Escape') closePopup();
      };

      close.addEventListener('click', closePopup);
      back.addEventListener('click', (event) => {
        if(event.target === back) closePopup();
      });
      document.addEventListener('keydown', onKeyDown);
      window.setTimeout(() => close.focus({preventScroll:true}), 0);
    }catch(error){
      console.warn('O.Poong startup survey popup:', error);
    }
  }

  function scheduleStartupSurveyPopup(){
    window.setTimeout(showStartupSurveyPopup, 180);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', scheduleStartupSurveyPopup, {once:true});
  }else{
    scheduleStartupSurveyPopup();
  }

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