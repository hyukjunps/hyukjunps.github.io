(() => {
  'use strict';

  const SAVE_KEY='opoong_avatar_gacha_v1';
  const ORDER={common:1,rare:2,epic:3,legendary:4,mythic:5};
  let installed=false;
  let beforeOwned=null;
  let drawStartedAt=0;

  function readState(){
    try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{};}
    catch(_){return{};}
  }

  function ownedSet(){
    const state=readState();
    return new Set(Array.isArray(state.owned)?state.owned:[]);
  }

  function pickBestNew(before,after){
    const items=window.OpoongAvatarGacha?.items?.()||[];
    const map=new Map(items.map(item=>[item.id,item]));
    const fresh=[...after].filter(id=>id!=='starter'&&!before.has(id)).map(id=>map.get(id)).filter(Boolean);
    if(!fresh.length)return null;
    fresh.sort((a,b)=>(ORDER[b.rarity]||0)-(ORDER[a.rarity]||0));
    return fresh[0];
  }

  function applyAfterDraw(){
    const before=beforeOwned||new Set();
    const after=ownedSet();
    const best=pickBestNew(before,after);
    beforeOwned=null;
    if(!best)return;

    try{
      window.OpoongAvatarGacha?.equip?.(best.id);
      window.OpoongPetExpansion?.render?.();
      window.dispatchEvent(new CustomEvent('opoong-avatar-auto-equipped',{detail:{id:best.id,rarity:best.rarity,at:Date.now()}}));
      window.gameRewardMessage?.(best.name+' 자동 장착 · 오풍 펫에도 적용!');
    }catch(error){
      console.warn('O.Poong avatar auto-equip:',error);
    }
  }

  function install(){
    if(installed)return true;
    if(!window.OpoongAvatarGacha?.equip||!window.OpoongAvatarGacha?.items)return false;
    installed=true;

    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-avatar-draw]');
      if(!button)return;
      beforeOwned=ownedSet();
      drawStartedAt=Date.now();
      window.setTimeout(()=>{
        if(Date.now()-drawStartedAt<250)return;
        applyAfterDraw();
      },900);
    },true);

    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer);},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
