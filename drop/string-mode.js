(() => {
  const originalDecodePayload = window.decodePayload;
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
    throw new Error('O.drop 연결 QR을 인식하지 못했어요. QR을 크게 맞춰 다시 스캔해 주세요.');
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