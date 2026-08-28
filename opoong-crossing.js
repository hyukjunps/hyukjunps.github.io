(() => {
  'use strict';

  const GAME_ID = 'opoong-crossing';
  const BEST_KEY = 'opoong_crossing_best_v1';
  const TOKEN_KEY = 'opoong_crossing_token_best_v1';
  const COLS = 9;
  const CELL = 72;
  const CANVAS_W = COLS * CELL;
  const CANVAS_H = 720;
  const ROW_H = 64;
  const PLAYER_SIZE = 42;
  const VIEW_ROWS = 12;

  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let raf = 0;
  let running = false;
  let lastTime = 0;
  let state = null;
  let touchStart = null;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (min, max) => min + Math.random() * (max - min);

  function bestScore(){
    const n = Number(localStorage.getItem(BEST_KEY) || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function bestTokens(){
    const n = Number(localStorage.getItem(TOKEN_KEY) || 0);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  }

  function saveBest(score, tokens){
    try{
      localStorage.setItem(BEST_KEY, String(Math.max(bestScore(), Math.floor(score))));
      localStorage.setItem(TOKEN_KEY, String(Math.max(bestTokens(), Math.floor(tokens))));
    }catch(_){ }
  }

  function injectStyles(){
    if(document.getElementById('opoongCrossingStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongCrossingStyles';
    style.textContent = `
      .coverPoongsanCrossing{position:relative;overflow:hidden;background:linear-gradient(180deg,#bfdbfe 0 33%,#86efac 33% 55%,#475569 55% 76%,#60a5fa 76% 100%)}
      .coverPoongsanCrossing::before{content:'🎒';position:absolute;left:20%;bottom:13%;font-size:43px;filter:drop-shadow(0 7px 7px rgba(15,23,42,.18));animation:poongsanCoverHop 1.5s ease-in-out infinite}
      .coverPoongsanCrossing::after{content:'🚌';position:absolute;right:12%;top:42%;font-size:45px;animation:poongsanCoverBus 2.3s linear infinite}
      @keyframes poongsanCoverHop{0%,100%{transform:translateY(0) rotate(-4deg)}50%{transform:translateY(-10px) rotate(4deg)}}
      @keyframes poongsanCoverBus{0%{transform:translateX(58px)}100%{transform:translateX(-150px)}}
      .crossingPanel{max-width:860px;margin:0 auto}
      .crossingHud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}
      .crossingStat{padding:10px 8px;border:1px solid var(--line);border-radius:16px;background:var(--card);text-align:center}
      .crossingStat span{display:block;color:var(--muted);font-size:10px;font-weight:900}.crossingStat strong{display:block;margin-top:4px;font-size:19px;font-weight:1000}
      .crossingStage{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:25px;background:#86efac;box-shadow:0 18px 45px rgba(15,23,42,.09),inset 0 1px 0 rgba(255,255,255,.55);touch-action:none;user-select:none;-webkit-user-select:none}
      #poongsanCrossingCanvas{display:block;width:100%;height:auto;aspect-ratio:${CANVAS_W}/${CANVAS_H};max-height:720px;touch-action:none}
      .crossingOverlay{position:absolute;inset:0;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.33);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);text-align:center;color:#fff}
      .crossingOverlay[hidden]{display:none!important}.crossingOverlayCard{width:min(430px,92%);padding:21px;border-radius:23px;background:rgba(15,23,42,.87);box-shadow:0 25px 70px rgba(0,0,0,.28)}
      .crossingOverlayCard b{display:block;font-size:25px;font-weight:1000;letter-spacing:-.5px}.crossingOverlayCard p{margin:9px 0 0;color:#dbeafe;font-size:12.5px;font-weight:850;line-height:1.7}
      .crossingControls{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:10px;margin-top:12px}
      .crossingPad{display:grid;grid-template-columns:repeat(3,55px);grid-template-rows:repeat(2,50px);gap:7px;justify-content:center}.crossingPad button{border:1px solid var(--line);border-radius:15px;background:var(--card);color:var(--text);font-size:19px;font-weight:1000;box-shadow:0 8px 20px rgba(15,23,42,.06);touch-action:manipulation}.crossingPad button:active{transform:translateY(2px) scale(.97)}
      .crossingPad .up{grid-column:2}.crossingPad .left{grid-column:1;grid-row:2}.crossingPad .down{grid-column:2;grid-row:2}.crossingPad .right{grid-column:3;grid-row:2}
      .crossingHint{color:var(--muted);font-size:11.5px;font-weight:850;line-height:1.65}.crossingHint:last-child{text-align:right}
      .crossingPulse{animation:crossingPulse .42s ease}.crossingShake{animation:crossingShake .35s ease}.crossingFlash{animation:crossingFlash .5s ease}
      @keyframes crossingPulse{0%{transform:scale(.8);opacity:.4}55%{transform:scale(1.14);opacity:1}100%{transform:scale(1)}}
      @keyframes crossingShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}50%{transform:translateX(6px)}75%{transform:translateX(-3px)}}
      @keyframes crossingFlash{0%{box-shadow:inset 0 0 0 0 rgba(250,204,21,0)}50%{box-shadow:inset 0 0 0 12px rgba(250,204,21,.5)}100%{box-shadow:inset 0 0 0 0 rgba(250,204,21,0)}}
      @media(max-width:680px){.crossingHud{grid-template-columns:1fr 1fr}.crossingControls{grid-template-columns:1fr}.crossingHint{text-align:center!important;order:2}.crossingPad{order:1}.crossingPad button{min-width:0}}
      @media(prefers-reduced-motion:reduce){.coverPoongsanCrossing::before,.coverPoongsanCrossing::after{animation:none!important}.crossingPulse,.crossingShake,.crossingFlash{animation:none!important}}
    `;
    document.head.appendChild(style);
  }

  function addCard(){
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if(!grid || document.getElementById('gameCardPoongsanCrossing')) return;
    const button = document.createElement('button');
    button.className = 'gameCard';
    button.type = 'button';
    button.id = 'gameCardPoongsanCrossing';
    button.innerHTML = `<span class="gameCover coverPoongsanCrossing"></span><span class="gameCardInfo"><b>길건너 풍산인</b><span id="gameCardPoongsanCrossingMeta">최고 ${bestScore()}칸</span></span>`;
    button.addEventListener('click', () => window.openMiniGame(GAME_ID));
    grid.appendChild(button);
    try{ window.OpoongGameCount?.refresh?.(); }catch(_){ }
  }

  function addPanel(){
    const view = document.getElementById('view-game');
    if(!view || document.getElementById('gamePoongsanCrossingPanel')) return;
    const shop = document.getElementById('gameColorShop');
    const panel = document.createElement('div');
    panel.id = 'gamePoongsanCrossingPanel';
    panel.className = 'gamePlayCard miniGamePanel crossingPanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="crossingHud">
        <div class="crossingStat"><span>전진</span><strong id="crossingScore">0칸</strong></div>
        <div class="crossingStat"><span>급식 토큰</span><strong id="crossingTokens">0개</strong></div>
        <div class="crossingStat"><span>난이도</span><strong id="crossingLevel">1</strong></div>
        <div class="crossingStat"><span>최고 기록</span><strong id="crossingBest">${bestScore()}칸</strong></div>
      </div>
      <div class="crossingStage" id="poongsanCrossingStage">
        <canvas id="poongsanCrossingCanvas" width="${CANVAS_W}" height="${CANVAS_H}" aria-label="길건너 풍산인 게임"></canvas>
        <div class="crossingOverlay" id="crossingOverlay">
          <div class="crossingOverlayCard">
            <b id="crossingOverlayTitle">길건너 풍산인</b>
            <p id="crossingOverlayText">차량을 피하고, 강에서는 움직이는 발판을 밟아 최대한 앞으로 가세요.<br>방향키 · WASD · 스와이프 · 화면 버튼 지원</p>
          </div>
        </div>
      </div>
      <div class="crossingControls">
        <div class="crossingHint" id="crossingStatus">앞으로 갈수록 차와 발판이 빨라져요.</div>
        <div class="crossingPad" aria-label="이동 버튼">
          <button class="up" type="button" data-crossing-move="up" aria-label="위로 이동">↑</button>
          <button class="left" type="button" data-crossing-move="left" aria-label="왼쪽 이동">←</button>
          <button class="down" type="button" data-crossing-move="down" aria-label="아래로 이동">↓</button>
          <button class="right" type="button" data-crossing-move="right" aria-label="오른쪽 이동">→</button>
        </div>
        <div class="crossingHint">도로는 타이밍, 강은 발판 위치가 핵심!</div>
      </div>`;
    if(shop?.parentNode) shop.parentNode.insertBefore(panel, shop);
    else view.appendChild(panel);

    panel.querySelectorAll('[data-crossing-move]').forEach(btn => {
      btn.addEventListener('pointerdown', e => {
        e.preventDefault();
        movePlayer(btn.dataset.crossingMove);
      });
    });

    const stage = document.getElementById('poongsanCrossingStage');
    stage?.addEventListener('pointerdown', e => {
      touchStart = {x:e.clientX, y:e.clientY};
    });
    stage?.addEventListener('pointerup', e => {
      if(!touchStart) return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      touchStart = null;
      if(Math.max(Math.abs(dx), Math.abs(dy)) < 18) return movePlayer('up');
      if(Math.abs(dx) > Math.abs(dy)) movePlayer(dx > 0 ? 'right' : 'left');
      else movePlayer(dy > 0 ? 'down' : 'up');
    });
    stage?.addEventListener('pointercancel', () => { touchStart = null; });
  }

  function laneType(row){
    if(row <= 1) return 'grass';
    if(row % 12 === 0) return 'grass';
    const phase = row % 9;
    if(phase === 4 || phase === 5) return 'river';
    if(phase === 1 || phase === 2 || phase === 7) return 'road';
    return Math.random() < .42 ? 'road' : 'grass';
  }

  function makeGrass(row){
    const blockers = new Set();
    if(row > 2){
      const count = Math.random() < .55 ? 1 + Math.floor(Math.random() * 3) : 0;
      while(blockers.size < count){
        const c = Math.floor(Math.random() * COLS);
        if(c !== 4) blockers.add(c);
      }
    }
    return {row, type:'grass', blockers, token:Math.random() < .18 ? Math.floor(Math.random() * COLS) : -1, taken:false};
  }

  function makeRoad(row){
    const dir = Math.random() < .5 ? -1 : 1;
    const level = 1 + Math.floor(row / 10);
    const speed = (85 + Math.min(145, level * 9) + rand(0, 55)) * dir;
    const vehicleCount = 2 + (Math.random() < .45 ? 1 : 0);
    const vehicles = [];
    const gap = CANVAS_W / vehicleCount;
    for(let i=0;i<vehicleCount;i++){
      const bus = Math.random() < Math.min(.12 + row / 260, .34);
      const w = bus ? rand(112, 145) : rand(72, 96);
      vehicles.push({
        x: i * gap + rand(-45,45),
        w,
        h: bus ? 38 : 31,
        bus,
        hue: [12,38,205,222,338][Math.floor(Math.random()*5)]
      });
    }
    return {row, type:'road', dir, speed, vehicles, token:Math.random() < .12 ? Math.floor(Math.random()*COLS) : -1, taken:false};
  }

  function makeRiver(row){
    const dir = Math.random() < .5 ? -1 : 1;
    const level = 1 + Math.floor(row / 11);
    const speed = (42 + Math.min(82, level * 5) + rand(0, 24)) * dir;
    const platforms = [];
    const count = 3 + (Math.random() < .35 ? 1 : 0);
    const gap = CANVAS_W / count;
    for(let i=0;i<count;i++){
      const lily = Math.random() < .28;
      platforms.push({x:i*gap + rand(-55,35), w:lily ? 62 : rand(105,150), h:lily ? 32 : 35, lily});
    }
    return {row, type:'river', dir, speed, platforms, token:-1, taken:true};
  }

  function makeLane(row){
    const type = laneType(row);
    if(type === 'road') return makeRoad(row);
    if(type === 'river') return makeRiver(row);
    return makeGrass(row);
  }

  function ensureLanes(from, to){
    if(!state) return;
    for(let row=from; row<=to; row++){
      if(!state.lanes.has(row)) state.lanes.set(row, makeLane(row));
    }
    for(const key of Array.from(state.lanes.keys())) if(key < from - 5) state.lanes.delete(key);
  }

  function newState(){
    const s = {
      started:false,
      over:false,
      reason:'',
      player:{col:4,row:0,x:4*CELL + CELL/2,y:0,fromX:0,fromY:0,toX:0,toY:0,hop:1,hopTime:0,hopDuration:.13,onPlatform:null},
      lanes:new Map(),
      maxRow:0,
      tokens:0,
      cameraRow:0,
      cameraTarget:0,
      particles:[],
      elapsed:0,
      level:1,
      invincible:.55
    };
    state = s;
    ensureLanes(0, VIEW_ROWS + 7);
    snapPlayerWorld();
    return s;
  }

  function laneScreenY(row){
    return CANVAS_H - 96 - (row - state.cameraRow) * ROW_H;
  }

  function playerWorldY(row){
    return CANVAS_H - 96 - row * ROW_H;
  }

  function snapPlayerWorld(){
    if(!state) return;
    const p = state.player;
    p.x = p.col * CELL + CELL/2;
    p.y = playerWorldY(p.row);
    p.fromX = p.toX = p.x;
    p.fromY = p.toY = p.y;
  }

  function resetGame(){
    cancelAnimationFrame(raf);
    running = false;
    lastTime = 0;
    newState();
    updateHud();
    const overlay = document.getElementById('crossingOverlay');
    if(overlay) overlay.hidden = false;
    const title = document.getElementById('crossingOverlayTitle');
    const text = document.getElementById('crossingOverlayText');
    if(title) title.textContent = '길건너 풍산인';
    if(text) text.innerHTML = '차량을 피하고, 강에서는 움직이는 발판을 밟아 최대한 앞으로 가세요.<br>방향키 · WASD · 스와이프 · 화면 버튼 지원';
    const status = document.getElementById('crossingStatus');
    if(status) status.textContent = '앞으로 갈수록 차와 발판이 빨라져요.';
    draw();
  }

  function startGame(){
    if(!state || state.over) resetGame();
    if(state.started) return;
    state.started = true;
    const overlay = document.getElementById('crossingOverlay');
    if(overlay) overlay.hidden = true;
    running = true;
    lastTime = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function targetBlocked(row, col){
    const lane = state?.lanes.get(row);
    return Boolean(lane?.type === 'grass' && lane.blockers?.has(col));
  }

  function movePlayer(direction){
    if(!state || state.over) startGame();
    if(!state?.started) startGame();
    if(state.over || state.player.hop < 1) return;
    const p = state.player;
    let col = p.col, row = p.row;
    if(direction === 'up') row += 1;
    else if(direction === 'down') row -= 1;
    else if(direction === 'left') col -= 1;
    else if(direction === 'right') col += 1;
    col = clamp(col, 0, COLS - 1);
    row = Math.max(0, row);
    if(col === p.col && row === p.row) return;
    ensureLanes(Math.max(0,row-3), row + VIEW_ROWS + 8);
    if(targetBlocked(row,col)){
      pulseStage('crossingShake');
      const status = document.getElementById('crossingStatus');
      if(status) status.textContent = '나무가 길을 막고 있어요!';
      return;
    }

    p.fromX = p.x;
    p.fromY = p.y;
    p.col = col;
    p.row = row;
    p.toX = col * CELL + CELL/2;
    p.toY = playerWorldY(row);
    p.hop = 0;
    p.hopTime = 0;
    p.onPlatform = null;
    if(row > state.maxRow){
      state.maxRow = row;
      state.cameraTarget = Math.max(0, row - 5);
      state.level = 1 + Math.floor(row / 12);
      spawnDust(p.x, laneScreenY(row) + 24, '#dcfce7', 5);
    }
    collectToken();
    updateHud();
  }

  function collectToken(){
    if(!state) return;
    const lane = state.lanes.get(state.player.row);
    if(!lane || lane.taken || lane.token !== state.player.col) return;
    lane.taken = true;
    state.tokens += 1;
    pulseStage('crossingFlash');
    spawnDust(state.player.x, laneScreenY(state.player.row), '#facc15', 14);
    updateHud();
    const status = document.getElementById('crossingStatus');
    if(status) status.textContent = '급식 토큰 +1!';
  }

  function spawnDust(x, y, color, count){
    if(!state) return;
    for(let i=0;i<count;i++) state.particles.push({x,y,vx:rand(-70,70),vy:rand(-95,-25),life:rand(.35,.65),max:1,color,r:rand(2,5)});
  }

  function pulseStage(cls){
    const stage = document.getElementById('poongsanCrossingStage');
    if(!stage) return;
    stage.classList.remove(cls);
    void stage.offsetWidth;
    stage.classList.add(cls);
    setTimeout(() => stage.classList.remove(cls), 650);
  }

  function overlap(ax, aw, bx, bw){
    return ax < bx + bw && ax + aw > bx;
  }

  function currentPlayerRect(){
    const p = state.player;
    const sx = p.x - PLAYER_SIZE/2;
    const sy = laneScreenY(p.row) - PLAYER_SIZE + 23;
    return {x:sx+7,y:sy+8,w:PLAYER_SIZE-14,h:PLAYER_SIZE-12};
  }

  function checkLaneDanger(dt){
    if(!state?.started || state.over || state.invincible > 0 || state.player.hop < .82) return;
    const p = state.player;
    const lane = state.lanes.get(p.row);
    if(!lane) return;
    const rect = currentPlayerRect();

    if(lane.type === 'road'){
      const y = laneScreenY(lane.row);
      for(const v of lane.vehicles){
        const h = v.h;
        const vy = y - h/2 + 4;
        if(rect.y < vy + h && rect.y + rect.h > vy && overlap(rect.x, rect.w, v.x, v.w)){
          endGame('vehicle');
          return;
        }
      }
    }else if(lane.type === 'river'){
      let platform = null;
      for(const item of lane.platforms){
        if(overlap(rect.x + 5, rect.w - 10, item.x, item.w)) { platform = item; break; }
      }
      if(!platform){
        endGame('water');
        return;
      }
      p.onPlatform = platform;
      p.x += lane.speed * dt;
      p.toX += lane.speed * dt;
      const colFloat = (p.x - CELL/2) / CELL;
      p.col = clamp(Math.round(colFloat),0,COLS-1);
      if(p.x < PLAYER_SIZE*.35 || p.x > CANVAS_W - PLAYER_SIZE*.35) endGame('water');
    }else{
      p.onPlatform = null;
    }
  }

  function updateLanes(dt){
    const min = Math.max(0, Math.floor(state.cameraRow) - 3);
    const max = Math.ceil(state.cameraRow) + VIEW_ROWS + 7;
    ensureLanes(min,max);
    for(const lane of state.lanes.values()){
      if(lane.type === 'road'){
        for(const v of lane.vehicles){
          v.x += lane.speed * dt;
          if(lane.speed > 0 && v.x > CANVAS_W + 55) v.x = -v.w - rand(45,130);
          if(lane.speed < 0 && v.x + v.w < -55) v.x = CANVAS_W + rand(45,130);
        }
      }else if(lane.type === 'river'){
        for(const p of lane.platforms){
          p.x += lane.speed * dt;
          if(lane.speed > 0 && p.x > CANVAS_W + 55) p.x = -p.w - rand(30,105);
          if(lane.speed < 0 && p.x + p.w < -55) p.x = CANVAS_W + rand(30,105);
        }
      }
    }
  }

  function updatePlayer(dt){
    const p = state.player;
    if(p.hop < 1){
      p.hopTime += dt;
      p.hop = clamp(p.hopTime / p.hopDuration,0,1);
      const t = 1 - Math.pow(1-p.hop,3);
      p.x = p.fromX + (p.toX - p.fromX) * t;
      p.y = p.fromY + (p.toY - p.fromY) * t;
      if(p.hop >= 1){ p.x = p.toX; p.y = p.toY; collectToken(); }
    }
  }

  function updateParticles(dt){
    for(const p of state.particles){p.x += p.vx*dt;p.y += p.vy*dt;p.vy += 150*dt;p.life -= dt;}
    state.particles = state.particles.filter(p => p.life > 0);
  }

  function update(dt){
    if(!state?.started || state.over) return;
    state.elapsed += dt;
    state.invincible = Math.max(0,state.invincible-dt);
    state.cameraRow += (state.cameraTarget - state.cameraRow) * Math.min(1,dt*7.5);
    updateLanes(dt);
    updatePlayer(dt);
    checkLaneDanger(dt);
    updateParticles(dt);
  }

  function endGame(reason){
    if(!state || state.over) return;
    state.over = true;
    state.reason = reason;
    running = false;
    cancelAnimationFrame(raf);
    saveBest(state.maxRow,state.tokens);
    updateHud();
    pulseStage('crossingShake');
    spawnDust(state.player.x,laneScreenY(state.player.row),'#ffffff',18);
    draw();
    const overlay = document.getElementById('crossingOverlay');
    const title = document.getElementById('crossingOverlayTitle');
    const text = document.getElementById('crossingOverlayText');
    if(overlay) overlay.hidden = false;
    if(title) title.textContent = `${state.maxRow}칸 전진!`;
    const reasonText = reason === 'water' ? '발판을 놓쳤어요.' : '차량과 닿았어요.';
    if(text) text.innerHTML = `${reasonText}<br>급식 토큰 ${state.tokens}개 · 최고 ${bestScore()}칸`;
    const meta = document.getElementById('gameCardPoongsanCrossingMeta');
    if(meta) meta.textContent = `최고 ${bestScore()}칸`;
    setTimeout(() => {
      window.OpoongGameResults?.show(GAME_ID, {
        title:'길건너 풍산인',
        primaryLabel:'전진',
        primaryValue:`${state.maxRow}칸`,
        stats:[
          {label:'급식 토큰', value:`${state.tokens}개`},
          {label:'난이도', value:`Lv.${state.level}`},
          {label:'최고 기록', value:`${bestScore()}칸`}
        ]
      });
    },260);
  }

  function updateHud(){
    const score = document.getElementById('crossingScore');
    const tokens = document.getElementById('crossingTokens');
    const level = document.getElementById('crossingLevel');
    const best = document.getElementById('crossingBest');
    if(score) score.textContent = `${state?.maxRow || 0}칸`;
    if(tokens) tokens.textContent = `${state?.tokens || 0}개`;
    if(level) level.textContent = `Lv.${state?.level || 1}`;
    if(best) best.textContent = `${bestScore()}칸`;
  }

  function rounded(ctx,x,y,w,h,r){
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(x,y,w,h,r); else ctx.rect(x,y,w,h);
    ctx.fill();
  }

  function drawGrass(ctx,lane,y){
    ctx.fillStyle = lane.row % 12 === 0 ? '#4ade80' : '#86efac';
    ctx.fillRect(0,y-ROW_H/2,CANVAS_W,ROW_H+1);
    ctx.fillStyle='rgba(255,255,255,.12)';
    for(let x=15;x<CANVAS_W;x+=58){ctx.fillRect(x,y+19,8,3);}
    if(lane.row % 12 === 0){
      ctx.fillStyle='rgba(255,255,255,.8)';ctx.font='900 12px system-ui';ctx.textAlign='left';ctx.fillText(`체크포인트 ${lane.row}`,10,y+5);
    }
    for(const c of lane.blockers || []){
      const x=c*CELL + CELL/2;
      ctx.fillStyle='#166534';ctx.beginPath();ctx.arc(x,y-4,19,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#15803d';ctx.beginPath();ctx.arc(x-9,y-9,15,0,Math.PI*2);ctx.arc(x+10,y-11,16,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#7c2d12';ctx.fillRect(x-4,y+8,8,15);
    }
  }

  function drawRoad(ctx,lane,y){
    ctx.fillStyle='#475569';ctx.fillRect(0,y-ROW_H/2,CANVAS_W,ROW_H+1);
    ctx.strokeStyle='rgba(255,255,255,.58)';ctx.lineWidth=3;ctx.setLineDash([18,17]);ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(CANVAS_W,y);ctx.stroke();ctx.setLineDash([]);
    for(const v of lane.vehicles){
      const top=y-v.h/2+2;
      ctx.fillStyle=`hsl(${v.hue} 78% 55%)`;rounded(ctx,v.x,top,v.w,v.h,9);
      ctx.fillStyle='rgba(255,255,255,.72)';rounded(ctx,v.x+10,top+6,Math.max(16,v.w*.23),10,4);rounded(ctx,v.x+v.w-32,top+6,22,10,4);
      ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(v.x+17,top+v.h,7,0,Math.PI*2);ctx.arc(v.x+v.w-17,top+v.h,7,0,Math.PI*2);ctx.fill();
      if(v.bus){ctx.fillStyle='#fff';ctx.font='900 10px system-ui';ctx.textAlign='center';ctx.fillText('BUS',v.x+v.w/2,top+v.h-7);}
    }
  }

  function drawRiver(ctx,lane,y){
    const grad=ctx.createLinearGradient(0,y-ROW_H/2,0,y+ROW_H/2);grad.addColorStop(0,'#38bdf8');grad.addColorStop(1,'#2563eb');ctx.fillStyle=grad;ctx.fillRect(0,y-ROW_H/2,CANVAS_W,ROW_H+1);
    ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;for(let x=-20;x<CANVAS_W;x+=55){ctx.beginPath();ctx.arc(x,y+10,19,Math.PI*.1,Math.PI*.9);ctx.stroke();}
    for(const p of lane.platforms){
      if(p.lily){ctx.fillStyle='#22c55e';ctx.beginPath();ctx.ellipse(p.x+p.w/2,y,p.w/2,p.h/2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#dcfce7';ctx.beginPath();ctx.arc(p.x+p.w*.62,y-3,5,0,Math.PI*2);ctx.fill();}
      else{ctx.fillStyle='#92400e';rounded(ctx,p.x,y-p.h/2,p.w,p.h,17);ctx.fillStyle='#b45309';ctx.fillRect(p.x+14,y-2,Math.max(5,p.w-28),4);ctx.fillStyle='#fbbf24';ctx.beginPath();ctx.arc(p.x+9,y,6,0,Math.PI*2);ctx.fill();}
    }
  }

  function drawToken(ctx,lane,y){
    if(lane.taken || lane.token < 0) return;
    const x=lane.token*CELL + CELL/2;
    ctx.save();ctx.translate(x,y-3);ctx.rotate(state.elapsed*2.4);ctx.fillStyle='#facc15';ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2?7:14;const px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.fill();ctx.restore();
  }

  function drawPlayer(ctx){
    const p=state.player;
    const y=laneScreenY(p.row);
    const hopLift=p.hop<1?Math.sin(p.hop*Math.PI)*18:0;
    const x=p.x;
    ctx.save();ctx.translate(x,y-hopLift);
    ctx.fillStyle='rgba(15,23,42,.18)';ctx.beginPath();ctx.ellipse(0,23+hopLift,21,8,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#1d4ed8';rounded(ctx,-18,-24,36,42,10);
    ctx.fillStyle='#0f172a';rounded(ctx,-15,16,11,17,4);rounded(ctx,4,16,11,17,4);
    ctx.fillStyle='#f8fafc';rounded(ctx,-13,-17,26,18,8);
    ctx.fillStyle='#0f172a';ctx.beginPath();ctx.arc(-5,-8,2.2,0,Math.PI*2);ctx.arc(5,-8,2.2,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#f97316';rounded(ctx,15,-13,12,31,5);
    ctx.fillStyle='#fff';ctx.font='1000 9px system-ui';ctx.textAlign='center';ctx.fillText('풍산',0,10);
    ctx.restore();
  }

  function drawParticles(ctx){
    for(const p of state.particles){ctx.globalAlpha=clamp(p.life/.55,0,1);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
  }

  function draw(){
    const canvas=document.getElementById('poongsanCrossingCanvas');
    if(!canvas || !state) return;
    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
    ctx.fillStyle='#86efac';ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
    const min=Math.max(0,Math.floor(state.cameraRow)-2);
    const max=Math.ceil(state.cameraRow)+VIEW_ROWS+3;
    ensureLanes(min,max);
    for(let row=max;row>=min;row--){
      const lane=state.lanes.get(row);if(!lane)continue;const y=laneScreenY(row);if(y<-ROW_H||y>CANVAS_H+ROW_H)continue;
      if(lane.type==='road')drawRoad(ctx,lane,y);else if(lane.type==='river')drawRiver(ctx,lane,y);else drawGrass(ctx,lane,y);
      drawToken(ctx,lane,y);
    }
    drawParticles(ctx);
    drawPlayer(ctx);
    const grad=ctx.createLinearGradient(0,0,0,70);grad.addColorStop(0,'rgba(15,23,42,.22)');grad.addColorStop(1,'rgba(15,23,42,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,CANVAS_W,80);
  }

  function loop(now){
    if(!running || !state || state.over) return;
    if(!lastTime) lastTime=now;
    const dt=Math.min(.04,Math.max(0,(now-lastTime)/1000));
    lastTime=now;
    update(dt);
    draw();
    if(running) raf=requestAnimationFrame(loop);
  }

  function bindKeys(){
    if(window.__opoongCrossingKeysBound) return;
    window.__opoongCrossingKeysBound=true;
    window.addEventListener('keydown', e => {
      const panel=document.getElementById('gamePoongsanCrossingPanel');
      const view=document.getElementById('view-game');
      if(!panel || panel.hidden || !view?.classList.contains('active')) return;
      const map={ArrowUp:'up',KeyW:'up',ArrowDown:'down',KeyS:'down',ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right'};
      const dir=map[e.code]||map[e.key];
      if(!dir)return;e.preventDefault();movePlayer(dir);
    });
  }

  function showGame(){
    document.querySelectorAll('#view-game .miniGamePanel').forEach(el => el.hidden=true);
    const hub=document.getElementById('gameHub');if(hub)hub.hidden=true;
    const top=document.getElementById('miniGameTopbar');if(top)top.hidden=false;
    const title=document.getElementById('miniGameTitle');if(title)title.textContent='길건너 풍산인';
    const panel=document.getElementById('gamePoongsanCrossingPanel');if(panel)panel.hidden=false;
    panel?.scrollIntoView({behavior:'smooth',block:'start'});
    resetGame();
  }

  function stopGame(){
    running=false;cancelAnimationFrame(raf);raf=0;lastTime=0;touchStart=null;
  }

  function wrapGameFunctions(){
    if(window.openMiniGame?.__opoongCrossingWrapped) return true;
    baseOpenMiniGame=window.openMiniGame;
    baseShowMiniGameHub=window.showMiniGameHub;
    baseStopActiveMiniGame=window.stopActiveMiniGame;
    if(typeof baseOpenMiniGame!=='function') return false;

    const wrappedOpen=function(game){
      if(game===GAME_ID){stopGame();showGame();return;}
      stopGame();return baseOpenMiniGame.apply(this,arguments);
    };
    wrappedOpen.__opoongCrossingWrapped=true;
    wrappedOpen.__original=baseOpenMiniGame;
    window.openMiniGame=wrappedOpen;

    if(typeof baseShowMiniGameHub==='function') window.showMiniGameHub=function(){
      stopGame();const panel=document.getElementById('gamePoongsanCrossingPanel');if(panel)panel.hidden=true;return baseShowMiniGameHub.apply(this,arguments);
    };
    if(typeof baseStopActiveMiniGame==='function') window.stopActiveMiniGame=function(){stopGame();return baseStopActiveMiniGame.apply(this,arguments);};
    return true;
  }

  function install(){
    if(installed) return;
    if(typeof window.openMiniGame!=='function' || !document.querySelector('#gameHub .gameCardGrid')){setTimeout(install,120);return;}
    installed=true;
    injectStyles();
    addCard();
    addPanel();
    bindKeys();
    wrapGameFunctions();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
