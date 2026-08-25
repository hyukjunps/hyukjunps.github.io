(() => {
  'use strict';

  const RESET_EVERY = 25;
  const RESET_WIDTH = 160;
  const MIN_SPEED = 175;
  const MAX_SPEED = 400;
  const MIN_SPEED_GAP = 35;

  function nextStackSpeed(previous) {
    let speed = previous;
    for (let i = 0; i < 8; i += 1) {
      speed = Math.round(MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED));
      if (Math.abs(speed - previous) >= MIN_SPEED_GAP) break;
    }
    return speed;
  }

  function installStackTuning() {
    if (typeof window.dropStackBlock !== 'function') return false;
    if (window.dropStackBlock.__opoongStackTuned) return true;

    const tunedDrop = function () {
      const s = opoongStack;
      if (!s.running) {
        startStackGame();
        return;
      }

      const last = s.blocks[s.blocks.length - 1];
      const left = Math.max(s.x, last.x);
      const right = Math.min(s.x + s.w, last.x + last.w);
      const overlap = right - left;

      if (overlap < 7) {
        endStackGame();
        return;
      }

      s.blocks.push({ x: left, w: overlap });
      const score = s.blocks.length - 1;

      if (score % RESET_EVERY === 0) {
        const center = left + overlap / 2;
        const resetX = Math.max(8, Math.min(472 - RESET_WIDTH, center - RESET_WIDTH / 2));
        const top = s.blocks[s.blocks.length - 1];
        top.x = resetX;
        top.w = RESET_WIDTH;
        s.x = resetX;
        s.w = RESET_WIDTH;
        setStackStatus(`${score}층! 블록 길이 회복`);
      } else {
        s.x = left;
        s.w = overlap;
        setStackStatus('이동 중');
      }

      s.dir *= -1;
      s.speed = nextStackSpeed(s.speed);
      s.x = s.dir > 0 ? 10 : 470 - s.w;
      updateStackHud();
      drawStackGame();
    };

    tunedDrop.__opoongStackTuned = true;
    window.dropStackBlock = tunedDrop;
    return true;
  }

  function init() {
    if (installStackTuning()) return;
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (installStackTuning() || tries > 40) window.clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

/* O.Poong mini-game trio loader: Helix / Pipe / Racing */
(() => {
  'use strict';
  const files = [
    './opoong-helix.js?v=20260825-2',
    './opoong-pipe.js?v=20260825-1',
    './opoong-racing.js?v=20260825-1'
  ];
  if (document.querySelector('script[data-opoong-trio-loader]')) return;
  files.forEach((src, index) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.opoongTrioLoader = String(index + 1);
    document.head.appendChild(script);
  });
})();
