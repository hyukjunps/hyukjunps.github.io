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
    'opoong-ramen': ['ramenMoney', '매출']
  };

  let lastResult = null;
  let installed = false;
  let originalShowGameOverAd = null;

  function textOf(el) {
    return String(el?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function getVisiblePanel() {
    return Array.from(document.querySelectorAll('#view-game .miniGamePanel')).find((el) => !el.hidden) || null;
  }

  function collectStats(game) {
    const panel = getVisiblePanel();
    const stats = [];
    const seen = new Set();

    const add = (label, value) => {
      label = String(label || '').trim();
      value = String(value || '').trim();
      if (!label || !value) return;
      const key = `${label}|${value}`;
      if (seen.has(key)) return;
      seen.add(key);
      stats.push({ label, value });
    };

    if (panel) {
      panel.querySelectorAll('.gameHud > div, .extraStat, .opoongRunStat, .ramenStat').forEach((box) => {
        add(textOf(box.querySelector('span')), textOf(box.querySelector('strong')));
      });
    }

    const primary = PRIMARY_IDS[game];
    let primaryLabel = '기록';
    let primaryValue = '';
    if (primary) {
      primaryLabel = primary[1];
      primaryValue = textOf(document.getElementById(primary[0]));
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
      stats: stats.slice(0, 4),
      createdAt: new Date().toISOString()
    };
  }

  function ensureShareUi() {
    const stage = document.getElementById('gameOverAdStage');
    if (!stage || document.getElementById('opoongGameShareButton')) return;

    const style = document.createElement('style');
    style.id = 'opoongGameShareStyle';
    style.textContent = `
      .opoongGameShareWrap{display:flex;justify-content:center;margin-top:12px}
      .opoongGameShareButton{min-height:46px;padding:11px 17px;border:0;border-radius:16px;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-weight:1000;box-shadow:0 10px 24px rgba(37,99,235,.22);cursor:pointer}
      .opoongGameShareButton:disabled{opacity:.58;cursor:wait}
      .opoongGameShareHint{margin:7px 0 0;text-align:center;color:var(--muted,#64748b);font-size:11px;font-weight:800;line-height:1.45}
    `;
    document.head.appendChild(style);

    const wrap = document.createElement('div');
    wrap.className = 'opoongGameShareWrap';
    const button = document.createElement('button');
    button.id = 'opoongGameShareButton';
    button.className = 'opoongGameShareButton';
    button.type = 'button';
    button.textContent = '친구에게 자랑하기';
    button.addEventListener('click', shareLastResult);
    wrap.appendChild(button);

    const hint = document.createElement('p');
    hint.className = 'opoongGameShareHint';
    hint.textContent = '결과를 PNG 이미지 파일로 만들어 공유해요.';

    stage.appendChild(wrap);
    stage.appendChild(hint);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }

  function fitText(ctx, text, maxWidth, startSize, minSize = 34) {
    let size = startSize;
    while (size > minSize) {
      ctx.font = `1000 ${size}px system-ui,-apple-system,"Noto Sans KR",sans-serif`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    return size;
  }

  async function shortCode(result) {
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(result));
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      return Array.from(digest.slice(0, 5)).map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    } catch (_) {
      return Math.random().toString(36).slice(2, 10).toUpperCase();
    }
  }

  async function makeResultPng(result) {
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
    ctx.beginPath(); ctx.arc(1110, 50, 260, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(14,165,233,.07)';
    ctx.beginPath(); ctx.arc(60, 630, 250, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#2563eb';
    roundRect(ctx, 64, 52, 76, 76, 22); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '1000 42px system-ui,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('O', 102, 91);

    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#0f172a';
    ctx.font = '1000 31px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText('O.Poong', 160, 86);
    ctx.fillStyle = '#64748b';
    ctx.font = '850 18px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText('GAME RESULT', 160, 116);

    ctx.fillStyle = '#1e40af';
    ctx.font = '950 26px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText(result.title, 66, 192);

    ctx.fillStyle = '#64748b';
    ctx.font = '900 20px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText(result.primaryLabel, 66, 244);

    ctx.fillStyle = '#0f172a';
    const pSize = fitText(ctx, result.primaryValue, 1010, 102, 52);
    ctx.font = `1000 ${pSize}px system-ui,-apple-system,"Noto Sans KR",sans-serif`;
    ctx.fillText(result.primaryValue, 66, 344);

    const extra = result.stats.filter((s) => !(s.label === result.primaryLabel && s.value === result.primaryValue)).slice(0, 3);
    const boxY = 392;
    const gap = 18;
    const boxW = extra.length ? Math.floor((1068 - gap * (extra.length - 1)) / extra.length) : 1068;

    if (extra.length) {
      extra.forEach((item, i) => {
        const x = 66 + i * (boxW + gap);
        ctx.fillStyle = 'rgba(255,255,255,.92)';
        roundRect(ctx, x, boxY, boxW, 112, 22); ctx.fill();
        ctx.strokeStyle = '#dbeafe'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#64748b';
        ctx.font = '850 16px system-ui,-apple-system,"Noto Sans KR",sans-serif';
        ctx.fillText(item.label, x + 20, boxY + 34);
        ctx.fillStyle = '#0f172a';
        const size = fitText(ctx, item.value, boxW - 40, 31, 21);
        ctx.font = `1000 ${size}px system-ui,-apple-system,"Noto Sans KR",sans-serif`;
        ctx.fillText(item.value, x + 20, boxY + 78);
      });
    }

    const code = await shortCode(result);
    const date = new Date(result.createdAt);
    const stamp = new Intl.DateTimeFormat('ko-KR', {
      year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'
    }).format(date);

    ctx.fillStyle = '#64748b';
    ctx.font = '800 15px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText(`O.Poong 결과 카드 · ${stamp} · RESULT ${code}`, 66, 570);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '750 14px system-ui,-apple-system,"Noto Sans KR",sans-serif';
    ctx.fillText('hyukjunps.github.io', 66, 598);

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요.')), 'image/png', 1);
    });
  }

  function safeFilename(title) {
    return String(title || 'opoong-result').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/-+/g, '-').slice(0, 55);
  }

  async function shareLastResult() {
    const button = document.getElementById('opoongGameShareButton');
    if (!lastResult || !button) return;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = '이미지 만드는 중…';
    try {
      const blob = await makeResultPng(lastResult);
      const file = new File([blob], `${safeFilename(lastResult.title)}-result.png`, { type: 'image/png' });
      const shareData = {
        title: `${lastResult.title} 결과`,
        text: 'O.Poong 게임 결과',
        files: [file]
      };

      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share(shareData);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      }
    } catch (error) {
      if (error?.name !== 'AbortError') alert(error?.message || '결과 이미지 공유에 실패했어요.');
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  function install() {
    if (installed) return;
    if (typeof window.showGameOverAd !== 'function' || !document.getElementById('gameOverAdStage')) {
      setTimeout(install, 120);
      return;
    }
    installed = true;
    originalShowGameOverAd = window.showGameOverAd;
    ensureShareUi();

    window.showGameOverAd = function(game) {
      lastResult = collectStats(game);
      const result = originalShowGameOverAd.apply(this, arguments);
      ensureShareUi();
      return result;
    };
    window.showGameOverAd.__opoongShareWrapped = true;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
