(() => {
  'use strict';

  const GAME_TITLES = {
    jump: 'O.Poong Jump',
    ttt: '틱택토',
    stack: '블록 쌓기',
    water: '워터 소트',
    maze: '미로 찾기',
    snake: '스네이크',
    mine: '지뢰찾기',
    click: '마우스 클릭 테스트',
    typing: '타자 게임',
    'opoong-run': 'O.Poong Run',
    'opoong-ramen': '오풍이의 라면가게'
  };

  const PRIMARY_IDS = {
    jump: ['gameScore', '점수'],
    ttt: ['tttStatus', '결과'],
    stack: ['stackScore', '기록'],
    water: ['waterMoves', '이동 횟수'],
    maze: ['mazeMoves', '이동 횟수'],
    snake: ['snakeScore', '점수'],
    mine: ['mineTime', '기록'],
    click: ['clickCps', 'CPS'],
    typing: ['typingCpm', '타수'],
    'opoong-run': ['opoongRunDistance', '거리'],
    'opoong-ramen': ['ramenMoney', '최종 수입']
  };

  const EXTRA_STAT_IDS = {
    jump: [['gameBest','최고 점수'],['gameStars','모은 별']],
    ttt: [['tttWins','누적 승리']],
    stack: [['stackBest','최고 기록']],
    water: [['waterLevel','퍼즐'],['waterBest','최고 기록']],
    maze: [['mazeTime','남은 시간'],['mazeBest','최고 기록']],
    snake: [['snakeBest','최고 기록']],
    mine: [['mineRemaining','남은 지뢰'],['mineBest','최고 기록']],
    click: [['clickCount','클릭 수'],['clickBest','최고 기록']],
    typing: [['typingAccuracy','정확도'],['typingStatus','결과']],
    'opoong-run': [['opoongRunCoins','코인'],['opoongRunBest','최고 기록']],
    'opoong-ramen': [['ramenServed','완성'],['ramenBurns','탄 냄비'],['ramenTarget','목표']]
  };

  const NEW_GAMES = new Set(['click','typing','opoong-run','opoong-ramen']);
  let lastResult = null;
  let installed = false;
  let originalShowGameOverAd = null;
  let originalRestartGameAfterAd = null;

  function textOf(el) {
    return String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function addStat(list, seen, label, value) {
    label = String(label || '').trim();
    value = String(value || '').trim();
    if (!label || !value) return;
    const key = `${label}|${value}`;
    if (seen.has(key)) return;
    seen.add(key);
    list.push({ label, value });
  }

  function collectStats(game, supplied = null) {
    if (supplied && typeof supplied === 'object') {
      return {
        game,
        title: supplied.title || GAME_TITLES[game] || 'O.Poong 게임',
        primaryLabel: supplied.primaryLabel || '기록',
        primaryValue: String(supplied.primaryValue ?? '완료'),
        stats: Array.isArray(supplied.stats) ? supplied.stats.slice(0, 5) : [],
        createdAt: new Date().toISOString()
      };
    }

    const stats = [];
    const seen = new Set();
    const primary = PRIMARY_IDS[game] || [null, '기록'];
    let primaryValue = primary[0] ? textOf(document.getElementById(primary[0])) : '';
    let primaryLabel = primary[1] || '기록';

    (EXTRA_STAT_IDS[game] || []).forEach(([id, label]) => addStat(stats, seen, label, textOf(document.getElementById(id))));

    const panel = Array.from(document.querySelectorAll('#view-game .miniGamePanel')).find((el) => !el.hidden);
    if (panel) {
      panel.querySelectorAll('.gameHud > div, .extraStat, .opoongRunStat, .ramenStat').forEach((box) => {
        addStat(stats, seen, textOf(box.querySelector('span')), textOf(box.querySelector('strong')));
      });
    }

    if (!primaryValue && stats.length) {
      primaryLabel = stats[0].label;
      primaryValue = stats[0].value;
    }
    if (!primaryValue) primaryValue = '완료';

    return {
      game,
      title: GAME_TITLES[game] || 'O.Poong 게임',
      primaryLabel,
      primaryValue,
      stats: stats.filter((s) => !(s.label === primaryLabel && s.value === primaryValue)).slice(0, 5),
      createdAt: new Date().toISOString()
    };
  }

  function ensureStyle() {
    if (document.getElementById('opoongGameShareStyle')) return;
    const style = document.createElement('style');
    style.id = 'opoongGameShareStyle';
    style.textContent = `
      .opoongShareActions{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:12px}
      .opoongShareBtn{min-height:46px;padding:11px 17px;border:0;border-radius:16px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:1000;box-shadow:0 10px 24px rgba(37,99,235,.22);cursor:pointer}
      .opoongShareBtn.secondary{background:linear-gradient(135deg,#0f766e,#059669);box-shadow:0 10px 24px rgba(5,150,105,.18)}
      .opoongShareBtn:disabled{opacity:.55;cursor:wait}
      .opoongShareNote{margin:7px 0 0;text-align:center;color:var(--muted,#64748b);font-size:11px;font-weight:800;line-height:1.45}
    `;
    document.head.appendChild(style);
  }

  function makeShareBlock(location) {
    const wrap = document.createElement('div');
    wrap.className = 'opoongShareActions';
    wrap.dataset.opoongShareBlock = location;

    const button = document.createElement('button');
    button.className = `opoongShareBtn${location === 'restart' ? ' secondary' : ''}`;
    button.type = 'button';
    button.textContent = '친구에게 기록 공유하기';
    button.addEventListener('click', () => shareLastResult(button));
    wrap.appendChild(button);
    return wrap;
  }

  function ensureShareUi() {
    ensureStyle();
    const adStage = document.getElementById('gameOverAdStage');
    const restartStage = document.getElementById('gameOverRestartStage');

    if (adStage && !adStage.querySelector('[data-opoong-share-block="ad"]')) {
      adStage.appendChild(makeShareBlock('ad'));
      const note = document.createElement('p');
      note.className = 'opoongShareNote';
      note.textContent = '방금 플레이한 기록을 PNG 이미지 파일로 공유해요.';
      adStage.appendChild(note);
    }

    if (restartStage && !restartStage.querySelector('[data-opoong-share-block="restart"]')) {
      const actions = restartStage.querySelector('.gameOverRestartActions');
      const block = makeShareBlock('restart');
      if (actions) actions.insertAdjacentElement('afterend', block);
      else restartStage.appendChild(block);
    }
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function fitText(ctx, text, maxWidth, startSize, minSize = 28) {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `1000 ${size}px system-ui,-apple-system,"Noto Sans KR",sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }

  async function resultCode(result) {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(result));
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      return Array.from(digest.slice(0, 6)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    } catch (_) {
      return Math.random().toString(36).slice(2, 12).toUpperCase();
    }
  }

  async function makePng(result) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, 1200, 630);
    bg.addColorStop(0, '#eff6ff');
    bg.addColorStop(.55, '#ffffff');
    bg.addColorStop(1, '#ecfeff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1200, 630);

    ctx.fillStyle = 'rgba(37,99,235,.08)';
    ctx.beginPath(); ctx.arc(1100, 35, 260, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(14,165,233,.07)';
    ctx.beginPath(); ctx.arc(40, 650, 250, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#2563eb';
    roundRect(ctx, 64, 48, 78, 78, 22); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '1000 43px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('O', 103, 88);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0f172a';
    ctx.font = '1000 32px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText('O.Poong', 164, 83);
    ctx.fillStyle = '#64748b';
    ctx.font = '850 18px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText('GAME RESULT', 164, 113);

    ctx.fillStyle = '#1e40af';
    ctx.font = '950 27px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText(result.title, 66, 190);

    ctx.fillStyle = '#64748b';
    ctx.font = '900 20px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText(result.primaryLabel, 66, 238);

    ctx.fillStyle = '#0f172a';
    const size = fitText(ctx, result.primaryValue, 1060, 100, 48);
    ctx.font = `1000 ${size}px system-ui,-apple-system,"Noto Sans KR",sans-serif`;
    ctx.fillText(result.primaryValue, 66, 338);

    const extra = result.stats.slice(0, 3);
    if (extra.length) {
      const gap = 18;
      const w = Math.floor((1068 - gap * (extra.length - 1)) / extra.length);
      extra.forEach((item, i) => {
        const x = 66 + i * (w + gap);
        ctx.fillStyle = 'rgba(255,255,255,.94)';
        roundRect(ctx, x, 390, w, 116, 22); ctx.fill();
        ctx.strokeStyle = '#dbeafe'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '850 16px system-ui,-apple-system,"Noto Sans KR",sans-serif';
        ctx.fillText(item.label, x + 20, 426);
        ctx.fillStyle = '#0f172a';
        const s = fitText(ctx, item.value, w - 40, 31, 21);
        ctx.font = `1000 ${s}px system-ui,-apple-system,"Noto Sans KR",sans-serif`;
        ctx.fillText(item.value, x + 20, 472);
      });
    }

    const code = await resultCode(result);
    const stamp = new Intl.DateTimeFormat('ko-KR', {
      year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit'
    }).format(new Date(result.createdAt));

    ctx.fillStyle = '#64748b';
    ctx.font = '800 15px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText(`O.Poong 결과 카드 · ${stamp} · RESULT ${code}`, 66, 568);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '750 14px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText('hyukjunps.github.io', 66, 597);

    return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('결과 이미지를 만들지 못했어요.')), 'image/png', 1));
  }

  function filename(title) {
    return String(title || 'opoong-game').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').slice(0, 55) + '-result.png';
  }

  async function shareLastResult(button) {
    if (!lastResult) {
      alert('공유할 게임 기록이 없어요.');
      return;
    }
    const old = button?.textContent || '친구에게 기록 공유하기';
    if (button) { button.disabled = true; button.textContent = 'PNG 만드는 중…'; }
    try {
      const blob = await makePng(lastResult);
      const file = new File([blob], filename(lastResult.title), { type:'image/png' });

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files:[file] }))) {
        await navigator.share({
          title: `${lastResult.title} 기록`,
          text: `O.Poong ${lastResult.title} · ${lastResult.primaryLabel} ${lastResult.primaryValue}`,
          files:[file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') alert(error?.message || '기록 공유에 실패했어요.');
    } finally {
      if (button) { button.disabled = false; button.textContent = old; }
    }
  }

  function capture(game, supplied = null) {
    lastResult = collectStats(game, supplied);
    try { sessionStorage.setItem('opoong_last_game_result', JSON.stringify(lastResult)); } catch (_) {}
    return lastResult;
  }

  function show(game, supplied = null) {
    capture(game, supplied);
    if (typeof originalShowGameOverAd === 'function') return originalShowGameOverAd(game);
  }

  function restoreLast() {
    try {
      const value = JSON.parse(sessionStorage.getItem('opoong_last_game_result') || 'null');
      if (value && value.game) lastResult = value;
    } catch (_) {}
  }

  function install() {
    if (installed) return;
    if (typeof window.showGameOverAd !== 'function' || !document.getElementById('gameOverAdStage')) {
      setTimeout(install, 100);
      return;
    }
    installed = true;
    restoreLast();
    originalShowGameOverAd = window.showGameOverAd;
    originalRestartGameAfterAd = window.restartGameAfterAd;
    ensureShareUi();

    window.showGameOverAd = function(game) {
      capture(game);
      ensureShareUi();
      return originalShowGameOverAd.apply(this, arguments);
    };

    window.restartGameAfterAd = function() {
      const game = lastResult?.game;
      if (game && NEW_GAMES.has(game)) {
        try { window.closeGameRestartPrompt?.(); } catch (_) {}
        window.openMiniGame?.(game);
        return;
      }
      if (typeof originalRestartGameAfterAd === 'function') return originalRestartGameAfterAd.apply(this, arguments);
    };

    window.OpoongGameResults = {
      capture,
      show,
      share: () => {
        const btn = document.querySelector('.opoongShareBtn');
        return shareLastResult(btn || null);
      },
      getLast: () => lastResult ? JSON.parse(JSON.stringify(lastResult)) : null
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
