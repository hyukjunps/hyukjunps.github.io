(() => {
  'use strict';

  const BEST_KEY = 'opoong_ghost_best_v1';
  const GAME_SECONDS = 60;
  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let baseRestartGameAfterAd = null;
  let canvas = null, ctx = null, raf = 0, running = false, last = 0;
  let keys = new Set();
  let state = null;
  let pointer = { active:false, x:0, y:0 };

  function bestScore(){ return Math.max(0, Number(localStorage.getItem(BEST_KEY)||0)||0); }
  function saveBest(v){ try{localStorage.setItem(BEST_KEY,String(Math.max(bestScore(),Math.floor(v||0))))}catch(_){} }

  function injectStyles(){
    if(document.getElementById('opoongGhostStyles'))return;
    const s=document.createElement('style');s.id='opoongGhostStyles';s.textContent=`
      .coverOpoongGhost{position:relative;overflow:hidden;background:radial-gradient(circle at 35% 45%,#334155,#020617 65%)}
      .coverOpoongGhost::before{content:'👻';position:absolute;left:18%;bottom:14%;font-size:50px;filter:drop-shadow(0 0 15px rgba(255,255,255,.45))}
      .coverOpoongGhost::after{content:'🔦';position:absolute;right:16%;top:20%;font-size:34px;transform:rotate(-25deg)}
      .ghostHud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}.ghostStat{padding:11px 8px;border:1px solid var(--line);border-radius:16px;background:var(--card);text-align:center}.ghostStat span{display:block;color:var(--muted);font-size:10.5px;font-weight:900}.ghostStat strong{display:block;margin-top:4px;font-size:19px}
      .ghostStage{position:relative;overflow:hidden;border-radius:24px;border:1px solid var(--line);background:#020617;touch-action:none;user-select:none}.ghostStage canvas{display:block;width:100%;height:auto;aspect-ratio:16/9;min-height:300px}.ghostOverlay{position:absolute;inset:0;display:grid;place-items:center;padding:20px;background:rgba(2,6,23,.64);backdrop-filter:blur(5px);color:#fff;text-align:center}.ghostOverlay[hidden]{display:none!important}.ghostCard{max-width:470px;padding:22px;border-radius:22px;background:rgba(15,23,42,.88);border:1px solid rgba(255,255,255,.1)}.ghostCard b{display:block;font-size:26px}.ghostCard p{margin:8px 0 15px;color:#cbd5e1;font-weight:800;line-height:1.65;font-size:13px}
      .ghostControls{display:flex;gap:8px;justify-content:space-between;align-items:center;flex-wrap:wrap;margin-top:11px}.ghostDpad{display:grid;grid-template-columns:repeat(3,48px);grid-template-rows:repeat(2,44px);gap:5px}.ghostDpad button{border:1px solid var(--line);border-radius:13px;background:var(--card2);font-weight:1000}.ghostDpad .up{grid-column:2}.ghostDpad .left{grid-column:1}.ghostDpad .down{grid-column:2}.ghostDpad .right{grid-column:3}.ghostHint{color:var(--muted);font-size:12px;font-weight:850;line-height:1.55}.ghostFlashBtn{min-height:48px;padding:0 18px;border:0;border-radius:16px;background:linear-gradient(135deg,#facc15,#f59e0b);color:#422006;font-weight:1000;box-shadow:0 10px 22px rgba(245,158,11,.22)}
      @media(max-width:650px){.ghostHud{grid-template-columns:1fr 1fr}.ghostControls{align-items:flex-end}.ghostHint{width:100%}.ghostStage canvas{min-height:270px}}
    `;document.head.appendChild(s);
  }

  function addCard(){
    const grid=document.querySelector('#gameHub .gameCardGrid');if(!grid||document.getElementById('gameCardOpoongGhost'))return;
    const b=document.createElement('button');b.type='button';b.className='gameCard';b.id='gameCardOpoongGhost';b.innerHTML=`<span class="gameCover coverOpoongGhost"></span><span class="gameCardInfo"><b>오풍 유령찾기</b><span id="gameCardOpoongGhostMeta">최고 ${bestScore()}점</span></span>`;b.addEventListener('click',()=>window.openMiniGame('opoong-ghost'));grid.appendChild(b);
  }

  function addPanel(){
    const view=document.getElementById('view-game');if(!view||document.getElementById('gameOpoongGhostPanel'))return;const shop=document.getElementById('gameColorShop');const panel=document.createElement('div');panel.id='gameOpoongGhostPanel';panel.className='gamePlayCard miniGamePanel';panel.hidden=true;panel.innerHTML=`
      <div class="ghostHud"><div class="ghostStat"><span>남은 시간</span><strong id="ghostTime">60초</strong></div><div class="ghostStat"><span>잡은 유령</span><strong id="ghostScore">0점</strong></div><div class="ghostStat"><span>체력</span><strong id="ghostHp">❤❤❤</strong></div><div class="ghostStat"><span>최고 기록</span><strong id="ghostBest">${bestScore()}점</strong></div></div>
      <div class="ghostStage" id="ghostStage"><canvas id="opoongGhostCanvas" width="960" height="540"></canvas><div class="ghostOverlay" id="ghostOverlay"><div class="ghostCard"><b>오풍 유령찾기 👻</b><p>깜깜한 마을에서 유령은 거의 보이지 않아요.<br>움직이면서 손전등 빛 속에 유령을 넣고 비추면 잡을 수 있어요.<br><br>WASD / 방향키 이동 · 마우스/터치로 손전등 방향</p><button class="bigBtn" id="ghostStart" type="button">유령 찾으러 가기</button></div></div></div>
      <div class="ghostControls"><div class="ghostHint">유령이 가까우면 화면 가장자리가 흔들려요. 유령에게 닿으면 체력이 줄어요.</div><div class="ghostDpad"><button class="up" data-ghost-move="up">▲</button><button class="left" data-ghost-move="left">◀</button><button class="down" data-ghost-move="down">▼</button><button class="right" data-ghost-move="right">▶</button></div><button class="ghostFlashBtn" id="ghostFlash" type="button">🔦 빛 강화</button></div>`;
    if(shop?.parentNode)shop.parentNode.insertBefore(panel,shop);else view.appendChild(panel);
    panel.querySelectorAll('[data-ghost-move]').forEach(b=>{const dir=b.dataset.ghostMove;const code={up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'}[dir];b.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(code)});['pointerup','pointercancel','pointerleave'].forEach(ev=>b.addEventListener(ev,()=>keys.delete(code)));});
    document.getElementById('ghostStart')?.addEventListener('click',startGame);document.getElementById('ghostFlash')?.addEventListener('pointerdown',()=>{if(state)state.boost=1.3});document.getElementById('ghostFlash')?.addEventListener('pointerup',()=>{if(state)state.boost=1});
  }

  function restoreStartOverlay(){
    const o=document.getElementById('ghostOverlay');
    const card=o?.querySelector('.ghostCard');
    if(!card)return;
    card.innerHTML=`<b>오풍 유령찾기 👻</b><p>깜깜한 마을에서 유령은 거의 보이지 않아요.<br>움직이면서 손전등 빛 속에 유령을 넣고 비추면 잡을 수 있어요.<br><br>WASD / 방향키 이동 · 마우스/터치로 손전등 방향</p><button class="bigBtn" id="ghostStart" type="button">유령 찾으러 가기</button>`;
    card.querySelector('#ghostStart')?.addEventListener('click',startGame);
  }

  function newGhost(){const edge=Math.floor(Math.random()*4);let x,y;if(edge===0){x=40;y=Math.random()*500+20}else if(edge===1){x=920;y=Math.random()*500+20}else if(edge===2){x=Math.random()*900+30;y=35}else{x=Math.random()*900+30;y=505}return{x,y,r:18+Math.random()*8,speed:42+Math.random()*34,seen:0,hit:0};}
  function reset(){state={time:GAME_SECONDS,score:0,hp:3,player:{x:480,y:270,r:16},aim:{x:700,y:270},ghosts:Array.from({length:5},newGhost),boost:1,inv:0,shake:0};updateHud();draw();}
  function startGame(){reset();running=true;last=performance.now();const o=document.getElementById('ghostOverlay');if(o)o.hidden=true;cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);}
  function stopGame(){running=false;cancelAnimationFrame(raf);raf=0;keys.clear();}
  function endGame(){if(!running)return;stopGame();saveBest(state.score);updateHud();const meta=document.getElementById('gameCardOpoongGhostMeta');if(meta)meta.textContent=`최고 ${bestScore()}점`;const o=document.getElementById('ghostOverlay');if(o){o.hidden=false;o.querySelector('.ghostCard').innerHTML=`<b>${state.score}점!</b><p>유령 ${state.score}마리를 찾아냈어요.<br>최고 기록 ${bestScore()}점</p><button class="bigBtn" type="button" id="ghostFakeAgain">잠시 후 광고가 표시돼요</button>`;}setTimeout(()=>{if(typeof window.showGameOverAd==='function')window.showGameOverAd('opoong-ghost');},350);}
  function updateHud(){if(!state)return;const t=document.getElementById('ghostTime'),s=document.getElementById('ghostScore'),h=document.getElementById('ghostHp'),b=document.getElementById('ghostBest');if(t)t.textContent=`${Math.max(0,Math.ceil(state.time))}초`;if(s)s.textContent=`${state.score}점`;if(h)h.textContent='❤'.repeat(Math.max(0,state.hp))+'♡'.repeat(Math.max(0,3-state.hp));if(b)b.textContent=`${Math.max(bestScore(),state.score)}점`;}
  function angleDiff(a,b){let d=a-b;while(d>Math.PI)d-=Math.PI*2;while(d<-Math.PI)d+=Math.PI*2;return Math.abs(d);}
  function update(dt){const p=state.player;let dx=0,dy=0;if(keys.has('ArrowUp')||keys.has('KeyW'))dy--;if(keys.has('ArrowDown')||keys.has('KeyS'))dy++;if(keys.has('ArrowLeft')||keys.has('KeyA'))dx--;if(keys.has('ArrowRight')||keys.has('KeyD'))dx++;const len=Math.hypot(dx,dy)||1;p.x=Math.max(22,Math.min(938,p.x+dx/len*190*dt));p.y=Math.max(22,Math.min(518,p.y+dy/len*190*dt));state.time-=dt;state.inv=Math.max(0,state.inv-dt);state.boost=Math.max(1,state.boost-dt*.25);const aimAng=Math.atan2(state.aim.y-p.y,state.aim.x-p.x);let nearest=9999;for(const g of state.ghosts){const vx=p.x-g.x,vy=p.y-g.y,d=Math.hypot(vx,vy)||1;nearest=Math.min(nearest,d);g.x+=vx/d*g.speed*dt;g.y+=vy/d*g.speed*dt;const ga=Math.atan2(g.y-p.y,g.x-p.x);const lit=d<220*state.boost&&angleDiff(ga,aimAng)<.34*state.boost;if(lit){g.seen+=dt*state.boost;if(g.seen>1.0){state.score++;Object.assign(g,newGhost());g.seen=0;}}else g.seen=Math.max(0,g.seen-dt*.45);if(d<p.r+g.r+3&&state.inv<=0){state.hp--;state.inv=1.25;state.shake=1;Object.assign(g,newGhost());if(state.hp<=0)return endGame();}}
    state.shake=Math.max(0,state.shake-dt*2.5);if(nearest<110)state.shake=Math.max(state.shake,(110-nearest)/110*.5);if(state.time<=0){state.time=0;endGame();}updateHud();}

  function draw(){if(!canvas||!ctx||!state)return;ctx.save();const sh=state.shake*5;ctx.translate((Math.random()-.5)*sh,(Math.random()-.5)*sh);ctx.fillStyle='#020617';ctx.fillRect(0,0,960,540);ctx.fillStyle='#0f172a';for(let x=30;x<960;x+=110)for(let y=25;y<540;y+=100){ctx.fillRect(x,y,65,55);ctx.fillStyle='#1e293b';ctx.fillRect(x+10,y+12,14,14);ctx.fillRect(x+39,y+12,14,14);ctx.fillStyle='#0f172a';}
    const p=state.player;const ang=Math.atan2(state.aim.y-p.y,state.aim.x-p.x);ctx.save();ctx.globalCompositeOperation='lighter';const grd=ctx.createRadialGradient(p.x,p.y,20,p.x,p.y,250*state.boost);grd.addColorStop(0,'rgba(254,249,195,.30)');grd.addColorStop(1,'rgba(254,249,195,0)');ctx.fillStyle=grd;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.arc(p.x,p.y,250*state.boost,ang-.34*state.boost,ang+.34*state.boost);ctx.closePath();ctx.fill();ctx.restore();
    for(const g of state.ghosts){const ga=Math.atan2(g.y-p.y,g.x-p.x),d=Math.hypot(g.x-p.x,g.y-p.y),lit=d<220*state.boost&&angleDiff(ga,ang)<.34*state.boost;ctx.globalAlpha=lit?Math.min(1,.25+g.seen*.75):.035;ctx.font=`${g.r*2.1}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('👻',g.x,g.y);if(lit&&g.seen>0){ctx.globalAlpha=.8;ctx.strokeStyle='#fde047';ctx.lineWidth=4;ctx.beginPath();ctx.arc(g.x,g.y,g.r+8,-Math.PI/2,-Math.PI/2+Math.PI*2*Math.min(1,g.seen));ctx.stroke();}}ctx.globalAlpha=1;ctx.fillStyle=state.inv>0?'#f87171':'#60a5fa';ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();ctx.font='20px system-ui';ctx.fillText('🔦',p.x+Math.cos(ang)*22,p.y+Math.sin(ang)*22);ctx.restore();}
  function loop(now){if(!running)return;const dt=Math.min(.04,(now-last)/1000);last=now;update(dt);draw();if(running)raf=requestAnimationFrame(loop);}
  function bind(){canvas=document.getElementById('opoongGhostCanvas');ctx=canvas?.getContext('2d');if(!canvas||canvas.dataset.bound)return;canvas.dataset.bound='1';window.addEventListener('keydown',e=>{if(!document.getElementById('gameOpoongGhostPanel')?.hidden&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();keys.add(e.code)}},{passive:false});window.addEventListener('keyup',e=>keys.delete(e.code));const setAim=e=>{const r=canvas.getBoundingClientRect();state&&(state.aim={x:(e.clientX-r.left)/r.width*960,y:(e.clientY-r.top)/r.height*540})};canvas.addEventListener('pointermove',setAim);canvas.addEventListener('pointerdown',e=>{setAim(e);pointer.active=true;if(state)state.boost=1.25});canvas.addEventListener('pointerup',()=>{pointer.active=false;if(state)state.boost=1});}
  function openGhost(){try{baseStopActiveMiniGame?.()}catch(_){}document.querySelectorAll('#view-game .miniGamePanel').forEach(e=>e.hidden=true);const hub=document.getElementById('gameHub');if(hub)hub.hidden=true;const p=document.getElementById('gameOpoongGhostPanel');if(p)p.hidden=false;stopGame();reset();bind();restoreStartOverlay();const o=document.getElementById('ghostOverlay');if(o)o.hidden=false;p?.scrollIntoView({behavior:'smooth',block:'start'});}
  function restartGhostAfterAd(){
    const api=window.OPOONG_GAME_HEARTS;
    if(api&&typeof api.spend==='function'){
      const spent=Boolean(api.spend());
      if(!spent){
        if(typeof api.openCharge==='function')api.openCharge('하트가 없어요. 다시 플레이하려면 하트를 충전해 주세요.');
        return;
      }
    }
    try{window.closeGameRestartPrompt?.()}catch(_){}
    restoreStartOverlay();
    startGame();
  }
  function wrap(){
    baseOpenMiniGame=window.openMiniGame;baseShowMiniGameHub=window.showMiniGameHub;baseStopActiveMiniGame=window.stopActiveMiniGame;baseRestartGameAfterAd=window.restartGameAfterAd;
    if(typeof baseOpenMiniGame!=='function')return;
    window.openMiniGame=function(game){if(game==='opoong-ghost')return openGhost();stopGame();return baseOpenMiniGame.apply(this,arguments)};
    if(typeof baseShowMiniGameHub==='function')window.showMiniGameHub=function(){stopGame();const r=baseShowMiniGameHub.apply(this,arguments);const p=document.getElementById('gameOpoongGhostPanel');if(p)p.hidden=true;return r};
    if(typeof baseStopActiveMiniGame==='function')window.stopActiveMiniGame=function(){stopGame();return baseStopActiveMiniGame.apply(this,arguments)};
    if(typeof baseRestartGameAfterAd==='function')window.restartGameAfterAd=function(){let game='';try{game=(typeof gameOverAdGame!=='undefined'?gameOverAdGame:'')}catch(_){}if(game==='opoong-ghost')return restartGhostAfterAd();return baseRestartGameAfterAd.apply(this,arguments)};
  }
  function install(){if(installed)return;if(typeof window.openMiniGame!=='function'||!document.querySelector('#gameHub .gameCardGrid')){setTimeout(install,120);return}installed=true;injectStyles();addCard();addPanel();wrap();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();