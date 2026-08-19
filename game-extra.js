(() => {
  'use strict';

  const CLICK_BEST_KEY = 'opoong_click_test_best_v1';
  const TYPE_BEST_KEY = 'opoong_typing_best_v1';
  const EXTRA_GAMES = new Set(['click', 'typing', 'piano']);
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let baseRenderGameLibraryStats = null;
  let installed = false;

  let clickTimer = 0;
  let clickRunning = false;
  let clickFinished = false;
  let clickCount = 0;
  let clickDuration = 5;
  let clickStartedAt = 0;
  let clickRaf = 0;

  const TYPE_SECONDS = 30;
  const TYPE_SENTENCES = [
    '오늘 할 일을 하나씩 끝내 보자.',
    '쉬는 시간은 생각보다 빨리 지나간다.',
    '집중할 때는 한 가지에만 집중한다.',
    '작은 기록이 쌓이면 큰 변화가 된다.',
    '풍산의 하루도 오늘부터 다시 시작이다.',
    '모르는 문제는 표시하고 다시 돌아온다.',
    '급할수록 문장을 천천히 정확하게 읽는다.',
    '친구와 함께하면 어려운 일도 조금 쉬워진다.',
    '오늘의 목표를 끝내고 편하게 쉬자.',
    '실수한 글자는 지우고 다시 정확하게 입력한다.',
    '좋은 습관은 반복할수록 자연스러워진다.',
    '수업이 끝난 뒤에는 필요한 내용을 바로 정리한다.'
  ];
  let typeTimer = 0;
  let typeRunning = false;
  let typeFinished = false;
  let typeStartedAt = 0;
  let typeRemaining = TYPE_SECONDS;
  let typeSentence = '';
  let typeCompletedChars = 0;
  let typeTotalTyped = 0;
  let typeCorrectTyped = 0;
  let typePrevValue = '';
  let typeLastSentence = -1;

  let audioContext = null;
  let pianoOctave = 0;
  let pianoSustain = false;
  const activeNotes = new Map();
  const KEY_TO_NOTE = {
    a: 'C', w: 'Cs', s: 'D', e: 'Ds', d: 'E', f: 'F', t: 'Fs', g: 'G', y: 'Gs', h: 'A', u: 'As', j: 'B', k: 'C5'
  };
  const PIANO_NOTES = [
    { id:'C',  label:'C',  semitone:0,  black:false, key:'A' },
    { id:'Cs', label:'C♯', semitone:1,  black:true,  key:'W' },
    { id:'D',  label:'D',  semitone:2,  black:false, key:'S' },
    { id:'Ds', label:'D♯', semitone:3,  black:true,  key:'E' },
    { id:'E',  label:'E',  semitone:4,  black:false, key:'D' },
    { id:'F',  label:'F',  semitone:5,  black:false, key:'F' },
    { id:'Fs', label:'F♯', semitone:6,  black:true,  key:'T' },
    { id:'G',  label:'G',  semitone:7,  black:false, key:'G' },
    { id:'Gs', label:'G♯', semitone:8,  black:true,  key:'Y' },
    { id:'A',  label:'A',  semitone:9,  black:false, key:'H' },
    { id:'As', label:'A♯', semitone:10, black:true,  key:'U' },
    { id:'B',  label:'B',  semitone:11, black:false, key:'J' },
    { id:'C5', label:'C',  semitone:12, black:false, key:'K' }
  ];

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function loadJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function saveJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function injectStyles() {
    if (document.getElementById('opoongExtraGameStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongExtraGameStyles';
    style.textContent = `
      .coverClick{background:linear-gradient(145deg,#dbeafe,#bfdbfe);position:relative;display:grid;place-items:center}
      .coverClick::before{content:'CLICK';font-size:clamp(17px,3vw,28px);font-weight:1000;letter-spacing:-1px;color:#1d4ed8}
      .coverClick::after{content:'';position:absolute;width:34%;aspect-ratio:1;border-radius:50%;border:7px solid #60a5fa;box-shadow:0 0 0 9px rgba(96,165,250,.17)}
      .coverTyping{background:linear-gradient(145deg,#f3e8ff,#ede9fe);display:grid;place-items:center;color:#7c3aed;font-size:34px;font-weight:1000}
      .coverPiano{background:linear-gradient(145deg,#111827,#334155);display:flex;align-items:flex-end;justify-content:center;gap:2px;padding:18px!important}
      .coverPiano i{display:block;width:11%;height:68%;border-radius:4px 4px 7px 7px;background:#fff;border:1px solid #cbd5e1}
      .coverPiano i:nth-child(2),.coverPiano i:nth-child(5){height:46%;background:#111827;border-color:#111827;margin-left:-7%;margin-right:-7%;z-index:2;align-self:flex-start}

      .extraGameGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
      .extraStat{padding:13px;border:1px solid var(--line);border-radius:17px;background:color-mix(in srgb,var(--card) 94%,var(--bg));text-align:center}
      .extraStat span{display:block;color:var(--muted);font-size:11px;font-weight:900}
      .extraStat strong{display:block;margin-top:5px;font-size:20px}

      .clickArena{min-height:360px;display:grid;place-items:center;padding:20px;border:1px solid var(--line);border-radius:24px;background:radial-gradient(circle at 50% 30%,color-mix(in srgb,var(--pri) 10%,var(--card)),var(--card));user-select:none}
      .clickTarget{width:min(260px,70vw);aspect-ratio:1;border:0;border-radius:50%;background:linear-gradient(145deg,var(--pri2),var(--pri));color:#fff;box-shadow:0 20px 48px color-mix(in srgb,var(--pri) 30%,transparent),inset 0 3px 0 rgba(255,255,255,.22);font-size:clamp(24px,6vw,42px);font-weight:1000;transition:transform .06s ease}
      .clickTarget:active{transform:scale(.96)}
      .clickTarget.finished{background:linear-gradient(145deg,#475569,#1e293b)}
      .clickModeRow{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}
      .clickModeRow button[aria-pressed='true']{color:#fff;background:linear-gradient(135deg,var(--pri),var(--pri2));border-color:transparent}

      .typingTarget{min-height:118px;padding:20px;border:1px solid var(--line);border-radius:22px;background:var(--card);font-size:clamp(18px,3vw,27px);font-weight:900;line-height:1.75;word-break:keep-all}
      .typingTarget .typedGood{color:var(--ok)}
      .typingTarget .typedBad{color:var(--bad);text-decoration:underline;text-decoration-thickness:2px}
      .typingTarget .typingRest{color:var(--muted)}
      .typingInput{width:100%;margin-top:12px;min-height:58px;padding:15px 16px;border:2px solid var(--line);border-radius:18px;background:var(--card2);color:var(--text);font-size:18px;font-weight:850;outline:0}
      .typingInput:focus{border-color:var(--pri3);box-shadow:0 0 0 4px color-mix(in srgb,var(--pri3) 17%,transparent)}
      .typingHint{margin-top:10px;color:var(--muted);font-size:12px;font-weight:850;line-height:1.6}

      .pianoTop{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:14px}
      .pianoControls{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
      .pianoStage{overflow-x:auto;padding:22px 12px 26px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(180deg,#1e293b,#0f172a);box-shadow:inset 0 10px 28px rgba(0,0,0,.22)}
      .pianoKeyboard{position:relative;width:min(100%,760px);min-width:560px;height:300px;margin:auto;display:grid;grid-template-columns:repeat(8,1fr);gap:3px}
      .pianoKey{position:relative;border:0;touch-action:none;user-select:none;-webkit-user-select:none}
      .pianoKey.white{height:100%;border-radius:0 0 12px 12px;background:linear-gradient(#fff,#eef2f7);box-shadow:inset 0 -8px 14px rgba(15,23,42,.11);z-index:1}
      .pianoKey.black{position:absolute;top:0;width:8.2%;height:61%;border-radius:0 0 9px 9px;background:linear-gradient(#020617,#1e293b);box-shadow:0 8px 12px rgba(0,0,0,.38);z-index:3;color:#fff}
      .pianoKey.pressed{transform:translateY(3px);filter:brightness(.86)}
      .pianoKey.white span{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:grid;gap:4px;text-align:center;color:#475569;font-weight:950}
      .pianoKey.white small{font-size:10px;color:#94a3b8}
      .pianoKey.black span{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);font-size:10px;font-weight:950;color:#cbd5e1}
      .pianoKey[data-note='Cs']{left:8.3%}.pianoKey[data-note='Ds']{left:20.8%}.pianoKey[data-note='Fs']{left:45.8%}.pianoKey[data-note='Gs']{left:58.3%}.pianoKey[data-note='As']{left:70.8%}
      .pianoStatus{margin-top:12px;text-align:center;color:var(--muted);font-size:12px;font-weight:850}
      @media(max-width:620px){
        .extraGameGrid{grid-template-columns:1fr 1fr}.extraGameGrid .extraStat:last-child{grid-column:1/-1}
        .clickArena{min-height:310px}.pianoKeyboard{height:250px}.pianoStage{padding-inline:8px}
      }
    `;
    document.head.appendChild(style);
  }

  function addCards() {
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if (!grid || document.getElementById('gameCardClick')) return;

    const cards = [
      ['click', 'gameCardClick', '<span class="gameCover coverClick"></span>', '마우스 클릭 테스트', 'gameCardClickMeta', '최고 기록 없음'],
      ['typing', 'gameCardTyping', '<span class="gameCover coverTyping">⌨</span>', '타자 게임', 'gameCardTypingMeta', '30초 타자 도전'],
      ['piano', 'gameCardPiano', '<span class="gameCover coverPiano"><i></i><i></i><i></i><i></i><i></i><i></i></span>', '피아노', 'gameCardPianoMeta', '키보드 · 터치 연주']
    ];

    cards.forEach(([game, id, cover, title, metaId, meta]) => {
      const button = document.createElement('button');
      button.className = 'gameCard';
      button.type = 'button';
      button.id = id;
      button.innerHTML = `${cover}<span class="gameCardInfo"><b>${title}</b><span id="${metaId}">${meta}</span></span>`;
      button.addEventListener('click', () => window.openMiniGame(game));
      grid.appendChild(button);
    });
  }

  function addPanels() {
    const gameView = document.getElementById('view-game');
    if (!gameView || document.getElementById('gameClickPanel')) return;
    const shop = document.getElementById('gameColorShop');
    const anchor = shop || gameView.lastElementChild;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="gameClickPanel" class="gamePlayCard miniGamePanel" hidden>
        <div class="extraGameGrid">
          <div class="extraStat"><span>클릭 수</span><strong id="clickCount">0</strong></div>
          <div class="extraStat"><span>CPS</span><strong id="clickCps">0.00</strong></div>
          <div class="extraStat"><span>남은 시간</span><strong id="clickTime">5.00초</strong></div>
        </div>
        <div class="clickModeRow" aria-label="클릭 테스트 시간">
          <button class="smallbtn ghost" type="button" data-click-seconds="5" aria-pressed="true">5초</button>
          <button class="smallbtn ghost" type="button" data-click-seconds="10" aria-pressed="false">10초</button>
          <span class="muted" id="clickBest">최고 기록 없음</span>
        </div>
        <div class="clickArena"><button id="clickTarget" class="clickTarget" type="button">클릭!</button></div>
        <div class="gameControls">
          <button id="clickReplay" class="bigBtn" type="button" hidden>다시 하기</button>
          <span class="muted" id="clickStatus">첫 클릭과 동시에 시간이 시작돼요.</span>
        </div>
      </div>

      <div id="gameTypingPanel" class="gamePlayCard miniGamePanel" hidden>
        <div class="extraGameGrid">
          <div class="extraStat"><span>타수</span><strong id="typingCpm">0</strong></div>
          <div class="extraStat"><span>정확도</span><strong id="typingAccuracy">100%</strong></div>
          <div class="extraStat"><span>남은 시간</span><strong id="typingTime">30초</strong></div>
        </div>
        <div id="typingTarget" class="typingTarget" aria-live="polite"></div>
        <input id="typingInput" class="typingInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="여기에 문장을 따라 입력하세요" aria-label="타자 게임 입력">
        <div class="typingHint">첫 글자를 입력하면 30초가 시작됩니다. 문장을 정확히 완성하면 다음 문장으로 넘어가요.</div>
        <div class="gameControls">
          <button id="typingReplay" class="bigBtn" type="button" hidden>다시 하기</button>
          <span class="muted" id="typingStatus">준비 · 첫 글자를 입력해 보세요.</span>
        </div>
      </div>

      <div id="gamePianoPanel" class="gamePlayCard miniGamePanel" hidden>
        <div class="pianoTop">
          <div><strong style="font-size:18px">O.Poong Piano</strong><div class="muted" style="margin-top:4px">터치하거나 A~K 키로 연주하세요.</div></div>
          <div class="pianoControls">
            <button id="pianoOctDown" class="smallbtn ghost" type="button">− 옥타브</button>
            <span class="pill" id="pianoOctaveLabel">C4</span>
            <button id="pianoOctUp" class="smallbtn ghost" type="button">+ 옥타브</button>
            <button id="pianoSustain" class="smallbtn ghost" type="button" aria-pressed="false">Sustain 끄기</button>
          </div>
        </div>
        <div class="pianoStage">
          <div id="pianoKeyboard" class="pianoKeyboard" aria-label="피아노 건반"></div>
        </div>
        <div id="pianoStatus" class="pianoStatus">A W S E D F T G Y H U J K · 터치 지원</div>
      </div>
    `;

    const nodes = Array.from(wrap.children);
    nodes.forEach(node => {
      if (shop) gameView.insertBefore(node, shop);
      else gameView.appendChild(node);
    });
  }

  function clickBestData() {
    return loadJson(CLICK_BEST_KEY, { 5: 0, 10: 0 });
  }

  function updateClickBestLabel() {
    const best = clickBestData();
    const value = safeNumber(best[String(clickDuration)] || best[clickDuration], 0);
    const el = document.getElementById('clickBest');
    if (el) el.textContent = value > 0 ? `${clickDuration}초 최고 ${value.toFixed(2)} CPS` : `${clickDuration}초 최고 기록 없음`;
  }

  function resetClickGame() {
    clearTimeout(clickTimer);
    cancelAnimationFrame(clickRaf);
    clickRunning = false;
    clickFinished = false;
    clickCount = 0;
    clickStartedAt = 0;
    const count = document.getElementById('clickCount');
    const cps = document.getElementById('clickCps');
    const time = document.getElementById('clickTime');
    const target = document.getElementById('clickTarget');
    const replay = document.getElementById('clickReplay');
    const status = document.getElementById('clickStatus');
    if (count) count.textContent = '0';
    if (cps) cps.textContent = '0.00';
    if (time) time.textContent = `${clickDuration.toFixed(2)}초`;
    if (target) { target.disabled = false; target.textContent = '클릭!'; target.classList.remove('finished'); }
    if (replay) replay.hidden = true;
    if (status) status.textContent = '첫 클릭과 동시에 시간이 시작돼요.';
    document.querySelectorAll('[data-click-seconds]').forEach(btn => {
      btn.disabled = false;
      btn.setAttribute('aria-pressed', String(Number(btn.dataset.clickSeconds) === clickDuration));
    });
    updateClickBestLabel();
  }

  function clickFrame() {
    if (!clickRunning) return;
    const elapsed = (performance.now() - clickStartedAt) / 1000;
    const remaining = Math.max(0, clickDuration - elapsed);
    const cps = elapsed > 0 ? clickCount / elapsed : 0;
    const time = document.getElementById('clickTime');
    const cpsBox = document.getElementById('clickCps');
    if (time) time.textContent = `${remaining.toFixed(2)}초`;
    if (cpsBox) cpsBox.textContent = cps.toFixed(2);
    if (remaining <= 0) finishClickGame();
    else clickRaf = requestAnimationFrame(clickFrame);
  }

  function handleClickTarget() {
    if (clickFinished) return;
    if (!clickRunning) {
      clickRunning = true;
      clickStartedAt = performance.now();
      document.querySelectorAll('[data-click-seconds]').forEach(btn => btn.disabled = true);
      const status = document.getElementById('clickStatus');
      if (status) status.textContent = '계속 클릭하세요!';
      clickRaf = requestAnimationFrame(clickFrame);
    }
    clickCount++;
    const count = document.getElementById('clickCount');
    if (count) count.textContent = String(clickCount);
  }

  function finishClickGame() {
    if (clickFinished) return;
    clickRunning = false;
    clickFinished = true;
    cancelAnimationFrame(clickRaf);
    const cps = clickCount / clickDuration;
    const best = clickBestData();
    const old = safeNumber(best[String(clickDuration)] || 0, 0);
    if (cps > old) {
      best[String(clickDuration)] = cps;
      saveJson(CLICK_BEST_KEY, best);
    }
    const time = document.getElementById('clickTime');
    const cpsBox = document.getElementById('clickCps');
    const target = document.getElementById('clickTarget');
    const replay = document.getElementById('clickReplay');
    const status = document.getElementById('clickStatus');
    if (time) time.textContent = '0.00초';
    if (cpsBox) cpsBox.textContent = cps.toFixed(2);
    if (target) { target.disabled = true; target.textContent = `${cps.toFixed(2)} CPS`; target.classList.add('finished'); }
    if (replay) replay.hidden = false;
    if (status) status.textContent = cps > old ? `신기록! ${clickCount}번 클릭했어요.` : `${clickCount}번 클릭 · 최고 기록에 다시 도전해 보세요.`;
    updateClickBestLabel();
    updateExtraStats();
    if (typeof window.awardOpoongPoints === 'function' && clickCount > 0) {
      window.awardOpoongPoints(Math.min(12, Math.max(3, Math.floor(cps))), '클릭 테스트');
    }
  }

  function chooseTypingSentence() {
    let index = Math.floor(Math.random() * TYPE_SENTENCES.length);
    if (TYPE_SENTENCES.length > 1 && index === typeLastSentence) index = (index + 1) % TYPE_SENTENCES.length;
    typeLastSentence = index;
    typeSentence = TYPE_SENTENCES[index];
    typePrevValue = '';
    const input = document.getElementById('typingInput');
    if (input) input.value = '';
    renderTypingTarget('');
  }

  function typingBest() {
    try { return Math.max(0, Math.floor(Number(localStorage.getItem(TYPE_BEST_KEY)) || 0)); } catch (_) { return 0; }
  }

  function saveTypingBest(value) {
    try { localStorage.setItem(TYPE_BEST_KEY, String(Math.max(0, Math.floor(value || 0)))); } catch (_) {}
  }

  function resetTypingGame() {
    clearInterval(typeTimer);
    typeTimer = 0;
    typeRunning = false;
    typeFinished = false;
    typeStartedAt = 0;
    typeRemaining = TYPE_SECONDS;
    typeCompletedChars = 0;
    typeTotalTyped = 0;
    typeCorrectTyped = 0;
    typePrevValue = '';
    chooseTypingSentence();
    const input = document.getElementById('typingInput');
    const replay = document.getElementById('typingReplay');
    const status = document.getElementById('typingStatus');
    if (input) { input.disabled = false; input.value = ''; }
    if (replay) replay.hidden = true;
    if (status) status.textContent = `준비 · 최고 ${typingBest() || 0}타`; 
    renderTypingHud();
    setTimeout(() => input && input.focus({ preventScroll:true }), 80);
  }

  function renderTypingTarget(value) {
    const target = document.getElementById('typingTarget');
    if (!target) return;
    const chars = Array.from(typeSentence);
    const typed = Array.from(value || '');
    target.innerHTML = chars.map((char, index) => {
      if (index >= typed.length) return `<span class="typingRest">${escapeText(char)}</span>`;
      return `<span class="${typed[index] === char ? 'typedGood' : 'typedBad'}">${escapeText(char)}</span>`;
    }).join('');
  }

  function escapeText(value) {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
  }

  function currentTypingCpm() {
    if (!typeStartedAt) return 0;
    const elapsed = Math.max(1, (performance.now() - typeStartedAt) / 1000);
    const current = document.getElementById('typingInput');
    const chars = typeCompletedChars + Array.from(current?.value || '').length;
    return Math.round(chars / elapsed * 60);
  }

  function currentTypingAccuracy() {
    if (!typeTotalTyped) return 100;
    return Math.max(0, Math.min(100, Math.round(typeCorrectTyped / typeTotalTyped * 100)));
  }

  function renderTypingHud() {
    const cpm = document.getElementById('typingCpm');
    const accuracy = document.getElementById('typingAccuracy');
    const time = document.getElementById('typingTime');
    if (cpm) cpm.textContent = String(currentTypingCpm());
    if (accuracy) accuracy.textContent = `${currentTypingAccuracy()}%`;
    if (time) time.textContent = `${Math.max(0, typeRemaining)}초`;
  }

  function startTypingTimer() {
    if (typeRunning || typeFinished) return;
    typeRunning = true;
    typeStartedAt = performance.now();
    typeRemaining = TYPE_SECONDS;
    const status = document.getElementById('typingStatus');
    if (status) status.textContent = '입력 중 · 정확하게 끝까지!';
    typeTimer = setInterval(() => {
      const elapsed = (performance.now() - typeStartedAt) / 1000;
      typeRemaining = Math.max(0, Math.ceil(TYPE_SECONDS - elapsed));
      renderTypingHud();
      if (elapsed >= TYPE_SECONDS) finishTypingGame();
    }, 100);
  }

  function handleTypingInput(event) {
    if (typeFinished) return;
    const input = event.target;
    const value = input.value;
    if (value && !typeRunning) startTypingTimer();

    if (value.length > typePrevValue.length && value.startsWith(typePrevValue)) {
      const added = Array.from(value.slice(typePrevValue.length));
      const expected = Array.from(typeSentence.slice(typePrevValue.length, value.length));
      added.forEach((char, index) => {
        typeTotalTyped++;
        if (char === expected[index]) typeCorrectTyped++;
      });
    }
    typePrevValue = value;
    renderTypingTarget(value);
    renderTypingHud();

    if (value === typeSentence) {
      typeCompletedChars += Array.from(typeSentence).length + 1;
      chooseTypingSentence();
    }
  }

  function finishTypingGame() {
    if (typeFinished) return;
    typeFinished = true;
    typeRunning = false;
    clearInterval(typeTimer);
    typeTimer = 0;
    typeRemaining = 0;
    const cpm = currentTypingCpm();
    const accuracy = currentTypingAccuracy();
    const oldBest = typingBest();
    if (cpm > oldBest) saveTypingBest(cpm);
    const input = document.getElementById('typingInput');
    const replay = document.getElementById('typingReplay');
    const status = document.getElementById('typingStatus');
    if (input) input.disabled = true;
    if (replay) replay.hidden = false;
    if (status) status.textContent = cpm > oldBest ? `신기록! ${cpm}타 · 정확도 ${accuracy}%` : `${cpm}타 · 정확도 ${accuracy}% · 최고 ${oldBest}타`;
    renderTypingHud();
    updateExtraStats();
    if (typeof window.awardOpoongPoints === 'function' && cpm > 0) {
      const reward = Math.min(15, Math.max(4, Math.floor(cpm / 80))) + (accuracy >= 95 ? 2 : 0);
      window.awardOpoongPoints(reward, '타자 게임');
    }
  }

  function buildPiano() {
    const keyboard = document.getElementById('pianoKeyboard');
    if (!keyboard || keyboard.children.length) return;
    const whiteOrder = ['C','D','E','F','G','A','B','C5'];
    whiteOrder.forEach(id => {
      const note = PIANO_NOTES.find(n => n.id === id);
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'pianoKey white';
      key.dataset.note = note.id;
      key.innerHTML = `<span>${note.label}<small>${note.key}</small></span>`;
      bindPianoPointer(key, note.id);
      keyboard.appendChild(key);
    });
    PIANO_NOTES.filter(n => n.black).forEach(note => {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'pianoKey black';
      key.dataset.note = note.id;
      key.innerHTML = `<span>${note.key}</span>`;
      bindPianoPointer(key, note.id);
      keyboard.appendChild(key);
    });
  }

  function bindPianoPointer(key, noteId) {
    key.addEventListener('pointerdown', event => {
      event.preventDefault();
      try { key.setPointerCapture(event.pointerId); } catch (_) {}
      playPianoNote(noteId);
    });
    key.addEventListener('pointerup', event => { event.preventDefault(); stopPianoNote(noteId); });
    key.addEventListener('pointercancel', () => stopPianoNote(noteId));
  }

  function noteFrequency(noteId) {
    const note = PIANO_NOTES.find(n => n.id === noteId);
    const midi = 60 + pianoOctave * 12 + (note?.semitone || 0);
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function ensureAudio() {
    if (!audioContext) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      audioContext = new AudioCtor();
    }
    if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    return audioContext;
  }

  function playPianoNote(noteId) {
    if (activeNotes.has(noteId)) return;
    const ctx = ensureAudio();
    if (!ctx) {
      const status = document.getElementById('pianoStatus');
      if (status) status.textContent = '이 브라우저에서는 오디오 재생을 지원하지 않아요.';
      return;
    }
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'triangle';
    oscillator.frequency.value = noteFrequency(noteId);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.18);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    activeNotes.set(noteId, { oscillator, gain });
    document.querySelectorAll(`.pianoKey[data-note="${noteId}"]`).forEach(el => el.classList.add('pressed'));
    const note = PIANO_NOTES.find(n => n.id === noteId);
    const status = document.getElementById('pianoStatus');
    if (status && note) status.textContent = `${note.label}${4 + pianoOctave + (note.semitone === 12 ? 1 : 0)} 연주 중`;
  }

  function stopPianoNote(noteId, force = false) {
    const active = activeNotes.get(noteId);
    if (!active) return;
    activeNotes.delete(noteId);
    document.querySelectorAll(`.pianoKey[data-note="${noteId}"]`).forEach(el => el.classList.remove('pressed'));
    const ctx = audioContext;
    if (!ctx) return;
    const now = ctx.currentTime;
    const release = force ? 0.03 : (pianoSustain ? 0.9 : 0.16);
    try {
      active.gain.gain.cancelScheduledValues(now);
      active.gain.gain.setValueAtTime(Math.max(0.0001, active.gain.gain.value), now);
      active.gain.gain.exponentialRampToValueAtTime(0.0001, now + release);
      active.oscillator.stop(now + release + 0.03);
    } catch (_) {}
  }

  function stopAllPianoNotes(force = true) {
    Array.from(activeNotes.keys()).forEach(id => stopPianoNote(id, force));
  }

  function updatePianoControls() {
    const label = document.getElementById('pianoOctaveLabel');
    const sustain = document.getElementById('pianoSustain');
    if (label) label.textContent = `C${4 + pianoOctave}`;
    if (sustain) {
      sustain.setAttribute('aria-pressed', String(pianoSustain));
      sustain.textContent = pianoSustain ? 'Sustain 켜짐' : 'Sustain 끄기';
      sustain.classList.toggle('primary', pianoSustain);
      sustain.classList.toggle('ghost', !pianoSustain);
    }
  }

  function bindControls() {
    document.querySelectorAll('[data-click-seconds]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (clickRunning || clickFinished) return;
        clickDuration = Number(btn.dataset.clickSeconds) === 10 ? 10 : 5;
        resetClickGame();
      });
    });
    document.getElementById('clickTarget')?.addEventListener('click', handleClickTarget);
    document.getElementById('clickReplay')?.addEventListener('click', () => window.openMiniGame('click'));
    document.getElementById('typingInput')?.addEventListener('input', handleTypingInput);
    document.getElementById('typingReplay')?.addEventListener('click', () => window.openMiniGame('typing'));
    document.getElementById('pianoOctDown')?.addEventListener('click', () => {
      stopAllPianoNotes();
      pianoOctave = Math.max(-1, pianoOctave - 1);
      updatePianoControls();
    });
    document.getElementById('pianoOctUp')?.addEventListener('click', () => {
      stopAllPianoNotes();
      pianoOctave = Math.min(1, pianoOctave + 1);
      updatePianoControls();
    });
    document.getElementById('pianoSustain')?.addEventListener('click', () => {
      pianoSustain = !pianoSustain;
      updatePianoControls();
    });

    document.addEventListener('keydown', event => {
      const panel = document.getElementById('gamePianoPanel');
      if (!panel || panel.hidden || event.repeat) return;
      if (event.target && /input|textarea|select/i.test(event.target.tagName)) return;
      const note = KEY_TO_NOTE[String(event.key || '').toLowerCase()];
      if (!note) return;
      event.preventDefault();
      playPianoNote(note);
    });
    document.addEventListener('keyup', event => {
      const note = KEY_TO_NOTE[String(event.key || '').toLowerCase()];
      if (note) stopPianoNote(note);
    });
  }

  function updateExtraStats() {
    const bestClick = clickBestData();
    const clickValues = [safeNumber(bestClick['5']), safeNumber(bestClick['10'])].filter(v => v > 0);
    const clickMeta = document.getElementById('gameCardClickMeta');
    if (clickMeta) clickMeta.textContent = clickValues.length ? `최고 ${Math.max(...clickValues).toFixed(2)} CPS` : '최고 기록 없음';
    const typingMeta = document.getElementById('gameCardTypingMeta');
    const bestType = typingBest();
    if (typingMeta) typingMeta.textContent = bestType ? `최고 ${bestType}타` : '30초 타자 도전';
  }

  function stopExtraGames() {
    clearTimeout(clickTimer);
    cancelAnimationFrame(clickRaf);
    clickRunning = false;
    clearInterval(typeTimer);
    typeTimer = 0;
    typeRunning = false;
    stopAllPianoNotes(true);
  }

  function openExtraGame(game) {
    if (!EXTRA_GAMES.has(game)) return;
    if (baseStopActiveMiniGame) baseStopActiveMiniGame();
    stopExtraGames();
    const hub = document.getElementById('gameHub');
    const topbar = document.getElementById('miniGameTopbar');
    const shop = document.getElementById('gameColorShop');
    if (hub) hub.hidden = true;
    if (topbar) topbar.hidden = false;
    if (shop) shop.hidden = true;
    document.querySelectorAll('.miniGamePanel').forEach(panel => panel.hidden = true);
    const panel = document.getElementById({ click:'gameClickPanel', typing:'gameTypingPanel', piano:'gamePianoPanel' }[game]);
    if (panel) panel.hidden = false;
    const title = document.getElementById('miniGameTitle');
    if (title) title.textContent = { click:'마우스 클릭 테스트', typing:'타자 게임', piano:'피아노' }[game];
    if (game === 'click') resetClickGame();
    if (game === 'typing') resetTypingGame();
    if (game === 'piano') { buildPiano(); updatePianoControls(); }
  }

  function wrapGameFunctions() {
    baseOpenMiniGame = window.openMiniGame;
    baseShowMiniGameHub = window.showMiniGameHub;
    baseStopActiveMiniGame = window.stopActiveMiniGame;
    baseRenderGameLibraryStats = window.renderGameLibraryStats;
    if (typeof baseOpenMiniGame !== 'function') return false;

    window.openMiniGame = function(game) {
      if (EXTRA_GAMES.has(game)) return openExtraGame(game);
      stopExtraGames();
      return baseOpenMiniGame.apply(this, arguments);
    };
    window.openMiniGame.__opoongExtraGames = true;

    if (typeof baseShowMiniGameHub === 'function') {
      window.showMiniGameHub = function() {
        stopExtraGames();
        const result = baseShowMiniGameHub.apply(this, arguments);
        updateExtraStats();
        return result;
      };
    }

    if (typeof baseStopActiveMiniGame === 'function') {
      window.stopActiveMiniGame = function() {
        stopExtraGames();
        return baseStopActiveMiniGame.apply(this, arguments);
      };
    }

    if (typeof baseRenderGameLibraryStats === 'function') {
      window.renderGameLibraryStats = function() {
        const result = baseRenderGameLibraryStats.apply(this, arguments);
        updateExtraStats();
        return result;
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
    addCards();
    addPanels();
    wrapGameFunctions();
    bindControls();
    buildPiano();
    resetClickGame();
    resetTypingGame();
    updatePianoControls();
    updateExtraStats();

    const gameView = document.getElementById('view-game');
    if (gameView) {
      const observer = new MutationObserver(() => {
        if (!gameView.classList.contains('active')) stopExtraGames();
      });
      observer.observe(gameView, { attributes:true, attributeFilter:['class'] });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();