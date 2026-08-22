(() => {
  'use strict';

  let observer = null;
  let rhythmInputInstalled = false;

  function countGames(){
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if(!grid) return 0;
    return [...grid.querySelectorAll('.gameCard')].filter(card => card.dataset.gameCountIgnore !== '1').length;
  }

  function render(){
    const count = countGames();
    if(!count) return;
    document.querySelectorAll('.navBtn[data-view="game"] .hint').forEach(el => {
      el.textContent = `게임 ${count}종`;
    });
    const lead = document.querySelector('#gameHub .gameLibraryLead span');
    if(lead) lead.textContent = `현재 ${count}개의 게임을 선택할 수 있어요.`;
  }

  function installRhythmInput(){
    if(rhythmInputInstalled) return;
    rhythmInputInstalled = true;

    document.addEventListener('pointerdown', event => {
      const stage = event.target.closest?.('.rhythmStage');
      if(!stage) return;

      const lanes = stage.querySelector('#rhythmLanes');
      if(!lanes) return;

      const rect = lanes.getBoundingClientRect();
      if(!rect.width) return;

      event.preventDefault();
      const lane = Math.max(0, Math.min(3, Math.floor((event.clientX - rect.left) / (rect.width / 4))));
      const key = document.querySelector(`#gameOpoongRhythmPanel .rhythmKey[data-rhythm="${lane}"]`);
      key?.click();

      const laneEl = lanes.children[lane];
      if(laneEl){
        laneEl.style.background = 'rgba(255,255,255,.10)';
        setTimeout(() => {
          if(laneEl.isConnected) laneEl.style.background = '';
        }, 80);
      }
    }, { passive:false });
  }

  function install(){
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if(!grid){ setTimeout(install, 120); return; }
    observer?.disconnect?.();
    observer = new MutationObserver(render);
    observer.observe(grid, { childList:true });
    render();
    setTimeout(render, 350);
    setTimeout(render, 1000);
    setTimeout(render, 2200);
    installRhythmInput();
    window.OpoongGameCount = { refresh:render, get:countGames };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();