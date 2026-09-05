(() => {
  const originalDecodePayload = window.decodePayload;
  const originalDrawQr = window.drawQr;
  if (typeof originalDecodePayload !== 'function') return;

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
    throw new Error('O.drop 연결 QR을 인식하지 못했어요. QR 전체가 카메라에 보이도록 거리를 조금 벌려 주세요.');
  };

  // Make dense WebRTC QR codes physically larger and give them a wider quiet zone.
  if (typeof originalDrawQr === 'function' && window.QRCode) {
    window.drawQr = async function (canvasSelector, placeholderSelector, text) {
      const canvas = document.querySelector(canvasSelector);
      const ph = document.querySelector(placeholderSelector);
      if (!canvas) return originalDrawQr(canvasSelector, placeholderSelector, text);
      await QRCode.toCanvas(canvas, text, {
        width: 720,
        margin: 5,
        errorCorrectionLevel: 'L',
        color: { dark: '#000000', light: '#ffffff' }
      });
      canvas.hidden = false;
      if (ph) ph.hidden = true;
    };
  }

  const style = document.createElement('style');
  style.id = 'odrop-qr-reliability-style';
  style.textContent = `
    .qrShell{width:min(100%,520px)!important;padding:12px!important;border-radius:22px!important}
    .qrShell canvas{image-rendering:pixelated!important;width:100%!important;height:100%!important;background:#fff!important}
    #qrReader{min-height:360px!important;background:#000!important}
    #qrReader video{object-fit:cover!important}
    @media(max-width:760px){.qrShell{width:min(94vw,500px)!important}.scannerModal{width:min(96vw,620px)!important}}
  `;
  document.head.appendChild(style);

  // Replace the original small 260x260 scan box with a large full-camera scan area.
  window.openScanner = async function (title, handler) {
    if (!window.Html5Qrcode) {
      if (typeof window.toast === 'function') toast('QR 카메라 모듈을 불러오지 못했어요.');
      return;
    }

    window.scannerHandler = handler;
    const titleEl = document.querySelector('#scannerTitle');
    const back = document.querySelector('#scannerBack');
    const status = document.querySelector('#scannerStatus');
    const reader = document.querySelector('#qrReader');
    if (titleEl) titleEl.textContent = title;
    if (back) back.hidden = false;
    if (status) {
      status.className = 'status';
      status.textContent = 'QR 전체가 화면 안에 들어오도록 맞춰 주세요. 가까이 대기보다 조금 거리를 두는 게 더 잘 읽혀요.';
    }

    try {
      if (window.scanner) {
        try { await window.scanner.stop(); } catch (_) {}
        try { await window.scanner.clear(); } catch (_) {}
      }
      if (reader) reader.innerHTML = '';
      window.scanner = new Html5Qrcode('qrReader', { verbose: false });

      const config = {
        fps: 20,
        disableFlip: false,
        videoConstraints: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          focusMode: 'continuous'
        }
      };

      const onSuccess = async (decodedText) => {
        const fn = window.scannerHandler;
        try {
          if (window.scanner) {
            try { await window.scanner.stop(); } catch (_) {}
            try { await window.scanner.clear(); } catch (_) {}
            window.scanner = null;
          }
          if (back) back.hidden = true;
          if (reader) reader.innerHTML = '';
          await fn(decodedText);
          if (typeof window.toast === 'function') toast('QR을 읽었어요.');
        } catch (e) {
          console.error(e);
          if (typeof window.toast === 'function') toast(e.message || 'QR을 처리하지 못했어요.');
        }
      };

      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) throw new Error('사용 가능한 카메라가 없어요.');
      const preferred = cameras.find(c => /back|rear|environment|후면/i.test(c.label)) || cameras[cameras.length - 1];
      await window.scanner.start(preferred.id, config, onSuccess, () => {});

      if (status) {
        status.className = 'status ok';
        status.textContent = '스캔 중 · QR의 네 모서리가 모두 카메라 화면에 보이게 해 주세요.';
      }
    } catch (e) {
      console.error(e);
      if (status) {
        status.className = 'status bad';
        status.textContent = '카메라를 시작하지 못했어요: ' + e.message;
      }
    }
  };

  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) heroTitle.innerHTML = 'QR로 연결하고,<br>기기끼리 바로 보내기.';
  const heroText = document.querySelector('.hero p');
  if (heroText) heroText.textContent = '파일은 O.Poong 서버에 업로드하지 않습니다. QR로 연결한 뒤 브라우저끼리 직접 전송하며, 연결 문자열은 카메라가 어려울 때만 보조로 사용할 수 있어요.';

  document.querySelectorAll('details.manual').forEach(el => { el.open = false; });

  const sendTab = document.querySelector('.modeTab[data-mode="send"] span');
  const receiveTab = document.querySelector('.modeTab[data-mode="receive"] span');
  if (sendTab) sendTab.textContent = '파일을 고르고 연결 QR 만들기';
  if (receiveTab) receiveTab.textContent = '상대 QR을 스캔해 연결하기';

  const makeOffer = document.querySelector('#makeOfferBtn');
  if (makeOffer) makeOffer.textContent = '연결 QR 만들기';
})();