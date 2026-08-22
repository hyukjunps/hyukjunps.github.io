(() => {
  'use strict';

  let observer = null;
  let rhythmInputInstalled = false;
  let rhythmFixInstalled = false;
  let rhythmFixState = null;
  let rhythmFixRaf = 0;

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
    window.OpoongGameCount = { refresh:render, get:countGames };
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();