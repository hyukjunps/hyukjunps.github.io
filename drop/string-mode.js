(() => {
  const originalDecodePayload = window.decodePayload;
  const originalDrawQr = window.drawQr;
  if (typeof originalDecodePayload !== 'function') return;

  const PART_SIZE = 520;
  const PART_PREFIX = 'ODM1|';
  let multiScanner = null;
  let scanMode = null;
  let scanParts = null;
  let scanBusy = false;
  let lastDecoded = '';
  let lastDecodedAt = 0;

  function normalizeCandidates(input) {
    const raw = String(input ?? '')
      .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
      .trim();
    const out = [];
    const add = (v) => {
      v = String(v ?? '').trim();
      if (v && !out.includes(v)) out.push(v);
    };
    add(raw);

    try {
      const u = new URL(raw);
      add(u.searchParams.get('data'));
      add(u.searchParams.get('payload'));
      add(u.searchParams.get('odrop'));
      if (u.hash) add(u.hash.slice(1));
    } catch (_) {}

    for (const v of [...out]) {
      try { add(decodeURIComponent(v)); } catch (_) {}
      const a = v.indexOf('OD1.');
      const b = v.indexOf('OD0.');
      const i = a >= 0 && b >= 0 ? Math.min(a, b) : Math.max(a, b);
      if (i >= 0) add(v.slice(i).trim().split(/\s+/)[0]);
    }
    return out;
  }

  window.decodePayload = function (text) {
    let lastError = null;
    for (const candidate of normalizeCandidates(text)) {
      if (!candidate.startsWith('OD1.') && !candidate.startsWith('OD0.')) continue;
      try { return originalDecodePayload(candidate); }
      catch (err) { lastError = err; }
    }
    if (lastError) throw lastError;
    throw new Error('O.drop 연결 QR을 인식하지 못했어요.');
  };

  function randomPartId() {
    try {
      const a = crypto.getRandomValues(new Uint8Array(4));
      return [...a].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
    } catch (_) {
      return Math.random().toString(36).slice(2, 10).toUpperCase();
    }
  }

  function splitPayload(text) {
    const raw = String(text || '');
    const total = Math.max(1, Math.ceil(raw.length / PART_SIZE));
    const id = randomPartId();
    const parts = [];
    for (let i = 0; i < total; i++) {
      const chunk = raw.slice(i * PART_SIZE, (i + 1) * PART_SIZE);
      parts.push(`${PART_PREFIX}${id}|${i + 1}|${total}|${chunk}`);
    }
    return { id, parts };
  }

  function clearQrTimer(canvas) {
    if (canvas && canvas._odropCycleTimer) {
      clearInterval(canvas._odropCycleTimer);
      canvas._odropCycleTimer = null;
    }
  }

  function ensureQrBadge(canvas) {
    const shell = canvas?.closest('.qrShell');
    if (!shell) return null;
    let badge = shell.parentElement?.querySelector('.odropQrPartBadge');
    if (!badge) {
      badge = document.createElement('div');
      badge.className = 'odropQrPartBadge';
      shell.insertAdjacentElement('afterend', badge);
    }
    return badge;
  }

  async function renderQrPart(canvas, text) {
    await QRCode.toCanvas(canvas, text, {
      width: 720,
      margin: 7,
      errorCorrectionLevel: 'L',
      color: { dark: '#000000', light: '#ffffff' }
    });
    canvas.hidden = false;
  }

  if (typeof originalDrawQr === 'function' && window.QRCode) {
    window.drawQr = async function (canvasSelector, placeholderSelector, text) {
      const canvas = document.querySelector(canvasSelector);
      const ph = document.querySelector(placeholderSelector);
      if (!canvas) return originalDrawQr(canvasSelector, placeholderSelector, text);

      clearQrTimer(canvas);
      const { parts } = splitPayload(text);
      let index = 0;
      const badge = ensureQrBadge(canvas);

      const show = async () => {
        try {
          await renderQrPart(canvas, parts[index]);
          if (ph) ph.hidden = true;
          if (badge) {
            badge.textContent = parts.length === 1
              ? 'QR을 스캔해 주세요.'
              : `분할 QR ${index + 1}/${parts.length} · 자동으로 다음 QR로 바뀝니다`;
          }
        } catch (e) {
          console.error(e);
          return originalDrawQr(canvasSelector, placeholderSelector, text);
        }
      };

      await show();
      if (parts.length > 1) {
        canvas._odropCycleTimer = setInterval(() => {
          index = (index + 1) % parts.length;
          show();
        }, 1350);
      }
    };
  }

  const style = document.createElement('style');
  style.id = 'odrop-qr-reliability-style';
  style.textContent = `
    .qrShell{width:min(100%,540px)!important;padding:12px!important;border-radius:22px!important}
    .qrShell canvas{image-rendering:pixelated!important;width:100%!important;height:100%!important;background:#fff!important}
    .odropQrPartBadge{margin:9px 0 0;text-align:center;color:var(--muted);font-size:12px;font-weight:900;line-height:1.5}
    #qrReader{min-height:380px!important;background:#000!important}
    #qrReader video{object-fit:cover!important}
    @media(max-width:760px){.qrShell{width:min(95vw,520px)!important}.scannerModal{width:min(96vw,640px)!important}}
  `;
  document.head.appendChild(style);

  function setScannerStatus(text, kind = '') {
    const el = document.querySelector('#scannerStatus');
    if (!el) return;
    el.className = 'status' + (kind ? ' ' + kind : '');
    el.textContent = text;
  }

  async function stopMultiScanner() {
    scanBusy = false;
    scanMode = null;
    scanParts = null;
    lastDecoded = '';
    lastDecodedAt = 0;
    if (multiScanner) {
      try { await multiScanner.stop(); } catch (_) {}
      try { await multiScanner.clear(); } catch (_) {}
      multiScanner = null;
    }
    const back = document.querySelector('#scannerBack');
    const reader = document.querySelector('#qrReader');
    if (back) back.hidden = true;
    if (reader) reader.innerHTML = '';
  }

  function parsePart(text) {
    const raw = String(text || '').trim();
    if (!raw.startsWith(PART_PREFIX)) return null;
    const pieces = raw.split('|');
    if (pieces.length < 5) return null;
    const id = pieces[1];
    const index = Number(pieces[2]);
    const total = Number(pieces[3]);
    const chunk = pieces.slice(4).join('|');
    if (!id || !Number.isInteger(index) || !Number.isInteger(total) || index < 1 || total < 1 || index > total || total > 20) return null;
    return { id, index, total, chunk };
  }

  function applyScannedPayload(payload, mode) {
    if (mode === 'offer') {
      const area = document.querySelector('#offerManual');
      const btn = document.querySelector('#applyOfferBtn');
      if (area) area.value = payload;
      if (btn) btn.click();
    } else {
      const area = document.querySelector('#answerManual');
      const btn = document.querySelector('#applyAnswerBtn');
      if (area) area.value = payload;
      if (btn) btn.click();
    }
  }

  async function handleDecoded(decodedText) {
    if (scanBusy) return;
    const now = Date.now();
    if (decodedText === lastDecoded && now - lastDecodedAt < 900) return;
    lastDecoded = decodedText;
    lastDecodedAt = now;

    const part = parsePart(decodedText);
    if (!part) {
      scanBusy = true;
      const mode = scanMode;
      await stopMultiScanner();
      applyScannedPayload(decodedText, mode);
      return;
    }

    if (!scanParts || scanParts.id !== part.id || scanParts.total !== part.total) {
      scanParts = { id: part.id, total: part.total, values: new Array(part.total).fill(null) };
    }
    scanParts.values[part.index - 1] = part.chunk;
    const got = scanParts.values.filter(Boolean).length;

    if (got < scanParts.total) {
      setScannerStatus(`분할 QR ${got}/${scanParts.total} 읽음 · 화면을 그대로 두면 다음 QR도 자동으로 읽습니다.`, 'ok');
      return;
    }

    scanBusy = true;
    const mode = scanMode;
    const payload = scanParts.values.join('');
    await stopMultiScanner();
    applyScannedPayload(payload, mode);
  }

  async function startMultiScanner(mode) {
    if (!window.Html5Qrcode) {
      alert('QR 카메라 모듈을 불러오지 못했어요.');
      return;
    }

    await stopMultiScanner();
    scanMode = mode;
    scanBusy = false;
    scanParts = null;

    const titleEl = document.querySelector('#scannerTitle');
    const back = document.querySelector('#scannerBack');
    const reader = document.querySelector('#qrReader');
    if (titleEl) titleEl.textContent = mode === 'offer' ? '연결 QR 스캔' : '답변 QR 스캔';
    if (back) back.hidden = false;
    if (reader) reader.innerHTML = '';
    setScannerStatus('QR 전체가 카메라 안에 들어오게 맞춰 주세요. 여러 장이면 자동으로 이어서 읽습니다.');

    try {
      multiScanner = new Html5Qrcode('qrReader', { verbose: false });
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) throw new Error('사용 가능한 카메라가 없어요.');
      const preferred = cameras.find(c => /back|rear|environment|후면/i.test(c.label)) || cameras[cameras.length - 1];
      await multiScanner.start(
        preferred.id,
        {
          fps: 18,
          disableFlip: false,
          aspectRatio: 1,
          qrbox: (w, h) => {
            const size = Math.floor(Math.min(w, h) * 0.9);
            return { width: size, height: size };
          }
        },
        handleDecoded,
        () => {}
      );
      setScannerStatus('스캔 중 · QR 네 모서리가 모두 보이게 해 주세요.', 'ok');
    } catch (e) {
      console.error(e);
      setScannerStatus('카메라를 시작하지 못했어요: ' + e.message, 'bad');
    }
  }

  // IMPORTANT: capture phase prevents the old already-bound scanner click handlers from running.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('#scanOfferBtn,#scanAnswerBtn,#closeScannerBtn') : null;
    if (!target) return;

    if (target.id === 'scanOfferBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      startMultiScanner('offer');
      return;
    }
    if (target.id === 'scanAnswerBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (target.disabled) return;
      startMultiScanner('answer');
      return;
    }
    if (target.id === 'closeScannerBtn') {
      event.preventDefault();
      event.stopImmediatePropagation();
      stopMultiScanner();
    }
  }, true);

  document.addEventListener('click', (event) => {
    const back = document.querySelector('#scannerBack');
    if (event.target === back) {
      event.preventDefault();
      event.stopImmediatePropagation();
      stopMultiScanner();
    }
  }, true);

  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) heroTitle.innerHTML = 'QR로 연결하고,<br>기기끼리 바로 보내기.';
  const heroText = document.querySelector('.hero p');
  if (heroText) heroText.textContent = '파일은 O.Poong 서버에 업로드하지 않습니다. 긴 연결 정보는 여러 개의 짧은 QR로 자동 분할되어 카메라가 순서대로 읽습니다.';

  document.querySelectorAll('details.manual').forEach(el => { el.open = false; });
  const sendTab = document.querySelector('.modeTab[data-mode="send"] span');
  const receiveTab = document.querySelector('.modeTab[data-mode="receive"] span');
  if (sendTab) sendTab.textContent = '파일을 고르고 연결 QR 만들기';
  if (receiveTab) receiveTab.textContent = '상대 QR을 스캔해 연결하기';
  const makeOffer = document.querySelector('#makeOfferBtn');
  if (makeOffer) makeOffer.textContent = '연결 QR 만들기';
})();