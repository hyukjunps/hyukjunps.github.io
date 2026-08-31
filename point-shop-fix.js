(function(){
  'use strict';

  const SHOP_KEY='opoong_point_shop_v1';
  const VALID_IDS=new Set([
    'completion','snake','mine','maze','rename','timetable','nowbar','focus','custom','season',
    'gamecard','buttons','dday','homebg','gamehud','panels','resultfx'
  ]);

  function repairedLoadOpoongShop(){
    try{
      const raw=JSON.parse(localStorage.getItem(SHOP_KEY)||'{}');
      const owned=Array.from(new Set(Array.isArray(raw.owned)?raw.owned:[])).filter(id=>VALID_IDS.has(id));
      const equippedRaw=raw.equipped&&typeof raw.equipped==='object'?raw.equipped:{};
      const equipped=Object.fromEntries(Object.entries(equippedRaw).filter(entry=>VALID_IDS.has(entry[0])));
      const customColor=/^#[0-9a-f]{6}$/i.test(raw.customColor||'')?raw.customColor:'#1e40af';
      const clean={owned,equipped,customColor};
      if(JSON.stringify(raw)!==JSON.stringify(clean))localStorage.setItem(SHOP_KEY,JSON.stringify(clean));
      return clean;
    }catch(error){
      console.error('O.Poong point shop state repair:',error);
      return{owned:[],equipped:{},customColor:'#1e40af'};
    }
  }

  function loadExpansion(){
    if(document.querySelector('script[data-opoong-shop-expansion]'))return;
    const s=document.createElement('script');
    s.src='./opoong-shop-expansion.js?v=20260825-1';
    s.async=false;
    s.dataset.opoongShopExpansion='1';
    document.head.appendChild(s);
  }

  function loadAvatarGacha(){
    if(document.querySelector('script[data-opoong-avatar-gacha]'))return;
    const s=document.createElement('script');
    s.src='./opoong-avatar-gacha.js?v=20260831-2';
    s.async=false;
    s.dataset.opoongAvatarGacha='1';
    document.head.appendChild(s);
  }

  function loadGachaOwnedFix(){
    if(document.querySelector('script[data-opoong-gacha-owned-fix]'))return;
    const s=document.createElement('script');
    s.src='./opoong-gacha-owned-fix.js?v=20260831-1';
    s.async=false;
    s.dataset.opoongGachaOwnedFix='1';
    document.head.appendChild(s);
  }

  function loadPetExpansion(){
    if(document.querySelector('script[data-opoong-pet-expansion]'))return;
    const s=document.createElement('script');
    s.src='./opoong-pet-expansion.js?v=20260831-1';
    s.async=false;
    s.dataset.opoongPetExpansion='1';
    document.head.appendChild(s);
  }

  function loadAvatarAutoEquip(){
    if(document.querySelector('script[data-opoong-avatar-autoequip]'))return;
    const s=document.createElement('script');
    s.src='./opoong-avatar-autoequip.js?v=20260831-1';
    s.async=false;
    s.dataset.opoongAvatarAutoequip='1';
    document.head.appendChild(s);
  }

  function refreshShop(){
    try{
      window.applyOpoongShop?.();
      window.renderOpoongColorShop?.();
      window.renderOpoongShopCatalog?.();
      window.updateFocusWallet?.();
    }catch(error){console.error('O.Poong point shop refresh:',error);}
  }

  function installFix(){
    if(typeof window.loadOpoongShop!=='function')return false;
    if(!window.loadOpoongShop.__opoongPointShopFixed){
      repairedLoadOpoongShop.__opoongPointShopFixed=true;
      window.loadOpoongShop=repairedLoadOpoongShop;
    }
    loadExpansion();
    loadAvatarGacha();
    loadGachaOwnedFix();
    loadPetExpansion();
    loadAvatarAutoEquip();
    refreshShop();
    return true;
  }

  function init(){
    if(installFix())return;
    let attempts=0;
    const timer=setInterval(()=>{attempts++;if(installFix()||attempts>50)clearInterval(timer);},100);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
