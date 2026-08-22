(() => {
  'use strict';

  const BRICK_BEST_KEY = 'opoong_brick_best_v1';
  const TETRIS_BEST_KEY = 'opoong_tetris_best_v1';
  const CLASSIC_GAMES = new Set(['brick', 'tetris']);

  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let baseRenderGameLibraryStats = null;

  /* ----------------------------- common ----------------------------- */
  function safeNumber(value, fallback = 0){
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function loadBest(key){
    try{return Math.max(0, Math.floor(safeNumber(localStorage.getItem(key), 0)));}
    catch(_){return 0;}
  }

  function saveBest(key, value){
    try{localStorage.setItem(key, String(Math.max(0, Math.floor(safeNumber(value, 0)))));}
    catch(_){ }
  }

  function panelVisible(id){
    const panel = document.getElementById(id);
    const gameView = document.getElementById('view-game');
    return Boolean(panel && !panel.hidden && gameView && gameView.classList.contains('active'));
  }

  function injectStyles(){
    if(document.getElementById('opoongClassicGameStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongClassicGameStyles';
    style.textContent = `
      .coverBrick{position:relative;overflow:hidden;background:linear-gradient(160deg,#dbeafe,#eff6ff 55%,#e0e7ff)}
      .coverBrick::before{content:'';position:absolute;left:14%;right:14%;top:18%;height:42%;background:repeating-linear-gradient(90deg,#2563eb 0 28px,#60a5fa 28px 56px);border-radius:9px;box-shadow:0 15px 0 #8b5cf6,0 30px 0 #f59e0b}
      .coverBrick::after{content:'';position:absolute;left:31%;right:31%;bottom:16%;height:8px;border-radius:999px;background:#0f172a;box-shadow:39px -35px 0 -11px #ef4444}
      .coverTetris{position:relative;overflow:hidden;background:linear-gradient(145deg,#111827,#1e293b)}
      .coverTetris::before{content:'';position:absolute;width:25px;height:25px;left:28%;top:24%;background:#38bdf8;box-shadow:25px 0 #38bdf8,50px 0 #22c55e,50px 25px #22c55e,25px 50px #f59e0b,50px 50px #f59e0b,75px 50px #f59e0b,25px 75px #a855f7,50px 75px #a855f7,50px 100px #a855f7,75px 100px #ef4444}
      .classicGamePanel{max-width:940px;margin:0 auto}
      .classicStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:12px}
      .classicStat{padding:12px;border:1px solid var(--line);border-radius:17px;background:color-mix(in srgb,var(--card) 95%,var(--bg));text-align:center}
      .classicStat span{display:block;color:var(--muted);font-size:10.5px;font-weight:900}.classicStat strong{display:block;margin-top:4px;font-size:20px;font-weight:1000}
      .classicStage{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:color-mix(in srgb,var(--card) 94%,var(--bg));box-shadow:inset 0 1px 0 rgba(255,255,255,.45)}
      .classicCanvas{display:block;width:100%;height:auto;touch-action:none;outline:none}
      .classicControls{display:flex;align-items:center;justify-content:center;gap:9px;flex-wrap:wrap;margin-top:12px}
      .classicCtrl{min-width:58px;min-height:48px;padding:9px 14px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text);font-size:18px;font-weight:1000;box-shadow:0 8px 20px rgba(15,23,42,.06);touch-action:manipulation}
      .classicCtrl.primary{min-width:120px;background:linear-gradient(135deg,var(--pri),var(--pri2));border-color:transparent;color:#fff}
      .classicHint{margin-top:10px;color:var(--muted);font-size:11.5px;font-weight:850;line-height:1.6;text-align:center}
      .classicStatus{margin-top:10px;min-height:22px;text-align:center;color:var(--muted);font-size:12px;font-weight:900}
      .tetrisLayout{display:grid;grid-template-columns:minmax(220px,360px) minmax(150px,1fr);gap:14px;align-items:start;justify-content:center}
      .tetrisBoardWrap{max-width:360px;margin:0 auto;background:#0f172a;border-radius:22px;overflow:hidden;border:1px solid color-mix(in srgb,var(--line) 60%,#334155)}
      .tetrisSide{display:grid;gap:10px}
      .tetrisNextBox{padding:13px;border:1px solid var(--line);border-radius:18px;background:var(--card);text-align:center}
      .tetrisNextBox span{display:block;color:var(--muted);font-size:11px;font-weight:900;margin-bottom:8px}
      #tetrisNextCanvas{display:block;width:112px;height:112px;margin:auto;border-radius:14px;background:#0f172a}
      .tetrisHelp{padding:13px;border:1px solid var(--line);border-radius:18px;background:color-mix(in srgb,var(--card) 94%,var(--bg));color:var(--muted);font-size:11.5px;font-weight:850;line-height:1.7}
      @media(max-width:700px){
        .classicStats{grid-template-columns:1fr 1fr}.tetrisLayout{grid-template-columns:1fr}.tetrisSide{grid-template-columns:130px 1fr}.tetrisBoardWrap{width:min(100%,330px)}
      }
      @media(max-width:430px){.tetrisSide{grid-template-columns:1fr}.classicCtrl{min-width:52px;padding-inline:11px}.classicCtrl.primary{min-width:105px}}
    `;
    document.head.appendChild(style);
  }

  function addCards(){
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if(!grid) return false;

    if(!document.getElementById('gameCardBrick')){
      const button = document.createElement('button');
      button.className = 'gameCard';
      button.type = 'button';
      button.id = 'gameCardBrick';
      button.innerHTML = `<span class="gameCover coverBrick"></span><span class="gameCardInfo"><b>벽돌깨기</b><span id="gameCardBrickMeta">최고 ${loadBest(BRICK_BEST_KEY).toLocaleString('ko-KR')}점</span></span>`;
      button.addEventListener('click', () => window.openMiniGame('brick'));
      grid.appendChild(button);
    }

    if(!document.getElementById('gameCardTetris')){
      const button = document.createElement('button');
      button.className = 'gameCard';
      button.type = 'button';
      button.id = 'gameCardTetris';
      button.innerHTML = `<span class="gameCover coverTetris"></span><span class="gameCardInfo"><b>테트리스</b><span id="gameCardTetrisMeta">최고 ${loadBest(TETRIS_BEST_KEY).toLocaleString('ko-KR')}점</span></span>`;
      button.addEventListener('click', () => window.openMiniGame('tetris'));
      grid.appendChild(button);
    }
    return true;
  }

  function addPanels(){
    const gameView = document.getElementById('view-game');
    if(!gameView) return false;
    const anchor = document.getElementById('gameColorShop') || gameView.lastElementChild;

    if(!document.getElementById('gameBrickPanel')){
      const panel = document.createElement('div');
      panel.id = 'gameBrickPanel';
      panel.className = 'gamePlayCard miniGamePanel classicGamePanel';
      panel.hidden = true;
      panel.innerHTML = `
        <div class="classicStats">
          <div class="classicStat"><span>점수</span><strong id="brickScore">0</strong></div>
          <div class="classicStat"><span>스테이지</span><strong id="brickStage">1</strong></div>
          <div class="classicStat"><span>남은 공</span><strong id="brickLives">3</strong></div>
          <div class="classicStat"><span>최고 점수</span><strong id="brickBest">${loadBest(BRICK_BEST_KEY).toLocaleString('ko-KR')}</strong></div>
        </div>
        <div class="classicStage"><canvas id="brickCanvas" class="classicCanvas" width="800" height="520" tabindex="0" aria-label="벽돌깨기 게임"></canvas></div>
        <div class="classicControls">
          <button id="brickLeft" class="classicCtrl" type="button" aria-label="왼쪽 이동">←</button>
          <button id="brickLaunch" class="classicCtrl primary" type="button">공 발사</button>
          <button id="brickRight" class="classicCtrl" type="button" aria-label="오른쪽 이동">→</button>
          <button id="brickRestart" class="classicCtrl" type="button" hidden>다시 하기</button>
        </div>
        <div id="brickStatus" class="classicStatus">패들을 움직이고 공 발사를 눌러 시작하세요.</div>
        <div class="classicHint">키보드 ← → · Space 또는 화면 드래그 지원 · 한 판에 공 3개</div>`;
      if(anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor); else gameView.appendChild(panel);
    }

    if(!document.getElementById('gameTetrisPanel')){
      const panel = document.createElement('div');
      panel.id = 'gameTetrisPanel';
      panel.className = 'gamePlayCard miniGamePanel classicGamePanel';
      panel.hidden = true;
      panel.innerHTML = `
        <div class="classicStats">
          <div class="classicStat"><span>점수</span><strong id="tetrisScore">0</strong></div>
          <div class="classicStat"><span>라인</span><strong id="tetrisLines">0</strong></div>
          <div class="classicStat"><span>레벨</span><strong id="tetrisLevel">1</strong></div>
          <div class="classicStat"><span>최고 점수</span><strong id="tetrisBest">${loadBest(TETRIS_BEST_KEY).toLocaleString('ko-KR')}</strong></div>
        </div>
        <div class="tetrisLayout">
          <div class="tetrisBoardWrap"><canvas id="tetrisCanvas" class="classicCanvas" width="300" height="600" tabindex="0" aria-label="테트리스 게임"></canvas></div>
          <div class="tetrisSide">
            <div class="tetrisNextBox"><span>다음 블록</span><canvas id="tetrisNextCanvas" width="112" height="112"></canvas></div>
            <div class="tetrisHelp">← → 이동<br>↑ / 탭 회전<br>↓ 한 칸 내리기<br>Space 즉시 내리기<br><br>10줄마다 레벨이 올라가고 낙하 속도가 빨라져요.</div>
          </div>
        </div>
        <div class="classicControls">
          <button id="tetrisLeft" class="classicCtrl" type="button" aria-label="왼쪽 이동">←</button>
          <button id="tetrisRotate" class="classicCtrl" type="button" aria-label="회전">↻</button>
          <button id="tetrisRight" class="classicCtrl" type="button" aria-label="오른쪽 이동">→</button>
          <button id="tetrisDown" class="classicCtrl" type="button" aria-label="아래 이동">↓</button>
          <button id="tetrisDrop" class="classicCtrl primary" type="button">DROP</button>
          <button id="tetrisRestart" class="classicCtrl" type="button" hidden>다시 하기</button>
        </div>
        <div id="tetrisStatus" class="classicStatus">게임이 시작됐어요.</div>`;
      if(anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor); else gameView.appendChild(panel);
    }
    return true;
  }

  /* --------------------------- brick breaker --------------------------- */
  const brickKeys = new Set();
  let brickRaf = 0;
  let brickRunning = false;
  let brickLast = 0;
  let brickState = null;

  function brickPalette(){
    return ['#2563eb','#3b82f6','#8b5cf6','#ec4899','#f59e0b','#22c55e','#06b6d4'];
  }

  function createBrickRows(stage){
    const cols = 10;
    const rows = Math.min(8, 4 + stage);
    const gap = 8;
    const margin = 35;
    const width = (800 - margin * 2 - gap * (cols - 1)) / cols;
    const height = 24;
    const items = [];
    for(let r=0;r<rows;r++){
      for(let c=0;c<cols;c++){
        items.push({x:margin + c * (width + gap), y:55 + r * 34, w:width, h:height, alive:true, row:r});
      }
    }
    return items;
  }

  function freshBrickState(){
    return {
      score:0,
      stage:1,
      lives:3,
      paddle:{x:335,y:480,w:130,h:16},
      ball:{x:400,y:458,r:9,vx:245,vy:-320,launched:false},
      bricks:createBrickRows(1),
      ended:false,
      won:false
    };
  }

  function resetBrickBall(){
    if(!brickState) return;
    const speed = 310 + brickState.stage * 28;
    brickState.ball.x = brickState.paddle.x + brickState.paddle.w / 2;
    brickState.ball.y = brickState.paddle.y - 13;
    brickState.ball.vx = (Math.random() < .5 ? -1 : 1) * (220 + brickState.stage * 15);
    brickState.ball.vy = -speed;
    brickState.ball.launched = false;
  }

  function resetBrickGame(){
    cancelAnimationFrame(brickRaf);
    brickState = freshBrickState();
    brickRunning = true;
    brickLast = performance.now();
    brickKeys.clear();
    const restart = document.getElementById('brickRestart');
    if(restart) restart.hidden = true;
    const launch = document.getElementById('brickLaunch');
    if(launch){ launch.hidden = false; launch.textContent = '공 발사'; }
    const status = document.getElementById('brickStatus');
    if(status) status.textContent = '패들을 움직이고 공 발사를 눌러 시작하세요.';
    updateBrickHud();
    drawBrick();
    brickRaf = requestAnimationFrame(brickLoop);
  }

  function launchBrick(){
    if(!brickState || brickState.ended) return;
    brickState.ball.launched = true;
    const launch = document.getElementById('brickLaunch');
    if(launch) launch.textContent = '진행 중';
    const status = document.getElementById('brickStatus');
    if(status) status.textContent = `스테이지 ${brickState.stage} 진행 중`;
    document.getElementById('brickCanvas')?.focus({preventScroll:true});
  }

  function updateBrickHud(){
    if(!brickState) return;
    const best = Math.max(loadBest(BRICK_BEST_KEY), brickState.score);
    const pairs = [
      ['brickScore', brickState.score.toLocaleString('ko-KR')],
      ['brickStage', String(brickState.stage)],
      ['brickLives', String(brickState.lives)],
      ['brickBest', best.toLocaleString('ko-KR')]
    ];
    pairs.forEach(([id,value]) => { const el=document.getElementById(id); if(el) el.textContent=value; });
    const meta = document.getElementById('gameCardBrickMeta');
    if(meta) meta.textContent = `최고 ${best.toLocaleString('ko-KR')}점`;
  }

  function endBrick(won){
    if(!brickState || brickState.ended) return;
    brickState.ended = true;
    brickState.won = Boolean(won);
    brickRunning = false;
    cancelAnimationFrame(brickRaf);
    const best = loadBest(BRICK_BEST_KEY);
    if(brickState.score > best) saveBest(BRICK_BEST_KEY, brickState.score);
    updateBrickHud();
    const status = document.getElementById('brickStatus');
    if(status) status.textContent = won ? `전 스테이지 클리어! ${brickState.score.toLocaleString('ko-KR')}점` : `게임 종료 · ${brickState.score.toLocaleString('ko-KR')}점`;
    const launch = document.getElementById('brickLaunch');
    if(launch) launch.hidden = true;
    const restart = document.getElementById('brickRestart');
    if(restart) restart.hidden = false;
    drawBrick();
    window.setTimeout(() => window.OpoongGameResults?.show?.('brick', {
      primaryLabel:'점수',
      primaryValue:`${brickState.score.toLocaleString('ko-KR')}점`,
      stats:[{label:'스테이지',value:String(brickState.stage)},{label:'최고 점수',value:`${Math.max(loadBest(BRICK_BEST_KEY),brickState.score).toLocaleString('ko-KR')}점`}]
    }), 180);
  }

  function advanceBrickStage(){
    if(!brickState) return;
    if(brickState.stage >= 5){ endBrick(true); return; }
    brickState.stage += 1;
    brickState.bricks = createBrickRows(brickState.stage);
    brickState.score += 100 * brickState.stage;
    resetBrickBall();
    updateBrickHud();
    const status = document.getElementById('brickStatus');
    if(status) status.textContent = `스테이지 ${brickState.stage}! 공을 다시 발사하세요.`;
    const launch = document.getElementById('brickLaunch');
    if(launch) launch.textContent = '공 발사';
  }

  function moveBrickPaddle(dx){
    if(!brickState) return;
    brickState.paddle.x = Math.max(10, Math.min(800 - brickState.paddle.w - 10, brickState.paddle.x + dx));
    if(!brickState.ball.launched){
      brickState.ball.x = brickState.paddle.x + brickState.paddle.w / 2;
      brickState.ball.y = brickState.paddle.y - 13;
    }
  }

  function updateBrick(dt){
    const s = brickState;
    if(!s || s.ended) return;
    const speed = 520 * dt;
    if(brickKeys.has('left')) moveBrickPaddle(-speed);
    if(brickKeys.has('right')) moveBrickPaddle(speed);
    if(!s.ball.launched) return;

    const b = s.ball;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    if(b.x - b.r <= 0){ b.x = b.r; b.vx = Math.abs(b.vx); }
    if(b.x + b.r >= 800){ b.x = 800 - b.r; b.vx = -Math.abs(b.vx); }
    if(b.y - b.r <= 0){ b.y = b.r; b.vy = Math.abs(b.vy); }

    const p = s.paddle;
    if(b.vy > 0 && b.y + b.r >= p.y && b.y - b.r <= p.y + p.h && b.x >= p.x - b.r && b.x <= p.x + p.w + b.r){
      b.y = p.y - b.r - 1;
      const hit = (b.x - (p.x + p.w / 2)) / (p.w / 2);
      const magnitude = Math.max(330, Math.hypot(b.vx, b.vy));
      b.vx = hit * 390;
      b.vy = -Math.sqrt(Math.max(18000, magnitude * magnitude - b.vx * b.vx));
    }

    for(const item of s.bricks){
      if(!item.alive) continue;
      if(b.x + b.r < item.x || b.x - b.r > item.x + item.w || b.y + b.r < item.y || b.y - b.r > item.y + item.h) continue;
      item.alive = false;
      s.score += 10 * s.stage;
      const overlapLeft = Math.abs((b.x + b.r) - item.x);
      const overlapRight = Math.abs((item.x + item.w) - (b.x - b.r));
      const overlapTop = Math.abs((b.y + b.r) - item.y);
      const overlapBottom = Math.abs((item.y + item.h) - (b.y - b.r));
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
      if(minOverlap === overlapLeft || minOverlap === overlapRight) b.vx *= -1; else b.vy *= -1;
      updateBrickHud();
      break;
    }

    if(s.bricks.every(item => !item.alive)) advanceBrickStage();

    if(b.y - b.r > 520){
      s.lives -= 1;
      updateBrickHud();
      if(s.lives <= 0){ endBrick(false); return; }
      resetBrickBall();
      const status = document.getElementById('brickStatus');
      if(status) status.textContent = `공이 하나 남았어요. 남은 공 ${s.lives}개`;
      const launch = document.getElementById('brickLaunch');
      if(launch) launch.textContent = '공 발사';
    }
  }

  function drawBrick(){
    const canvas = document.getElementById('brickCanvas');
    if(!canvas || !brickState) return;
    const ctx = canvas.getContext('2d');
    const s = brickState;
    const grad = ctx.createLinearGradient(0,0,0,520);
    grad.addColorStop(0,'#eff6ff'); grad.addColorStop(1,'#eef2ff');
    ctx.fillStyle = grad; ctx.fillRect(0,0,800,520);

    const colors = brickPalette();
    s.bricks.forEach(item => {
      if(!item.alive) return;
      ctx.fillStyle = colors[item.row % colors.length];
      ctx.beginPath();
      if(ctx.roundRect) ctx.roundRect(item.x,item.y,item.w,item.h,7); else ctx.rect(item.x,item.y,item.w,item.h);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.24)';
      ctx.fillRect(item.x+5,item.y+4,Math.max(0,item.w-10),3);
    });

    ctx.fillStyle = '#0f172a';
    ctx.beginPath(); if(ctx.roundRect) ctx.roundRect(s.paddle.x,s.paddle.y,s.paddle.w,s.paddle.h,8); else ctx.rect(s.paddle.x,s.paddle.y,s.paddle.w,s.paddle.h); ctx.fill();
    const ballGrad = ctx.createRadialGradient(s.ball.x-3,s.ball.y-4,2,s.ball.x,s.ball.y,s.ball.r+4);
    ballGrad.addColorStop(0,'#fff'); ballGrad.addColorStop(.35,'#f8fafc'); ballGrad.addColorStop(1,'#ef4444');
    ctx.fillStyle = ballGrad; ctx.beginPath(); ctx.arc(s.ball.x,s.ball.y,s.ball.r,0,Math.PI*2); ctx.fill();

    if(s.ended){
      ctx.fillStyle='rgba(15,23,42,.58)';ctx.fillRect(0,0,800,520);
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='1000 34px system-ui';
      ctx.fillText(s.won?'CLEAR!':'GAME OVER',400,245);
      ctx.font='900 20px system-ui';ctx.fillText(`${s.score.toLocaleString('ko-KR')}점`,400,282);
    }
  }

  function brickLoop(now){
    if(!brickRunning || !brickState) return;
    const dt = Math.min(.032, Math.max(0, (now - brickLast) / 1000));
    brickLast = now;
    updateBrick(dt);
    drawBrick();
    if(brickRunning) brickRaf = requestAnimationFrame(brickLoop);
  }

  function stopBrick(){
    brickRunning = false;
    cancelAnimationFrame(brickRaf);
    brickKeys.clear();
  }

  /* ------------------------------- tetris ------------------------------- */
  const TETRIS_COLS = 10;
  const TETRIS_ROWS = 20;
  const TETRIS_CELL = 30;
  const TETROMINOES = {
    I:[[1,1,1,1]],
    J:[[1,0,0],[1,1,1]],
    L:[[0,0,1],[1,1,1]],
    O:[[1,1],[1,1]],
    S:[[0,1,1],[1,1,0]],
    T:[[0,1,0],[1,1,1]],
    Z:[[1,1,0],[0,1,1]]
  };
  const TETRIS_COLORS = {I:'#22d3ee',J:'#3b82f6',L:'#f59e0b',O:'#facc15',S:'#22c55e',T:'#a855f7',Z:'#ef4444'};

  let tetrisRaf = 0;
  let tetrisRunning = false;
  let tetrisLast = 0;
  let tetrisDropClock = 0;
  let tetrisBoard = [];
  let tetrisPiece = null;
  let tetrisNextType = null;
  let tetrisBag = [];
  let tetrisScore = 0;
  let tetrisLines = 0;
  let tetrisLevel = 1;
  let tetrisOver = false;
  let tetrisTouchStart = null;

  function emptyTetrisBoard(){
    return Array.from({length:TETRIS_ROWS}, () => Array(TETRIS_COLS).fill(null));
  }

  function refillBag(){
    tetrisBag = Object.keys(TETROMINOES);
    for(let i=tetrisBag.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [tetrisBag[i],tetrisBag[j]] = [tetrisBag[j],tetrisBag[i]];
    }
  }

  function takeBag(){
    if(!tetrisBag.length) refillBag();
    return tetrisBag.pop();
  }

  function cloneShape(shape){
    return shape.map(row => row.slice());
  }

  function makePiece(type){
    const shape = cloneShape(TETROMINOES[type]);
    return {type,shape,x:Math.floor((TETRIS_COLS-shape[0].length)/2),y:0};
  }

  function tetrisCollides(piece, dx=0, dy=0, shape=piece.shape){
    for(let r=0;r<shape.length;r++){
      for(let c=0;c<shape[r].length;c++){
        if(!shape[r][c]) continue;
        const x = piece.x + c + dx;
        const y = piece.y + r + dy;
        if(x < 0 || x >= TETRIS_COLS || y >= TETRIS_ROWS) return true;
        if(y >= 0 && tetrisBoard[y][x]) return true;
      }
    }
    return false;
  }

  function rotateShape(shape){
    return shape[0].map((_,i) => shape.map(row => row[i]).reverse());
  }

  function spawnTetrisPiece(){
    const type = tetrisNextType || takeBag();
    tetrisNextType = takeBag();
    tetrisPiece = makePiece(type);
    if(tetrisCollides(tetrisPiece)){
      finishTetris();
      return false;
    }
    drawTetrisNext();
    return true;
  }

  function resetTetrisGame(){
    cancelAnimationFrame(tetrisRaf);
    tetrisBoard = emptyTetrisBoard();
    tetrisBag = [];
    tetrisNextType = takeBag();
    tetrisScore = 0;
    tetrisLines = 0;
    tetrisLevel = 1;
    tetrisDropClock = 0;
    tetrisOver = false;
    tetrisRunning = true;
    tetrisLast = performance.now();
    spawnTetrisPiece();
    const restart = document.getElementById('tetrisRestart');
    if(restart) restart.hidden = true;
    const status = document.getElementById('tetrisStatus');
    if(status) status.textContent = '게임이 시작됐어요.';
    updateTetrisHud();
    drawTetris();
    tetrisRaf = requestAnimationFrame(tetrisLoop);
    document.getElementById('tetrisCanvas')?.focus({preventScroll:true});
  }

  function tetrisInterval(){
    return Math.max(105, 700 - (tetrisLevel - 1) * 55);
  }

  function moveTetris(dx,dy){
    if(!tetrisRunning || tetrisOver || !tetrisPiece) return false;
    if(tetrisCollides(tetrisPiece,dx,dy)) return false;
    tetrisPiece.x += dx;
    tetrisPiece.y += dy;
    drawTetris();
    return true;
  }

  function rotateTetris(){
    if(!tetrisRunning || tetrisOver || !tetrisPiece) return;
    const rotated = rotateShape(tetrisPiece.shape);
    const kicks = [0,-1,1,-2,2];
    for(const kick of kicks){
      if(!tetrisCollides(tetrisPiece,kick,0,rotated)){
        tetrisPiece.x += kick;
        tetrisPiece.shape = rotated;
        drawTetris();
        return;
      }
    }
  }

  function softDropTetris(){
    if(moveTetris(0,1)){
      tetrisScore += 1;
      updateTetrisHud();
      return;
    }
    lockTetrisPiece();
  }

  function hardDropTetris(){
    if(!tetrisRunning || tetrisOver || !tetrisPiece) return;
    let distance = 0;
    while(!tetrisCollides(tetrisPiece,0,1)){
      tetrisPiece.y += 1;
      distance += 1;
    }
    tetrisScore += distance * 2;
    lockTetrisPiece();
  }

  function lockTetrisPiece(){
    if(!tetrisPiece || tetrisOver) return;
    tetrisPiece.shape.forEach((row,r) => row.forEach((cell,c) => {
      if(!cell) return;
      const y = tetrisPiece.y + r;
      const x = tetrisPiece.x + c;
      if(y >= 0 && y < TETRIS_ROWS && x >= 0 && x < TETRIS_COLS) tetrisBoard[y][x] = tetrisPiece.type;
    }));
    clearTetrisLines();
    tetrisDropClock = 0;
    spawnTetrisPiece();
    updateTetrisHud();
    drawTetris();
  }

  function clearTetrisLines(){
    let cleared = 0;
    for(let r=TETRIS_ROWS-1;r>=0;r--){
      if(tetrisBoard[r].every(Boolean)){
        tetrisBoard.splice(r,1);
        tetrisBoard.unshift(Array(TETRIS_COLS).fill(null));
        cleared += 1;
        r += 1;
      }
    }
    if(!cleared) return;
    const points = [0,100,300,500,800][cleared] || 1200;
    tetrisScore += points * tetrisLevel;
    tetrisLines += cleared;
    tetrisLevel = Math.floor(tetrisLines / 10) + 1;
  }

  function finishTetris(){
    if(tetrisOver) return;
    tetrisOver = true;
    tetrisRunning = false;
    cancelAnimationFrame(tetrisRaf);
    const oldBest = loadBest(TETRIS_BEST_KEY);
    if(tetrisScore > oldBest) saveBest(TETRIS_BEST_KEY,tetrisScore);
    updateTetrisHud();
    drawTetris();
    const status = document.getElementById('tetrisStatus');
    if(status) status.textContent = `게임 종료 · ${tetrisScore.toLocaleString('ko-KR')}점 · ${tetrisLines}줄`;
    const restart = document.getElementById('tetrisRestart');
    if(restart) restart.hidden = false;
    window.setTimeout(() => window.OpoongGameResults?.show?.('tetris', {
      primaryLabel:'점수',
      primaryValue:`${tetrisScore.toLocaleString('ko-KR')}점`,
      stats:[{label:'라인',value:`${tetrisLines}줄`},{label:'레벨',value:String(tetrisLevel)},{label:'최고 점수',value:`${Math.max(loadBest(TETRIS_BEST_KEY),tetrisScore).toLocaleString('ko-KR')}점`}]
    }),180);
  }

  function updateTetrisHud(){
    const best = Math.max(loadBest(TETRIS_BEST_KEY), tetrisScore);
    const pairs = [
      ['tetrisScore',tetrisScore.toLocaleString('ko-KR')],
      ['tetrisLines',String(tetrisLines)],
      ['tetrisLevel',String(tetrisLevel)],
      ['tetrisBest',best.toLocaleString('ko-KR')]
    ];
    pairs.forEach(([id,value]) => { const el=document.getElementById(id); if(el) el.textContent=value; });
    const meta = document.getElementById('gameCardTetrisMeta');
    if(meta) meta.textContent = `최고 ${best.toLocaleString('ko-KR')}점`;
  }

  function drawTetrisCell(ctx,x,y,type,alpha=1){
    if(y < 0) return;
    const px = x*TETRIS_CELL;
    const py = y*TETRIS_CELL;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = TETRIS_COLORS[type] || '#94a3b8';
    ctx.fillRect(px+1,py+1,TETRIS_CELL-2,TETRIS_CELL-2);
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(px+4,py+4,TETRIS_CELL-8,4);
    ctx.strokeStyle='rgba(15,23,42,.28)';ctx.strokeRect(px+1.5,py+1.5,TETRIS_CELL-3,TETRIS_CELL-3);
    ctx.restore();
  }

  function drawTetris(){
    const canvas = document.getElementById('tetrisCanvas');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle='#0f172a';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle='rgba(148,163,184,.10)';ctx.lineWidth=1;
    for(let x=1;x<TETRIS_COLS;x++){ctx.beginPath();ctx.moveTo(x*TETRIS_CELL,0);ctx.lineTo(x*TETRIS_CELL,600);ctx.stroke();}
    for(let y=1;y<TETRIS_ROWS;y++){ctx.beginPath();ctx.moveTo(0,y*TETRIS_CELL);ctx.lineTo(300,y*TETRIS_CELL);ctx.stroke();}
    tetrisBoard.forEach((row,y) => row.forEach((type,x) => { if(type) drawTetrisCell(ctx,x,y,type); }));

    if(tetrisPiece){
      let ghostY = tetrisPiece.y;
      while(!tetrisCollides({...tetrisPiece,y:ghostY},0,1,tetrisPiece.shape)) ghostY += 1;
      tetrisPiece.shape.forEach((row,r) => row.forEach((cell,c) => { if(cell) drawTetrisCell(ctx,tetrisPiece.x+c,ghostY+r,tetrisPiece.type,.18); }));
      tetrisPiece.shape.forEach((row,r) => row.forEach((cell,c) => { if(cell) drawTetrisCell(ctx,tetrisPiece.x+c,tetrisPiece.y+r,tetrisPiece.type,1); }));
    }

    if(tetrisOver){
      ctx.fillStyle='rgba(2,6,23,.72)';ctx.fillRect(0,0,300,600);
      ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='1000 28px system-ui';ctx.fillText('GAME OVER',150,280);
      ctx.font='900 18px system-ui';ctx.fillText(`${tetrisScore.toLocaleString('ko-KR')}점`,150,315);
    }
  }

  function drawTetrisNext(){
    const canvas = document.getElementById('tetrisNextCanvas');
    if(!canvas || !tetrisNextType) return;
    const ctx=canvas.getContext('2d');ctx.fillStyle='#0f172a';ctx.fillRect(0,0,112,112);
    const shape=TETROMINOES[tetrisNextType];const cell=22;
    const ox=(112-shape[0].length*cell)/2;const oy=(112-shape.length*cell)/2;
    shape.forEach((row,r)=>row.forEach((v,c)=>{if(!v)return;ctx.fillStyle=TETRIS_COLORS[tetrisNextType];ctx.fillRect(ox+c*cell+1,oy+r*cell+1,cell-2,cell-2);ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(ox+c*cell+4,oy+r*cell+4,cell-8,3);}));
  }

  function tetrisLoop(now){
    if(!tetrisRunning || tetrisOver) return;
    if(document.hidden){ tetrisLast=now; tetrisRaf=requestAnimationFrame(tetrisLoop); return; }
    const delta = Math.min(80, Math.max(0, now - tetrisLast));
    tetrisLast = now;
    tetrisDropClock += delta;
    if(tetrisDropClock >= tetrisInterval()){
      tetrisDropClock = 0;
      if(!moveTetris(0,1)) lockTetrisPiece();
    }
    if(tetrisRunning) tetrisRaf=requestAnimationFrame(tetrisLoop);
  }

  function stopTetris(){
    tetrisRunning=false;
    cancelAnimationFrame(tetrisRaf);
  }

  /* -------------------------- integration + input -------------------------- */
  function stopClassics(){
    stopBrick();
    stopTetris();
  }

  function openClassic(game){
    stopClassics();
    const hub=document.getElementById('gameHub');
    const topbar=document.getElementById('miniGameTopbar');
    const shop=document.getElementById('gameColorShop');
    if(hub) hub.hidden=true;
    if(topbar) topbar.hidden=false;
    if(shop) shop.hidden=true;
    document.querySelectorAll('#view-game .miniGamePanel').forEach(panel => {panel.hidden=true;});

    const panel = document.getElementById(game==='brick'?'gameBrickPanel':'gameTetrisPanel');
    if(panel) panel.hidden=false;
    const title=document.getElementById('miniGameTitle');
    if(title) title.textContent = game==='brick'?'벽돌깨기':'테트리스';

    if(game==='brick') resetBrickGame();
    else resetTetrisGame();
    panel?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function updateCardStats(){
    const brick=document.getElementById('gameCardBrickMeta');
    const tetris=document.getElementById('gameCardTetrisMeta');
    if(brick) brick.textContent=`최고 ${loadBest(BRICK_BEST_KEY).toLocaleString('ko-KR')}점`;
    if(tetris) tetris.textContent=`최고 ${loadBest(TETRIS_BEST_KEY).toLocaleString('ko-KR')}점`;
  }

  function bindHoldButton(id,key){
    const button=document.getElementById(id);
    if(!button) return;
    const down=e=>{e.preventDefault();brickKeys.add(key);};
    const up=e=>{e.preventDefault();brickKeys.delete(key);};
    button.addEventListener('pointerdown',down);
    button.addEventListener('pointerup',up);
    button.addEventListener('pointercancel',up);
    button.addEventListener('pointerleave',up);
  }

  function bindInputs(){
    bindHoldButton('brickLeft','left');
    bindHoldButton('brickRight','right');
    document.getElementById('brickLaunch')?.addEventListener('click',launchBrick);
    document.getElementById('brickRestart')?.addEventListener('click',()=>window.openMiniGame('brick'));

    const brickCanvas=document.getElementById('brickCanvas');
    brickCanvas?.addEventListener('pointermove',e=>{
      if(!brickState) return;
      const rect=brickCanvas.getBoundingClientRect();
      const x=(e.clientX-rect.left)*(800/rect.width);
      brickState.paddle.x=Math.max(10,Math.min(800-brickState.paddle.w-10,x-brickState.paddle.w/2));
      if(!brickState.ball.launched) resetBrickBall();
    });
    brickCanvas?.addEventListener('pointerdown',e=>{e.preventDefault();launchBrick();});

    document.getElementById('tetrisLeft')?.addEventListener('click',()=>moveTetris(-1,0));
    document.getElementById('tetrisRight')?.addEventListener('click',()=>moveTetris(1,0));
    document.getElementById('tetrisRotate')?.addEventListener('click',rotateTetris);
    document.getElementById('tetrisDown')?.addEventListener('click',softDropTetris);
    document.getElementById('tetrisDrop')?.addEventListener('click',hardDropTetris);
    document.getElementById('tetrisRestart')?.addEventListener('click',()=>window.openMiniGame('tetris'));

    const tetrisCanvas=document.getElementById('tetrisCanvas');
    tetrisCanvas?.addEventListener('pointerdown',e=>{tetrisTouchStart={x:e.clientX,y:e.clientY};});
    tetrisCanvas?.addEventListener('pointerup',e=>{
      if(!tetrisTouchStart) return;
      const dx=e.clientX-tetrisTouchStart.x,dy=e.clientY-tetrisTouchStart.y;
      tetrisTouchStart=null;
      if(Math.max(Math.abs(dx),Math.abs(dy))<16){rotateTetris();return;}
      if(Math.abs(dx)>Math.abs(dy)){
        const steps=Math.max(1,Math.min(4,Math.round(Math.abs(dx)/36)));
        for(let i=0;i<steps;i++) moveTetris(dx>0?1:-1,0);
      }else if(dy>0){
        if(dy>95) hardDropTetris(); else softDropTetris();
      }
    });

    window.addEventListener('keydown',e=>{
      if(panelVisible('gameBrickPanel')){
        if(e.code==='ArrowLeft'){e.preventDefault();brickKeys.add('left');}
        if(e.code==='ArrowRight'){e.preventDefault();brickKeys.add('right');}
        if(e.code==='Space'){e.preventDefault();launchBrick();}
      }
      if(panelVisible('gameTetrisPanel')){
        if(e.code==='ArrowLeft'){e.preventDefault();moveTetris(-1,0);}
        else if(e.code==='ArrowRight'){e.preventDefault();moveTetris(1,0);}
        else if(e.code==='ArrowDown'){e.preventDefault();softDropTetris();}
        else if(e.code==='ArrowUp'||e.code==='KeyX'||e.code==='KeyZ'){e.preventDefault();rotateTetris();}
        else if(e.code==='Space'){e.preventDefault();hardDropTetris();}
      }
    },{passive:false});
    window.addEventListener('keyup',e=>{
      if(e.code==='ArrowLeft') brickKeys.delete('left');
      if(e.code==='ArrowRight') brickKeys.delete('right');
    });
  }

  function wrapGameFunctions(){
    baseOpenMiniGame=window.openMiniGame;
    baseShowMiniGameHub=window.showMiniGameHub;
    baseStopActiveMiniGame=window.stopActiveMiniGame;
    baseRenderGameLibraryStats=window.renderGameLibraryStats;
    if(typeof baseOpenMiniGame!=='function') return false;

    const wrappedOpen=function(game){
      if(CLASSIC_GAMES.has(game)) return openClassic(game);
      stopClassics();
      return baseOpenMiniGame.apply(this,arguments);
    };
    wrappedOpen.__opoongClassicsWrapper=true;
    wrappedOpen.__original=baseOpenMiniGame;
    window.openMiniGame=wrappedOpen;

    if(typeof baseShowMiniGameHub==='function'){
      window.showMiniGameHub=function(){
        stopClassics();
        const result=baseShowMiniGameHub.apply(this,arguments);
        ['gameBrickPanel','gameTetrisPanel'].forEach(id=>{const panel=document.getElementById(id);if(panel)panel.hidden=true;});
        return result;
      };
    }

    if(typeof baseStopActiveMiniGame==='function'){
      window.stopActiveMiniGame=function(){stopClassics();return baseStopActiveMiniGame.apply(this,arguments);};
    }

    if(typeof baseRenderGameLibraryStats==='function'){
      window.renderGameLibraryStats=function(){const result=baseRenderGameLibraryStats.apply(this,arguments);updateCardStats();return result;};
    }
    return true;
  }

  function install(){
    if(installed) return;
    if(typeof window.openMiniGame!=='function' || !document.querySelector('#gameHub .gameCardGrid')){
      setTimeout(install,120);
      return;
    }
    installed=true;
    injectStyles();
    addCards();
    addPanels();
    bindInputs();
    wrapGameFunctions();
    updateCardStats();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
