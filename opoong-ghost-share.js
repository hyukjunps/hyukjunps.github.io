(() => {
  'use strict';

  function install() {
    if (!window.OpoongGameResults || typeof window.showGameOverAd !== 'function') {
      setTimeout(install, 100);
      return;
    }
    if (window.showGameOverAd.__opoongGhostBridge) return;

    const previousShow = window.showGameOverAd;
    const previousRestart = window.restartGameAfterAd;

    window.showGameOverAd = function(game) {
      if (game === 'opoong-ghost') {
        const score = document.getElementById('ghostScore')?.textContent || '0점';
        const hp = document.getElementById('ghostHp')?.textContent || '-';
        const best = document.getElementById('ghostBest')?.textContent || '-';
        return window.OpoongGameResults.show('opoong-ghost', {
          title: '오풍 유령찾기',
          primaryLabel: '잡은 유령',
          primaryValue: score,
          stats: [
            { label: '남은 체력', value: hp },
            { label: '최고 기록', value: best }
          ]
        });
      }
      return previousShow.apply(this, arguments);
    };
    window.showGameOverAd.__opoongGhostBridge = true;

    window.restartGameAfterAd = function() {
      const last = window.OpoongGameResults?.getLast?.();
      if (last?.game === 'opoong-ghost') {
        try { window.closeGameRestartPrompt?.(); } catch (_) {}
        window.openMiniGame?.('opoong-ghost');
        return;
      }
      if (typeof previousRestart === 'function') return previousRestart.apply(this, arguments);
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
