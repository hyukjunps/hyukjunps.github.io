(() => {
  'use strict';

  // O.Poong startup reliability patch.
  // Google Forms startup survey is intentionally removed.
  // The existing first-run onboarding/privacy setup is preserved.

  function installStartButtonFallback(){
    const start = document.getElementById('firstStartBtn');
    if(!start || start.dataset.opoongFallbackInstalled === '1') return;
    start.dataset.opoongFallbackInstalled = '1';

    start.addEventListener('click', (event) => {
      // Let the original handler run first when it is healthy.
      setTimeout(() => {
        const setupBack = document.getElementById('firstSetupBack');
        if(!setupBack) return;

        const visible = getComputedStyle(setupBack).display !== 'none';
        if(visible) return;

        try{
          if(typeof window.startFirstSetup === 'function'){
            window.startFirstSetup();
            return;
          }
        }catch(error){
          console.warn('O.Poong original start handler failed:', error);
        }

        // Emergency fallback: preserve onboarding, but make the setup modal visible.
        try{
          document.body?.classList.remove('setup-pending');
          setupBack.style.display = 'flex';
          setupBack.style.zIndex = '10000';
        }catch(error){
          console.warn('O.Poong setup fallback failed:', error);
        }
      }, 0);
    }, true);
  }

  function removeLegacySurveyOnly(){
    try{
      document.getElementById('opoongStartupSurveyBack')?.remove();
      localStorage.setItem('opoong_startup_survey_closed_forever_v1', '1');
    }catch(_){ }
  }

  function init(){
    removeLegacySurveyOnly();
    installStartButtonFallback();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
  window.addEventListener('pageshow', init);

  if(!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try{
      const reg = await navigator.serviceWorker.getRegistration();
      if(!reg) return;
      await reg.update();
      if(reg.waiting) reg.waiting.postMessage({type:'SKIP_WAITING'});
      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if(!worker) return;
        worker.addEventListener('statechange', () => {
          if(worker.state === 'installed' && navigator.serviceWorker.controller){
            worker.postMessage({type:'SKIP_WAITING'});
          }
        });
      });
    }catch(error){
      console.warn('O.Poong PWA update check:', error);
    }
  });
})();
