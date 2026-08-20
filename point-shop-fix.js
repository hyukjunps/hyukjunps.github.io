(function(){
  'use strict';

  const SHOP_KEY = 'opoong_point_shop_v1';
  const VALID_IDS = new Set([
    'completion','snake','mine','maze','rename',
    'timetable','nowbar','focus','custom','season'
  ]);

  function repairedLoadOpoongShop(){
    try{
      const raw = JSON.parse(localStorage.getItem(SHOP_KEY) || '{}');
      const owned = Array.from(new Set(Array.isArray(raw.owned) ? raw.owned : []))
        .filter(function(id){ return VALID_IDS.has(id); });
      const equippedRaw = raw.equipped && typeof raw.equipped === 'object' ? raw.equipped : {};
      const equipped = Object.fromEntries(
        Object.entries(equippedRaw).filter(function(entry){ return VALID_IDS.has(entry[0]); })
      );
      const customColor = /^#[0-9a-f]{6}$/i.test(raw.customColor || '') ? raw.customColor : '#1e40af';
      const clean = { owned: owned, equipped: equipped, customColor: customColor };

      if(JSON.stringify(raw) !== JSON.stringify(clean)){
        localStorage.setItem(SHOP_KEY, JSON.stringify(clean));
      }
      return clean;
    }catch(error){
      console.error('O.Poong point shop state repair:', error);
      return { owned: [], equipped: {}, customColor: '#1e40af' };
    }
  }

  function refreshShop(){
    try{
      if(typeof window.applyOpoongShop === 'function') window.applyOpoongShop();
      if(typeof window.renderOpoongColorShop === 'function') window.renderOpoongColorShop();
      if(typeof window.updateFocusWallet === 'function') window.updateFocusWallet();
    }catch(error){
      console.error('O.Poong point shop refresh:', error);
    }
  }

  function installFix(){
    if(typeof window.loadOpoongShop !== 'function') return false;
    if(window.loadOpoongShop.__opoongPointShopFixed) return true;

    repairedLoadOpoongShop.__opoongPointShopFixed = true;
    window.loadOpoongShop = repairedLoadOpoongShop;

    // Re-read the state that previous purchases already saved in localStorage.
    refreshShop();
    return true;
  }

  function init(){
    if(installFix()) return;
    let attempts = 0;
    const timer = window.setInterval(function(){
      attempts += 1;
      if(installFix() || attempts > 40) window.clearInterval(timer);
    }, 100);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
