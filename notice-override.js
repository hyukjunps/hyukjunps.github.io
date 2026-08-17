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

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', applyRenewalNotice, {once:true});
  }else{
    applyRenewalNotice();
  }

  window.setTimeout(applyRenewalNotice, 400);
})();
