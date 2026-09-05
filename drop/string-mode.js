(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  // QR generation must never block O.drop's string-based pairing flow.
  // The core O.drop code calls drawQr() while preparing offers/answers,
  // so replace it with a harmless placeholder renderer.
  window.drawQr = async function (_canvasSelector, placeholderSelector) {
    const ph = $(placeholderSelector);
    if (ph) {
      ph.hidden = false;
      ph.innerHTML = '연결 문자열을 복사해서<br>상대 기기에 붙여넣어 주세요.';
    }
  };

  const style = document.createElement('style');
  style.id = 'odrop-string-mode-style';
  style.textContent = `
    .qrShell, #scanAnswerBtn, #scanOfferBtn, #scannerBack { display:none !important; }
    .manual { margin-top:0 !important; }
    .manual > summary { display:none !important; }
    .manual textarea {
      min-height:150px !important;
      font-size:12px !important;
      line-height:1.5 !important;
      word-break:break-all !important;
    }
    .stringModeBadge {
      display:inline-flex; margin:0 0 12px; padding:7px 10px; border-radius:999px;
      background:color-mix(in srgb,var(--pri) 9%,var(--card)); color:var(--pri);
      border:1px solid color-mix(in srgb,var(--pri) 22%,var(--line));
      font-size:11.5px; font-weight:950;
    }
    .stringGuide {
      margin:0 0 12px; padding:12px 13px; border-radius:16px;
      background:var(--card2); border:1px solid var(--line);
      color:var(--muted); font-size:12px; font-weight:800; line-height:1.65;
    }
    #copyOfferBtn, #copyAnswerBtn, #applyOfferBtn, #applyAnswerBtn { min-height:44px; }
  `;
  document.head.appendChild(style);

  function setText(sel, text) {
    const el = $(sel);
    if (el) el.textContent = text;
  }

  // Open the existing manual pairing controls and promote them to the main UI.
  $$('details.manual').forEach((el) => { el.open = true; });

  const heroTitle = document.querySelector('.hero h1');
  if (heroTitle) heroTitle.innerHTML = '문자열로 연결하고,<br>기기끼리 바로 보내기.';
  const heroP = document.querySelector('.hero p');
  if (heroP) heroP.textContent = '파일은 O.Poong 서버에 업로드하지 않습니다. 두 기기가 연결 문자열을 서로 복사·붙여넣기한 뒤 브라우저끼리 직접 연결합니다.';

  const modeTabs = $$('.modeTab');
  if (modeTabs[0]) modeTabs[0].innerHTML = '보내기<span>파일을 고르고 연결 문자열 만들기</span>';
  if (modeTabs[1]) modeTabs[1].innerHTML = '받기<span>상대 연결 문자열 붙여넣기</span>';

  setText('#makeOfferBtn', '연결 문자열 만들기');
  setText('#copyOfferBtn', '연결 문자열 복사');
  setText('#applyAnswerBtn', '답변 문자열 적용');
  setText('#applyOfferBtn', '연결 문자열 적용');
  setText('#copyAnswerBtn', '답변 문자열 복사');

  const answerManual = $('#answerManual');
  if (answerManual) answerManual.placeholder = '받는 기기에서 복사한 답변 문자열(OD1... 또는 OD0...)을 붙여넣으세요.';
  const offerManual = $('#offerManual');
  if (offerManual) offerManual.placeholder = '보내는 기기에서 복사한 연결 문자열(OD1... 또는 OD0...)을 붙여넣으세요.';

  const sendManual = answerManual?.closest('.manual');
  if (sendManual) {
    sendManual.insertAdjacentHTML('afterbegin', '<span class="stringModeBadge">기본 연결 방식 · 문자열</span><div class="stringGuide">① 위에서 연결 문자열 만들기 → ② 연결 문자열 복사 → ③ 받는 기기에 붙여넣기 → ④ 돌아온 답변 문자열을 아래에 붙여넣고 적용</div>');
  }
  const receiveManual = offerManual?.closest('.manual');
  if (receiveManual) {
    receiveManual.insertAdjacentHTML('afterbegin', '<span class="stringModeBadge">기본 연결 방식 · 문자열</span><div class="stringGuide">① 보내는 기기의 연결 문자열을 아래에 붙여넣기 → ② 연결 문자열 적용 → ③ 답변 문자열 복사 → ④ 보내는 기기에 다시 붙여넣기</div>');
  }

  // Replace QR-centric helper/status copy whenever the core app updates it.
  const replacements = [
    ['연결 QR이 준비됐어요. 받는 기기에서 스캔해 주세요.', '연결 문자열이 준비됐어요. 복사해서 받는 기기에 붙여넣어 주세요.'],
    ['답변 QR이 준비됐어요. 보내는 기기에서 이 QR을 스캔해 주세요.', '답변 문자열이 준비됐어요. 복사해서 보내는 기기에 붙여넣어 주세요.'],
    ['파일이 준비됐어요. 연결 QR을 만들어 주세요.', '파일이 준비됐어요. 연결 문자열을 만들어 주세요.'],
    ['보내는 기기의 QR을 스캔해 주세요.', '보내는 기기의 연결 문자열을 붙여넣어 주세요.'],
    ['O.drop 연결 QR이 아니에요.', 'O.drop 연결 문자열이 아니에요.'],
    ['답변 QR이 아니에요.', '답변 연결 문자열이 아니에요.'],
    ['다른 전송의 답변 QR이에요.', '다른 전송의 답변 연결 문자열이에요.'],
    ['보내기용 O.drop QR이 아니에요.', '보내기용 O.drop 연결 문자열이 아니에요.']
  ];

  function rewriteText(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      let text = node.nodeValue;
      let next = text;
      for (const [from, to] of replacements) next = next.split(from).join(to);
      if (next !== text) node.nodeValue = next;
    }
  }
  rewriteText();

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          let t = node.nodeValue;
          for (const [from, to] of replacements) t = t.split(from).join(to);
          node.nodeValue = t;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          rewriteText(node);
        }
      }
      if (m.type === 'characterData' && m.target?.nodeValue) {
        let t = m.target.nodeValue;
        for (const [from, to] of replacements) t = t.split(from).join(to);
        m.target.nodeValue = t;
      }
    }
  });
  observer.observe(document.body, {subtree:true, childList:true, characterData:true});

  // Paste convenience: when clipboard permission is available, users can use normal paste;
  // no automatic clipboard reading is performed.
})();