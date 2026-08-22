(() => {
  'use strict';

  const BEST_KEY = 'opoong_run_best_v1';
  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let raf = 0;
  let running = false;
  let lastTime = 0;
  let state = null;

  function bestScore() {
    const n = Number(localStorage.getItem(BEST_KEY) || '0');
    return Number.isFinite(n) ? n : 0;
  }

  function saveBest(value) {
    try { localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(value)))); } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('opoongRunStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongRunStyles';
    style.textContent = `
      .coverOpoongRun{position:relative;overflow:hidden;background:linear-gradient(180deg,#dbeafe 0 58%,#bfdbfe 58% 62%,#d1fae5 62% 100%)}
      .coverOpoongRun::before{content:'O';position:absolute;left:18%;bottom:18%;width:42px;height:42px;display:grid;place-items:center;border-radius:14px;background:#2563eb;color:#fff;font-size:25px;font-weight:1000;box-shadow:0 8px 18px rgba(37,99,235,.28)}
      .coverOpoongRun::after{content:'';position:absolute;right:17%;bottom:18%;width:28px;height:34px;border-radius:7px 7px 3px 3px;background:#475569;box-shadow:-54px -24px 0 -7px #f59e0b}
      .opoongRunTop{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:12px}
      .opoongRunStat{padding:12px;border:1px solid var(--line);border-radius:16px;background:color-mix(in srgb,var(--card) 95%,var(--bg));text-align:center}
      .opoongRunStat span{display:block;color:var(--muted);font-size:11px;font-weight:900}
      .opoongRunStat strong{display:block;margin-top:4px;font-size:20px}
      .opoongRunStage{position:relative;overflow:hidden;border:1px solid var(--line);border-radius:24px;background:#dbeafe;touch-action:none;user-select:none;-webkit-user-select:none;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
      #opoongRunCanvas{display:block;width:100%;height:auto;aspect-ratio:16/9;min-height:270px;max-height:520px}
      .opoongRunOverlay{position:absolute;inset:0;display:grid;place-items:center;padding:24px;background:rgba(15,23,42,.38);backdrop-filter:blur(3px);color:#fff;text-align:center}
      .opoongRunOverlay[hidden]{display:none!important}
      .opoongRunOverlayCard{max-width:430px;padding:20px 22px;border-radius:22px;background:rgba(15,23,42,.82);box-shadow:0 20px 50px rgba(0,0,0,.25)}
      .opoongRunOverlayCard b{display:block;font-size:25px}
      .opoongRunOverlayCard p{margin:8px 0 0;color:#dbeafe;font-weight:800;line-height:1.6;font-size:13px}
      .opoongRunControls{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px}
      .opoongRunHint{color:var(--muted);font-size:12px;font-weight:850;line-height:1.55}
      .opoongRunJump{min-width:126px;min-height:48px;border:0;border-radius:16px;color:#fff;background:linear-gradient(135deg,var(--pri),var(--pri2));font-weight:1000;box-shadow:0 10px 24px color-mix(in srgb,var(--pri) 25%,transparent);touch-action:manipulation}
      @media(max-width:620px){.opoongRunTop{grid-template-columns:1fr 1fr}.opoongRunTop .opoongRunStat:last-child{grid-column:1/-1}#opoongRunCanvas{min-height:230px}.opoongRunControls{align-items:stretch}.opoongRunJump{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function addCard() {
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if (!grid || document.getElementById('gameCardOpoongRun')) return;
    const button = document.createElement('button');
    button.className = 'gameCard';
    button.type = 'button';
    button.id = 'gameCardOpoongRun';
    button.innerHTML = `<span class="gameCover coverOpoongRun"></span><span class="gameCardInfo"><b>O.Poong Run</b><span id="gameCardOpoongRunMeta">최고 ${bestScore()}m</span></span>`;
    button.addEventListener('click', () => window.openMiniGame('opoong-run'));
    grid.appendChild(button);
  }

  function addPanel() {
    const gameView = document.getElementById('view-game');
    if (!gameView || document.getElementById('gameOpoongRunPanel')) return;
    const shop = document.getElementById('gameColorShop');
    const anchor = shop || gameView.lastElementChild;
    const panel = document.createElement('div');
    panel.id = 'gameOpoongRunPanel';
    panel.className = 'gamePlayCard miniGamePanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="opoongRunTop">
        <div class="opoongRunStat"><span>거리</span><strong id="opoongRunDistance">0m</strong></div>
        <div class="opoongRunStat"><span>코인</span><strong id="opoongRunCoins">0</strong></div>
        <div class="opoongRunStat"><span>최고 기록</span><strong id="opoongRunBest">${bestScore()}m</strong></div>
      </div>
      <div class="opoongRunStage" id="opoongRunStage">
        <canvas id="opoongRunCanvas" width="960" height="540" aria-label="O.Poong Run 게임"></canvas>
        <div class="opoongRunOverlay" id="opoongRunOverlay">
          <div class="opoongRunOverlayCard">
            <b id="opoongRunOverlayTitle">O.Poong Run</b>
            <p id="opoongRunOverlayText">장애물을 뛰어넘고 코인을 모아 최대한 멀리 달려보세요.<br>Space · ↑ · 화면 터치로 점프</p>
          </div>
        </div>
      </div>
      <div class="opoongRunControls">
        <div class="opoongRunHint" id="opoongRunStatus">Space / ↑ / 터치로 점프 · 두 번 연속 점프 가능</div>
        <button class="opoongRunJump" id="opoongRunJump" type="button">점프</button>
      </div>
    `;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor);
    else gameView.appendChild(panel);

    document.getElementById('opoongRunJump')?.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
    document.getElementById('opoongRunStage')?.addEventListener('pointerdown', (e) => { e.preventDefault(); jump(); });
  }

  function makeState() {
    return {
      started: false,
      over: false,
      time: 0,
      distance: 0,
      coins: 0,
      speed: 330,
      groundY: 438,
      player: { x: 155, y: 380, w: 54, h: 58, vy: 0, jumps: 0 },
      obstacles: [],
      pickups: [],
      nextObstacle: 1.2,
      nextCoin: .75,
      cloudOffset: 0,
      hillOffset: 0
    };
  }

  function resetGame() {
    state = makeState();
    lastTime = 0;
    updateStats();
    const overlay = document.getElementById('opoongRunOverlay');
    if (overlay) overlay.hidden = false;
    const title = document.getElementById('opoongRunOverlayTitle');
    const text = document.getElementById('opoongRunOverlayText');
    if (title) title.textContent = 'O.Poong Run';
    if (text) text.innerHTML = '장애물을 뛰어넘고 코인을 모아 최대한 멀리 달려보세요.<br>Space · ↑ · 화면 터치로 점프';
    draw();
  }

  function startGame() {
    if (!state) resetGame();
    if (state.over) resetGame();
    state.started = true;
    const overlay = document.getElementById('opoongRunOverlay');
    if (overlay) overlay.hidden = true;
    running = true;
    lastTime = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function jump() {
    if (!state) resetGame();
    if (!state.started || state.over) startGame();
    const p = state.player;
    if (p.jumps >= 2) return;
    p.vy = p.jumps === 0 ? -760 : -680;
    p.jumps += 1;
  }

  function spawnObstacle() {
    const tall = Math.random() < .38;
    const w = tall ? 48 : 58 + Math.random() * 32;
    const h = tall ? 82 : 42 + Math.random() * 30;
    state.obstacles.push({ x: 1010, y: state.groundY - h, w, h, kind: tall ? 'tower' : 'crate' });
    state.nextObstacle = Math.max(.72, 1.45 - state.speed / 900) + Math.random() * .8;
  }

  function spawnCoin() {
    const count = 2 + Math.floor(Math.random() * 4);
    const baseY = 300 - Math.random() * 95;
    for (let i = 0; i < count; i++) state.pickups.push({ x: 1000 + i * 52, y: baseY - Math.sin(i * .9) * 38, r: 13, taken: false });
    state.nextCoin = 1.1 + Math.random() * 1.4;
  }

  function intersects(a, b) {
    const padX = 8, padY = 7;
    return a.x + padX < b.x + b.w && a.x + a.w - padX > b.x && a.y + padY < b.y + b.h && a.y + a.h - padY > b.y;
  }

  function update(dt) {
    if (!state?.started || state.over) return;
    const p = state.player;
    state.time += dt;
    state.speed = Math.min(620, 330 + state.time * 8.5);
    state.distance += state.speed * dt / 10;
    state.cloudOffset = (state.cloudOffset + state.speed * .04 * dt) % 960;
    state.hillOffset = (state.hillOffset + state.speed * .12 * dt) % 960;

    p.vy += 1900 * dt;
    p.y += p.vy * dt;
    const floor = state.groundY - p.h;
    if (p.y >= floor) { p.y = floor; p.vy = 0; p.jumps = 0; }

    state.nextObstacle -= dt;
    state.nextCoin -= dt;
    if (state.nextObstacle <= 0) spawnObstacle();
    if (state.nextCoin <= 0) spawnCoin();

    for (const obstacle of state.obstacles) obstacle.x -= state.speed * dt;
    for (const coin of state.pickups) coin.x -= state.speed * dt;
    state.obstacles = state.obstacles.filter(o => o.x + o.w > -30);
    state.pickups = state.pickups.filter(c => c.x + c.r > -30 && !c.taken);

    for (const obstacle of state.obstacles) {
      if (intersects(p, obstacle)) return gameOver();
    }
    for (const coin of state.pickups) {
      const cx = Math.max(p.x, Math.min(coin.x, p.x + p.w));
      const cy = Math.max(p.y, Math.min(coin.y, p.y + p.h));
      const dx = coin.x - cx, dy = coin.y - cy;
      if (dx * dx + dy * dy <= coin.r * coin.r) { coin.taken = true; state.coins += 1; }
    }
    updateStats();
  }

  function gameOver() {
    if (!state || state.over) return;
    state.over = true;
    running = false;
    const score = Math.floor(state.distance);
    if (score > bestScore()) saveBest(score);
    updateStats();
    const overlay = document.getElementById('opoongRunOverlay');
    const title = document.getElementById('opoongRunOverlayTitle');
    const text = document.getElementById('opoongRunOverlayText');
    if (overlay) overlay.hidden = false;
    if (title) title.textContent = `${score}m 달렸어요`;
    if (text) text.innerHTML = `코인 ${state.coins}개 · 최고 ${bestScore()}m<br>점프 버튼이나 Space를 누르면 다시 시작해요.`;
    const meta = document.getElementById('gameCardOpoongRunMeta');
    if (meta) meta.textContent = `최고 ${bestScore()}m`;
    draw();
  }

  function updateStats() {
    const d = document.getElementById('opoongRunDistance');
    const c = document.getElementById('opoongRunCoins');
    const b = document.getElementById('opoongRunBest');
    if (d) d.textContent = `${Math.floor(state?.distance || 0)}m`;
    if (c) c.textContent = String(state?.coins || 0);
    if (b) b.textContent = `${bestScore()}m`;
  }

  function roundedRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, rr) : (ctx.rect(x, y, w, h));
    ctx.fill();
  }

  function draw() {
    const canvas = document.getElementById('opoongRunCanvas');
    if (!canvas || !state) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#bfdbfe'); sky.addColorStop(.68, '#eff6ff'); sky.addColorStop(1, '#dcfce7');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(255,255,255,.85)';
    for (let i = -1; i < 5; i++) {
      const x = ((i * 240 - state.cloudOffset) % 1200) - 90;
      ctx.beginPath(); ctx.arc(x, 95, 34, 0, Math.PI * 2); ctx.arc(x + 38, 82, 42, 0, Math.PI * 2); ctx.arc(x + 82, 100, 31, 0, Math.PI * 2); ctx.fill();
    }

    ctx.fillStyle = '#bbf7d0';
    for (let i = -1; i < 6; i++) {
      const x = ((i * 210 - state.hillOffset) % 1260) - 120;
      ctx.beginPath(); ctx.moveTo(x, state.groundY); ctx.quadraticCurveTo(x + 80, 270, x + 175, state.groundY); ctx.fill();
    }

    ctx.fillStyle = '#86efac'; ctx.fillRect(0, state.groundY, w, h - state.groundY);
    ctx.fillStyle = '#4ade80'; ctx.fillRect(0, state.groundY, w, 8);
    ctx.fillStyle = '#a16207';
    for (let x = -((state.distance * 2) % 64); x < w; x += 64) ctx.fillRect(x, state.groundY + 34, 34, 7);

    for (const coin of state.pickups) {
      if (coin.taken) continue;
      ctx.fillStyle = '#fbbf24'; ctx.beginPath(); ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(coin.x - 4, coin.y - 4, 4, 0, Math.PI * 2); ctx.fill();
    }

    for (const o of state.obstacles) {
      if (o.kind === 'tower') {
        ctx.fillStyle = '#475569'; roundedRect(ctx, o.x, o.y, o.w, o.h, 8);
        ctx.fillStyle = '#94a3b8'; ctx.fillRect(o.x + 9, o.y + 12, o.w - 18, 8);
      } else {
        ctx.fillStyle = '#92400e'; roundedRect(ctx, o.x, o.y, o.w, o.h, 8);
        ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 5; ctx.strokeRect(o.x + 6, o.y + 6, o.w - 12, o.h - 12);
      }
    }

    const p = state.player;
    ctx.save();
    if (p.y < state.groundY - p.h - 2) ctx.rotate(Math.sin(state.time * 8) * .025);
    ctx.fillStyle = '#2563eb'; roundedRect(ctx, p.x, p.y, p.w, p.h, 15);
    ctx.fillStyle = '#ffffff'; ctx.font = '900 28px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('O', p.x + p.w / 2, p.y + p.h / 2 + 1);
    ctx.fillStyle = '#1e3a8a'; ctx.fillRect(p.x + 8, p.y + p.h - 7, 14, 7); ctx.fillRect(p.x + p.w - 22, p.y + p.h - 7, 14, 7);
    ctx.restore();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(.033, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    draw();
    if (running) raf = requestAnimationFrame(loop);
  }

  function stopRun() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function openRun() {
    try { baseStopActiveMiniGame?.(); } catch (_) {}
    document.querySelectorAll('#view-game .miniGamePanel').forEach(el => { el.hidden = true; });
    const hub = document.getElementById('gameHub');
    if (hub) hub.hidden = true;
    const panel = document.getElementById('gameOpoongRunPanel');
    if (panel) panel.hidden = false;
    resetGame();
    panel?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function bindKeys() {
    window.addEventListener('keydown', (e) => {
      const panel = document.getElementById('gameOpoongRunPanel');
      if (!panel || panel.hidden) return;
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); jump(); }
      if (e.code === 'KeyR') { e.preventDefault(); resetGame(); startGame(); }
    }, { passive: false });
  }

  function wrapGameFunctions() {
    baseOpenMiniGame = window.openMiniGame;
    baseShowMiniGameHub = window.showMiniGameHub;
    baseStopActiveMiniGame = window.stopActiveMiniGame;
    if (typeof baseOpenMiniGame !== 'function') return false;

    window.openMiniGame = function(game) {
      if (game === 'opoong-run') return openRun();
      stopRun();
      return baseOpenMiniGame.apply(this, arguments);
    };

    if (typeof baseShowMiniGameHub === 'function') {
      window.showMiniGameHub = function() {
        stopRun();
        const result = baseShowMiniGameHub.apply(this, arguments);
        const panel = document.getElementById('gameOpoongRunPanel');
        if (panel) panel.hidden = true;
        return result;
      };
    }

    if (typeof baseStopActiveMiniGame === 'function') {
      window.stopActiveMiniGame = function() {
        stopRun();
        return baseStopActiveMiniGame.apply(this, arguments);
      };
    }
    return true;
  }

  function install() {
    if (installed) return;
    if (typeof window.openMiniGame !== 'function' || !document.querySelector('#gameHub .gameCardGrid')) {
      setTimeout(install, 120);
      return;
    }
    installed = true;
    injectStyles();
    addCard();
    addPanel();
    bindKeys();
    wrapGameFunctions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
