(() => {
  'use strict';

  const SAVE_KEY='opoong_avatar_gacha_v1';
  const ORDER={common:1,rare:2,epic:3,legendary:4,mythic:5};
  let installed=false;
  let drawStartedAt=0;
  let drawCount=1;

  function readState(){
    try{return JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{};}
    catch(_){return{};}
  }

  function itemMap(){
    const items=window.OpoongAvatarGacha?.items?.()||[];
    return new Map(items.map(item=>[item.id,item]));
  }

  function pickBestLatest(){
    const state=readState();
    const map=itemMap();
    const history=Array.isArray(state.history)?state.history:[];
    const recent=history
      .filter(entry=>Number(entry.at||0)>=drawStartedAt-250)
      .slice(0,drawCount)
      .map(entry=>{
        const item=map.get(entry.id);
        return item?{...item,duplicate:Boolean(entry.duplicate)}:null;
      })
      .filter(Boolean);

    if(!recent.length){
      const fallback=history.slice(0,drawCount).map(entry=>map.get(entry.id)).filter(Boolean);
      if(!fallback.length)return null;
      fallback.sort((a,b)=>(ORDER[b.rarity]||0)-(ORDER[a.rarity]||0));
      return fallback[0];
    }

    recent.sort((a,b)=>(ORDER[b.rarity]||0)-(ORDER[a.rarity]||0));
    return recent[0];
  }

  function applyAfterDraw(){
    const best=pickBestLatest();
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
      drawStartedAt=Date.now();
      drawCount=Number(button.dataset.avatarDraw)===5?5:1;
      window.setTimeout(applyAfterDraw,900);
    },true);

    return true;
  }

  let tries=0;
  const timer=setInterval(()=>{tries++;if(install()||tries>100)clearInterval(timer);},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
