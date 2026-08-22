(() => {
  'use strict';

  let observer = null;

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
    window.OpoongGameCount = { refresh:render, get:countGames };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();