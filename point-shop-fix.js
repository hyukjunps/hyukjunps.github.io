(() => {
  'use strict';

  /*
   * O.Poong point-system retirement cleanup
   * - 집중 모드의 공부시간/과목/세션 기록은 유지합니다.
   * - 포인트 잔액, 포인트샵 구매/장착, 아바타·가챠·펫 연동 상태는 삭제합니다.
   * - 이후 포인트 적립/차감/구매 함수는 동작하지 않도록 막습니다.
   */

  const LEGACY_PREFIXES = [
    'opoong_rewards',
    'opoong_point_shop',
    'opoong_shop_',
    'opoong_avatar_gacha',
    'opoong_gacha_',
    'opoong_pet_'
  ];
  const FOCUS_LOG_KEY = 'opoong_focus_log_v1';
  const FOCUS_SESSION_KEY = 'opoong_focus_session_v1';

  function removeLegacyPointStorage(){
    try{
      for(let i=localStorage.length-1;i>=0;i--){
        const key=String(localStorage.key(i)||'');
        const low=key.toLowerCase();
        if(LEGACY_PREFIXES.some(prefix=>low.startsWith(prefix))){
          localStorage.removeItem(key);
        }
      }
    }catch(error){
      console.warn('O.Poong point storage cleanup:',error);
    }
  }

  function stripPointFieldsFromFocusLog(){
    try{
      const raw=JSON.parse(localStorage.getItem(FOCUS_LOG_KEY)||'{}');
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
      let changed=false;
      Object.values(raw).forEach(record=>{
        if(!record||typeof record!=='object')return;
        if(Object.prototype.hasOwnProperty.call(record,'earned')){delete record.earned;changed=true;}
        if(Object.prototype.hasOwnProperty.call(record,'penalty')){delete record.penalty;changed=true;}
      });
      if(changed)localStorage.setItem(FOCUS_LOG_KEY,JSON.stringify(raw));
    }catch(error){
      console.warn('O.Poong focus point-log cleanup:',error);
    }
  }

  function stripPointFieldsFromFocusSession(){
    try{
      const raw=JSON.parse(localStorage.getItem(FOCUS_SESSION_KEY)||'{}');
      if(!raw||typeof raw!=='object'||Array.isArray(raw))return;
      let changed=false;
      if(Object.prototype.hasOwnProperty.call(raw,'credited')){delete raw.credited;changed=true;}
      if(Object.prototype.hasOwnProperty.call(raw,'penaltyTotal')){delete raw.penaltyTotal;changed=true;}
      if(changed)localStorage.setItem(FOCUS_SESSION_KEY,JSON.stringify(raw));
    }catch(error){
      console.warn('O.Poong focus session cleanup:',error);
    }
  }

  function restoreDefaultAppearance(){
    const root=document.documentElement;
    try{delete root.dataset.opoongColor;}catch(_){ }
    try{
      Object.keys(root.dataset).forEach(key=>{
        if(key.toLowerCase().startsWith('shop'))delete root.dataset[key];
      });
    }catch(_){ }
    root.style.removeProperty('--pri');
    root.style.removeProperty('--pri2');

    [
      'opoongExpandedShopStyles','opoongAvatarGachaStyles','opoongPetExpansionStyles',
      'opoongAvatarAutoEquipStyles','opoongGachaOwnedFixStyles'
    ].forEach(id=>document.getElementById(id)?.remove());
  }

  function defaultRewards(){
    return {points:0,owned:['blue'],color:'blue'};
  }
  function defaultShop(){
    return {owned:[],equipped:{},customColor:'#1e40af'};
  }

  function disablePointFunctions(){
    window.loadOpoongRewards=defaultRewards;
    window.saveOpoongRewards=function(){removeLegacyPointStorage();};
    window.awardOpoongPoints=function(){};
    window.buyOrApplyOpoongColor=function(){};
    window.applyOpoongColor=restoreDefaultAppearance;
    window.renderOpoongColorShop=function(){restoreDefaultAppearance();hidePointUi();};

    window.loadOpoongShop=defaultShop;
    window.saveOpoongShop=function(){removeLegacyPointStorage();};
    window.shopOwns=function(){return false;};
    window.shopSpend=function(){return false;};
    window.buyOpoongShopProduct=function(){};
    window.equipOpoongShopVariant=function(){};
    window.purchaseOpoongNameChange=function(){};
    window.setOpoongCustomColor=function(){};
    window.disableOpoongShopTheme=function(){};
    window.renderOpoongShopCatalog=function(){};
    window.applyOpoongShop=restoreDefaultAppearance;
    window.playFocusCompletionEffect=function(){};

    window.gameRewardMessage=function(){
      const box=document.getElementById('gameRewardMessage');
      if(box)box.textContent='';
    };

    window.getOpoongSnakePalette=function(){
      return {bg:'#071f17',food:'#fb7185',head:'#facc15',body:'#4ade80'};
    };
    window.getOpoongMineSymbols=function(){
      return {mine:'✹',flag:'⚑'};
    };

    window.updateFocusWallet=function(){};
    window.deductFocusPoints=function(){return 0;};
    window.creditFocusBlocks=function(){};
    window.applyFocusDeparturePenalty=function(){return 0;};

    window.registerFocusExitAttempt=function(label){
      try{
        if(typeof focusSession==='undefined'||!focusSession.started||!focusSession.running)return 0;
        const now=Date.now();
        if(typeof focusLastExitAttemptAt!=='undefined'&&now-focusLastExitAttemptAt<1600)return 0;
        if(typeof focusLastExitAttemptAt!=='undefined')focusLastExitAttemptAt=now;
        if(typeof showFocusLockWarning==='function'){
          showFocusLockWarning((label||'이탈 시도')+'가 감지됐어요. 집중 모드를 계속합니다.');
        }
      }catch(_){ }
      return 0;
    };

    window.initAdminPointMode=function(){
      document.getElementById('adminPointBack')?.remove();
    };
    window.openAdminPointMode=function(){};
    window.refreshAdminPointMode=function(){};
    window.adminAdjustPoints=function(){};
    window.adminSetPoints=function(){};
    window.adminClearPoints=function(){};
  }

  function hidePointUi(){
    document.querySelectorAll('.gameWallet,.focusHeaderWallet').forEach(el=>el.remove());
    document.getElementById('gameColorShop')?.remove();
    document.getElementById('adminPointBack')?.remove();

    const earned=document.getElementById('focusTodayEarned');
    const penalty=document.getElementById('focusTodayPenalty');
    if(earned?.closest('.focusStat'))earned.closest('.focusStat').style.display='none';
    if(penalty?.closest('.focusStat'))penalty.closest('.focusStat').style.display='none';

    const lockPenalty=document.getElementById('focusLockPenalty');
    if(lockPenalty?.parentElement)lockPenalty.parentElement.style.display='none';

    const focusRule=document.querySelector('#view-focus .focusRule');
    if(focusRule){
      focusRule.innerHTML='<b>집중 모드 안내</b><br>시작하면 전체화면 집중 화면이 열립니다. 앱 전환·화면 숨김·뒤로가기 같은 이탈 시도가 감지되면 경고를 표시합니다. 세션마다 비상 탈출 5회는 공부를 일시정지할 때 사용할 수 있어요. 웹 제한상 다른 앱 자체를 막을 수는 없지만 화면 이탈은 감지합니다.';
    }

    const gameSection=document.getElementById('view-game');
    if(gameSection){
      const lead=gameSection.querySelector('.sectionHeader p');
      if(lead)lead.textContent='원하는 게임을 골라 자유롭게 플레이해보세요.';
    }

    const logo=document.getElementById('adminLogoTrigger');
    if(logo){
      logo.style.cursor='default';
      logo.removeAttribute('role');
      logo.removeAttribute('tabindex');
      logo.setAttribute('aria-label','O.Poong 홈 로고');
    }

    document.querySelectorAll('.avatarGachaSection,#gameOpoongPetPanel,[data-opoong-avatar-gacha],[data-opoong-pet]').forEach(el=>el.remove());
  }

  function sanitizeDynamicPointText(root){
    const scope=root&&root.querySelectorAll?root:document;

    scope.querySelectorAll('#gameMessage span').forEach(el=>{
      el.textContent=String(el.textContent||'').replace(/\s*·\s*\+\d[\d,]*\s*P\b/gi,'');
    });
    scope.querySelectorAll('.gameRewardMessage').forEach(el=>{el.textContent='';});
    scope.querySelectorAll('.searchResultText span').forEach(el=>{
      let text=String(el.textContent||'');
      text=text.replace(/무단\s*이탈\s*100\s*P\s*감점/gi,'이탈 시도 경고');
      text=text.replace(/100\s*P\s*감점/gi,'이탈 시도 경고');
      el.textContent=text;
    });
  }

  function installObserver(){
    if(document.documentElement.dataset.opoongPointRetiredObserver)return;
    document.documentElement.dataset.opoongPointRetiredObserver='1';
    let queued=false;
    const observer=new MutationObserver(records=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{
        queued=false;
        for(const record of records){
          for(const node of record.addedNodes){
            if(node.nodeType===1)sanitizeDynamicPointText(node);
          }
        }
        hidePointUi();
      });
    });
    observer.observe(document.documentElement,{childList:true,subtree:true});
  }

  function cleanup(){
    removeLegacyPointStorage();
    stripPointFieldsFromFocusLog();
    stripPointFieldsFromFocusSession();
    restoreDefaultAppearance();
    disablePointFunctions();
    hidePointUi();
    sanitizeDynamicPointText(document);
    installObserver();
  }

  cleanup();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});
  window.addEventListener('load',cleanup,{once:true});
  window.addEventListener('pageshow',cleanup);
  window.addEventListener('storage',event=>{
    const key=String(event.key||'').toLowerCase();
    if(LEGACY_PREFIXES.some(prefix=>key.startsWith(prefix)))cleanup();
  });
})();
