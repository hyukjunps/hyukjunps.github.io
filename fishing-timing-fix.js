(() => {
  'use strict';

  let raf=0,last=0,pos=0,dir=1,speed=58,center=50,width=27,acceptedAt=0,goodHits=0,bypass=false,installed=false;
  const q=id=>document.getElementById(id);

  function style(){
    if(q('fishingTimingGuardStyle'))return;
    const s=document.createElement('style');s.id='fishingTimingGuardStyle';s.textContent=`
.fishingTimingGuard{position:relative;height:34px;margin-top:10px;border-radius:13px;background:#111827;border:1px solid rgba(255,255,255,.16);overflow:hidden}
.fishingTimingSafe{position:absolute;top:4px;bottom:4px;border-radius:9px;background:linear-gradient(90deg,#22c55e,#4ade80);box-shadow:0 0 18px rgba(34,197,94,.34)}
.fishingTimingNeedle{position:absolute;top:0;bottom:0;width:4px;border-radius:3px;background:#fff;box-shadow:0 0 12px #fff;transform:translateX(-2px)}
.fishingTimingGuard.good{box-shadow:0 0 0 3px rgba(34,197,94,.28)}.fishingTimingGuard.bad{box-shadow:0 0 0 3px rgba(239,68,68,.3)}`;
    document.head.appendChild(s);
  }

  function ensureUi(){
    const battle=q('fishingBattle');if(!battle)return false;
    if(!q('fishingTimingGuard')){
      const hint=battle.querySelector('.fishingBattleHint');
      const box=document.createElement('div');box.id='fishingTimingGuard';box.className='fishingTimingGuard';
      box.innerHTML='<div id="fishingTimingSafe" class="fishingTimingSafe"></div><div id="fishingTimingNeedle" class="fishingTimingNeedle"></div>';
      if(hint)hint.insertAdjacentElement('beforebegin',box);else battle.appendChild(box);
      if(hint){hint.id='fishingTimingGuardText';hint.textContent='흰 선이 초록 구역 안에 있을 때만 연타하세요!';}
    }
    const p=q('fishingOverlay')?.querySelector('.fishingOverlayCard p');
    if(p&&!p.dataset.timingGuard){p.dataset.timingGuard='1';p.innerHTML='입질이 오면 바늘을 걸고,<br><b>움직이는 흰 선이 초록 구역 안에 있을 때 “당기기!”를 연타</b>하세요.<br>구역 밖 연타는 힘이 줄지 않아요.';}
    return true;
  }

  function randomZone(){center=20+Math.random()*60;width=23+Math.random()*7;goodHits=0;}
  function active(){const b=q('fishingAction'),battle=q('fishingBattle');return !!b&&b.classList.contains('fight')&&battle?.classList.contains('show');}
  function render(){const safe=q('fishingTimingSafe'),needle=q('fishingTimingNeedle');if(safe){safe.style.left=`${center-width/2}%`;safe.style.width=`${width}%`;}if(needle)needle.style.left=`${pos}%`;}
  function loop(now){
    if(!active()){last=0;raf=requestAnimationFrame(loop);return;}
    if(!last)last=now;
    const dt=Math.min(.05,(now-last)/1000);last=now;pos+=dir*speed*dt;
    if(pos>=100){pos=100;dir=-1;speed=52+Math.random()*22;}
    if(pos<=0){pos=0;dir=1;speed=52+Math.random()*22;}
    render();raf=requestAnimationFrame(loop);
  }

  function flash(ok){const t=q('fishingTimingGuard');if(!t)return;t.classList.remove('good','bad');void t.offsetWidth;t.classList.add(ok?'good':'bad');setTimeout(()=>t.classList.remove('good','bad'),120);}

  function onClick(event){
    const button=event.target.closest?.('#fishingAction');if(!button||!button.classList.contains('fight'))return;
    if(bypass){bypass=false;return;}
    const now=performance.now();
    event.preventDefault();event.stopImmediatePropagation();
    if(now-acceptedAt<85)return;
    acceptedAt=now;
    const ok=pos>=center-width/2&&pos<=center+width/2;flash(ok);
    const text=q('fishingTimingGuardText');
    if(!ok){if(text)text.textContent='구역 밖! 흰 선이 초록 구역 안일 때 누르세요.';return;}
    goodHits++;if(text)text.textContent='좋아요! 초록 구역 안에서 계속 연타!';
    if(goodHits>=3)randomZone();
    bypass=true;button.click();
  }

  function install(){
    if(installed)return;
    if(!q('gameOpoongFishingPanel')||!q('fishingAction')){setTimeout(install,120);return;}
    installed=true;style();ensureUi();randomZone();render();
    document.addEventListener('click',onClick,true);
    const observer=new MutationObserver(()=>{ensureUi();if(active()&&!last){pos=Math.random()*100;randomZone();render();}});
    observer.observe(q('gameOpoongFishingPanel'),{subtree:true,attributes:true,attributeFilter:['class','hidden']});
    cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
