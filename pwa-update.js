(() => {
  'use strict';

  // Google Forms startup survey is removed.
  // Existing O.Poong first-run onboarding/privacy setup is preserved.

  function removeLegacySurveyOnly(){
    try{
      document.getElementById('opoongStartupSurveyBack')?.remove();
      localStorage.setItem('opoong_startup_survey_closed_forever_v1', '1');
    }catch(_){ }
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
            setupBack.style.display = 'flex';
            setupBack.style.zIndex = '10000';
          }
        }catch(error){
          console.warn('O.Poong setup fallback failed:', error);
        }
      }, 0);
    }, true);
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

  // Update the worker quietly. Do not reload, navigate, unregister,
  // or force startup/home visibility from here.
  if('serviceWorker' in navigator){
    window.addEventListener('load', async () => {
      try{
        const reg = await navigator.serviceWorker.getRegistration();
        if(reg) await reg.update();
      }catch(error){
        console.warn('O.Poong PWA update check:', error);
      }
    });
  }
})();
