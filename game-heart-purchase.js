(function(){
  'use strict';

  const HEART_KEY = 'opoong_game_hearts_v1';
  const REWARDS_KEY = 'opoong_rewards_v2';
  const HEART_PRICE = 3000;
  const PURCHASE_AMOUNT = 1;

  function formatPoints(value){
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('ko-KR') + ' P';
  }

  function getHearts(){
    try{
      const api = window.OPOONG_GAME_HEARTS;
      if(api && typeof api.get === 'function') return Math.max(0, Math.floor(Number(api.get()) || 0));
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      return Math.max(0, Math.floor(Number(raw.hearts) || 0));
    }catch(_){
      return 0;
    }
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

  function localDayKey(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
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
          <span class="heartPurchasePrice">3,000 P</span>
        </div>
        <div class="heartPurchaseBalance"><span>보유 포인트</span><strong id="gameHeartPurchasePoints">0 P</strong></div>
        <button class="btn primary heartPurchaseBtn" type="button" id="gameHeartPurchaseBtn">3,000P로 하트 1개 구매</button>
        <div class="heartPurchaseHelp" id="gameHeartPurchaseHelp">하트가 0개가 되면 구매 버튼이 활성화됩니다.</div>
      `;
      const note = document.getElementById('gameHeartModalNote');
      if(note) body.insertBefore(card, note);
      else body.appendChild(card);
      card.querySelector('#gameHeartPurchaseBtn').addEventListener('click', buyHeart);
    }

    const note = document.getElementById('gameHeartModalNote');
    if(note) note.textContent = '하트는 매일 무료 충전되며, 모두 사용한 뒤에는 3,000P로 1개씩 추가 구매할 수 있어요. 위 광고는 일반 광고이며 하트 지급과 연결되지 않습니다.';

    updatePurchaseUi();
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
      help.textContent = '보유 하트를 모두 사용한 뒤 추가 하트를 구매할 수 있어요.';
      return;
    }

    if(points < HEART_PRICE){
      button.disabled = true;
      button.textContent = `${formatPoints(HEART_PRICE - points)} 부족`;
      help.textContent = `하트 1개 구매에는 ${formatPoints(HEART_PRICE)}가 필요해요.`;
      return;
    }

    button.disabled = false;
    button.textContent = '3,000P로 하트 1개 구매';
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

    if(!window.confirm('3,000P를 사용해 하트 1개를 구매할까요?')) return;
    if(!spendPoints()){
      updatePurchaseUi();
      return;
    }

    if(!addPurchasedHeart()){
      // Heart write failures are rare; restore points when possible.
      try{
        if(typeof window.awardOpoongPoints === 'function') window.awardOpoongPoints(HEART_PRICE, '하트 구매 취소');
      }catch(_){ }
      window.alert('하트 충전에 실패했어요. 다시 시도해 주세요.');
      return;
    }

    refreshAllUi();
    if(typeof window.gameRewardMessage === 'function') window.gameRewardMessage('하트 1개 구매 완료 · -3,000 P');
  }

  function observeModal(){
    const back = document.getElementById('gameHeartModalBack');
    if(!back || back.__opoongPurchaseObserver) return false;
    const observer = new MutationObserver(function(){
      if(!back.hidden){
        ensurePurchaseUi();
        updatePurchaseUi();
      }
    });
    observer.observe(back, {attributes:true, attributeFilter:['hidden']});
    back.__opoongPurchaseObserver = observer;
    return true;
  }

  function init(){
    ensurePurchaseUi();
    observeModal();

    let tries = 0;
    const timer = window.setInterval(function(){
      tries += 1;
      const ready = ensurePurchaseUi() && observeModal();
      if(ready || tries > 30) window.clearInterval(timer);
    }, 250);

    window.addEventListener('storage', function(event){
      if(event.key === HEART_KEY || event.key === REWARDS_KEY) updatePurchaseUi();
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
