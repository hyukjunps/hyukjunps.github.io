(()=>{
  'use strict';

  const GAME='helix';
  const BEST_KEY='opoong_helix_best_v1';
  const TAU=Math.PI*2;
  const BALL_R=12;
  const TRACK_L=48;
  const TRACK_R=372;
  const TRACK_W=TRACK_R-TRACK_L;
  const SMASH_STREAK=4;
  const q=id=>document.getElementById(id);
  const best=()=>Math.max(0,Number(localStorage.getItem(BEST_KEY))||0);

  let baseOpen=null,baseHub=null,baseStop=null;
  let state=null,raf=0,drag=null,installed=false;

  function mod(n,m){return ((n%m)+m)%m;}
  function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

  function injectStyle(){
    if(q('helixGameStyle'))return;
    const el=document.createElement('style');
    el.id='helixGameStyle';
    el.textContent=`
      .coverHelix{display:grid;place-items:center;background:linear-gradient(145deg,#dbeafe,#ede9fe);position:relative;overflow:hidden}
      .coverHelix:before{content:'';width:66px;height:66px;border-radius:50%;border:12px solid #2563eb;border-right-color:transparent;border-bottom-color:#8b5cf6;transform:rotate(-24deg);box-shadow:0 8px 20px rgba(37,99,235,.18)}
      .coverHelix:after{content:'●';position:absolute;color:#f43f5e;font-size:24px;transform:translate(20px,-20px)}
      .hxHud{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
      .hxHud div{padding:11px;border:1px solid var(--line);border-radius:16px;background:var(--card);text-align:center}
      .hxHud span{display:block;color:var(--muted);font-size:10px;font-weight:900}
      .hxHud strong{display:block;margin-top:4px;font-size:18px}
      .hxWrap{display:grid;place-items:center;padding:8px;border:1px solid var(--line);border-radius:24px;background:var(--card2);overflow:hidden}
      #helixCanvas{width:min(100%,520px);height:auto;border-radius:18px;touch-action:none;user-select:none;-webkit-user-select:none}
      .hxBtns{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}
      .hxHint{text-align:center;margin-top:9px;color:var(--muted);font-size:12px;font-weight:850;line-height:1.55}
      .hxEasyNote{display:inline-flex;align-items:center;justify-content:center;margin-top:8px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb,var(--ok) 9%,var(--card));color:var(--ok);font-size:10.5px;font-weight:950}
      .hxSmashNote{display:inline-flex;align-items:center;justify-content:center;margin-top:6px;padding:6px 10px;border-radius:999px;background:color-mix(in srgb,#f97316 10%,var(--card));color:#ea580c;font-size:10.5px;font-weight:950}
      @media(max-width:620px){.hxHud{grid-template-columns:1fr 1fr}.hxHud div:last-child{grid-column:1/-1}.hxBtns .btn{min-width:88px}}
    `;
    document.head.appendChild(el);
  }

  function addCard(){
    const grid=document.querySelector('#gameHub .gameCardGrid');
    if(!grid||q('gameCardHelix'))return;
    const button=document.createElement('button');
    button.className='gameCard';button.type='button';button.id='gameCardHelix';
    button.innerHTML=`<span class="gameCover coverHelix"></span><span class="gameCardInfo"><b>헬릭스 점프</b><span id="gameCardHelixMeta">최고 ${best()}층</span></span>`;
    button.addEventListener('click',()=>window.openMiniGame(GAME));
    grid.appendChild(button);
  }

  function addPanel(){
    const view=q('view-game'),shop=q('gameColorShop');
    if(!view||q('gameHelixPanel'))return;
    const panel=document.createElement('div');
    panel.id='gameHelixPanel';panel.className='gamePlayCard miniGamePanel';panel.hidden=true;
    panel.innerHTML=`
      <div class="hxHud">
        <div><span>현재 층</span><strong id="helixScore">0층</strong></div>
        <div><span>연속 낙하</span><strong id="helixStreak">0 / ${SMASH_STREAK}</strong></div>
        <div><span>상태</span><strong id="helixStatus">준비</strong></div>
      </div>
      <div class="hxWrap"><canvas id="helixCanvas" width="420" height="560" aria-label="헬릭스 점프 게임"></canvas></div>
      <div class="hxBtns">
        <button id="helixLeft" class="btn ghost" type="button">← 회전</button>
        <button id="helixStart" class="bigBtn" type="button">게임 시작</button>
        <button id="helixRight" class="btn ghost" type="button">회전 →</button>
      </div>
      <div class="hxHint">좌우로 드래그해서 발판을 돌리세요. 공 전체가 틈 안에 들어오면 아래층으로 통과해요.<br><span class="hxEasyNote">초반 4층 안전 · 넓어진 틈 · 느려진 낙하</span><br><span class="hxSmashNote">🔥 4층 연속으로 발판에 안 닿으면 다음 발판 1개를 부수고 관통!</span></div>`;
    if(shop?.parentNode)shop.parentNode.insertBefore(panel,shop);else view.appendChild(panel);
  }

  function newPlatform(y,index){
    const gapAngle=Math.random()*TAU;
    const early=index<4;
    return{
      y,index,gapAngle,
      gapHalf:early?76+Math.random()*8:62+Math.random()*9,
      hazardAngle:mod(gapAngle+1.15+Math.random()*(TAU-2.3),TAU),
      hazardHalf:early?0:16+Math.random()*6,
      passed:false,
      broken:false
    };
  }

  function wrappedIntervals(center,half){
    if(half<=0)return[];
    const left=center-half,right=center+half;
    if(left<TRACK_L)return [[TRACK_L,right],[TRACK_R-(TRACK_L-left),TRACK_R]].filter(x=>x[1]>x[0]);
    if(right>TRACK_R)return [[left,TRACK_R],[TRACK_L,TRACK_L+(right-TRACK_R)]].filter(x=>x[1]>x[0]);
    return [[left,right]];
  }

  function complement(intervals){
    const sorted=intervals.slice().sort((a,b)=>a[0]-b[0]),out=[];
    let cursor=TRACK_L;
    for(const [a,b] of sorted){if(a>cursor)out.push([cursor,a]);cursor=Math.max(cursor,b);}
    if(cursor<TRACK_R)out.push([cursor,TRACK_R]);
    return out;
  }

  function intersect(a,b){
    const out=[];
    for(const x of a)for(const y of b){const l=Math.max(x[0],y[0]),r=Math.min(x[1],y[1]);if(r>l)out.push([l,r]);}
    return out;
  }

  function angleX(angle){return TRACK_L+(mod(angle+(state?.rotation||0),TAU)/TAU)*TRACK_W;}
  function geometry(platform){
    const gap=wrappedIntervals(angleX(platform.gapAngle),platform.gapHalf);
    const solid=complement(gap);
    const hazard=intersect(wrappedIntervals(angleX(platform.hazardAngle),platform.hazardHalf),solid);
    return{gap,solid,hazard};
  }
  function ballFitsGap(platform){return geometry(platform).gap.some(([a,b])=>210-BALL_R>=a&&210+BALL_R<=b);}
  function ballTouchesHazard(platform){return geometry(platform).hazard.some(([a,b])=>210+BALL_R>a&&210-BALL_R<b);}

  function rounded(ctx,x,y,w,h,r){
    if(w<=0)return;
    const rr=Math.min(r,w/2,h/2);ctx.beginPath();
    if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,rr);
    else{ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);}
    ctx.fill();
  }

  function addBreakParticles(y){
    for(let i=0;i<18;i++){
      const a=Math.random()*TAU;
      state.particles.push({
        x:210+(Math.random()-.5)*95,
        y:y+5,
        vx:Math.cos(a)*(60+Math.random()*150),
        vy:-40+Math.sin(a)*(40+Math.random()*130),
        life:.55+Math.random()*.35,
        size:4+Math.random()*7,
        red:Math.random()<.28
      });
    }
  }

  function draw(){
    const canvas=q('helixCanvas');if(!canvas||!state)return;
    const ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height,m=w/2;
    const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#dff4ff');bg.addColorStop(.62,'#eef2ff');bg.addColorStop(1,'#ede9fe');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.58)';
    [[62,72,34],[342,96,42],[125,215,27]].forEach(([x,y,r])=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.arc(x+r*.65,y+4,r*.72,0,TAU);ctx.fill();});
    ctx.fillStyle='#94a3b8';ctx.fillRect(m-13,18,26,h-18);ctx.fillStyle='#dbe4ef';ctx.fillRect(m-5,18,10,h-18);

    for(const p of state.platforms){
      if(p.broken||p.y<-35||p.y>h+35)continue;
      const g=geometry(p);
      ctx.fillStyle='rgba(15,23,42,.12)';g.solid.forEach(([a,b])=>rounded(ctx,a,p.y+5,b-a,14,7));
      ctx.fillStyle='#2563eb';g.solid.forEach(([a,b])=>rounded(ctx,a,p.y,b-a,15,7));
      ctx.fillStyle='rgba(255,255,255,.28)';g.solid.forEach(([a,b])=>{if(b-a>12)ctx.fillRect(a+6,p.y+3,b-a-12,3);});
      ctx.fillStyle='#ef4444';g.hazard.forEach(([a,b])=>rounded(ctx,a,p.y,b-a,15,7));
      ctx.fillStyle='rgba(15,23,42,.48)';ctx.font='800 10px system-ui';ctx.textAlign='left';ctx.fillText(String(p.index+1),22,p.y+11);
    }

    for(const part of state.particles){
      ctx.globalAlpha=Math.max(0,part.life*1.8);
      ctx.fillStyle=part.red?'#ef4444':'#2563eb';
      ctx.save();ctx.translate(part.x,part.y);ctx.rotate((part.x+part.y)*.02);ctx.fillRect(-part.size/2,-part.size/2,part.size,part.size*.55);ctx.restore();
    }
    ctx.globalAlpha=1;

    if(state.smash){
      const glow=ctx.createRadialGradient(m,state.ballY,4,m,state.ballY,30);
      glow.addColorStop(0,'rgba(255,237,213,.95)');glow.addColorStop(.35,'rgba(249,115,22,.55)');glow.addColorStop(1,'rgba(249,115,22,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.arc(m,state.ballY,30,0,TAU);ctx.fill();
      ctx.fillStyle='#f97316';ctx.beginPath();ctx.moveTo(m-8,state.ballY+10);ctx.quadraticCurveTo(m-16,state.ballY+27,m,state.ballY+21);ctx.quadraticCurveTo(m+17,state.ballY+27,m+8,state.ballY+10);ctx.fill();
    }

    ctx.fillStyle='rgba(15,23,42,.12)';ctx.beginPath();ctx.ellipse(m,state.ballY+14,15,5,0,0,TAU);ctx.fill();
    const ball=ctx.createRadialGradient(m-5,state.ballY-6,2,m,state.ballY,BALL_R+3);
    if(state.smash){ball.addColorStop(0,'#fff7ed');ball.addColorStop(.4,'#fb923c');ball.addColorStop(1,'#ea580c');}
    else{ball.addColorStop(0,'#fecdd3');ball.addColorStop(.38,'#fb7185');ball.addColorStop(1,'#e11d48');}
    ctx.fillStyle=ball;ctx.beginPath();ctx.arc(m,state.ballY,BALL_R,0,TAU);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.82)';ctx.beginPath();ctx.arc(m-4,state.ballY-5,3.5,0,TAU);ctx.fill();
  }

  function updateHud(){
    q('helixScore')&&(q('helixScore').textContent=`${state?.score||0}층`);
    q('helixStreak')&&(q('helixStreak').textContent=state?.smash?'🔥 파괴 준비':`${state?.fallStreak||0} / ${SMASH_STREAK}`);
  }

  function setStatus(text){q('helixStatus')&&(q('helixStatus').textContent=text);}

  function reset(){
    cancelAnimationFrame(raf);raf=0;drag=null;
    state={
      running:false,ended:false,rotation:0,ballY:78,vy:0,score:0,last:0,nextIndex:10,
      fallStreak:0,smash:false,particles:[],
      platforms:Array.from({length:10},(_,i)=>newPlatform(160+i*72,i))
    };
    updateHud();setStatus('준비');q('helixStart')&&(q('helixStart').textContent='게임 시작');draw();
  }

  function rotate(delta){if(!state)return;state.rotation=mod(state.rotation+delta,TAU);draw();}

  function scorePlatform(p){
    if(p.passed)return;
    p.passed=true;state.score++;updateHud();
  }

  function passGap(p){
    scorePlatform(p);
    state.fallStreak++;
    if(state.fallStreak>=SMASH_STREAK&&!state.smash){
      state.smash=true;
      state.fallStreak=SMASH_STREAK;
      setStatus('🔥 파괴 모드!');
    }
    updateHud();
  }

  function smashPlatform(p){
    p.broken=true;
    scorePlatform(p);
    addBreakParticles(p.y);
    state.smash=false;
    state.fallStreak=0;
    state.vy=Math.max(state.vy,300);
    setStatus('💥 발판 파괴!');
    updateHud();
  }

  function landOnPlatform(p){
    state.ballY=p.y-BALL_R;
    state.fallStreak=0;state.smash=false;
    updateHud();
    if(ballTouchesHazard(p)){
      draw();finish('위험 구역 착지');return false;
    }
    state.vy=-325;
    setStatus('진행 중');
    return true;
  }

  function finish(reason){
    if(!state||state.ended)return;
    state.running=false;state.ended=true;cancelAnimationFrame(raf);raf=0;
    const record=Math.max(best(),state.score);localStorage.setItem(BEST_KEY,String(record));updateHud();
    setStatus(reason);q('helixStart')&&(q('helixStart').textContent='다시 시작');
    q('gameCardHelixMeta')&&(q('gameCardHelixMeta').textContent=`최고 ${record}층`);
    window.OpoongGameResults?.show?.(GAME,{title:'헬릭스 점프',primaryLabel:'도달 층수',primaryValue:`${state.score}층`,stats:[{label:'최고 기록',value:`${record}층`},{label:'종료',value:reason}]})||window.showGameOverAd?.(GAME);
  }

  function updateParticles(dt){
    for(const p of state.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=460*dt;p.life-=dt;}
    state.particles=state.particles.filter(p=>p.life>0);
  }

  function loop(now){
    if(!state?.running)return;
    const dt=clamp((now-state.last)/1000,0,.035);state.last=now;
    const prevY=state.ballY;state.vy+=800*dt;state.ballY+=state.vy*dt;
    updateParticles(dt);

    if(state.vy>0){
      for(const p of state.platforms.slice().sort((a,b)=>a.y-b.y)){
        if(p.broken)continue;
        if(prevY+BALL_R<=p.y&&state.ballY+BALL_R>=p.y){
          if(ballFitsGap(p)){passGap(p);continue;}
          if(state.smash){smashPlatform(p);continue;}
          if(!landOnPlatform(p))return;
          break;
        }
      }
    }

    if(state.ballY>260){const delta=state.ballY-260;state.ballY=260;state.platforms.forEach(p=>{p.y-=delta;});state.particles.forEach(p=>{p.y-=delta;});}
    state.platforms=state.platforms.filter(p=>p.y>-95);
    while(state.platforms.length<11){const bottom=state.platforms.length?Math.max(...state.platforms.map(p=>p.y)):200;state.platforms.push(newPlatform(bottom+72,state.nextIndex++));}
    draw();raf=requestAnimationFrame(loop);
  }

  function start(){
    reset();state.running=true;state.last=performance.now();state.vy=30;
    setStatus('진행 중');q('helixStart')&&(q('helixStart').textContent='다시 시작');
    raf=requestAnimationFrame(loop);
  }

  function stop(){cancelAnimationFrame(raf);raf=0;if(state)state.running=false;drag=null;}

  function open(){
    stop();document.querySelectorAll('#view-game .miniGamePanel').forEach(el=>{el.hidden=true;});
    q('gameHub')&&(q('gameHub').hidden=true);q('miniGameTopbar')&&(q('miniGameTopbar').hidden=false);q('miniGameTitle')&&(q('miniGameTitle').textContent='헬릭스 점프');
    q('gameHelixPanel')&&(q('gameHelixPanel').hidden=false);reset();q('gameHelixPanel')?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function bind(){
    q('helixStart')?.addEventListener('click',start);q('helixLeft')?.addEventListener('click',()=>rotate(-.28));q('helixRight')?.addEventListener('click',()=>rotate(.28));
    const canvas=q('helixCanvas');
    if(canvas){
      canvas.addEventListener('pointerdown',e=>{e.preventDefault();drag={x:e.clientX,id:e.pointerId};try{canvas.setPointerCapture(e.pointerId);}catch(_){ }},{passive:false});
      canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;e.preventDefault();const dx=e.clientX-drag.x;drag.x=e.clientX;rotate(dx*.014);},{passive:false});
      const end=e=>{if(drag?.id===e.pointerId)drag=null;};canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    }
    window.addEventListener('keydown',e=>{const panel=q('gameHelixPanel');if(!panel||panel.hidden)return;if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();rotate(e.key==='ArrowLeft'?-.24:.24);}if(e.code==='Space'&&!state?.running){e.preventDefault();start();}});
  }

  function wrap(){
    baseOpen=window.openMiniGame;baseHub=window.showMiniGameHub;baseStop=window.stopActiveMiniGame;if(typeof baseOpen!=='function')return false;
    window.openMiniGame=function(game){if(game===GAME)return open();stop();return baseOpen.apply(this,arguments);};
    if(typeof baseHub==='function')window.showMiniGameHub=function(){stop();const result=baseHub.apply(this,arguments);q('gameHelixPanel')&&(q('gameHelixPanel').hidden=true);return result;};
    if(typeof baseStop==='function')window.stopActiveMiniGame=function(){stop();return baseStop.apply(this,arguments);};
    return true;
  }

  function install(){
    if(installed)return;
    if(typeof window.openMiniGame!=='function'||!document.querySelector('#gameHub .gameCardGrid')){setTimeout(install,120);return;}
    installed=true;injectStyle();addCard();addPanel();bind();wrap();reset();
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',install,{once:true}):install();
})();
