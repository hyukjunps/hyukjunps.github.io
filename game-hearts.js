(function(){
  'use strict';

  const HEART_KEY = 'opoong_game_hearts_v1';
  const HEART_MAX = 5;
  const HEART_REWARD = 1;
  const SCRIPT_VERSION = '2026-08-17';

  function clampHeart(value){
    return Math.max(0, Math.min(HEART_MAX, Math.floor(Number(value) || 0)));
  }

  function localDayKey(date){
    const d = date || new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function saveHeartState(state){
    try{
      localStorage.setItem(HEART_KEY, JSON.stringify({
        hearts: clampHeart(state.hearts),
        refillDay: String(state.refillDay || localDayKey()),
        version: SCRIPT_VERSION
      }));
    }catch(_){ }
  }

  function loadHeartState(){
    const today = localDayKey();
    let state = { hearts: HEART_MAX, refillDay: today, version: SCRIPT_VERSION };

    try{
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      if(raw && typeof raw === 'object'){
        state.hearts = raw.hearts === undefined ? HEART_MAX : clampHeart(raw.hearts);
        state.refillDay = String(raw.refillDay || '');
      }
    }catch(_){ }

    if(state.refillDay !== today){
      state.hearts = HEART_MAX;
      state.refillDay = today;
      saveHeartState(state);
    }

    return state;
  }

  function spendHeart(){
    const state = loadHeartState();
    if(state.hearts <= 0) return false;
    state.hearts -= 1;
    saveHeartState(state);
    renderHeartUi();
    return true;
  }

  function addHeart(amount){
    const state = loadHeartState();
    const before = state.hearts;
    state.hearts = clampHeart(state.hearts + Math.max(0, Math.floor(Number(amount) || 0)));
    saveHeartState(state);
    renderHeartUi();
    return state.hearts - before;
  }

  function nextRefillLabel(){
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 0, 0);
    const h = Math.max(0, Math.floor((next - now) / 3600000));
    const m = Math.max(0, Math.floor(((next - now) % 3600000) / 60000));
    return `다음 무료 충전까지 약 ${h}시간 ${m}분`;
  }

  function injectHeartStyles(){
    if(document.getElementById('opoongHeartStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongHeartStyles';
    style.textContent = `
      .gameHeaderWallets{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .gameHeartWallet{display:flex;align-items:center;gap:9px;padding:10px 12px;border:1px solid color-mix(in srgb,#ef4444 34%,var(--line));border-radius:999px;background:color-mix(in srgb,#ef4444 8%,var(--card));box-shadow:0 8px 18px rgba(15,23,42,.04)}
      .gameHeartWallet .heartIcon{color:#ef4444;font-size:18px;line-height:1}
      .gameHeartWallet .heartText{display:flex;flex-direction:column;line-height:1.1}
      .gameHeartWallet .heartText span{color:var(--muted);font-size:10.5px;font-weight:900}
      .gameHeartWallet .heartText strong{margin-top:3px;color:#ef4444;font-size:17px;font-weight:1000;white-space:nowrap}
      .gameHeartChargeBtn{min-height:38px!important;padding:8px 11px!important;border-radius:999px!important;font-size:11.5px!important}
      .gameHeartHint{max-width:920px;margin:0 auto 12px;padding:11px 13px;border:1px solid color-mix(in srgb,#ef4444 24%,var(--line));border-radius:17px;background:color-mix(in srgb,#ef4444 5%,var(--card));color:var(--muted);font-size:11.5px;font-weight:850;line-height:1.55}
      .heartModalBack[hidden]{display:none!important}
      .heartModalBack{position:fixed;z-index:51000;inset:0;display:grid;place-items:center;padding:16px;background:rgba(2,6,23,.68);backdrop-filter:blur(10px)}
      .heartModal{width:min(500px,100%);overflow:hidden;border:1px solid var(--line);border-radius:28px;background:var(--card);box-shadow:0 28px 90px rgba(0,0,0,.38)}
      .heartModalHead{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid var(--line)}
      .heartModalBody{padding:18px}
      .heartBig{display:flex;align-items:center;justify-content:center;gap:10px;padding:18px;border-radius:22px;background:color-mix(in srgb,#ef4444 8%,var(--card));color:#ef4444}
      .heartBig span{font-size:30px}.heartBig strong{font-size:32px}
      .heartModalBody p{margin:13px 2px 0;color:var(--muted);font-size:12.5px;font-weight:820;line-height:1.7}
      .heartModalActions{display:grid;gap:8px;margin-top:14px}
      .heartModalActions button{width:100%}
      .heartRewardStatus{min-height:18px;margin-top:10px;color:var(--pri);font-size:11.5px;font-weight:900;text-align:center}
      #gameHub.heart-empty .gameCard{opacity:.78}
      @media(max-width:620px){
        .gameHeaderWallets{width:100%;justify-content:stretch}
        .gameHeaderWallets .gameWallet,.gameHeartWallet{flex:1 1 180px;justify-content:space-between}
        .gameHeartHint{margin-bottom:10px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureHeartUi(){
    injectHeartStyles();
    const gameView = document.getElementById('view-game');
    const header = gameView && gameView.querySelector('.gameSectionHeader');
    if(!header) return;

    const pointWallet = header.querySelector('.gameWallet');
    let wallets = header.querySelector('.gameHeaderWallets');
    if(!wallets){
      wallets = document.createElement('div');
      wallets.className = 'gameHeaderWallets';
      if(pointWallet){
        pointWallet.parentNode.insertBefore(wallets, pointWallet);
        wallets.appendChild(pointWallet);
      }else{
        header.appendChild(wallets);
      }
    }

    if(!document.getElementById('gameHeartWallet')){
      const heartWallet = document.createElement('div');
      heartWallet.id = 'gameHeartWallet';
      heartWallet.className = 'gameHeartWallet';
      heartWallet.innerHTML = `
        <span class="heartIcon" aria-hidden="true">♥</span>
        <span class="heartText"><span>게임 하트</span><strong id="gameHeartCount">5 / 5</strong></span>
        <button class="smallbtn ghost gameHeartChargeBtn" type="button" id="gameHeartChargeBtn">+ 충전</button>
      `;
      wallets.appendChild(heartWallet);
      heartWallet.querySelector('#gameHeartChargeBtn').addEventListener('click', openHeartModal);
    }

    const hub = document.getElementById('gameHub');
    if(hub && !document.getElementById('gameHeartHint')){
      const hint = document.createElement('div');
      hint.id = 'gameHeartHint';
      hint.className = 'gameHeartHint';
      hint.textContent = '게임을 선택해 들어갈 때 하트 1개를 사용해요. 하트는 매일 5개로 무료 충전됩니다.';
      hub.parentNode.insertBefore(hint, hub);
    }

    if(!document.getElementById('gameHeartModalBack')){
      const back = document.createElement('div');
      back.id = 'gameHeartModalBack';
      back.className = 'heartModalBack';
      back.hidden = true;
      back.setAttribute('role', 'dialog');
      back.setAttribute('aria-modal', 'true');
      back.setAttribute('aria-labelledby', 'gameHeartModalTitle');
      back.innerHTML = `
        <section class="heartModal">
          <div class="heartModalHead">
            <b id="gameHeartModalTitle">게임 하트 충전</b>
            <button class="btn ghost" type="button" id="gameHeartModalClose">닫기</button>
          </div>
          <div class="heartModalBody">
            <div class="heartBig"><span aria-hidden="true">♥</span><strong id="gameHeartModalCount">5 / 5</strong></div>
            <p id="gameHeartRefillText">매일 00:00 이후 처음 접속하면 하트가 5개로 충전돼요.</p>
            <div class="heartModalActions">
              <button class="bigBtn" type="button" id="gameHeartRewardBtn">보상형 광고 보고 +1 ♥</button>
            </div>
            <div id="gameHeartRewardStatus" class="heartRewardStatus" aria-live="polite"></div>
            <p>일반 배너 광고를 클릭하는 대가로 하트를 지급하지 않습니다. 광고 제공사가 보상 완료를 확인한 경우에만 하트가 지급돼요.</p>
          </div>
        </section>
      `;
      document.body.appendChild(back);
      back.addEventListener('click', function(event){ if(event.target === back) closeHeartModal(); });
      back.querySelector('#gameHeartModalClose').addEventListener('click', closeHeartModal);
      back.querySelector('#gameHeartRewardBtn').addEventListener('click', requestRewardedHeart);
    }

    renderHeartUi();
  }

  function renderHeartUi(){
    const state = loadHeartState();
    const count = document.getElementById('gameHeartCount');
    const modalCount = document.getElementById('gameHeartModalCount');
    const refill = document.getElementById('gameHeartRefillText');
    const hub = document.getElementById('gameHub');
    if(count) count.textContent = `${state.hearts} / ${HEART_MAX}`;
    if(modalCount) modalCount.textContent = `${state.hearts} / ${HEART_MAX}`;
    if(refill) refill.textContent = `매일 00:00 이후 처음 확인할 때 5개로 충전돼요. ${nextRefillLabel()}.`;
    if(hub) hub.classList.toggle('heart-empty', state.hearts <= 0);

    const rewardBtn = document.getElementById('gameHeartRewardBtn');
    if(rewardBtn){
      rewardBtn.disabled = state.hearts >= HEART_MAX;
      rewardBtn.textContent = state.hearts >= HEART_MAX ? '하트가 이미 가득 찼어요' : '보상형 광고 보고 +1 ♥';
    }
  }

  function setHeartStatus(message){
    const status = document.getElementById('gameHeartRewardStatus');
    if(status) status.textContent = message || '';
  }

  function openHeartModal(message){
    ensureHeartUi();
    const back = document.getElementById('gameHeartModalBack');
    if(!back) return;
    back.hidden = false;
    renderHeartUi();
    setHeartStatus(typeof message === 'string' ? message : '');
  }

  function closeHeartModal(){
    const back = document.getElementById('gameHeartModalBack');
    if(back) back.hidden = true;
    setHeartStatus('');
  }

  async function requestRewardedHeart(){
    const state = loadHeartState();
    if(state.hearts >= HEART_MAX){
      setHeartStatus('하트가 이미 5개예요.');
      renderHeartUi();
      return;
    }

    const button = document.getElementById('gameHeartRewardBtn');
    if(button) button.disabled = true;
    setHeartStatus('보상형 광고를 준비하고 있어요…');

    try{
      if(typeof window.OPOONG_REWARDED_AD !== 'function'){
        setHeartStatus('현재 배너 광고만 연결되어 있어요. 보상형 광고 SDK를 연결하면 여기서 바로 +1 하트를 받을 수 있어요.');
        return;
      }

      const granted = await window.OPOONG_REWARDED_AD();
      if(granted === true){
        const added = addHeart(HEART_REWARD);
        setHeartStatus(added ? '광고 보상 완료 · 하트 +1 ♥' : '하트가 이미 가득 찼어요.');
      }else{
        setHeartStatus('광고 보상이 완료되지 않아 하트가 지급되지 않았어요.');
      }
    }catch(error){
      console.error('O.Poong rewarded heart ad:', error);
      setHeartStatus('광고를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    }finally{
      renderHeartUi();
      if(button && loadHeartState().hearts < HEART_MAX) button.disabled = false;
    }
  }

  function installGameEntryGate(){
    if(typeof window.openMiniGame !== 'function') return false;
    if(window.openMiniGame.__opoongHeartGate) return true;

    const original = window.openMiniGame;
    const gated = function(game){
      ensureHeartUi();
      const state = loadHeartState();
      if(state.hearts <= 0){
        openHeartModal('하트가 없어요. 보상형 광고를 완료하면 +1 ♥을 받을 수 있어요.');
        return;
      }

      if(!spendHeart()){
        openHeartModal('하트가 없어요.');
        return;
      }
      return original.apply(this, arguments);
    };
    gated.__opoongHeartGate = true;
    gated.__original = original;
    window.openMiniGame = gated;
    return true;
  }

  function scheduleMidnightRefresh(){
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 1, 0);
    const delay = Math.max(1000, next - now);
    window.setTimeout(function(){
      loadHeartState();
      renderHeartUi();
      scheduleMidnightRefresh();
    }, delay);
  }

  window.OPOONG_GRANT_HEART_FROM_REWARDED_AD = function(){
    const added = addHeart(HEART_REWARD);
    if(added) setHeartStatus('광고 보상 완료 · 하트 +1 ♥');
    return added;
  };
  window.OPOONG_GAME_HEARTS = {
    get: function(){ return loadHeartState().hearts; },
    max: HEART_MAX,
    render: renderHeartUi,
    openCharge: openHeartModal
  };

  function init(){
    ensureHeartUi();
    installGameEntryGate();
    scheduleMidnightRefresh();

    let attempts = 0;
    const timer = window.setInterval(function(){
      attempts += 1;
      ensureHeartUi();
      if(installGameEntryGate() || attempts > 20) window.clearInterval(timer);
    }, 250);

    window.addEventListener('storage', function(event){
      if(event.key === HEART_KEY) renderHeartUi();
    });
    document.addEventListener('visibilitychange', function(){
      if(!document.hidden) renderHeartUi();
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
