(() => {
  'use strict';

  const SAVE_KEY = 'opoong_village_v1';
  const ORIGINAL = CanvasRenderingContext2D.prototype.fillText;
  let installed = false;
  let statusTimer = 0;

  function villageReady(){
    try{
      const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if(!s?.placed) return false;
      let airport=false, runway=false, plane=false;
      for(const p of s.placed){
        const id = String(p.itemId || '');
        if(id === 'village-5-0') airport = true;
        if(id === 'village-5-1') runway = true;
        if(id === 'village-5-3' || id === 'village-5-4') plane = true;
      }
      return airport && runway && plane;
    }catch(_){ return false; }
  }

  function phase(){
    const cycle = 18000;
    const t = performance.now() % cycle;
    if(t < 3500) return {name:'탑승 준비',p:0};
    if(t < 6500) return {name:'활주 중',p:(t-3500)/3000};
    if(t < 10500) return {name:'이륙 중',p:(t-6500)/4000};
    if(t < 15000) return {name:'비행 중',p:(t-10500)/4500};
    return {name:'착륙 준비',p:(t-15000)/3000};
  }

  function offsets(){
    if(!villageReady()) return {x:0,y:0,scale:1,rotate:0};
    const ph = phase();
    if(ph.name === '활주 중') return {x:ph.p*150,y:0,scale:1,rotate:0};
    if(ph.name === '이륙 중') return {x:150+ph.p*210,y:-ph.p*150,scale:1+ph.p*.18,rotate:-ph.p*.18};
    if(ph.name === '비행 중') return {x:360+ph.p*260,y:-150-ph.p*90,scale:1.18,rotate:-.18};
    if(ph.name === '착륙 준비') return {x:620-ph.p*620,y:-240+ph.p*240,scale:1.18-ph.p*.18,rotate:-.18+ph.p*.18};
    return {x:0,y:0,scale:1,rotate:0};
  }

  function patchedFillText(text,x,y,maxWidth){
    const isVillage = this?.canvas?.id === 'opoongVillageCanvas';
    const plane = text === '✈️' || text === '🛩️' || text === '✈' || text === '🛩';
    if(isVillage && plane && villageReady()){
      const o = offsets();
      this.save();
      this.translate(x+o.x,y+o.y);
      this.rotate(o.rotate);
      this.scale(o.scale,o.scale);
      if(maxWidth !== undefined) ORIGINAL.call(this,text,0,0,maxWidth);
      else ORIGINAL.call(this,text,0,0);
      this.restore();
      return;
    }
    if(maxWidth !== undefined) return ORIGINAL.call(this,text,x,y,maxWidth);
    return ORIGINAL.call(this,text,x,y);
  }

  function addStatus(){
    const wrap = document.getElementById('villageMapWrap');
    if(!wrap || document.getElementById('villageAirportStatus')) return;
    const badge = document.createElement('div');
    badge.id = 'villageAirportStatus';
    badge.style.cssText = 'position:absolute;right:12px;top:12px;z-index:2;padding:8px 11px;border-radius:999px;background:rgba(15,23,42,.76);color:#fff;font-size:10.5px;font-weight:900;backdrop-filter:blur(10px);pointer-events:none;box-shadow:0 8px 18px rgba(15,23,42,.12)';
    wrap.appendChild(badge);
    const update = () => {
      if(!document.body.contains(badge)) return;
      badge.textContent = villageReady() ? `✈ 오풍항공 · ${phase().name}` : '✈ 공항 + 활주로 + 비행기 필요';
    };
    update();
    statusTimer = setInterval(update, 700);
  }

  function install(){
    if(installed) return;
    installed = true;
    CanvasRenderingContext2D.prototype.fillText = patchedFillText;
    const wait = () => {
      if(document.getElementById('villageMapWrap')) addStatus();
      else setTimeout(wait,180);
    };
    wait();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();