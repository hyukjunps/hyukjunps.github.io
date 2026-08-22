(() => {
  'use strict';

  const BEST_KEY = 'opoong_ramen_best_v1';
  const SHIFT_SECONDS = 75;
  const POT_COUNT = 3;
  const ORDERS = [
    { id:'basic', name:'기본 라면', egg:false, green:false, price:900 },
    { id:'egg', name:'계란 라면', egg:true, green:false, price:1100 },
    { id:'green', name:'파 라면', egg:false, green:true, price:1050 },
    { id:'special', name:'오풍이 라면', egg:true, green:true, price:1400 }
  ];

  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let raf = 0;
  let running = false;
  let lastTime = 0;
  let timeLeft = SHIFT_SECONDS;
  let money = 0;
  let served = 0;
  let selected = 0;
  let pots = [];

  function bestRevenue() {
    const n = Number(localStorage.getItem(BEST_KEY) || '0');
    return Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  function saveBest(value) {
    try { localStorage.setItem(BEST_KEY, String(Math.max(0, Math.floor(value)))); } catch (_) {}
  }

  function randomOrder() {
    return ORDERS[Math.floor(Math.random() * ORDERS.length)];
  }

  function newPot(index) {
    return {
      index,
      water:false,
      noodles:false,
      soup:false,
      egg:false,
      green:false,
      cook:0,
      burned:false,
      order:randomOrder()
    };
  }

  function resetPots() {
    pots = Array.from({ length:POT_COUNT }, (_, i) => newPot(i));
    selected = 0;
  }

  function injectStyles() {
    if (document.getElementById('opoongRamenStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongRamenStyles';
    style.textContent = `
      .coverOpoongRamen{position:relative;overflow:hidden;background:linear-gradient(180deg,#fff7ed,#ffedd5);display:grid;place-items:center}
      .coverOpoongRamen::before{content:'🍜';font-size:54px;filter:drop-shadow(0 8px 12px rgba(124,45,18,.18));transform:translateY(5px)}
      .coverOpoongRamen::after{content:'오풍';position:absolute;right:12%;top:12%;padding:5px 8px;border-radius:10px;background:#2563eb;color:white;font-size:11px;font-weight:1000;transform:rotate(7deg)}

      .ramenHud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:12px}
      .ramenStat{padding:12px 9px;border:1px solid var(--line);border-radius:17px;background:color-mix(in srgb,var(--card) 95%,var(--bg));text-align:center}
      .ramenStat span{display:block;color:var(--muted);font-size:11px;font-weight:900}
      .ramenStat strong{display:block;margin-top:4px;font-size:20px;letter-spacing:-.4px}

      .ramenKitchen{padding:14px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(180deg,color-mix(in srgb,#fff7ed 75%,var(--card)),var(--card));overflow:hidden}
      .ramenOrders{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:12px}
      .ramenOrder{padding:11px;border:1px solid var(--line);border-radius:17px;background:var(--card);text-align:center;transition:.16s ease}
      .ramenOrder.selected{border-color:var(--pri2);box-shadow:0 0 0 3px color-mix(in srgb,var(--pri2) 15%,transparent);transform:translateY(-1px)}
      .ramenOrder b{display:block;font-size:13px}
      .ramenOrder span{display:block;margin-top:4px;color:var(--muted);font-size:11px;font-weight:800}

      .ramenPots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .ramenPot{position:relative;min-height:235px;padding:12px 10px 14px;border:2px solid transparent;border-radius:22px;background:linear-gradient(180deg,#f8fafc,#e2e8f0);text-align:center;overflow:hidden;transition:.16s ease;touch-action:manipulation}
      .ramenPot.selected{border-color:var(--pri2);box-shadow:0 14px 30px color-mix(in srgb,var(--pri) 14%,transparent)}
      .ramenPot.burned{background:linear-gradient(180deg,#e7e5e4,#a8a29e)}
      .ramenPotTop{display:flex;align-items:center;justify-content:space-between;gap:8px;color:#475569;font-size:11px;font-weight:950}
      .ramenPotBody{position:relative;width:min(150px,92%);height:112px;margin:14px auto 10px;border:8px solid #475569;border-top-width:5px;border-radius:18px 18px 28px 28px;background:#cbd5e1;overflow:hidden;box-shadow:inset 0 5px 10px rgba(15,23,42,.16),0 8px 14px rgba(15,23,42,.12)}
      .ramenPotHandle{position:absolute;top:61px;width:28px;height:12px;border-radius:10px;background:#334155}.ramenPotHandle.left{left:calc(50% - 96px)}.ramenPotHandle.right{right:calc(50% - 96px)}
      .ramenBroth{position:absolute;left:5px;right:5px;bottom:5px;height:0;border-radius:8px 8px 19px 19px;background:linear-gradient(180deg,#fdba74,#ea580c);transition:height .2s ease,background .2s ease}
      .ramenPot.burned .ramenBroth{background:linear-gradient(180deg,#78716c,#292524)!important}
      .ramenNoodles{position:absolute;left:17%;right:17%;bottom:28px;height:0;opacity:0;background:repeating-linear-gradient(0deg,#fde68a 0 5px,#f59e0b 5px 7px);border-radius:45%;transition:.2s ease}
      .ramenPot.has-noodles .ramenNoodles{height:28px;opacity:.92}
      .ramenEgg{position:absolute;width:32px;height:26px;border-radius:50%;left:50%;bottom:45px;transform:translateX(-50%);background:#fff7ed;opacity:0;box-shadow:inset 0 0 0 8px #fbbf24}
      .ramenPot.has-egg .ramenEgg{opacity:1}
      .ramenGreen{position:absolute;left:20%;right:20%;bottom:39px;height:8px;opacity:0;background:repeating-linear-gradient(90deg,#22c55e 0 9px,transparent 9px 14px)}
      .ramenPot.has-green .ramenGreen{opacity:1}
      .ramenSteam{position:absolute;left:50%;bottom:118px;width:100px;height:52px;transform:translateX(-50%);pointer-events:none;opacity:0}
      .ramenSteam::before,.ramenSteam::after{content:'';position:absolute;bottom:0;width:13px;height:42px;border:4px solid rgba(255,255,255,.82);border-left-color:transparent;border-bottom-color:transparent;border-radius:50%;animation:ramenSteam 1.25s linear infinite}
      .ramenSteam::before{left:27px}.ramenSteam::after{right:27px;animation-delay:.35s}
      .ramenPot.cooking .ramenSteam{opacity:1}
      @keyframes ramenSteam{0%{transform:translateY(10px) scale(.8);opacity:0}30%{opacity:1}100%{transform:translateY(-12px) scale(1.15);opacity:0}}
      .ramenProgress{height:9px;margin-top:8px;border-radius:999px;background:#cbd5e1;overflow:hidden}.ramenProgress i{display:block;height:100%;width:0;background:linear-gradient(90deg,#60a5fa,#22c55e 72%,#f59e0b 88%,#ef4444);transition:width .08s linear}
      .ramenPotState{margin-top:7px;min-height:34px;color:#475569;font-size:11px;font-weight:900;line-height:1.45}

      .ramenBench{margin-top:12px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
      .ramenAction{min-height:62px;padding:8px 6px;border:1px solid var(--line);border-radius:16px;background:var(--card);color:var(--text);font-weight:950;display:grid;place-items:center;gap:2px;transition:.14s ease;touch-action:manipulation}
      .ramenAction:hover{transform:translateY(-2px)}.ramenAction:active{transform:translateY(1px) scale(.98)}
      .ramenAction span{font-size:23px}.ramenAction small{font-size:11px;color:var(--muted);font-weight:900}
      .ramenAction.serve{color:#fff;border:0;background:linear-gradient(135deg,#059669,#10b981);box-shadow:0 10px 20px rgba(5,150,105,.2)}
      .ramenAction.serve small{color:#d1fae5}

      .ramenMessage{margin-top:12px;min-height:46px;padding:12px 14px;border-radius:17px;background:color-mix(in srgb,var(--pri) 6%,var(--card));border:1px solid var(--line);font-size:12px;font-weight:850;line-height:1.55;color:var(--muted)}
      .ramenMessage.good{color:#047857;background:#ecfdf5;border-color:#a7f3d0}.ramenMessage.bad{color:#b91c1c;background:#fef2f2;border-color:#fecaca}
      .ramenStartRow{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px}
      .ramenStartRow .muted{font-size:12px;font-weight:850;line-height:1.5}

      @media(max-width:760px){
        .ramenHud{grid-template-columns:1fr 1fr}.ramenOrders{grid-template-columns:1fr}.ramenPots{grid-template-columns:1fr}.ramenPot{min-height:215px}.ramenBench{grid-template-columns:repeat(3,1fr)}
      }
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
    button.innerHTML = `<span class="gameCover coverOpoongRamen"></span><span class="gameCardInfo"><b>오풍이의 라면가게</b><span id="gameCardOpoongRamenMeta">최고 매출 ${bestRevenue().toLocaleString()}원</span></span>`;
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
        <div class="ramenStat"><span>남은 시간</span><strong id="ramenTime">75초</strong></div>
        <div class="ramenStat"><span>매출</span><strong id="ramenMoney">0원</strong></div>
        <div class="ramenStat"><span>완성</span><strong id="ramenServed">0그릇</strong></div>
        <div class="ramenStat"><span>최고 매출</span><strong id="ramenBest">${bestRevenue().toLocaleString()}원</strong></div>
      </div>

      <div class="ramenKitchen">
        <div class="ramenOrders" id="ramenOrders"></div>
        <div class="ramenPots" id="ramenPots"></div>
        <div class="ramenBench">
          <button class="ramenAction" type="button" data-ramen-action="water"><span>💧</span><small>물</small></button>
          <button class="ramenAction" type="button" data-ramen-action="noodles"><span>🍜</span><small>면</small></button>
          <button class="ramenAction" type="button" data-ramen-action="soup"><span>🥄</span><small>스프</small></button>
          <button class="ramenAction" type="button" data-ramen-action="egg"><span>🥚</span><small>계란</small></button>
          <button class="ramenAction" type="button" data-ramen-action="green"><span>🌿</span><small>파</small></button>
          <button class="ramenAction serve" type="button" data-ramen-action="serve"><span>🔔</span><small>완성!</small></button>
        </div>
        <div class="ramenMessage" id="ramenMessage">냄비를 고르고 물 → 면 → 스프 순서로 넣어주세요. 주문에 맞춰 계란·파를 추가하고, 익힘 정도 70~90%에 내면 최고 점수!</div>
      </div>
      <div class="ramenStartRow">
        <span class="muted">냄비 3개를 동시에 관리하세요. 100%를 넘기면 타버립니다.</span>
        <button class="bigBtn" id="ramenStart" type="button">영업 시작</button>
      </div>
    `;
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(panel, anchor);
    else gameView.appendChild(panel);

    panel.querySelectorAll('[data-ramen-action]').forEach(btn => btn.addEventListener('click', () => doAction(btn.dataset.ramenAction)));
    document.getElementById('ramenStart')?.addEventListener('click', startShift);
  }

  function orderText(order) {
    if (!order) return '';
    const extras = [];
    if (order.egg) extras.push('계란');
    if (order.green) extras.push('파');
    return extras.length ? `${extras.join(' + ')} 추가` : '추가 토핑 없음';
  }

  function potStateText(p) {
    if (p.burned) return '🔥 타버림 · 버리고 새로 시작';
    if (!p.water) return '빈 냄비';
    if (!p.noodles) return '물이 준비됨';
    if (!p.soup) return `면 익는 중 · ${Math.floor(p.cook)}%`;
    const toppings = [p.egg && '계란', p.green && '파'].filter(Boolean).join(' · ');
    return `${toppings || '토핑 없음'} · 익힘 ${Math.floor(p.cook)}%`;
  }

  function renderOrders() {
    const box = document.getElementById('ramenOrders');
    if (!box) return;
    box.innerHTML = pots.map((p, i) => `<div class="ramenOrder ${i === selected ? 'selected' : ''}" data-order-pot="${i}"><b>${i + 1}번 주문 · ${p.order.name}</b><span>${orderText(p.order)} · ${p.order.price.toLocaleString()}원</span></div>`).join('');
    box.querySelectorAll('[data-order-pot]').forEach(el => el.addEventListener('click', () => selectPot(Number(el.dataset.orderPot))));
  }

  function renderPots() {
    const box = document.getElementById('ramenPots');
    if (!box) return;
    box.innerHTML = pots.map((p, i) => {
      const brothHeight = p.water ? (p.noodles ? 68 : 54) : 0;
      const classes = ['ramenPot', i === selected ? 'selected' : '', p.noodles ? 'has-noodles cooking' : '', p.egg ? 'has-egg' : '', p.green ? 'has-green' : '', p.burned ? 'burned' : ''].filter(Boolean).join(' ');
      return `<button class="${classes}" type="button" data-pot="${i}">
        <div class="ramenPotTop"><span>${i + 1}번 냄비</span><span>${p.order.name}</span></div>
        <i class="ramenPotHandle left"></i><i class="ramenPotHandle right"></i>
        <div class="ramenSteam"></div>
        <div class="ramenPotBody"><div class="ramenBroth" style="height:${brothHeight}%"></div><div class="ramenNoodles"></div><div class="ramenEgg"></div><div class="ramenGreen"></div></div>
        <div class="ramenProgress"><i style="width:${Math.min(100, p.cook)}%"></i></div>
        <div class="ramenPotState">${potStateText(p)}</div>
      </button>`;
    }).join('');
    box.querySelectorAll('[data-pot]').forEach(el => el.addEventListener('click', () => selectPot(Number(el.dataset.pot))));
  }

  function renderHud() {
    const t = document.getElementById('ramenTime');
    const m = document.getElementById('ramenMoney');
    const s = document.getElementById('ramenServed');
    const b = document.getElementById('ramenBest');
    if (t) t.textContent = `${Math.max(0, Math.ceil(timeLeft))}초`;
    if (m) m.textContent = `${Math.max(0, Math.floor(money)).toLocaleString()}원`;
    if (s) s.textContent = `${served}그릇`;
    if (b) b.textContent = `${bestRevenue().toLocaleString()}원`;
  }

  function renderAll() {
    renderHud();
    renderOrders();
    renderPots();
  }

  function setMessage(text, kind = '') {
    const el = document.getElementById('ramenMessage');
    if (!el) return;
    el.textContent = text;
    el.className = `ramenMessage${kind ? ' ' + kind : ''}`;
  }

  function selectPot(index) {
    if (!Number.isInteger(index) || index < 0 || index >= pots.length) return;
    selected = index;
    renderOrders();
    renderPots();
  }

  function ensureRunning() {
    if (!running) {
      setMessage('먼저 영업 시작 버튼을 눌러주세요.', 'bad');
      return false;
    }
    return true;
  }

  function doAction(action) {
    if (!ensureRunning()) return;
    const p = pots[selected];
    if (!p) return;

    if (p.burned) {
      if (action === 'water') {
        pots[selected] = newPot(selected);
        pots[selected].water = true;
        setMessage(`${selected + 1}번 냄비를 씻고 새 물을 받았어요.`);
        renderAll();
      } else setMessage('타버린 냄비예요. 물 버튼으로 비우고 다시 시작하세요.', 'bad');
      return;
    }

    if (action === 'water') {
      if (p.water) return setMessage('이미 물이 들어 있어요.', 'bad');
      p.water = true;
      setMessage(`${selected + 1}번 냄비에 물을 받았어요.`);
    } else if (action === 'noodles') {
      if (!p.water) return setMessage('물을 먼저 넣어야 해요.', 'bad');
      if (p.noodles) return setMessage('면은 이미 들어 있어요.', 'bad');
      p.noodles = true;
      p.cook = 0;
      setMessage('면 투입! 이제 익힘 게이지를 확인하세요.');
    } else if (action === 'soup') {
      if (!p.noodles) return setMessage('면을 먼저 넣어야 해요.', 'bad');
      if (p.soup) return setMessage('스프는 이미 넣었어요.', 'bad');
      p.soup = true;
      setMessage('스프 투입 완료. 주문 토핑을 확인하세요.');
    } else if (action === 'egg') {
      if (!p.soup) return setMessage('스프까지 넣은 뒤 계란을 넣어주세요.', 'bad');
      if (p.egg) return setMessage('계란은 이미 들어 있어요.', 'bad');
      p.egg = true;
      setMessage('계란 추가!');
    } else if (action === 'green') {
      if (!p.soup) return setMessage('스프까지 넣은 뒤 파를 넣어주세요.', 'bad');
      if (p.green) return setMessage('파는 이미 들어 있어요.', 'bad');
      p.green = true;
      setMessage('파 추가!');
    } else if (action === 'serve') {
      servePot(p);
      return;
    }
    renderPots();
  }

  function servePot(p) {
    if (!p.water || !p.noodles || !p.soup) {
      money = Math.max(0, money - 200);
      setMessage('재료가 덜 들어간 라면을 냈어요. -200원', 'bad');
      pots[selected] = newPot(selected);
      renderAll();
      return;
    }

    const orderOk = p.egg === p.order.egg && p.green === p.order.green;
    const cook = p.cook;
    let multiplier = 1;
    let label = '';

    if (cook < 55) { multiplier = .35; label = '너무 설익었어요'; }
    else if (cook < 70) { multiplier = .7; label = '조금 덜 익었어요'; }
    else if (cook <= 90) { multiplier = 1.15; label = '완벽한 익힘!'; }
    else if (cook <= 100) { multiplier = .65; label = '조금 퍼졌어요'; }
    else { multiplier = .2; label = '너무 늦었어요'; }

    if (!orderOk) multiplier *= .45;
    const earned = Math.max(100, Math.round(p.order.price * multiplier / 50) * 50);
    money += earned;
    served += 1;
    setMessage(`${label}${orderOk ? '' : ' · 주문 토핑이 달라요'}  +${earned.toLocaleString()}원`, orderOk && cook >= 70 && cook <= 90 ? 'good' : 'bad');
    pots[selected] = newPot(selected);
    renderAll();
  }

  function update(dt) {
    if (!running) return;
    timeLeft -= dt;
    for (const p of pots) {
      if (!p.noodles || p.burned) continue;
      p.cook += dt * (p.soup ? 8.2 : 7.2);
      if (p.cook >= 108) {
        p.cook = 108;
        p.burned = true;
        money = Math.max(0, money - 150);
        setMessage(`${p.index + 1}번 냄비가 타버렸어요! -150원`, 'bad');
      }
    }
    if (timeLeft <= 0) endShift();
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(.08, Math.max(0, (now - lastTime) / 1000));
    lastTime = now;
    update(dt);
    renderHud();
    renderPots();
    if (running) raf = requestAnimationFrame(loop);
  }

  function startShift() {
    stopLoop();
    money = 0;
    served = 0;
    timeLeft = SHIFT_SECONDS;
    resetPots();
    running = true;
    lastTime = performance.now();
    const start = document.getElementById('ramenStart');
    if (start) start.textContent = '다시 시작';
    setMessage('영업 시작! 주문을 보고 냄비 3개를 동시에 관리하세요.', 'good');
    renderAll();
    raf = requestAnimationFrame(loop);
  }

  function endShift() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    timeLeft = 0;
    const finalMoney = Math.floor(money);
    const oldBest = bestRevenue();
    if (finalMoney > oldBest) saveBest(finalMoney);
    const record = finalMoney > oldBest ? ' 🎉 최고 기록!' : '';
    setMessage(`영업 종료! ${served}그릇 판매 · 총 매출 ${finalMoney.toLocaleString()}원${record}`, 'good');
    const meta = document.getElementById('gameCardOpoongRamenMeta');
    if (meta) meta.textContent = `최고 매출 ${bestRevenue().toLocaleString()}원`;
    renderHud();
    renderPots();
  }

  function stopLoop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
  }

  function openRamen() {
    try { baseStopActiveMiniGame?.(); } catch (_) {}
    document.querySelectorAll('#view-game .miniGamePanel').forEach(el => { el.hidden = true; });
    const hub = document.getElementById('gameHub');
    if (hub) hub.hidden = true;
    const panel = document.getElementById('gameOpoongRamenPanel');
    if (panel) panel.hidden = false;
    stopLoop();
    timeLeft = SHIFT_SECONDS;
    money = 0;
    served = 0;
    resetPots();
    setMessage('냄비를 고르고 물 → 면 → 스프 순서로 넣어주세요. 주문에 맞춰 계란·파를 추가하고, 익힘 정도 70~90%에 내면 최고 점수!');
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
