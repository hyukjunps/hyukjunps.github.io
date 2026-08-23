(() => {
  'use strict';

  const KEY='opoong_ttt_opponent_v1';
  let installed=false,opponent='ai',turn='X',selected=-1;
  let baseSetMode=null,baseReset=null,basePlay=null,baseRender=null;
  const q=id=>document.getElementById(id);

  function styles(){if(q('opoongTtt2pStyles'))return;const s=document.createElement('style');s.id='opoongTtt2pStyles';s.textContent=`
    .tttOpponentSwitch{display:flex;justify-content:center;gap:8px;margin:0 0 9px}.tttOpponentSwitch .smallbtn[aria-pressed='true']{color:#fff;border-color:#0f766e;background:#0f766e}.tttVersusBadge{display:inline-flex;align-items:center;gap:5px;padding:4px 8px;border-radius:999px;background:#ecfdf5;color:#047857;font-size:10px;font-weight:1000;margin-left:5px}.tttOpponentSwitch .smallbtn[aria-pressed='true'] .tttVersusBadge{background:rgba(255,255,255,.18);color:#fff}@media(max-width:500px){.tttOpponentSwitch{flex-wrap:wrap}}
  `;document.head.appendChild(s);}
  function panel(){return q('tttBoard')?.closest('.miniGamePanel');}
  function helper(){const h=panel()?.querySelector('.gameControls .muted');if(!h)return;h.textContent=opponent==='local2'?(tttMode==='move'?'2인용 · 각자 말 3개를 놓은 뒤 자기 말을 빈칸으로 옮겨 먼저 3줄을 만들면 승리해요.':'2인용 · X와 O가 같은 기기에서 번갈아 한 칸씩 둡니다.'):(tttMode==='move'?'이동 모드에서는 X 3개를 놓은 뒤 내 말을 빈칸으로 옮겨요. · AI 난이도 쉬움':'가로·세로·대각선 3칸을 먼저 만들면 승리해요. · AI 난이도 쉬움');}
  function addSwitch(){const p=panel(),mode=p?.querySelector('.tttModeSwitch');if(!p||!mode||q('tttOpponentAi'))return;const w=document.createElement('div');w.className='tttOpponentSwitch';w.setAttribute('aria-label','틱택토 상대 선택');w.innerHTML='<button id="tttOpponentAi" class="smallbtn" type="button">컴퓨터와 대전</button><button id="tttOpponent2P" class="smallbtn" type="button">2인용 <span class="tttVersusBadge">같은 기기</span></button>';mode.parentNode.insertBefore(w,mode);q('tttOpponentAi')?.addEventListener('click',()=>setOpponent('ai'));q('tttOpponent2P')?.addEventListener('click',()=>setOpponent('local2'));}
  function sync(){q('tttOpponentAi')?.setAttribute('aria-pressed',String(opponent==='ai'));q('tttOpponent2P')?.setAttribute('aria-pressed',String(opponent==='local2'));helper();}
  function setOpponent(mode){opponent=mode==='local2'?'local2':'ai';try{localStorage.setItem(KEY,opponent);}catch(_){}clearTimeout(tttComputerTimer);tttComputerThinking=false;sync();window.resetTicTacToe?.();}
  function status(){const p=turn==='X'?'1P(X)':'2P(O)';if(tttMode==='normal')return`${p} 차례`;const count=tttMarkCount(turn);return count<3?`${p} 말 놓기 (${count}/3)`:selected>=0?`${p} · 옮길 빈 칸을 선택하세요`:`${p} · 옮길 말을 선택하세요`;}
  function finish(mark,line){tttGameOver=true;tttComputerThinking=false;selected=-1;setTttStatus(`${mark==='X'?'1P(X)':'2P(O)'} 승리!`);window.renderTicTacToe?.(line);window.OpoongGameResults?.show('ttt',{title:'틱택토 2인용',primaryLabel:'승자',primaryValue:mark==='X'?'1P · X':'2P · O',stats:[{label:'게임 방식',value:tttMode==='move'?'말 이동 모드':'일반 모드'}]})||window.showGameOverAd?.('ttt');}
  function draw(){tttGameOver=true;setTttStatus('무승부');window.renderTicTacToe?.();window.OpoongGameResults?.show('ttt',{title:'틱택토 2인용',primaryLabel:'결과',primaryValue:'무승부',stats:[{label:'게임 방식',value:'일반 모드'}]})||window.showGameOverAd?.('ttt');}
  function switchTurn(){turn=turn==='X'?'O':'X';selected=-1;setTttStatus(status());window.renderTicTacToe?.();}
  function play(index){if(tttGameOver)return;if(tttMode==='normal'){if(tttBoardState[index])return;tttBoardState[index]=turn;const line=tttWinningLine(turn);if(line)return finish(turn,line);if(tttBoardState.every(Boolean))return draw();switchTurn();return;}
    const count=tttMarkCount(turn);if(count<3){if(tttBoardState[index])return;tttBoardState[index]=turn;const line=tttWinningLine(turn);if(line)return finish(turn,line);switchTurn();return;}
    if(tttBoardState[index]===turn){selected=selected===index?-1:index;setTttStatus(status());window.renderTicTacToe?.();return;}
    if(tttBoardState[index]||selected<0){setTttStatus(`${turn==='X'?'1P(X)':'2P(O)'} · 먼저 자기 말을 선택하세요`);return;}
    tttBoardState[selected]='';tttBoardState[index]=turn;selected=-1;const line=tttWinningLine(turn);if(line)return finish(turn,line);switchTurn();
  }
  function render(line){const b=q('tttBoard');if(!b)return;const count=tttMarkCount(turn);b.innerHTML=tttBoardState.map((mark,index)=>{const win=line&&line.includes(index),sel=selected===index;let disabled=tttGameOver;if(!disabled&&tttMode==='normal'&&mark)disabled=true;if(!disabled&&tttMode==='move'&&count<3&&mark)disabled=true;if(!disabled&&tttMode==='move'&&count>=3&&mark&&mark!==turn)disabled=true;return`<button class="tttCell${mark==='O'?' ttt-o':''}${win?' ttt-win':''}${sel?' ttt-selected':''}" type="button" data-index="${index}" ${disabled?'disabled':''}>${mark}</button>`;}).join('');b.querySelectorAll('.tttCell').forEach(cell=>cell.addEventListener('click',()=>window.playTicTacToe?.(Number(cell.dataset.index))));}

  function install(){if(installed)return;if(typeof window.resetTicTacToe!=='function'||!q('tttBoard')){setTimeout(install,120);return;}installed=true;styles();addSwitch();baseSetMode=window.setTttMode;baseReset=window.resetTicTacToe;basePlay=window.playTicTacToe;baseRender=window.renderTicTacToe;try{opponent=localStorage.getItem(KEY)==='local2'?'local2':'ai';}catch(_){opponent='ai';}
    window.renderTicTacToe=function(line){if(opponent==='local2')return render(line);return baseRender.apply(this,arguments);};
    window.resetTicTacToe=function(){if(opponent!=='local2')return baseReset.apply(this,arguments);clearTimeout(tttComputerTimer);tttBoardState=Array(9).fill('');tttGameOver=false;tttComputerThinking=false;tttSelected=-1;selected=-1;turn='X';setTttStatus(status());render();helper();};
    window.playTicTacToe=function(index){if(opponent==='local2')return play(index);return basePlay.apply(this,arguments);};
    window.setTttMode=function(mode){if(opponent!=='local2')return baseSetMode.apply(this,arguments);tttMode=mode==='move'?'move':'normal';q('tttModeNormal')?.setAttribute('aria-pressed',String(tttMode==='normal'));q('tttModeMove')?.setAttribute('aria-pressed',String(tttMode==='move'));window.resetTicTacToe();};
    sync();if(opponent==='local2')window.resetTicTacToe();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
