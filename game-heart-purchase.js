(function(){
  'use strict';

  const HEART_KEY = 'opoong_game_hearts_v1';
  const REWARDS_KEY = 'opoong_rewards_v2';
  const HEART_PRICE = 200;
  const PURCHASE_AMOUNT = 1;

  const CELEBRATION_DAY = '2026-08-23';
  const CELEBRATION_TOTAL = 100;
  const CELEBRATION_BATCH = 50;
  const CELEBRATION_RESERVE_KEY = 'opoong_500_views_heart_reserve_v1';
  const CELEBRATION_GRANTED_KEY = 'opoong_500_views_heart_granted_v1';
  const CELEBRATION_POPUP_DISMISSED_KEY = 'opoong_500_views_popup_dismissed_v1';

  function formatPoints(value){
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('ko-KR') + ' P';
  }

  function localDayKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function isCelebrationDay(){
    return localDayKey() === CELEBRATION_DAY;
  }

  function getCelebrationReserve(){
    if(!isCelebrationDay()) return 0;
    try{
      return Math.max(0, Math.floor(Number(localStorage.getItem(CELEBRATION_RESERVE_KEY)) || 0));
    }catch(_){
      return 0;
    }
  }

  function setCelebrationReserve(value){
    try{
      localStorage.setItem(CELEBRATION_RESERVE_KEY, String(Math.max(0, Math.floor(Number(value) || 0))));
    }catch(_){ }
  }

  function readBaseHearts(){
    try{
      const api = window.OPOONG_GAME_HEARTS;
      if(api && typeof api.get === 'function' && !api.get.__opoong500HeartGet){
        return Math.max(0, Math.floor(Number(api.get()) || 0));
      }
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      return Math.max(0, Math.floor(Number(raw.hearts) || 0));
    }catch(_){
      return 0;
    }
  }

  function readBaseHeartsFromStorage(){
    try{
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      return Math.max(0, Math.floor(Number(raw.hearts) || 0));
    }catch(_){
      return 0;
    }
  }

  function grantCelebrationHearts(){
    if(!isCelebrationDay()) return false;

    try{
      if(localStorage.getItem(CELEBRATION_GRANTED_KEY) === CELEBRATION_DAY) return false;

      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      raw.hearts = CELEBRATION_BATCH;
      raw.refillDay = CELEBRATION_DAY;
      raw.max = CELEBRATION_BATCH;
      localStorage.setItem(HEART_KEY, JSON.stringify(raw));
      setCelebrationReserve(CELEBRATION_TOTAL - CELEBRATION_BATCH);
      localStorage.setItem(CELEBRATION_GRANTED_KEY, CELEBRATION_DAY);
      return true;
    }catch(_){
      return false;
    }
  }

  function refillFromCelebrationReserve(){
    if(!isCelebrationDay()) return false;

    try{
      const reserve = getCelebrationReserve();
      if(reserve <= 0) return false;

      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      const base = Math.max(0, Math.floor(Number(raw.hearts) || 0));
      if(base > 0) return false;

      const refill = Math.min(CELEBRATION_BATCH, reserve);
      raw.hearts = refill;
      raw.refillDay = CELEBRATION_DAY;
      raw.max = CELEBRATION_BATCH;
      localStorage.setItem(HEART_KEY, JSON.stringify(raw));
      setCelebrationReserve(reserve - refill);
      return true;
    }catch(_){
      return false;
    }
  }

  function getHearts(){
    grantCelebrationHearts();
    refillFromCelebrationReserve();

    const base = readBaseHeartsFromStorage();
    if(isCelebrationDay()) return base + getCelebrationReserve();
    return base;
  }

  function getPoints(){
    try{
      if(typeof window.loadOpoongRewards === 'function'){
        const rewards = window.loadOpoongRewards();
        return Math.max(0, Math.floor(Number(rewards && rewards.points) || 0));
      }
      const raw = JSON.parse(localStorage.getItem(REWARDS_KEY) || '{}');
      return Math.max(0, Math.floor(Number(raw.points) || 0));
    }catch(_){
      return 0;
    }
  }

  function renderCelebrationHeartUi(){
    if(!isCelebrationDay()) return;

    const total = readBaseHeartsFromStorage() + getCelebrationReserve();
    const count = document.getElementById('gameHeartCount');
    const modalCount = document.getElementById('gameHeartModalCount');
    const refill = document.getElementById('gameHeartRefillText');
    const hint = document.getElementById('gameHeartHint');

    const label = `${total} / ${CELEBRATION_TOTAL}`;
    if(count && count.textContent !== label) count.textContent = label;
    if(modalCount && modalCount.textContent !== label) modalCount.textContent = label;
    if(refill) refill.textContent = '카카오 애드핏 요청수 500회 돌파 기념으로 오늘(8월 23일)만 하트 100개가 제공돼요. 내일부터는 다시 평소 무료 충전량으로 돌아갑니다.';
    if(hint) hint.textContent = '🎉 O.Poong 카카오 애드핏 요청수 500회 돌파! 오늘만 게임 하트 100개를 무료로 드려요.';
  }

  function patchHeartApi(){
    const api = window.OPOONG_GAME_HEARTS;
    if(!api) return false;

    if(typeof api.get === 'function' && !api.get.__opoong500HeartGet){
      const originalGet = api.get;
      const wrappedGet = function(){
        grantCelebrationHearts();
        refillFromCelebrationReserve();
        return originalGet.apply(this, arguments);
      };
      wrappedGet.__opoong500HeartGet = true;
      wrappedGet.__original = originalGet;
      api.get = wrappedGet;
    }

    if(typeof api.render === 'function' && !api.render.__opoong500HeartRender){
      const originalRender = api.render;
      const wrappedRender = function(){
        const result = originalRender.apply(this, arguments);
        renderCelebrationHeartUi();
        return result;
      };
      wrappedRender.__opoong500HeartRender = true;
      wrappedRender.__original = originalRender;
      api.render = wrappedRender;
    }

    if(isCelebrationDay()) api.max = CELEBRATION_TOTAL;
    return true;
  }

  function installCelebrationEntryGate(){
    if(!isCelebrationDay()) return true;
    const current = window.openMiniGame;
    if(typeof current !== 'function') return false;
    if(current.__opoong500HeartGate) return true;

    const wrapped = function(){
      grantCelebrationHearts();
      refillFromCelebrationReserve();
      return current.apply(this, arguments);
    };
    wrapped.__opoong500HeartGate = true;
    wrapped.__original = current;
    window.openMiniGame = wrapped;
    return true;
  }

  function observeCelebrationHeartUi(){
    if(!isCelebrationDay()) return true;
    const count = document.getElementById('gameHeartCount');
    if(!count) return false;
    if(count.__opoong500Observer) return true;

    const observer = new MutationObserver(function(){
      renderCelebrationHeartUi();
    });
    observer.observe(count, {childList:true, characterData:true,subtree:true});
    count.__opoong500Observer = observer;
    renderCelebrationHeartUi();
    return true;
  }

  function injectStyles(){
    if(document.getElementById('opoongHeartPurchaseStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongHeartPurchaseStyles';
    style.textContent = `
      .heartPurchaseCard{margin-top:14px;padding:15px;border:1px solid color-mix(in srgb,#ef4444 25%,var(--line));border-radius:19px;background:linear-gradient(135deg,color-mix(in srgb,#ef4444 7%,var(--card)),var(--card))}
      .heartPurchaseTop{display:flex;align-items:center;justify-content:space-between;gap:12px}
      .heartPurchaseTitle{display:flex;align-items:center;gap:9px;min-width:0}
      .heartPurchaseIcon{display:grid;place-items:center;width:38px;height:38px;flex:0 0 auto;border-radius:13px;background:color-mix(in srgb,#ef4444 12%,var(--card));color:#ef4444;font-size:20px}
      .heartPurchaseTitle strong{display:block;font-size:14px}.heartPurchaseTitle span{display:block;margin-top:3px;color:var(--muted);font-size:11px;font-weight:850}
      .heartPurchasePrice{color:#ef4444;font-size:16px;font-weight:1000;white-space:nowrap}
      .heartPurchaseBalance{display:flex;justify-content:space-between;gap:12px;margin-top:12px;padding-top:11px;border-top:1px solid var(--line);color:var(--muted);font-size:11.5px;font-weight:850}
      .heartPurchaseBalance strong{color:var(--text)}
      .heartPurchaseBtn{width:100%;margin-top:11px;min-height:46px!important}
      .heartPurchaseBtn:disabled{cursor:not-allowed;opacity:.55;transform:none!important}
      .heartPurchaseHelp{margin-top:8px;color:var(--muted);font-size:10.5px;font-weight:800;line-height:1.55}

      .opoong500Back[hidden]{display:none!important}
      .opoong500Back{position:fixed;z-index:65000;inset:0;display:grid;place-items:center;padding:18px;background:rgba(2,6,23,.72);backdrop-filter:blur(12px)}
      .opoong500Popup{position:relative;width:min(520px,100%);max-height:min(760px,calc(100vh - 36px));overflow:auto;border:1px solid color-mix(in srgb,var(--pri) 22%,var(--line));border-radius:30px;background:var(--card);box-shadow:0 30px 100px rgba(0,0,0,.42);padding:24px}
      .opoong500Close{position:absolute;right:14px;top:14px;width:40px;height:40px;border:1px solid var(--line);border-radius:50%;background:color-mix(in srgb,var(--card) 90%,transparent);color:var(--text);font-size:21px;font-weight:900;display:grid;place-items:center}
      .opoong500Badge{display:inline-flex;align-items:center;gap:7px;padding:8px 11px;border-radius:999px;background:color-mix(in srgb,#ef4444 9%,var(--card));border:1px solid color-mix(in srgb,#ef4444 20%,var(--line));color:#ef4444;font-size:12px;font-weight:1000}
      .opoong500Popup h2{margin:16px 46px 0 0;font-size:clamp(27px,7vw,38px);line-height:1.08;letter-spacing:-1.4px}
      .opoong500Lead{margin:11px 0 0;color:var(--muted);font-size:14px;font-weight:800;line-height:1.7}
      .opoong500Hero{margin-top:18px;padding:20px;border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,#ef4444 11%,var(--card)),color-mix(in srgb,var(--pri) 7%,var(--card)));border:1px solid color-mix(in srgb,#ef4444 18%,var(--line));text-align:center}
      .opoong500Hero span{display:block;color:#ef4444;font-size:13px;font-weight:950}.opoong500Hero strong{display:block;margin-top:5px;color:#ef4444;font-size:42px;line-height:1;font-weight:1000;letter-spacing:-2px}
      .opoong500Grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
      .opoong500Card{padding:15px;border:1px solid var(--line);border-radius:20px;background:color-mix(in srgb,var(--card) 95%,var(--bg));min-height:118px}
      .opoong500Card b{display:block;font-size:14px}.opoong500Card p{margin:7px 0 0;color:var(--muted);font-size:12px;font-weight:800;line-height:1.65}
      .opoong500Offline{grid-column:1/-1;border-color:color-mix(in srgb,var(--pri) 22%,var(--line));background:color-mix(in srgb,var(--pri) 5%,var(--card))}
      .opoong500Offline b{color:var(--pri);font-size:15px}
      .opoong500Ok{width:100%;margin-top:15px;min-height:50px!important}
      .opoong500Foot{margin:10px 3px 0;color:var(--muted);font-size:10.5px;font-weight:750;line-height:1.55;text-align:center}
      @media(max-width:520px){.opoong500Popup{padding:21px 16px 17px;border-radius:26px}.opoong500Grid{grid-template-columns:1fr}.opoong500Offline{grid-column:auto}.opoong500Hero strong{font-size:38px}}
    `;
    document.head.appendChild(style);
  }

  function ensurePurchaseUi(){
    injectStyles();
    const body = document.querySelector('#gameHeartModalBack .heartModalBody');
    if(!body) return false;

    let card = document.getElementById('gameHeartPurchaseCard');
    if(!card){
      card = document.createElement('div');
      card.id = 'gameHeartPurchaseCard';
      card.className = 'heartPurchaseCard';
      card.innerHTML = `
        <div class="heartPurchaseTop">
          <div class="heartPurchaseTitle">
            <span class="heartPurchaseIcon" aria-hidden="true">♥</span>
            <div><strong>하트 1개 구매</strong><span>무료 하트를 모두 사용했을 때 구매할 수 있어요.</span></div>
          </div>
          <span class="heartPurchasePrice">200 P</span>
        </div>
        <div class="heartPurchaseBalance"><span>보유 포인트</span><strong id="gameHeartPurchasePoints">0 P</strong></div>
        <button class="btn primary heartPurchaseBtn" type="button" id="gameHeartPurchaseBtn">200P로 하트 1개 구매</button>
        <div class="heartPurchaseHelp" id="gameHeartPurchaseHelp">하트가 0개가 되면 구매 버튼이 활성화됩니다.</div>
      `;
      const note = document.getElementById('gameHeartModalNote');
      if(note) body.insertBefore(card, note);
      else body.appendChild(card);
      card.querySelector('#gameHeartPurchaseBtn').addEventListener('click', buyHeart);
    }

    const note = document.getElementById('gameHeartModalNote');
    if(note){
      note.textContent = isCelebrationDay()
        ? '🎉 카카오 애드핏 요청수 500회 돌파 기념으로 오늘만 하트 100개가 제공돼요. 모두 사용한 뒤에는 200P로 1개씩 추가 구매할 수 있어요.'
        : '하트는 매일 무료 충전되며, 모두 사용한 뒤에는 200P로 1개씩 추가 구매할 수 있어요. 위 광고는 일반 광고이며 하트 지급과 연결되지 않습니다.';
    }

    updatePurchaseUi();
    renderCelebrationHeartUi();
    return true;
  }

  function updatePurchaseUi(){
    const button = document.getElementById('gameHeartPurchaseBtn');
    const pointText = document.getElementById('gameHeartPurchasePoints');
    const help = document.getElementById('gameHeartPurchaseHelp');
    if(!button || !pointText || !help) return;

    const hearts = getHearts();
    const points = getPoints();
    pointText.textContent = formatPoints(points);

    if(hearts > 0){
      button.disabled = true;
      button.textContent = `하트 ${hearts}개 남음`;
      help.textContent = isCelebrationDay()
        ? '오늘 제공된 100개 하트를 모두 사용한 뒤 추가 하트를 구매할 수 있어요.'
        : '보유 하트를 모두 사용한 뒤 추가 하트를 구매할 수 있어요.';
      return;
    }

    if(points < HEART_PRICE){
      button.disabled = true;
      button.textContent = `${formatPoints(HEART_PRICE - points)} 부족`;
      help.textContent = `하트 1개 구매에는 ${formatPoints(HEART_PRICE)}가 필요해요.`;
      return;
    }

    button.disabled = false;
    button.textContent = '200P로 하트 1개 구매';
    help.textContent = '구매하면 하트 1개가 즉시 충전돼요.';
  }

  function spendPoints(){
    if(typeof window.shopSpend === 'function'){
      return window.shopSpend(HEART_PRICE, '하트 1개');
    }

    try{
      const raw = JSON.parse(localStorage.getItem(REWARDS_KEY) || '{}');
      const points = Math.max(0, Math.floor(Number(raw.points) || 0));
      if(points < HEART_PRICE) return false;
      raw.points = points - HEART_PRICE;
      localStorage.setItem(REWARDS_KEY, JSON.stringify(raw));
      return true;
    }catch(_){
      return false;
    }
  }

  function addPurchasedHeart(){
    try{
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      raw.hearts = PURCHASE_AMOUNT;
      raw.refillDay = String(raw.refillDay || localDayKey());
      raw.max = Math.max(1, Math.floor(Number(raw.max) || 50));
      localStorage.setItem(HEART_KEY, JSON.stringify(raw));
      return true;
    }catch(_){
      return false;
    }
  }

  function refreshAllUi(){
    try{
      if(window.OPOONG_GAME_HEARTS && typeof window.OPOONG_GAME_HEARTS.render === 'function') window.OPOONG_GAME_HEARTS.render();
      if(typeof window.renderOpoongColorShop === 'function') window.renderOpoongColorShop();
      if(typeof window.updateFocusWallet === 'function') window.updateFocusWallet();
    }catch(_){ }
    updatePurchaseUi();
    renderCelebrationHeartUi();
  }

  function buyHeart(){
    const hearts = getHearts();
    if(hearts > 0){
      updatePurchaseUi();
      return;
    }

    const points = getPoints();
    if(points < HEART_PRICE){
      if(typeof window.gameRewardMessage === 'function') window.gameRewardMessage(`하트 1개 구매에 ${formatPoints(HEART_PRICE - points)}가 부족해요.`);
      updatePurchaseUi();
      return;
    }

    if(!window.confirm('200P를 사용해 하트 1개를 구매할까요?')) return;
    if(!spendPoints()){
      updatePurchaseUi();
      return;
    }

    if(!addPurchasedHeart()){
      try{
        if(typeof window.awardOpoongPoints === 'function') window.awardOpoongPoints(HEART_PRICE, '하트 구매 취소');
      }catch(_){ }
      window.alert('하트 충전에 실패했어요. 다시 시도해 주세요.');
      return;
    }

    refreshAllUi();
    if(typeof window.gameRewardMessage === 'function') window.gameRewardMessage('하트 1개 구매 완료 · -200 P');
  }

  function observeModal(){
    const back = document.getElementById('gameHeartModalBack');
    if(!back || back.__opoongPurchaseObserver) return false;
    const observer = new MutationObserver(function(){
      if(!back.hidden){
        ensurePurchaseUi();
        updatePurchaseUi();
        renderCelebrationHeartUi();
      }
    });
    observer.observe(back, {attributes:true, attributeFilter:['hidden']});
    back.__opoongPurchaseObserver = observer;
    return true;
  }

  function dismissCelebrationPopup(){
    try{ localStorage.setItem(CELEBRATION_POPUP_DISMISSED_KEY, '1'); }catch(_){ }
    const back = document.getElementById('opoong500PopupBack');
    if(back) back.hidden = true;
  }

  function showCelebrationPopup(){
    if(!isCelebrationDay()) return;
    try{
      if(localStorage.getItem(CELEBRATION_POPUP_DISMISSED_KEY) === '1') return;
    }catch(_){ }

    injectStyles();
    if(document.getElementById('opoong500PopupBack')) return;

    const back = document.createElement('div');
    back.id = 'opoong500PopupBack';
    back.className = 'opoong500Back';
    back.setAttribute('role','dialog');
    back.setAttribute('aria-modal','true');
    back.setAttribute('aria-labelledby','opoong500PopupTitle');
    back.innerHTML = `
      <section class="opoong500Popup">
        <button class="opoong500Close" type="button" aria-label="다시 보지 않고 닫기">×</button>
        <span class="opoong500Badge">🎉 500 REQUESTS</span>
        <h2 id="opoong500PopupTitle">O.Poong 최대 요청수<br>500회 돌파!</h2>
        <p class="opoong500Lead">이용해 준 모두에게 감사해요. 기념으로 오늘 하루 혜택을 크게 올렸어요.</p>

        <div class="opoong500Hero">
          <span>8월 23일 오늘만</span>
          <strong>♥ 100개</strong>
        </div>

        <div class="opoong500Grid">
          <div class="opoong500Card">
            <b>하트 가격 대폭 인하</b>
            <p>무료 하트를 모두 사용한 뒤에는 앞으로 하트 1개를 <strong>200P</strong>로 구매할 수 있어요.</p>
          </div>
          <div class="opoong500Card">
            <b>오늘은 더 넉넉하게</b>
            <p>기념 하트는 자동 적용돼요. 별도 버튼을 누르지 않아도 총 100개를 사용할 수 있어요.</p>
          </div>
          <div class="opoong500Card opoong500Offline">
            <b>📴 게임 · 시간표는 오프라인에서도!</b>
            <p>O.Poong을 앱으로 설치하고 한 번 온라인에서 실행해 두면, 게임과 저장된 시간표를 인터넷 없이도 사용할 수 있어요.</p>
          </div>
        </div>

        <button class="btn primary opoong500Ok" type="button">확인했어요</button>
        <div class="opoong500Foot">500회는 8월 22일 기준 카카오 애드핏 요청수로 산정했습니다.<br>X 또는 확인 버튼을 누르면 이 기기에서는 이 팝업이 다시 표시되지 않아요.</div>
      </section>
    `;

    back.querySelector('.opoong500Close').addEventListener('click', dismissCelebrationPopup);
    back.querySelector('.opoong500Ok').addEventListener('click', dismissCelebrationPopup);
    document.body.appendChild(back);
  }

  function applyCelebrationNotice(){
    if(!isCelebrationDay()) return false;
    try{
      if(typeof NOTICE_CONFIG !== 'undefined' && NOTICE_CONFIG){
        NOTICE_CONFIG.enabled = true;
        NOTICE_CONFIG.title = '🎉 O.Poong 최대 요청수 500회 돌파!';
        NOTICE_CONFIG.message = '오늘만 게임 하트 100개! 하트를 다 쓰면 이제 1개 200P · 앱 설치 후 게임과 저장된 시간표는 오프라인에서도 사용할 수 있어요. 500회는 8월 22일 기준 카카오 애드핏 요청수로 산정했습니다.';
        NOTICE_CONFIG.buttonText = '';
        NOTICE_CONFIG.buttonUrl = '';
      }

      const box = document.getElementById('noticeBanner');
      if(box){
        box.className = 'noticeBanner topNotice';
        box.innerHTML = '<div><strong>🎉 O.Poong 최대 요청수 500회 돌파!</strong><p>오늘만 게임 하트 100개! 하트를 다 쓰면 이제 1개 200P · 앱 설치 후 게임과 저장된 시간표는 오프라인에서도 사용할 수 있어요.<br><small>500회는 8월 22일 기준 카카오 애드핏 요청수로 산정했습니다.</small></p></div><span class="pill">EVENT</span>';
        return true;
      }
    }catch(error){
      console.error('O.Poong 500-request notice:', error);
    }
    return false;
  }

  function init(){
    grantCelebrationHearts();
    patchHeartApi();
    installCelebrationEntryGate();
    ensurePurchaseUi();
    observeModal();
    observeCelebrationHeartUi();
    showCelebrationPopup();
    renderCelebrationHeartUi();

    window.setTimeout(applyCelebrationNotice, 700);

    let tries = 0;
    const timer = window.setInterval(function(){
      tries += 1;
      const apiReady = patchHeartApi();
      const gateReady = installCelebrationEntryGate();
      const uiReady = ensurePurchaseUi() && observeModal();
      const celebrationUiReady = observeCelebrationHeartUi();
      renderCelebrationHeartUi();
      if((apiReady && gateReady && uiReady && celebrationUiReady) || tries > 40) window.clearInterval(timer);
    }, 250);

    window.addEventListener('storage', function(event){
      if(event.key === HEART_KEY || event.key === REWARDS_KEY || event.key === CELEBRATION_RESERVE_KEY){
        updatePurchaseUi();
        renderCelebrationHeartUi();
      }
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
