(() => {
  'use strict';

  let observer = null;
  let rhythmInputInstalled = false;
  let rhythmFixInstalled = false;
  let rhythmFixState = null;
  let rhythmFixRaf = 0;
  let ramenDragInstalled = false;
  let ramenDragState = null;
  let ramenSyntheticClick = false;

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

  function rhythmPanelVisible(){
    const panel = document.getElementById('gameOpoongRhythmPanel');
    return !!panel && !panel.hidden;
  }

  function rhythmTargetY(){
    const lanes = document.getElementById('rhythmLanes');
    const target = lanes?.querySelector('.rhythmTarget');
    if(target && lanes){
      const lr = lanes.getBoundingClientRect();
      const tr = target.getBoundingClientRect();
      return tr.top - lr.top + tr.height / 2;
    }
    const stage = document.querySelector('#gameOpoongRhythmPanel .rhythmStage');
    return Math.max(0, (stage?.clientHeight || 470) - 72);
  }

  function rhythmRender(){
    const s = rhythmFixState;
    const lanes = document.getElementById('rhythmLanes');
    if(!s || !lanes) return;
    lanes.innerHTML = [0,1,2,3].map(i => `<div class="rhythmLane"><div class="rhythmTarget"></div>${s.notes.filter(n => n.l === i).map(n => `<div class="rhythmNote" data-fix-note="1" style="top:${n.y}px"></div>`).join('')}</div>`).join('');
    const score = document.getElementById('rhythmScore');
    const combo = document.getElementById('rhythmCombo');
    const acc = document.getElementById('rhythmAcc');
    const time = document.getElementById('rhythmTime');
    if(score) score.textContent = s.score;
    if(combo) combo.textContent = s.combo;
    if(acc) acc.textContent = `${s.total ? Math.round(s.hit / s.total * 100) : 100}%`;
    if(time) time.textContent = `${Math.max(0, Math.ceil(s.time))}초`;
  }

  function rhythmTone(frequency){
    try{
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(!Ctx) return;
      window.__opoongRhythmAudio = window.__opoongRhythmAudio || new Ctx();
      const ac = window.__opoongRhythmAudio;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = frequency;
      g.gain.setValueAtTime(.08, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .07);
      o.connect(g); g.connect(ac.destination); o.start(); o.stop(ac.currentTime + .08);
    }catch(_){ }
  }

  function rhythmHit(lane){
    const s = rhythmFixState;
    if(!s?.run) return;
    rhythmTone([330,392,494,587][lane]);
    const targetY = rhythmTargetY();
    let best = null;
    let distance = Infinity;
    s.notes.forEach(note => {
      if(note.l !== lane) return;
      const d = Math.abs((note.y + 16) - targetY);
      if(d < distance){ best = note; distance = d; }
    });
    s.total++;
    if(best && distance < 72){
      s.notes = s.notes.filter(note => note !== best);
      s.hit++;
      s.combo++;
      s.score += (distance < 22 ? 300 : distance < 45 ? 200 : 100) + Math.min(400, s.combo * 10);
    }else{
      s.combo = 0;
    }
    rhythmRender();
  }

  function rhythmFinish(){
    const s = rhythmFixState;
    if(!s) return;
    s.run = false;
    cancelAnimationFrame(rhythmFixRaf);
    rhythmFixRaf = 0;
    const best = Math.max(Number(localStorage.getItem('opoong_rhythm_best_v1') || 0), s.score);
    localStorage.setItem('opoong_rhythm_best_v1', String(best));
    const accuracy = s.total ? Math.round(s.hit / s.total * 100) : 100;
    if(window.OpoongGameResults?.show){
      window.OpoongGameResults.show('opoong-rhythm', {
        title:'오풍 리듬',
        primaryLabel:'점수',
        primaryValue:`${s.score}점`,
        stats:[{label:'정확도',value:`${accuracy}%`},{label:'최고 기록',value:`${best}점`}]
      });
    }else{
      window.showGameOverAd?.('opoong-rhythm');
    }
  }

  function rhythmLoop(now){
    const s = rhythmFixState;
    if(!s?.run) return;
    const dt = Math.min(.05, Math.max(0, (now - s.last) / 1000));
    s.last = now;
    s.time -= dt;
    s.spawn -= dt;
    if(s.spawn <= 0){
      s.notes.push({l:Math.floor(Math.random() * 4), y:-35});
      s.spawn = .48 + Math.random() * .18;
    }
    s.notes.forEach(note => { note.y += 235 * dt; });
    const stage = document.querySelector('#gameOpoongRhythmPanel .rhythmStage');
    const missY = (stage?.clientHeight || 470) + 40;
    s.notes = s.notes.filter(note => {
      if(note.y > missY){ s.total++; s.combo = 0; return false; }
      return true;
    });
    rhythmRender();
    if(s.time <= 0){
      s.time = 0;
      rhythmRender();
      rhythmFinish();
      return;
    }
    rhythmFixRaf = requestAnimationFrame(rhythmLoop);
  }

  function rhythmStartFixed(){
    cancelAnimationFrame(rhythmFixRaf);
    rhythmFixState = {time:45, score:0, combo:0, hit:0, total:0, notes:[], spawn:0, run:true, last:performance.now()};
    rhythmRender();
    rhythmTone(220);
    rhythmFixRaf = requestAnimationFrame(rhythmLoop);
  }

  function installRhythmFix(){
    if(rhythmFixInstalled) return;
    rhythmFixInstalled = true;

    document.addEventListener('click', event => {
      const start = event.target.closest?.('#rhythmStart');
      if(!start || !rhythmPanelVisible()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      rhythmStartFixed();
    }, true);

    window.addEventListener('keydown', event => {
      if(!rhythmPanelVisible() || !rhythmFixState?.run) return;
      const map = {KeyD:0, KeyF:1, KeyJ:2, KeyK:3};
      if(map[event.code] === undefined) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      rhythmHit(map[event.code]);
    }, true);
  }

  function installRhythmInput(){
    if(rhythmInputInstalled) return;
    rhythmInputInstalled = true;

    document.addEventListener('pointerdown', event => {
      const stage = event.target.closest?.('.rhythmStage');
      if(!stage || !rhythmPanelVisible()) return;
      const lanes = stage.querySelector('#rhythmLanes');
      if(!lanes) return;
      const rect = lanes.getBoundingClientRect();
      if(!rect.width) return;
      event.preventDefault();
      const lane = Math.max(0, Math.min(3, Math.floor((event.clientX - rect.left) / (rect.width / 4))));
      if(rhythmFixState?.run){
        event.stopImmediatePropagation();
        rhythmHit(lane);
        return;
      }
      const key = document.querySelector(`#gameOpoongRhythmPanel .rhythmKey[data-rhythm="${lane}"]`);
      key?.click();
    }, { passive:false, capture:true });

    document.addEventListener('pointerdown', event => {
      const key = event.target.closest?.('#gameOpoongRhythmPanel .rhythmKey[data-rhythm]');
      if(!key || !rhythmFixState?.run) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      rhythmHit(Number(key.dataset.rhythm));
    }, { passive:false, capture:true });
  }

  function ramenPanelVisible(){
    const panel = document.getElementById('gameOpoongRamenPanel');
    return !!panel && !panel.hidden;
  }

  function ensureRamenDragUI(){
    const panel = document.getElementById('gameOpoongRamenPanel');
    if(!panel) return;

    if(!document.getElementById('opoongRamenDragStyles')){
      const style = document.createElement('style');
      style.id = 'opoongRamenDragStyles';
      style.textContent = `
        #gameOpoongRamenPanel .ramenTool,#gameOpoongRamenPanel .ramenPot{cursor:grab;user-select:none;-webkit-user-select:none;touch-action:none}
        #gameOpoongRamenPanel .ramenTool:active,#gameOpoongRamenPanel .ramenPot:active{cursor:grabbing}
        .ramenServeZone{margin-top:12px;min-height:82px;border:2px dashed #fb7185;border-radius:20px;background:rgba(255,255,255,.76);display:grid;place-items:center;text-align:center;padding:12px;color:#9d174d;font-weight:1000;transition:.14s ease}
        .ramenServeZone span{display:block;font-size:27px;margin-bottom:3px}.ramenServeZone.hot{border-color:#16a34a;background:#f0fdf4;color:#047857;transform:scale(1.01)}
        .opoongRamenDragGhost{position:fixed;z-index:2147483646;pointer-events:none;min-width:72px;max-width:150px;padding:10px 13px;border-radius:17px;background:rgba(255,255,255,.96);border:2px solid #ec4899;box-shadow:0 15px 38px rgba(15,23,42,.25);text-align:center;color:#831843;font-weight:1000;transform:translate(-50%,-50%) rotate(-3deg)}
        .opoongRamenDragGhost.pot{min-width:118px;border-color:#f59e0b;background:#fffbeb}
        #gameOpoongRamenPanel .ramenPot.ramenDropTarget{outline:4px solid rgba(34,197,94,.45);background:rgba(255,255,255,.31)}
      `;
      document.head.appendChild(style);
    }

    const stove = panel.querySelector('.ramenStove');
    if(stove && !panel.querySelector('.ramenServeZone')){
      const zone = document.createElement('div');
      zone.className = 'ramenServeZone';
      zone.innerHTML = '<div><span>🍽️</span>완성된 냄비를 여기로 드래그해서 제공</div>';
      stove.insertAdjacentElement('afterend', zone);
    }

    const hint = panel.querySelector('.ramenStartRow .muted');
    if(hint) hint.textContent = '주전자·스프·면·계란·파를 냄비로 직접 드래그하세요. 완성된 냄비는 제공대로 끌어다 놓아야 판매됩니다.';
    const message = panel.querySelector('#ramenMessage');
    if(message && /선택|눌러/.test(message.textContent || '')) message.textContent = '재료를 잡아 냄비 위로 드래그해서 넣어주세요.';
  }

  function ramenClearDropTargets(){
    document.querySelectorAll('#gameOpoongRamenPanel .ramenDropTarget').forEach(el => el.classList.remove('ramenDropTarget'));
    document.querySelector('#gameOpoongRamenPanel .ramenServeZone')?.classList.remove('hot');
  }

  function ramenMoveGhost(x, y){
    if(!ramenDragState?.ghost) return;
    ramenDragState.ghost.style.left = `${x}px`;
    ramenDragState.ghost.style.top = `${y}px`;
  }

  function ramenInternalClick(el){
    if(!el) return;
    ramenSyntheticClick = true;
    try{ el.click(); }finally{ ramenSyntheticClick = false; }
  }

  function ramenStartDrag(event, source){
    const tool = source.closest?.('[data-ramen-tool]');
    const pot = source.closest?.('[data-ramen-pot]');
    if(!tool && !pot) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    ensureRamenDragUI();

    const ghost = document.createElement('div');
    ghost.className = `opoongRamenDragGhost${pot ? ' pot' : ''}`;
    if(tool){
      const icon = tool.querySelector('span')?.textContent || '🥣';
      const label = tool.querySelector('small')?.textContent || '재료';
      ghost.textContent = `${icon} ${label}`;
      ramenDragState = {type:'tool', key:tool.dataset.ramenTool, ghost, pointerId:event.pointerId};
    }else{
      const index = Number(pot.dataset.ramenPot);
      ghost.textContent = `🍜 ${index + 1}번 냄비`;
      ramenDragState = {type:'pot', index, ghost, pointerId:event.pointerId};
    }
    document.body.appendChild(ghost);
    ramenMoveGhost(event.clientX, event.clientY);
  }

  function ramenDragMove(event){
    if(!ramenDragState || event.pointerId !== ramenDragState.pointerId) return;
    event.preventDefault();
    ramenMoveGhost(event.clientX, event.clientY);
    ramenClearDropTargets();
    const under = document.elementFromPoint(event.clientX, event.clientY);
    if(ramenDragState.type === 'tool') under?.closest?.('#gameOpoongRamenPanel .ramenPot')?.classList.add('ramenDropTarget');
    else under?.closest?.('#gameOpoongRamenPanel .ramenServeZone')?.classList.add('hot');
  }

  function ramenDragEnd(event){
    if(!ramenDragState || event.pointerId !== ramenDragState.pointerId) return;
    event.preventDefault();
    const state = ramenDragState;
    ramenDragState = null;
    const under = document.elementFromPoint(event.clientX, event.clientY);
    ramenClearDropTargets();
    state.ghost?.remove();

    if(state.type === 'tool'){
      const pot = under?.closest?.('#gameOpoongRamenPanel .ramenPot[data-ramen-pot]');
      if(!pot) return;
      const tool = document.querySelector(`#gameOpoongRamenPanel .ramenTool[data-ramen-tool="${state.key}"]`);
      ramenInternalClick(tool);
      const currentPot = document.querySelector(`#gameOpoongRamenPanel .ramenPot[data-ramen-pot="${pot.dataset.ramenPot}"]`);
      ramenInternalClick(currentPot);
      return;
    }

    const zone = under?.closest?.('#gameOpoongRamenPanel .ramenServeZone');
    if(!zone) return;
    const serve = document.querySelector('#gameOpoongRamenPanel .ramenTool[data-ramen-tool="serve"]');
    ramenInternalClick(serve);
    const currentPot = document.querySelector(`#gameOpoongRamenPanel .ramenPot[data-ramen-pot="${state.index}"]`);
    ramenInternalClick(currentPot);
  }

  function installRamenDrag(){
    if(ramenDragInstalled) return;
    ramenDragInstalled = true;

    document.addEventListener('click', event => {
      if(ramenSyntheticClick || !ramenPanelVisible()) return;
      const control = event.target.closest?.('#gameOpoongRamenPanel .ramenTool, #gameOpoongRamenPanel .ramenPot');
      if(!control) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);

    document.addEventListener('pointerdown', event => {
      if(!ramenPanelVisible()) return;
      const source = event.target.closest?.('#gameOpoongRamenPanel .ramenTool, #gameOpoongRamenPanel .ramenPot');
      if(!source) return;
      ramenStartDrag(event, source);
    }, {capture:true, passive:false});

    document.addEventListener('pointermove', ramenDragMove, {capture:true, passive:false});
    document.addEventListener('pointerup', ramenDragEnd, {capture:true, passive:false});
    document.addEventListener('pointercancel', event => {
      if(!ramenDragState || event.pointerId !== ramenDragState.pointerId) return;
      ramenDragState.ghost?.remove();
      ramenDragState = null;
      ramenClearDropTargets();
    }, {capture:true, passive:false});

    ensureRamenDragUI();
    setTimeout(ensureRamenDragUI, 350);
    setTimeout(ensureRamenDragUI, 1000);
    setTimeout(ensureRamenDragUI, 2200);
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
    installRhythmFix();
    installRhythmInput();
    installRamenDrag();
    window.OpoongGameCount = { refresh:render, get:countGames };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();