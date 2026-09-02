(function(){
  'use strict';

  function applyRenewalNotice(){
    try{
      if(typeof NOTICE_CONFIG !== 'undefined' && NOTICE_CONFIG){
        NOTICE_CONFIG.enabled = true;
        NOTICE_CONFIG.title = 'O.Poong 리뉴얼 완료!';
        NOTICE_CONFIG.message = '미니 게임부터 포인트 샵, 시간표 기능 업그레이드, D-day 기능까지!!';
        NOTICE_CONFIG.buttonText = '';
        NOTICE_CONFIG.buttonUrl = '';
      }

      if(typeof renderNotice === 'function'){
        renderNotice();
        return true;
      }

      const box = document.getElementById('noticeBanner');
      if(box){
        box.className = 'noticeBanner topNotice';
        box.innerHTML = '<div><strong>O.Poong 리뉴얼 완료!</strong><p>미니 게임부터 포인트 샵, 시간표 기능 업그레이드, D-day 기능까지!!</p></div><span class="pill">Notice</span>';
        return true;
      }
    }catch(error){
      console.error('O.Poong notice override:', error);
    }
    return false;
  }

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
      console.warn('O.Poong startup visibility rescue:', error);
    }
  }

  function installStartFallback(){
    const start = document.getElementById('firstStartBtn');
    if(!start || start.dataset.opoongRescueInstalled === '1') return;
    start.dataset.opoongRescueInstalled = '1';

    start.addEventListener('click', function(){
      window.setTimeout(function(){
        try{
          const setup = document.getElementById('firstSetupBack');
          if(!setup) return;
          if(getComputedStyle(setup).display !== 'none') return;

          if(typeof window.startFirstSetup === 'function'){
            try{ window.startFirstSetup(); }catch(_){ }
          }

          if(getComputedStyle(setup).display === 'none'){
            document.body?.classList.remove('setup-pending');
            setup.hidden = false;
            setup.style.setProperty('display','flex','important');
            setup.style.setProperty('visibility','visible','important');
            setup.style.setProperty('opacity','1','important');
            setup.style.setProperty('z-index','2147483001','important');
          }
        }catch(error){
          console.warn('O.Poong start fallback:', error);
        }
      }, 0);
    }, true);
  }

  function rescue(){
    removeLegacySurveyOnly();
    forceStartupVisible();
    installStartFallback();
  }

  function init(){
    rescue();
    applyRenewalNotice();
    window.setTimeout(rescue, 50);
    window.setTimeout(rescue, 400);
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  }else{
    init();
  }
  window.addEventListener('pageshow', rescue);
})();
