(function(){
  'use strict';

  const HEART_KEY = 'opoong_game_hearts_v1';

  function heartApi(){
    return window.OPOONG_GAME_HEARTS || null;
  }

  function currentHearts(){
    const api = heartApi();
    return api && typeof api.get === 'function' ? Math.max(0, Number(api.get()) || 0) : 0;
  }

  function openEmptyHeartNotice(api){
    if(api && typeof api.openCharge === 'function'){
      api.openCharge('하트가 없어요. 다시 플레이하려면 하트를 충전해 주세요.');
    }
  }

  function spendReplayHeart(){
    const api = heartApi();
    if(!api) return true;

    if(typeof api.spend === 'function'){
      const spent = Boolean(api.spend());
      if(!spent) openEmptyHeartNotice(api);
      return spent;
    }

    const hearts = currentHearts();
    if(hearts <= 0){
      openEmptyHeartNotice(api);
      return false;
    }

    try{
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      const base = Math.max(0, Math.floor(Number(raw.hearts) || 0));
      if(base <= 0){
        openEmptyHeartNotice(api);
        return false;
      }
      raw.hearts = base - 1;
      localStorage.setItem(HEART_KEY, JSON.stringify(raw));
    }catch(_){
      return false;
    }

    if(typeof api.render === 'function') api.render();
    return true;
  }

  function blockReplay(event){
    event.preventDefault();
    event.stopPropagation();
    if(typeof event.stopImmediatePropagation === 'function') event.stopImmediatePropagation();
  }

  function shouldChargeDirectButton(button){
    if(!button) return false;
    const onclick = String(button.getAttribute('onclick') || '');

    if(onclick.includes('resetTicTacToe()')) return true;
    if(onclick.includes('nextWaterPuzzle()')) return true;
    if(onclick.includes('newMazeGame()')) return true;
    if(onclick.includes('newMinesGame()')) return true;
    if(onclick.includes('resetSnakeGame()')) return true;

    return false;
  }

  document.addEventListener('click', function(event){
    const button = event.target.closest('button');
    if(!button || !shouldChargeDirectButton(button)) return;

    const gameView = document.getElementById('view-game');
    if(!gameView || !gameView.classList.contains('active')) return;

    if(!spendReplayHeart()) blockReplay(event);
  }, true);

  function wrapReplayStart(functionName, isReplay){
    const original = window[functionName];
    if(typeof original !== 'function' || original.__opoongReplayHeartGate) return false;

    const wrapped = function(){
      let replay = false;
      try{ replay = Boolean(isReplay()); }catch(_){ replay = false; }

      if(replay && !spendReplayHeart()) return;
      return original.apply(this, arguments);
    };

    wrapped.__opoongReplayHeartGate = true;
    wrapped.__original = original;
    window[functionName] = wrapped;
    return true;
  }

  function installReplayWrappers(){
    const jump = wrapReplayStart('startOpoongGame', function(){
      const button = document.getElementById('gameStartButton');
      return button && button.textContent.includes('다시');
    });

    const stack = wrapReplayStart('startStackGame', function(){
      const button = document.getElementById('stackStartButton');
      return button && button.textContent.includes('다시');
    });

    const snake = wrapReplayStart('startSnakeGame', function(){
      const status = document.getElementById('snakeStatus');
      return status && status.textContent.includes('게임 종료');
    });

    return jump && stack && snake;
  }

  function init(){
    installReplayWrappers();

    let tries = 0;
    const timer = window.setInterval(function(){
      tries += 1;
      if(installReplayWrappers() || tries > 20) window.clearInterval(timer);
    }, 250);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
