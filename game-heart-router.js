(function(){
  'use strict';

  const HEART_KEY = 'opoong_game_hearts_v1';
  const BONUS_HEART_KEY = 'opoong_bonus_hearts_v1';
  const LEGACY_BONUS_HEART_KEY = 'opoong_bonus_hearts_seoyul_v1';
  const HEART_MAX = 50;

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
    if(heartReady && pointReady) return;

    let tries = 0;
    const timer = window.setInterval(function(){
      tries += 1;
      const heartsInstalled = installHeartRouter();
      const pointsInstalled = installPointSync();
      if((heartsInstalled && pointsInstalled) || tries >= 40) window.clearInterval(timer);
    },250);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  window.addEventListener('pageshow', function(){
    migrateLegacyBonus();
    installHeartRouter();
    installPointSync();
    try{window.OPOONG_GAME_HEARTS?.render?.();}catch(_){ }
  });

  window.addEventListener('storage', function(event){
    if(event.key === HEART_KEY || event.key === BONUS_HEART_KEY || event.key === LEGACY_BONUS_HEART_KEY){
      migrateLegacyBonus();
      try{window.OPOONG_GAME_HEARTS?.render?.();}catch(_){ }
    }
  });
})();
