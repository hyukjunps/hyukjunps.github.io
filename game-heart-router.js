(function(){
  'use strict';

  const HEART_KEY = 'opoong_game_hearts_v1';
  const BONUS_HEART_KEY = 'opoong_bonus_hearts_v1';
  const LEGACY_BONUS_HEART_KEY = 'opoong_bonus_hearts_seoyul_v1';
  const HEART_MAX = 50;
  const TTT_MOVE_SECONDS = 8;
  let tttMoveTimerInstalled = false;
  let tttMoveDeadline = 0;
  let tttMoveKey = '';
  let tttAutoMoving = false;

  function readNumber(key){
    try{return Math.max(0, Math.floor(Number(localStorage.getItem(key)) || 0));}
    catch(_){return 0;}
  }

  function writeNumber(key, value){
    try{localStorage.setItem(key, String(Math.max(0, Math.floor(Number(value) || 0))));return true;}
    catch(_){return false;}
  }

  function migrateLegacyBonus(){
    try{
      const legacy = readNumber(LEGACY_BONUS_HEART_KEY);
      if(legacy <= 0) return;
      writeNumber(BONUS_HEART_KEY, readNumber(BONUS_HEART_KEY) + legacy);
      localStorage.removeItem(LEGACY_BONUS_HEART_KEY);
    }catch(_){ }
  }

  function loadBonusHearts(){
    migrateLegacyBonus();
    return readNumber(BONUS_HEART_KEY);
  }

  function saveBonusHearts(value){
    return writeNumber(BONUS_HEART_KEY, value);
  }

  function readBaseHeartState(){
    try{
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    }catch(_){return {};}
  }

  function saveBaseHeartState(raw){
    try{localStorage.setItem(HEART_KEY, JSON.stringify(raw));return true;}
    catch(_){return false;}
  }

  function installPointSync(){
    const baseSpend = window.shopSpend;
    if(typeof baseSpend !== 'function') return false;
    if(baseSpend.__opoongPointSync) return true;

    const syncedSpend = function(){
      const result = baseSpend.apply(this, arguments);
      if(result !== false){
        try{window.renderOpoongColorShop?.();}catch(_){ }
        try{window.updateFocusWallet?.();}catch(_){ }
        try{
          const points = Number(window.loadOpoongRewards?.().points) || 0;
          window.dispatchEvent(new CustomEvent('opoong:points-changed', {detail:{points}}));
        }catch(_){ }
      }
      return result;
    };

    syncedSpend.__opoongPointSync = true;
    syncedSpend.__original = baseSpend;
    window.shopSpend = syncedSpend;
    return true;
  }

  function ensureTttMoveBadge(){
    const status = document.getElementById('tttStatus');
    if(!status) return null;
    let badge = document.getElementById('tttMoveTimerBadge');
    if(!badge){
      badge = document.createElement('span');
      badge.id = 'tttMoveTimerBadge';
      badge.setAttribute('aria-live', 'polite');
      badge.style.cssText = 'display:none;align-items:center;justify-content:center;margin-left:8px;padding:5px 9px;border-radius:999px;background:color-mix(in srgb,var(--pri) 10%,var(--card));border:1px solid color-mix(in srgb,var(--pri) 25%,var(--line));color:var(--pri);font-size:11px;font-weight:1000;white-space:nowrap;';
      status.insertAdjacentElement('afterend', badge);
    }
    return badge;
  }

  function tttMoveTimerActive(){
    try{
      const board = document.getElementById('tttBoard');
      const panel = board?.closest('.miniGamePanel');
      return Boolean(
        board && panel && !panel.hidden &&
        typeof tttMode !== 'undefined' && tttMode === 'move' &&
        typeof tttGameOver !== 'undefined' && !tttGameOver &&
        typeof tttComputerThinking !== 'undefined' && !tttComputerThinking &&
        typeof tttMarkCount === 'function' && tttMarkCount('X') >= 3 && tttMarkCount('O') >= 3
      );
    }catch(_){return false;}
  }

  function tttMoveCurrentMark(){
    const twoPlayer = document.getElementById('tttOpponent2P')?.getAttribute('aria-pressed') === 'true';
    if(!twoPlayer) return 'X';
    const status = document.getElementById('tttStatus')?.textContent || '';
    return status.includes('2P(O)') ? 'O' : 'X';
  }

  function tttMoveTurnKey(){
    try{return `${tttMoveCurrentMark()}:${tttBoardState.join('|')}`;}
    catch(_){return '';}
  }

  function autoMoveTicTacToe(){
    if(tttAutoMoving || !tttMoveTimerActive() || typeof window.playTicTacToe !== 'function') return;
    let board;
    try{board = tttBoardState.slice();}catch(_){return;}
    const mark = tttMoveCurrentMark();
    const own = [];
    const empty = [];
    board.forEach(function(value, index){
      if(value === mark) own.push(index);
      else if(!value) empty.push(index);
    });
    if(!own.length || !empty.length) return;

    const status = document.getElementById('tttStatus')?.textContent || '';
    const destinationOnly = status.includes('빈 칸을 선택하세요');
    const from = own[Math.floor(Math.random() * own.length)];
    const to = empty[Math.floor(Math.random() * empty.length)];

    tttAutoMoving = true;
    try{
      if(!destinationOnly) window.playTicTacToe(from);
      window.playTicTacToe(to);
    }catch(_){ }
    tttAutoMoving = false;
    tttMoveDeadline = 0;
    tttMoveKey = '';
  }

  function tickTttMoveTimer(){
    const badge = ensureTttMoveBadge();
    if(!badge) return;
    if(!tttMoveTimerActive()){
      badge.style.display = 'none';
      tttMoveDeadline = 0;
      tttMoveKey = '';
      return;
    }

    const key = tttMoveTurnKey();
    const now = performance.now();
    if(!tttMoveDeadline || key !== tttMoveKey){
      tttMoveKey = key;
      tttMoveDeadline = now + TTT_MOVE_SECONDS * 1000;
    }

    const remaining = Math.max(0, tttMoveDeadline - now);
    badge.style.display = 'inline-flex';
    badge.textContent = `⏱ 말 선택 · ${Math.max(0, Math.ceil(remaining / 1000))}초`;
    if(remaining <= 0) autoMoveTicTacToe();
  }

  function installTttMoveTimer(){
    if(tttMoveTimerInstalled) return true;
    if(typeof window.playTicTacToe !== 'function' || !document.getElementById('tttBoard')) return false;
    tttMoveTimerInstalled = true;
    ensureTttMoveBadge();
    window.setInterval(tickTttMoveTimer, 100);
    tickTttMoveTimer();
    return true;
  }

  function installHeartRouter(){
    const api = window.OPOONG_GAME_HEARTS;
    if(!api || typeof api.get !== 'function' || typeof window.openMiniGame !== 'function') return false;
    if(api.__opoongSingleChargeRouter) return true;

    migrateLegacyBonus();

    const baseGet = api.get.bind(api);
    const baseRender = typeof api.render === 'function' ? api.render.bind(api) : null;
    const routedOpenMiniGame = window.openMiniGame;

    function baseCount(){
      return Math.max(0, Math.floor(Number(baseGet()) || 0));
    }

    function totalHearts(){
      return baseCount() + loadBonusHearts();
    }

    function renderTotal(){
      if(baseRender) baseRender();
      const base = baseCount();
      const bonus = loadBonusHearts();
      const total = base + bonus;
      const count = document.getElementById('gameHeartCount');
      const modalCount = document.getElementById('gameHeartModalCount');
      const hub = document.getElementById('gameHub');
      if(count) count.textContent = bonus > 0 ? `${total}개 · 보너스 ${bonus}` : `${base} / ${api.max || HEART_MAX}`;
      if(modalCount) modalCount.textContent = bonus > 0 ? `${total}개 (보너스 ${bonus})` : `${base} / ${api.max || HEART_MAX}`;
      if(hub) hub.classList.toggle('heart-empty', total <= 0);
    }

    function spendAnyHeart(){
      const base = baseCount();
      if(base > 0){
        const raw = readBaseHeartState();
        raw.hearts = Math.max(0, base - 1);
        if(!saveBaseHeartState(raw)) return false;
        renderTotal();
        return true;
      }
      const bonus = loadBonusHearts();
      if(bonus > 0){
        if(!saveBonusHearts(bonus - 1)) return false;
        renderTotal();
        return true;
      }
      return false;
    }

    api.get = totalHearts;
    api.spend = spendAnyHeart;
    api.getBonus = loadBonusHearts;
    api.render = renderTotal;
    api.__opoongSingleChargeRouter = true;

    const unifiedOpen = function(){
      const baseBefore = baseCount();
      const bonusBefore = loadBonusHearts();
      if(baseBefore <= 0 && bonusBefore <= 0){
        if(typeof api.openCharge === 'function') api.openCharge('하트가 없어요. 다음 무료 충전을 기다리거나 하트를 충전해 주세요.');
        return;
      }

      if(baseBefore > 0){
        const result = routedOpenMiniGame.apply(this, arguments);
        const baseAfter = baseCount();
        if(baseAfter >= baseBefore){
          const raw = readBaseHeartState();
          raw.hearts = Math.max(0, baseAfter - 1);
          saveBaseHeartState(raw);
        }
        renderTotal();
        return result;
      }

      const temp = readBaseHeartState();
      temp.hearts = 1;
      if(!saveBaseHeartState(temp)) return;
      let opened = false;
      try{
        const result = routedOpenMiniGame.apply(this, arguments);
        opened = true;
        return result;
      }finally{
        const after = readBaseHeartState();
        after.hearts = 0;
        saveBaseHeartState(after);
        if(opened) saveBonusHearts(Math.max(0, bonusBefore - 1));
        renderTotal();
      }
    };

    unifiedOpen.__opoongHeartGate = true;
    unifiedOpen.__opoongSingleChargeRouter = true;
    unifiedOpen.__original = routedOpenMiniGame;
    window.openMiniGame = unifiedOpen;

    renderTotal();
    return true;
  }

  function init(){
    migrateLegacyBonus();
    const heartReady = installHeartRouter();
    const pointReady = installPointSync();
    const tttReady = installTttMoveTimer();
    if(heartReady && pointReady && tttReady) return;

    let tries = 0;
    const timer = window.setInterval(function(){
      tries += 1;
      const heartsInstalled = installHeartRouter();
      const pointsInstalled = installPointSync();
      const tttInstalled = installTttMoveTimer();
      if((heartsInstalled && pointsInstalled && tttInstalled) || tries >= 40) window.clearInterval(timer);
    },250);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  window.addEventListener('pageshow', function(){
    migrateLegacyBonus();
    installHeartRouter();
    installPointSync();
    installTttMoveTimer();
    try{window.OPOONG_GAME_HEARTS?.render?.();}catch(_){ }
  });

  window.addEventListener('storage', function(event){
    if(event.key === HEART_KEY || event.key === BONUS_HEART_KEY || event.key === LEGACY_BONUS_HEART_KEY){
      migrateLegacyBonus();
      try{window.OPOONG_GAME_HEARTS?.render?.();}catch(_){ }
    }
  });
})();
