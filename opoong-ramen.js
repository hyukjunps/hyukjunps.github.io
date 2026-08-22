(() => {
  'use strict';

  const BEST_KEY = 'opoong_ramen_best_v2';
  const SHIFT_SECONDS = 75;
  const TARGET_MONEY = 15000;
  const POT_COUNT = 4;
  const MAX_BURNS = 3;
  const BASE_PRICE = 1000;

  const WINDOWS = {
    soup: [8, 28],
    noodles: [22, 42],
    egg: [48, 68],
    green: [62, 82],
    serve: [80, 98]
  };

  const TOOLS = {
    kettle: { label:'주전자', icon:'🫖', hint:'냄비를 눌러 물을 부어요.' },
    soup: { label:'스프', icon:'🥄', hint:'물이 데워지기 시작하면 스프를 넣어요.' },
    noodles: { label:'면', icon:'🍜', hint:'스프 다음, 너무 늦지 않게 면을 넣어요.' },
    egg: { label:'계란', icon:'🥚', hint:'중간쯤 익었을 때 계란을 넣어요.' },
    green: { label:'파', icon:'🌿', hint:'마지막에 가까워졌을 때 파를 넣어요.' },
    serve: { label:'완성', icon:'🔔', hint:'모든 재료를 넣고 가장 맛있을 때 꺼내요.' }
  };

  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let raf = 0;
  let running = false;
  let ended = false;
  let lastTime = 0;
  let timeLeft = SHIFT_SECONDS;
  let money = 0;
  let served = 0;
  let burns = 0;
  let selectedTool = 'kettle';
  let pots = [];

  function bestRevenue() {
    const n = Number(localStorage.getItem(BEST_KEY) || '0');
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function saveBest(value) {
    try { localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(value)))); } catch (_) {}
  }

  function freshPot(index) {
    return {
      index,
      water:false,
      soup:false,
      noodles:false,
      egg:false,
      green:false,
      heat:0,
      badTiming:0,
      burning:false,
      flash:''
    };
  }

  function resetPots() {
    pots = Array.from({ length:POT_COUNT }, (_, i) => freshPot(i));
  }

  function timingScore(value, key) {
    const win = WINDOWS[key];
    if (!win) return 1;
    const center = (win[0] + win[1]) / 2;
    const half = (win[1] - win[0]) / 2;
    const distance = Math.abs(value - center);
    if (distance <= half * .45) return 1;
    if (distance <= half) return .72;
    return .35;
  }

  function ingredientComplete(p) {
    return p.water && p.soup && p.noodles && p.egg && p.green;
  }

  function injectStyles() {
    if (document.getElementById('opoongRamenStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongRamenStyles';
    style.textContent = `
      .coverOpoongRamen{position:relative;overflow:hidden;background:linear-gradient(180deg,#fff0f6,#ffd9e8 58%,#fff7ed 58%);display:grid;place-items:center}
      .coverOpoongRamen::before{content:'🍜';font-size:54px;filter:drop-shadow(0 8px 12px rgba(190,24,93,.16));transform:translateY(7px)}
      .coverOpoongRamen::after{content:'오풍';position:absolute;right:11%;top:11%;padding:5px 9px;border-radius:10px;background:#ec4899;color:#fff;font-size:11px;font-weight:1000;transform:rotate(7deg)}

      .ramenHud{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:12px}
      .ramenStat{padding:11px 8px;border:1px solid #fbcfe8;border-radius:17px;background:linear-gradient(180deg,#fff,#fff7fb);text-align:center}
      .ramenStat span{display:block;color:#9d174d;font-size:10.5px;font-weight:900}
      .ramenStat strong{display:block;margin-top:4px;color:#831843;font-size:18px;letter-spacing:-.4px}
      .ramenTarget.ok strong{color:#047857}
      .ramenBurns strong{color:#dc2626}

      .ramenKitchen{position:relative;overflow:hidden;padding:14px;border:1px solid #f9a8d4;border-radius:26px;background:linear-gradient(180deg,#fff1f7 0 28%,#ffe4ef 28% 47%,#fff8ef 47%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.55)}
      .ramenSign{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;padding:11px 14px;border-radius:18px;background:linear-gradient(135deg,#f9a8d4,#fbcfe8);border:2px solid #fff;color:#9d174d;box-shadow:0 8px 18px rgba(190,24,93,.12)}
      .ramenSign b{font-size:19px;letter-spacing:-.6px}.ramenSign span{font-size:11px;font-weight:900;text-align:right}

      .ramenShelf{display:grid;grid-template-columns:1.35fr repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}
      .ramenTool{min-height:72px;border:2px solid #fbcfe8;border-radius:18px;background:#fff;color:#831843;display:grid;place-items:center;gap:2px;padding:8px;transition:.14s ease;touch-action:manipulation}
      .ramenTool span{font-size:27px}.ramenTool small{font-size:11px;font-weight:950;color:#9d174d}.ramenTool.selected{border-color:#ec4899;background:#fdf2f8;box-shadow:0 0 0 4px rgba(236,72,153,.12);transform:translateY(-2px)}
      .ramenTool.kettle{background:linear-gradient(180deg,#fff9c7,#fde68a);border-color:#fbbf24}.ramenTool.kettle.selected{border-color:#d97706;box-shadow:0 0 0 4px rgba(245,158,11,.15)}

      .ramenStove{position:relative;padding:18px 14px 14px;border-radius:24px;background:linear-gradient(180deg,#fda4c7,#fb7185);box-shadow:inset 0 8px 20px rgba(255,255,255,.3)}
      .ramenPots{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
      .ramenPot{position:relative;min-height:238px;border:0;border-radius:22px;background:rgba(255,255,255,.16);padding:9px 7px 12px;color:#7c2d12;touch-action:manipulation;transition:.13s ease}
      .ramenPot:hover{background:rgba(255,255,255,.24)}.ramenPot:active{transform:scale(.985)}
      .ramenPotTop{display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:10px;font-weight:1000;color:#fff}
      .ramenPotBody{position:relative;width:min(155px,94%);height:116px;margin:23px auto 9px;border:8px solid #d97706;border-top-width:5px;border-radius:24px 24px 34px 34px;background:linear-gradient(145deg,#fde047,#fbbf24 60%,#eab308);overflow:hidden;box-shadow:inset 0 5px 12px rgba(255,255,255,.44),0 8px 16px rgba(124,45,18,.2)}
      .ramenPotBody::before,.ramenPotBody::after{content:'';position:absolute;top:17px;width:34px;height:15px;border-radius:999px;background:#ca8a04;z-index:5}.ramenPotBody::before{left:-27px}.ramenPotBody::after{right:-27px}
      .ramenLiquid{position:absolute;left:7px;right:7px;bottom:7px;height:0;border-radius:12px 12px 23px 23px;background:linear-gradient(180deg,#bae6fd,#38bdf8);transition:height .18s ease,background .18s ease}
      .ramenPot.has-water .ramenLiquid{height:62%}.ramenPot.has-soup .ramenLiquid{background:linear-gradient(180deg,#fdba74,#ea580c)}.ramenPot.burning .ramenLiquid{background:linear-gradient(180deg,#78716c,#292524)}
      .ramenNoodles{position:absolute;left:17%;right:17%;bottom:28px;height:0;opacity:0;border-radius:48%;background:repeating-linear-gradient(0deg,#fef08a 0 5px,#eab308 5px 7px);transition:.16s ease}.ramenPot.has-noodles .ramenNoodles{height:29px;opacity:.94}
      .ramenEgg{position:absolute;left:50%;bottom:45px;width:34px;height:27px;transform:translateX(-50%);border-radius:50%;background:#fff7ed;box-shadow:inset 0 0 0 9px #facc15;opacity:0}.ramenPot.has-egg .ramenEgg{opacity:1}
      .ramenGreen{position:absolute;left:20%;right:20%;bottom:39px;height:9px;background:repeating-linear-gradient(90deg,#16a34a 0 8px,transparent 8px 13px);opacity:0}.ramenPot.has-green .ramenGreen{opacity:1}
      .ramenSteam{position:absolute;left:50%;top:26px;width:90px;height:55px;transform:translate(-50%,-100%);opacity:0;pointer-events:none}.ramenPot.has-water .ramenSteam{opacity:1}
      .ramenSteam::before,.ramenSteam::after{content:'';position:absolute;bottom:0;width:13px;height:42px;border:4px solid rgba(255,255,255,.86);border-left-color:transparent;border-bottom-color:transparent;border-radius:50%;animation:opoongRamenSteam 1.2s linear infinite}.ramenSteam::before{left:24px}.ramenSteam::after{right:24px;animation-delay:.3s}
      @keyframes opoongRamenSteam{0%{transform:translateY(10px) scale(.8);opacity:0}30%{opacity:1}100%{transform:translateY(-12px) scale(1.15);opacity:0}}
      .ramenFlame{position:absolute;left:50%;bottom:51px;transform:translateX(-50%);font-size:20px;filter:drop-shadow(0 3px 3px rgba(185,28,28,.25));opacity:.72}.ramenPot.burning .ramenFlame{font-size:34px;opacity:1}
      .ramenProgress{height:10px;border-radius:999px;background:rgba(255,255,255,.52);overflow:hidden}.ramenProgress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#38bdf8 0 18%,#facc15 35%,#22c55e 72%,#f59e0b 90%,#dc2626);transition:width .08s linear}
      .ramenPotState{min-height:32px;margin-top:7px;color:#fff;font-size:10.5px;font-weight:950;line-height:1.45;text-shadow:0 1px 2px rgba(124,45,18,.25)}
      .ramenPotFlash{position:absolute;inset:5px;border-radius:18px;display:grid;place-items:center;background:rgba(255,255,255,.88);color:#be123c;font-size:13px;font-weight:1000;opacity:0;pointer-events:none;transition:.15s ease}.ramenPot.flash .ramenPotFlash{opacity:1}

      .ramenToolHint{margin-top:12px;min-height:46px;padding:12px 14px;border:1px solid #fbcfe8;border-radius:17px;background:rgba(255,255,255,.88);color:#9d174d;font-size:12px;font-weight:900;line-height:1.55}.ramenToolHint.good{border-color:#86efac;background:#f0fdf4;color:#047857}.ramenToolHint.bad{border-color:#fecaca;background:#fef2f2;color:#b91c1c}
      .ramenStartRow{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px}.ramenStartRow .muted{font-size:12px;font-weight:850;line-height:1.55}

      @media(max-width:820px){.ramenHud{grid-template-columns:repeat(2,1fr)}.ramenHud .ramenStat:last-child{grid-column:1/-1}.ramenShelf{grid-template-columns:repeat(3,1fr)}.ramenPots{grid-template-columns:1fr 1fr}.ramenPot{min-height:222px}}
      @media(max-width:480px){.ramenPots{grid-template-columns:1fr}.ramenShelf{grid-template-columns:1fr 1fr}.ramenSign{align-items:flex-start;flex-direction:column}.ramenPot{min-height:214px}}
    `;
    document.head.appendChild(style);
  }

  function addCard() {
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if (!grid || document.getElementById('gameCardOpoongRamen')) return;
    const button = document.createElement('button');
    button.className = 'gameCard';
    button.type = 'button';
    button.id = 'gameCardOpoongRamen';
    button.innerHTML = `<span class="gameCover coverOpoongRamen"></span><span class="gameCardInfo"><b>오풍이의 라면가게</b><span id="gameCardOpoongRamenMeta">목표 15,000원 · 최고 ${bestRevenue().toLocaleString()}원</span></span>`;
    button.addEventListener('click', () => window.openMiniGame('opoong-ramen'));
    grid.appendChild(button);
  }

  function addPanel() {
    const gameView = document.getElementById('view-game');
    if (!gameView || document.getElementById('gameOpoongRamenPanel')) return;
    const shop = document.getElementById('gameColorShop');
    const anchor = shop || gameView.lastElementChild;
    const panel = document.createElement('div');
    panel.id = 'gameOpoongRamenPanel';
    panel.className = 'gamePlayCard miniGamePanel';
    panel.hidden = true;
    panel.innerHTML = `
      <div class="ramenHud">
        <div class="ramenStat"><span>남은 시간</span><strong id="ramenTime">${SHIFT_SECONDS}초</strong></div>
        <div class="ramenStat"><span>수입금</span><strong id="ramenMoney">0원</strong></div>
        <div class="ramenStat ramenTarget"><span>목표</span><strong id="ramenTarget">15,000원</strong></div>
        <div class="ramenStat"><span>완성</span><strong id="ramenServed">0그릇</strong></div>
        <div class="ramenStat ramenBurns"><span>탄 냄비</span><strong id="ramenBurns">0 / 3</strong></div>
      </div>

      <div class="ramenKitchen">
        <div class="ramenSign"><b>오풍이의 라면가게</b><span>모든 재료를 직접 넣고<br>15,000원을 채워라!</span></div>
        <div class="ramenShelf" id="ramenTools"></div>
        <div class="ramenStove"><div class="ramenPots" id="ramenPots"></div></div>
        <div class="ramenToolHint" id="ramenMessage">주전자를 선택한 뒤 빈 냄비를 눌러 물을 부어주세요.</div>
      </div>
      <div class="ramenStartRow">
        <span class="muted">스프는 자동으로 들어가지 않습니다. 물·스프·면·계란·파를 모두 직접 넣고, 냄비를 3번 태우면 즉시 실패합니다.</span>
        <button class="bigBtn" id="ramenStart" type="button">영업 시작</button>
      </div>
    `;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor);
    else gameView.appendChild(panel);
    document.getElementById('ramenStart')?.addEventListener('click', startShift);
  }

  function renderTools() {
    const box = document.getElementById('ramenTools');
    if (!box) return;
    box.innerHTML = Object.entries(TOOLS).map(([key, tool]) => `
      <button class="ramenTool ${key === 'kettle' ? 'kettle' : ''} ${selectedTool === key ? 'selected' : ''}" type="button" data-ramen-tool="${key}">
        <span>${tool.icon}</span><small>${tool.label}</small>
      </button>`).join('');
    box.querySelectorAll('[data-ramen-tool]').forEach((btn) => btn.addEventListener('click', () => selectTool(btn.dataset.ramenTool)));
  }

  function potStateText(p) {
    if (p.burning) return '🔥 탔어요! 잠시 후 새 냄비로 교체';
    if (!p.water) return '빈 냄비 · 주전자로 물부터';
    const added = [p.soup && '스프', p.noodles && '면', p.egg && '계란', p.green && '파'].filter(Boolean);
    if (!added.length) return `물 끓이는 중 · ${Math.floor(p.heat)}%`;
    return `${added.join(' · ')} · 익힘 ${Math.floor(p.heat)}%`;
  }

  function renderPots() {
    const box = document.getElementById('ramenPots');
    if (!box) return;
    box.innerHTML = pots.map((p, i) => {
      const classes = [
        'ramenPot', p.water && 'has-water', p.soup && 'has-soup', p.noodles && 'has-noodles',
        p.egg && 'has-egg', p.green && 'has-green', p.burning && 'burning', p.flash && 'flash'
      ].filter(Boolean).join(' ');
      return `<button class="${classes}" type="button" data-ramen-pot="${i}">
        <div class="ramenPotTop"><span>${i + 1}번 냄비</span><span>${ingredientComplete(p) ? '완성 대기' : '조리 중'}</span></div>
        <div class="ramenSteam"></div>
        <div class="ramenPotBody"><div class="ramenLiquid"></div><div class="ramenNoodles"></div><div class="ramenEgg"></div><div class="ramenGreen"></div></div>
        <div class="ramenFlame">🔥</div>
        <div class="ramenProgress"><i style="width:${Math.min(100, p.heat)}%"></i></div>
        <div class="ramenPotState">${potStateText(p)}</div>
        <div class="ramenPotFlash">${p.flash || ''}</div>
      </button>`;
    }).join('');
    box.querySelectorAll('[data-ramen-pot]').forEach((btn) => btn.addEventListener('click', () => useToolOnPot(Number(btn.dataset.ramenPot))));
  }

  function renderHud() {
    const values = {
      ramenTime: `${Math.max(0, Math.ceil(timeLeft))}초`,
      ramenMoney: `${Math.floor(money).toLocaleString()}원`,
      ramenTarget: `${TARGET_MONEY.toLocaleString()}원`,
      ramenServed: `${served}그릇`,
      ramenBurns: `${burns} / ${MAX_BURNS}`
    };
    Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
  }

  function renderAll() {
    renderHud();
    renderTools();
    renderPots();
  }

  function setMessage(text, kind = '') {
    const el = document.getElementById('ramenMessage');
    if (!el) return;
    el.textContent = text;
    el.className = `ramenToolHint${kind ? ' ' + kind : ''}`;
  }

  function selectTool(tool) {
    if (!TOOLS[tool]) return;
    selectedTool = tool;
    renderTools();
    setMessage(`${TOOLS[tool].icon} ${TOOLS[tool].label} 선택 · ${TOOLS[tool].hint}`);
  }

  function ensureRunning() {
    if (running && !ended) return true;
    setMessage('먼저 영업 시작 버튼을 눌러주세요.', 'bad');
    return false;
  }

  function flashPot(index, text) {
    const p = pots[index];
    if (!p) return;
    p.flash = text;
    renderPots();
    setTimeout(() => { if (pots[index] === p) { p.flash = ''; renderPots(); } }, 420);
  }

  function useToolOnPot(index) {
    if (!ensureRunning()) return;
    const p = pots[index];
    if (!p || p.burning) return;
    const tool = selectedTool;

    if (tool === 'kettle') {
      if (p.water) return setMessage(`${index + 1}번 냄비에는 이미 물이 있어요.`, 'bad');
      p.water = true;
      p.heat = 0;
      flashPot(index, '촤아— 💧');
      setMessage(`${index + 1}번 냄비에 주전자로 물을 부었어요. 이제 직접 스프와 재료를 넣으세요.`, 'good');
      renderPots();
      return;
    }

    if (!p.water) return setMessage('빈 냄비예요. 주전자로 물부터 부어주세요.', 'bad');

    if (tool === 'serve') {
      servePot(index);
      return;
    }

    if (p[tool]) return setMessage(`${TOOLS[tool].label}은 이미 넣었어요.`, 'bad');

    const prerequisite = {
      soup: () => true,
      noodles: () => p.soup,
      egg: () => p.noodles && p.soup,
      green: () => p.noodles && p.soup
    };
    if (prerequisite[tool] && !prerequisite[tool]()) {
      if (tool === 'noodles') return setMessage('스프를 먼저 넣어주세요.', 'bad');
      return setMessage('스프와 면을 먼저 넣어주세요.', 'bad');
    }

    p[tool] = true;
    const q = timingScore(p.heat, tool);
    p.badTiming += q >= .7 ? 0 : 1;
    const timingText = q === 1 ? '타이밍 완벽!' : q >= .7 ? '괜찮은 타이밍!' : '타이밍이 조금 아쉬워요.';
    flashPot(index, `${TOOLS[tool].icon} ${timingText}`);
    setMessage(`${index + 1}번 냄비에 ${TOOLS[tool].label} 투입 · ${timingText}`, q >= .7 ? 'good' : 'bad');
    renderPots();
  }

  function servePot(index) {
    const p = pots[index];
    if (!ingredientComplete(p)) {
      const missing = [!p.soup && '스프', !p.noodles && '면', !p.egg && '계란', !p.green && '파'].filter(Boolean).join(', ');
      setMessage(`아직 완성하면 안 돼요. 빠진 재료: ${missing}`, 'bad');
      return;
    }

    const cookQuality = timingScore(p.heat, 'serve');
    let ingredientQuality = 1 - Math.min(.45, p.badTiming * .12);
    let multiplier = cookQuality * ingredientQuality;
    if (p.heat < 72) multiplier *= .68;
    if (p.heat > 100) multiplier *= .45;

    const earned = Math.max(350, Math.round(BASE_PRICE * multiplier / 50) * 50);
    money += earned;
    served += 1;

    const perfect = cookQuality === 1 && p.badTiming === 0;
    setMessage(`${index + 1}번 라면 완성! ${perfect ? '완벽한 한 그릇 ✨' : '조리 완료'} +${earned.toLocaleString()}원`, perfect ? 'good' : '');
    pots[index] = freshPot(index);
    renderAll();

    if (money >= TARGET_MONEY) endGame(true, '목표 금액 달성!');
  }

  function burnPot(index) {
    const p = pots[index];
    if (!p || p.burning) return;
    p.burning = true;
    burns += 1;
    setMessage(`${index + 1}번 냄비를 태웠어요! ${burns}/${MAX_BURNS}`, 'bad');
    renderAll();

    if (burns >= MAX_BURNS) {
      endGame(false, '냄비를 3번 태웠어요.');
      return;
    }

    setTimeout(() => {
      if (!ended && pots[index] === p) {
        pots[index] = freshPot(index);
        setMessage(`${index + 1}번 냄비를 새 냄비로 교체했어요. 다시 도전!`);
        renderAll();
      }
    }, 850);
  }

  function update(dt) {
    if (!running || ended) return;
    timeLeft -= dt;

    pots.forEach((p, i) => {
      if (!p.water || p.burning) return;
      p.heat += dt * 9.2;
      if (p.heat >= 108) burnPot(i);
    });

    if (timeLeft <= 0) {
      timeLeft = 0;
      endGame(money >= TARGET_MONEY, money >= TARGET_MONEY ? '목표 금액 달성!' : '15,000원을 채우지 못했어요.');
    }
  }

  function loop(now) {
    if (!running || ended) return;
    const dt = Math.min(.07, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    renderHud();
    renderPots();
    if (running && !ended) raf = requestAnimationFrame(loop);
  }

  function startShift() {
    stopLoop();
    ended = false;
    timeLeft = SHIFT_SECONDS;
    money = 0;
    served = 0;
    burns = 0;
    selectedTool = 'kettle';
    resetPots();
    running = true;
    lastTime = performance.now();
    const start = document.getElementById('ramenStart');
    if (start) start.textContent = '처음부터 다시';
    setMessage('영업 시작! 주전자를 선택하고 냄비에 직접 물을 부어주세요.', 'good');
    renderAll();
    raf = requestAnimationFrame(loop);
  }

  function endGame(success, reason) {
    if (ended) return;
    ended = true;
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;

    const finalMoney = Math.floor(money);
    if (finalMoney > bestRevenue()) saveBest(finalMoney);
    const meta = document.getElementById('gameCardOpoongRamenMeta');
    if (meta) meta.textContent = `목표 15,000원 · 최고 ${bestRevenue().toLocaleString()}원`;

    setMessage(`${success ? '성공! 🎉' : '실패!'} ${reason} 최종 수입 ${finalMoney.toLocaleString()}원 · ${served}그릇 완성`, success ? 'good' : 'bad');
    renderAll();

    setTimeout(() => {
      if (typeof window.showGameOverAd === 'function') window.showGameOverAd('opoong-ramen');
    }, 450);
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function openRamen() {
    try { baseStopActiveMiniGame?.(); } catch (_) {}
    document.querySelectorAll('#view-game .miniGamePanel').forEach((el) => { el.hidden = true; });
    const hub = document.getElementById('gameHub');
    if (hub) hub.hidden = true;
    const panel = document.getElementById('gameOpoongRamenPanel');
    if (panel) panel.hidden = false;

    stopLoop();
    ended = false;
    timeLeft = SHIFT_SECONDS;
    money = 0;
    served = 0;
    burns = 0;
    selectedTool = 'kettle';
    resetPots();
    setMessage('주전자를 선택한 뒤 빈 냄비를 눌러 물을 부어주세요. 모든 재료는 직접 넣어야 합니다.');
    renderAll();
    panel?.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function wrapGameFunctions() {
    baseOpenMiniGame = window.openMiniGame;
    baseShowMiniGameHub = window.showMiniGameHub;
    baseStopActiveMiniGame = window.stopActiveMiniGame;
    if (typeof baseOpenMiniGame !== 'function') return false;

    window.openMiniGame = function(game) {
      if (game === 'opoong-ramen') return openRamen();
      stopLoop();
      return baseOpenMiniGame.apply(this, arguments);
    };

    if (typeof baseShowMiniGameHub === 'function') {
      window.showMiniGameHub = function() {
        stopLoop();
        const result = baseShowMiniGameHub.apply(this, arguments);
        const panel = document.getElementById('gameOpoongRamenPanel');
        if (panel) panel.hidden = true;
        return result;
      };
    }

    if (typeof baseStopActiveMiniGame === 'function') {
      window.stopActiveMiniGame = function() {
        stopLoop();
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
    resetPots();
    wrapGameFunctions();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
