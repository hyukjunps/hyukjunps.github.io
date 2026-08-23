(() => {
  'use strict';

  if (window.OpoongFreshGames?.version) return;

  const games = new Map();
  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let baseRestartGameAfterAd = null;

  const q = (id) => document.getElementById(id);

  function addCard({ id, title, coverClass, meta, game }) {
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if (!grid || q(id)) return;
    const button = document.createElement('button');
    button.className = 'gameCard';
    button.type = 'button';
    button.id = id;
    button.innerHTML = `<span class="gameCover ${coverClass}"></span><span class="gameCardInfo"><b>${title}</b><span>${meta}</span></span>`;
    button.addEventListener('click', () => window.openMiniGame?.(game));
    grid.appendChild(button);
    refreshCount();
  }

  function addPanel(id, html) {
    const view = q('view-game');
    if (!view || q(id)) return q(id);
    const shop = q('gameColorShop');
    const panel = document.createElement('div');
    panel.id = id;
    panel.className = 'gamePlayCard miniGamePanel';
    panel.hidden = true;
    panel.innerHTML = html;
    if (shop?.parentNode) shop.parentNode.insertBefore(panel, shop);
    else view.appendChild(panel);
    return panel;
  }

  function refreshCount() {
    setTimeout(() => {
      const count = document.querySelectorAll('#gameHub .gameCardGrid .gameCard').length;
      document.querySelectorAll('.navBtn[data-view="game"] .hint').forEach((el) => { el.textContent = `게임 ${count}종`; });
      const lead = document.querySelector('#gameHub .gameLibraryLead span');
      if (lead) lead.textContent = `현재 ${count}개의 게임을 선택할 수 있어요.`;
    }, 60);
  }

  function stopRegistered(except = '') {
    for (const [id, item] of games) {
      if (id === except) continue;
      try { item.stop?.(); } catch (_) {}
    }
  }

  function showPanel(panelId) {
    try { baseStopActiveMiniGame?.(); } catch (_) {}
    document.querySelectorAll('#view-game .miniGamePanel').forEach((el) => { el.hidden = true; });
    const hub = q('gameHub');
    if (hub) hub.hidden = true;
    const panel = q(panelId);
    if (panel) panel.hidden = false;
  }

  function hideRegisteredPanels() {
    for (const item of games.values()) {
      const panel = q(item.panelId);
      if (panel) panel.hidden = true;
    }
  }

  function register(id, item) {
    if (!id || !item || games.has(id)) return;
    games.set(id, item);
    item.mount?.({ addCard, addPanel, q, refreshCount });
    refreshCount();
  }

  function wrap() {
    if (installed || typeof window.openMiniGame !== 'function') return false;
    installed = true;
    baseOpenMiniGame = window.openMiniGame;
    baseShowMiniGameHub = window.showMiniGameHub;
    baseStopActiveMiniGame = window.stopActiveMiniGame;
    baseRestartGameAfterAd = window.restartGameAfterAd;

    window.openMiniGame = function(game) {
      const item = games.get(game);
      if (item) {
        stopRegistered(game);
        showPanel(item.panelId);
        item.open?.();
        return;
      }
      stopRegistered();
      hideRegisteredPanels();
      return baseOpenMiniGame.apply(this, arguments);
    };

    if (typeof baseShowMiniGameHub === 'function') {
      window.showMiniGameHub = function() {
        stopRegistered();
        hideRegisteredPanels();
        return baseShowMiniGameHub.apply(this, arguments);
      };
    }

    if (typeof baseStopActiveMiniGame === 'function') {
      window.stopActiveMiniGame = function() {
        stopRegistered();
        return baseStopActiveMiniGame.apply(this, arguments);
      };
    }

    if (typeof baseRestartGameAfterAd === 'function') {
      window.restartGameAfterAd = function() {
        const game = window.OpoongGameResults?.getLast?.()?.game;
        if (games.has(game)) {
          try { window.closeGameRestartPrompt?.(); } catch (_) {}
          window.openMiniGame?.(game);
          return;
        }
        return baseRestartGameAfterAd.apply(this, arguments);
      };
    }
    return true;
  }

  function init() {
    if (wrap()) return;
    setTimeout(init, 120);
  }

  window.OpoongFreshGames = {
    version: '2026-08-23-1',
    register,
    addCard,
    addPanel,
    refreshCount,
    q
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
