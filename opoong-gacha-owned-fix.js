(() => {
  'use strict';

  const SAVE_KEY='opoong_avatar_gacha_v1';
  let drawGuard=false;
  let installed=false;

  function readState(){
    try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{};}
    catch(_){return{};}
  }

  function writeState(next){
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(next));return true;}
    catch(_){return false;}
  }

  function itemMap(){
    const items=window.OpoongAvatarGacha?.items?.()||[];
    return new Map(items.map(item=>[item.name,item]));
  }

  function recoverVisibleResults(){
    const cards=[...document.querySelectorAll('#avatarResultGrid .avatarResult')];
    if(!cards.length)return false;
    const map=itemMap();
    if(!map.size)return false;

    const state=readState();
    const owned=new Set(Array.isArray(state.owned)?state.owned:['starter']);
    owned.add('starter');
    let changed=false;

    cards.forEach(card=>{
      const name=card.querySelector('b')?.textContent?.trim();
      const item=map.get(name);
      if(item&&!owned.has(item.id)){
        owned.add(item.id);
        changed=true;
      }
    });

    if(!changed)return false;
    state.owned=[...owned];
    if(!state.equipped||!owned.has(state.equipped))state.equipped='starter';
    writeState(state);
    window.OpoongAvatarGacha?.render?.();
    window.OpoongPetExpansion?.render?.();
    return true;
  }

  function beginDrawGuard(){
    drawGuard=true;
    // drawAvatar() itself is synchronous; release after the click handler finishes.
    setTimeout(()=>{
      drawGuard=false;
      recoverVisibleResults();
      window.OpoongAvatarGacha?.render?.();
      window.OpoongPetExpansion?.render?.();
    },0);
    // The result modal is populated a little later, so run one recovery pass too.
    setTimeout(recoverVisibleResults,500);
    setTimeout(recoverVisibleResults,1900);
  }

  function install(){
    if(installed)return true;
    installed=true;

    // Mark the synchronous draw before the shop's delegated click handler runs.
    document.addEventListener('click',event=>{
      if(event.target.closest('[data-avatar-draw]'))beginDrawGuard();
    },true);

    // During a draw, pet XP emits this event before the avatar state is saved.
    // Blocking the gacha render here prevents load() from overwriting the new owned state.
    window.addEventListener('opoong-pet-updated',event=>{
      if(!drawGuard||event.detail?.source!=='gacha')return;
      event.stopImmediatePropagation();
    },true);

    // Recover a result that is still visible from a draw made just before this fix loaded.
    setTimeout(recoverVisibleResults,250);
    return true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.OpoongGachaOwnedFix={recover:recoverVisibleResults};
})();
