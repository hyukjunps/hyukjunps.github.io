(() => {
  'use strict';

  // Google Forms startup survey is intentionally removed.
  // Existing O.Poong first-run onboarding/privacy setup stays intact.

  function removeLegacySurveyOnly(){
    try{
      document.getElementById('opoongStartupSurveyBack')?.remove();
      localStorage.setItem('opoong_startup_survey_closed_forever_v1', '1');
    }catch(_){ }
  }

  function forceStartupVisible(){
    try{
      const body = document.body;
      const back = document.getElementById('firstStartBack');
      if(!body || !back || !body.classList.contains('setup-pending')) return;

      back.hidden = false;
      back.style.setProperty('display','flex','important');
      back.style.setProperty('visibility','visible','important');
      back.style.setProperty('opacity','1','important');
      back.style.setProperty('pointer-events','auto','important');
      back.style.setProperty('position','fixed','important');
      back.style.setProperty('inset','0','important');
      back.style.setProperty('z-index','2147483000','important');
      back.style.setProperty('width','100%','important');
      back.style.setProperty('min-height','100dvh','important');

      const card = back.querySelector('.firstStartCard');
      if(card){
        card.style.setProperty('display','flex','important');
        card.style.setProperty('visibility','visible','important');
        card.style.setProperty('opacity','1','important');
      }

      const start = document.getElementById('firstStartBtn');
      if(start){
        start.hidden = false;
        start.disabled = false;
        start.style.setProperty('display','inline-flex','important');
        start.style.setProperty('visibility','visible','important');
        start.style.setProperty('opacity','1','important');
        start.style.setProperty('pointer-events','auto','important');
      }
    }catch(error){
      console.warn('O.Poong startup visibility repair:', error);
    }
  }

  function installStartButtonFallback(){
    const start = document.getElementById('firstStartBtn');
    if(!start || start.dataset.opoongFallbackInstalled === '1') return;
    start.dataset.opoongFallbackInstalled = '1';

    start.addEventListener('click', () => {
      setTimeout(() => {
        const setupBack = document.getElementById('firstSetupBack');
        if(!setupBack) return;

        try{
          if(getComputedStyle(setupBack).display !== 'none') return;
          if(typeof window.startFirstSetup === 'function'){
            try{ window.startFirstSetup(); }catch(_){ }
          }

          if(getComputedStyle(setupBack).display === 'none'){
            document.body?.classList.remove('setup-pending');
            setupBack.hidden = false;
            setupBack.style.setProperty('display','flex','important');
            setupBack.style.setProperty('visibility','visible','important');
            setupBack.style.setProperty('opacity','1','important');
            setupBack.style.setProperty('z-index','2147483001','important');
          }
        }catch(error){
          console.warn('O.Poong setup fallback failed:', error);
        }
      }, 0);
    }, true);
  }

  function rescue(){
    removeLegacySurveyOnly();
    forceStartupVisible();
    installStartButtonFallback();
  }

  function init(){
    rescue();
    setTimeout(rescue, 50);
    setTimeout(rescue, 400);
    setTimeout(rescue, 1200);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
  window.addEventListener('pageshow', rescue);

  if(!('serviceWorker' in navigator)) return;

  let controllerReloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    rescue();
    try{
      const key = 'opoong_startup_worker_reload_v79';
      if(controllerReloading || sessionStorage.getItem(key) === '1') return;
      controllerReloading = true;
      sessionStorage.setItem(key, '1');
      setTimeout(() => location.reload(), 80);
    }catch(_){ }
  });

  window.addEventListener('load', async () => {
    rescue();
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
