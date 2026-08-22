(() => {
  'use strict';

  const BEST_KEY = 'opoong_candy_best_v1';
  const GAME_SECONDS = 45;
  const MAX_LIVES = 3;
  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let raf = 0;
  let running = false;
  let lastTime = 0;
  let spawnTimer = 0;
  let state = null;

  const CANDIES = [
    { icon:'🍬', points:10, cls:'pink' },
    { icon:'🍭', points:15, cls:'blue' },
    { icon:'🍫', points:20, cls:'brown' },
    { icon:'🧁', points:25, cls:'purple' },
    { icon:'🍩', points:30, cls:'orange' }
  ];

  function bestScore(){
    const n = Number(localStorage.getItem(BEST_KEY) || '0');
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function saveBest(score){
    try { localStorage.setItem(BEST_KEY, String(Math.max(bestScore(), Math.floor(score || 0)))); } catch (_) {}
  }

  function injectStyles(){
    if(document.getElementById('opoongCandyStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongCandyStyles';
    style.textContent = `
      .coverOpoongCandy{position:relative;overflow:hidden;background:linear-gradient(160deg,#fdf2f8,#fae8ff 52%,#dbeafe)}
      .coverOpoongCandy::before{content:'🍬';position:absolute;left:14%;bottom:15%;font-size:48px;transform:rotate(-12deg);filter:drop-shadow(0 8px 10px rgba(190,24,93,.16))}
      .coverOpoongCandy::after{content:'🍭';position:absolute;right:14%;top:15%;font-size:42px;transform:rotate(16deg);filter:drop-shadow(0 8px 10px rgba(37,99,235,.15))}
      .candyHud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:10px}
      .candyStat{padding:11px 8px;border:1px solid var(--line);border-radius:16px;background:var(--card);text-align:center}.candyStat span{display:block;color:var(--muted);font-size:10.5px;font-weight:900}.candyStat strong{display:block;margin-top:4px;font-size:19px}
      .candyStage{position:relative;min-height:470px;overflow:hidden;border:1px solid var(--line);border-radius:26px;background:linear-gradient(180deg,#fefcff,#fff7ed 62%,#dcfce7 62%);touch-action:manipulation;user-select:none;-webkit-user-select:none;box-shadow:inset 0 -40px 80px rgba(34,197,94,.08)}
      .candyStage::before{content:'';position:absolute;inset:auto 0 0;height:95px;background:linear-gradient(180deg,#86efac,#4ade80)}
      .candyStage::after{content:'😋';position:absolute;left:50%;bottom:30px;transform:translateX(-50%);font-size:76px;filter:drop-shadow(0 10px 12px rgba(15,23,42,.14));pointer-events:none}
      .candyTarget{position:absolute;width:68px;height:68px;border:0;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.94);font-size:38px;box-shadow:0 10px 25px rgba(15,23,42,.16);animation:candyPop .18s ease-out;touch-action:manipulation;z-index:2}
      .candyTarget.bad{background:#fee2e2;box-shadow:0 10px 25px rgba(185,28,28,.18)}
      .candyTarget.gold{box-shadow:0 0 0 5px rgba(250,204,21,.28),0 12px 28px rgba(202,138,4,.22)}
      .candyTarget.hit{animation:candyHit .18s ease-in forwards;pointer-events:none}
      @keyframes candyPop{from{transform:scale(.35) translateY(18px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
      @keyframes candyHit{to{transform:scale(1.55);opacity:0}}
      .candyFloat{position:absolute;z-index:4;font-size:18px;font-weight:1000;color:#166534;pointer-events:none;animation:candyFloat .65s ease-out forwards;text-shadow:0 2px 0 #fff}
      .candyFloat.bad{color:#b91c1c}@keyframes candyFloat{to{transform:translateY(-45px);opacity:0}}
      .candyOverlay{position:absolute;inset:0;z-index:8;display:grid;place-items:center;padding:20px;background:rgba(255,255,255,.72);backdrop-filter:blur(7px)}.candyOverlay[hidden]{display:none!important}
      .candyOverlayCard{max-width:460px;padding:22px;border:1px solid var(--line);border-radius:24px;background:var(--card);text-align:center;box-shadow:0 24px 70px rgba(15,23,42,.16)}.candyOverlayCard b{display:block;font-size:27px}.candyOverlayCard p{margin:9px 0 16px;color:var(--muted);font-size:13px;font-weight:800;line-height:1.7}
      .candyTip{margin-top:10px;padding:11px 13px;border:1px solid var(--line);border-radius:16px;background:var(--card2);color:var(--muted);font-size:12px;font-weight:850;line-height:1.55}
      @media(max-width:620px){.candyHud{grid-template-columns:1fr 1fr}.candyStage{min-height:420px}.candyTarget{width:62px;height:62px;font-size:34px}}
    `;
    document.head.appendChild(style);
  }

  function addCard(){
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if(!grid || document.getElementById('gameCardOpoongCandy')) return;
    const button = document.createElement('button');
    button.className = 'gameCard';
    button.type = 'button';
    button.id = 'gameCardOpoongCandy';
    button.innerHTML = `<span class="gameCover coverOpoongCandy"></span><span class="gameCardInfo"><b>오풍 캔디</b><span id="gameCardOpoongCandyMeta">최고 ${bestScore().toLocaleString()}점</span></span>`;
    button.addEventListener('click', () => window.openMiniGame('opoong-candy'));
    grid.appendChild(button);
  }

  function addPanel(){
    const view = document.getElementById('view-game');
    if(!view || document.getElementById('gameOpoongCandyPanel')) return;
    const shop = document.getElementById('gameColorShop');
    const panel = document.createElement('div');
    panel.id = 'gameOpoongCandyPanel';
    panel.className = 'gamePlayCard miniGamePanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="candyHud">
        <div class="candyStat"><span>남은 시간</span><strong id="candyTime">45초</strong></div>
        <div class="candyStat"><span>점수</span><strong id="candyScore">0점</strong></div>
        <div class="candyStat"><span>콤보</span><strong id="candyCombo">0 COMBO</strong></div>
        <div class="candyStat"><span>목숨</span><strong id="candyLives">❤❤❤</strong></div>
      </div>
      <div class="candyStage" id="candyStage">
        <div class="candyOverlay" id="candyOverlay">
          <div class="candyOverlayCard">
            <b>오풍 캔디 🍬</b>
            <p>튀어나오는 사탕을 빠르게 눌러 점수를 올리세요.<br>연속으로 맞히면 콤보 보너스가 커져요.<br><br>💣 폭탄과 👾 장난꾸러기를 누르면 목숨이 줄어요.</p>
            <button class="bigBtn" id="candyStart" type="button">게임 시작</button>
          </div>
        </div>
      </div>
      <div class="candyTip">🍬 10점 · 🍭 15점 · 🍫 20점 · 🧁 25점 · 🍩 30점 · 황금 사탕은 2배!</div>`;
    if(shop?.parentNode) shop.parentNode.insertBefore(panel, shop); else view.appendChild(panel);
    document.getElementById('candyStart')?.addEventListener('click', startGame);
  }

  function resetState(){
    state = { time:GAME_SECONDS, score:0, combo:0, lives:MAX_LIVES, targets:new Map(), serial:0, ended:false };
    clearTargets();
    updateHud();
  }

  function updateHud(){
    if(!state) return;
    const t = document.getElementById('candyTime');
    const s = document.getElementById('candyScore');
    const c = document.getElementById('candyCombo');
    const l = document.getElementById('candyLives');
    if(t) t.textContent = `${Math.max(0, Math.ceil(state.time))}초`;
    if(s) s.textContent = `${state.score.toLocaleString()}점`;
    if(c) c.textContent = `${state.combo} COMBO`;
    if(l) l.textContent = '❤'.repeat(Math.max(0,state.lives)) + '♡'.repeat(Math.max(0,MAX_LIVES-state.lives));
  }

  function clearTargets(){
    document.querySelectorAll('#candyStage .candyTarget,#candyStage .candyFloat').forEach(el => el.remove());
    state?.targets?.clear?.();
  }

  function spawn(){
    if(!running || !state) return;
    const stage = document.getElementById('candyStage');
    if(!stage) return;
    const rect = stage.getBoundingClientRect();
    const isBad = Math.random() < Math.min(.24, .12 + (GAME_SECONDS-state.time)*.0025);
    const isGold = !isBad && Math.random() < .10;
    const candy = CANDIES[Math.floor(Math.random()*CANDIES.length)];
    const target = document.createElement('button');
    const id = ++state.serial;
    target.type = 'button';
    target.className = `candyTarget${isBad?' bad':''}${isGold?' gold':''}`;
    target.dataset.id = String(id);
    target.textContent = isBad ? (Math.random()<.55?'💣':'👾') : candy.icon;
    const pad = 18;
    const w = Math.max(300, rect.width || 600);
    const h = Math.max(350, rect.height || 470);
    const x = pad + Math.random()*Math.max(10,w-68-pad*2);
    const y = pad + Math.random()*Math.max(10,h-165);
    target.style.left = `${x}px`;
    target.style.top = `${y}px`;
    const lifetime = Math.max(620, 1350 - (GAME_SECONDS-state.time)*9 - state.combo*5);
    const data = { id, target, bad:isBad, gold:isGold, candy, x, y, timeout:0 };
    state.targets.set(id,data);
    target.addEventListener('pointerdown', (e) => { e.preventDefault(); hitTarget(id); });
    stage.appendChild(target);
    data.timeout = setTimeout(() => missTarget(id), lifetime);
  }

  function floatText(x,y,text,bad=false){
    const stage = document.getElementById('candyStage'); if(!stage) return;
    const el = document.createElement('div');
    el.className = `candyFloat${bad?' bad':''}`;
    el.textContent = text;
    el.style.left = `${x}px`; el.style.top = `${y}px`;
    stage.appendChild(el);
    setTimeout(()=>el.remove(),700);
  }

  function removeTarget(data){
    if(!data) return;
    clearTimeout(data.timeout);
    state?.targets?.delete(data.id);
    data.target?.classList.add('hit');
    setTimeout(()=>data.target?.remove(),180);
  }

  function hitTarget(id){
    if(!running || !state) return;
    const data = state.targets.get(id); if(!data) return;
    if(data.bad){
      state.lives--;
      state.combo = 0;
      floatText(data.x,data.y,'-1 ❤',true);
      removeTarget(data);
      updateHud();
      if(state.lives<=0) endGame();
      return;
    }
    state.combo++;
    const comboBonus = Math.min(3, 1 + Math.floor(state.combo/5)*.25);
    const points = Math.round(data.candy.points * comboBonus * (data.gold?2:1));
    state.score += points;
    floatText(data.x,data.y,`+${points}${data.gold?' ✨':''}`);
    removeTarget(data);
    updateHud();
  }

  function missTarget(id){
    if(!state) return;
    const data = state.targets.get(id); if(!data) return;
    if(!data.bad) state.combo = 0;
    state.targets.delete(id);
    data.target?.remove();
    updateHud();
  }

  function startGame(){
    stopGame();
    resetState();
    running = true;
    lastTime = performance.now();
    spawnTimer = 0;
    const overlay = document.getElementById('candyOverlay'); if(overlay) overlay.hidden = true;
    raf = requestAnimationFrame(loop);
  }

  function stopGame(){
    running = false;
    cancelAnimationFrame(raf); raf = 0;
    if(state?.targets) for(const data of state.targets.values()) clearTimeout(data.timeout);
    clearTargets();
  }

  function endGame(){
    if(!running || !state || state.ended) return;
    state.ended = true;
    running = false;
    cancelAnimationFrame(raf); raf = 0;
    for(const data of state.targets.values()) clearTimeout(data.timeout);
    clearTargets();
    saveBest(state.score);
    updateHud();
    const meta = document.getElementById('gameCardOpoongCandyMeta');
    if(meta) meta.textContent = `최고 ${bestScore().toLocaleString()}점`;
    const overlay = document.getElementById('candyOverlay');
    if(overlay){
      overlay.hidden = false;
      overlay.innerHTML = `<div class="candyOverlayCard"><b>${state.score.toLocaleString()}점!</b><p>최고 콤보를 노리면서 더 높은 기록에 도전해보세요.<br>최고 기록 ${bestScore().toLocaleString()}점</p><span class="muted">잠시 후 광고가 표시돼요.</span></div>`;
    }
    setTimeout(()=>{
      if(typeof window.showGameOverAd === 'function') window.showGameOverAd('opoong-candy');
    },350);
  }

  function loop(now){
    if(!running || !state) return;
    const dt = Math.min(.05, Math.max(0,(now-lastTime)/1000));
    lastTime = now;
    state.time -= dt;
    spawnTimer -= dt;
    const elapsed = GAME_SECONDS-state.time;
    const interval = Math.max(.22, .58 - elapsed*.005);
    if(spawnTimer<=0){
      spawn();
      if(Math.random() < Math.min(.4, elapsed/100)) setTimeout(()=>running&&spawn(),80+Math.random()*100);
      spawnTimer = interval;
    }
    if(state.time<=0){ state.time=0; updateHud(); endGame(); return; }
    updateHud();
    raf = requestAnimationFrame(loop);
  }

  function openCandy(){
    try{baseStopActiveMiniGame?.();}catch(_){}
    document.querySelectorAll('#view-game .miniGamePanel').forEach(el=>el.hidden=true);
    const hub=document.getElementById('gameHub'); if(hub)hub.hidden=true;
    const panel=document.getElementById('gameOpoongCandyPanel'); if(panel)panel.hidden=false;
    stopGame(); resetState();
    const overlay=document.getElementById('candyOverlay');
    if(overlay){
      overlay.hidden=false;
      overlay.innerHTML=`<div class="candyOverlayCard"><b>오풍 캔디 🍬</b><p>튀어나오는 사탕을 빠르게 눌러 점수를 올리세요.<br>연속으로 맞히면 콤보 보너스가 커져요.<br><br>💣 폭탄과 👾 장난꾸러기를 누르면 목숨이 줄어요.</p><button class="bigBtn" id="candyStartAgain" type="button">게임 시작</button></div>`;
      document.getElementById('candyStartAgain')?.addEventListener('click',startGame);
    }
    panel?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function wrapGameFunctions(){
    baseOpenMiniGame=window.openMiniGame; baseShowMiniGameHub=window.showMiniGameHub; baseStopActiveMiniGame=window.stopActiveMiniGame;
    if(typeof baseOpenMiniGame!=='function') return false;
    window.openMiniGame=function(game){ if(game==='opoong-candy') return openCandy(); stopGame(); return baseOpenMiniGame.apply(this,arguments); };
    if(typeof baseShowMiniGameHub==='function') window.showMiniGameHub=function(){ stopGame(); const r=baseShowMiniGameHub.apply(this,arguments); const p=document.getElementById('gameOpoongCandyPanel'); if(p)p.hidden=true; return r; };
    if(typeof baseStopActiveMiniGame==='function') window.stopActiveMiniGame=function(){ stopGame(); return baseStopActiveMiniGame.apply(this,arguments); };
    return true;
  }

  function install(){
    if(installed)return;
    if(typeof window.openMiniGame!=='function'||!document.querySelector('#gameHub .gameCardGrid')){setTimeout(install,120);return;}
    installed=true; injectStyles(); addCard(); addPanel(); wrapGameFunctions();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();