(() => {
  'use strict';

  const GAME_ID = 'marble';
  const SAVE_KEY = 'opoong_marble_save_v1';
  const STATS_KEY = 'opoong_marble_stats_v1';
  const MAX_ROUNDS = 35;
  const START_CASH = 3200;
  const START_BONUS = 500;
  const PLAYER_COLORS = ['#2563eb', '#ef4444', '#16a34a', '#f59e0b'];
  const GROUP_COLORS = { asia:'#38bdf8', europe:'#a78bfa', america:'#fb7185', world:'#34d399' };
  const GROUP_NAMES = { asia:'아시아', europe:'유럽', america:'아메리카', world:'월드' };

  const TILE_DEFS = [
    {type:'start', name:'출발', icon:'GO'},
    {type:'city', name:'서울', group:'asia', price:320, rent:70},
    {type:'chance', name:'찬스', icon:'?'},
    {type:'city', name:'도쿄', group:'asia', price:360, rent:78},
    {type:'city', name:'베이징', group:'asia', price:400, rent:86},
    {type:'capital', name:'수도 지정', icon:'♛'},
    {type:'city', name:'싱가포르', group:'asia', price:460, rent:98},
    {type:'island', name:'무인도', icon:'⌛'},
    {type:'city', name:'파리', group:'europe', price:480, rent:104},
    {type:'city', name:'런던', group:'europe', price:520, rent:112},
    {type:'chance', name:'찬스', icon:'?'},
    {type:'city', name:'로마', group:'europe', price:440, rent:94},
    {type:'city', name:'베를린', group:'europe', price:500, rent:108},
    {type:'travel', name:'세계여행', icon:'✈'},
    {type:'city', name:'뉴욕', group:'america', price:620, rent:132},
    {type:'city', name:'LA', group:'america', price:560, rent:120},
    {type:'tax', name:'국세청', icon:'₩'},
    {type:'city', name:'밴쿠버', group:'america', price:500, rent:108},
    {type:'city', name:'리우', group:'america', price:460, rent:98},
    {type:'chance', name:'찬스', icon:'?'},
    {type:'city', name:'시드니', group:'world', price:540, rent:116},
    {type:'city', name:'두바이', group:'world', price:680, rent:146},
    {type:'city', name:'카이로', group:'world', price:420, rent:90},
    {type:'city', name:'케이프타운', group:'world', price:480, rent:104}
  ];

  const CHANCE_CARDS = [
    {title:'여행 지원금', text:'여행 지원금 300만을 받았어요.', amount:300},
    {title:'보너스 수익', text:'투자 수익으로 400만을 받았어요.', amount:400},
    {title:'수리비', text:'건물 수리비 220만을 냅니다.', amount:-220},
    {title:'세금 환급', text:'세금 환급 180만을 받았어요.', amount:180},
    {title:'교통비 폭탄', text:'예상 밖 교통비로 160만을 냅니다.', amount:-160},
    {title:'특급 이동', text:'가장 가까운 내 도시로 이동합니다.', action:'ownCity'},
    {title:'빠른 여행', text:'앞으로 4칸 이동합니다.', action:'forward4'},
    {title:'휴식권', text:'다음 무인도 효과를 한 번 무시합니다.', action:'shield'}
  ];

  let installed = false;
  let state = null;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let autoTimer = 0;
  let decisionResolver = null;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => Array.from(root.querySelectorAll(s));
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const money = (v) => `${Math.max(0, Math.round(Number(v)||0)).toLocaleString('ko-KR')}만`;
  const activePlayers = () => state ? state.players.filter(p => !p.bankrupt) : [];
  const currentPlayer = () => state?.players?.[state.turn] || null;
  const tileAt = (i) => state?.tiles?.[i] || null;
  const defAt = (i) => TILE_DEFS[i];

  function safeJson(key, fallback){
    try { const parsed = JSON.parse(localStorage.getItem(key) || 'null'); return parsed ?? fallback; }
    catch (_) { return fallback; }
  }
  function saveJson(key, value){ try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {} }

  function makeTiles(){ return TILE_DEFS.map(() => ({owner:null, level:0, landmark:false})); }
  function makePlayers(mode){
    let firstName='플레이어 1';
    try { firstName=String(localStorage.getItem('opoong_user_name_v1')||'').trim().slice(0,12)||'플레이어 1'; } catch(_) {}
    return [0,1,2,3].map(i => ({
      id:i,
      name: i===0 ? firstName : (mode==='ai' ? `AI ${i}` : `플레이어 ${i+1}`),
      cash:START_CASH,
      pos:0,
      skip:0,
      shield:0,
      bankrupt:false,
      capitalTile:null,
      ai: mode==='ai' && i>0,
      color:PLAYER_COLORS[i]
    }));
  }
  function newState(mode='ai'){
    return {
      version:1,
      mode: mode==='local' ? 'local' : 'ai',
      started:true,
      ended:false,
      turn:0,
      round:1,
      phase:'roll',
      dice:[1,1],
      tiles:makeTiles(),
      players:makePlayers(mode),
      log:['게임 시작! 도시를 사고, 건설하고, 랜드마크를 세워 승리하세요.'],
      lastAction:'플레이어 1의 차례입니다.'
    };
  }

  function loadState(){
    const raw = safeJson(SAVE_KEY, null);
    if(!raw || raw.version!==1 || !Array.isArray(raw.players) || !Array.isArray(raw.tiles)) return null;
    return raw;
  }
  function persist(){ if(state?.started && !state.ended) saveJson(SAVE_KEY, state); else localStorage.removeItem(SAVE_KEY); }
  function clearAuto(){ clearTimeout(autoTimer); autoTimer=0; }

  function pushLog(text){
    if(!state) return;
    state.log.unshift(text);
    state.log = state.log.slice(0, 14);
    state.lastAction = text;
  }

  function tileGridPos(index){
    if(index <= 6) return {r:1,c:index+1};
    if(index <= 12) return {r:index-5,c:7};
    if(index <= 18) return {r:7,c:19-index};
    return {r:25-index,c:1};
  }

  function injectStyles(){
    if($('#opoongMarbleStyles')) return;
    const style=document.createElement('style');
    style.id='opoongMarbleStyles';
    style.textContent=`
      .coverMarble{background:linear-gradient(145deg,#0ea5e9,#2563eb 52%,#312e81);color:#fff;position:relative;isolation:isolate}
      .coverMarble:before{content:'';position:absolute;inset:12%;border:3px solid rgba(255,255,255,.8);border-radius:22%;box-shadow:inset 0 0 0 7px rgba(255,255,255,.08)}
      .coverMarble:after{content:'♛';position:absolute;font-size:38px;filter:drop-shadow(0 7px 10px rgba(0,0,0,.28));transform:rotate(-7deg)}
      .marblePanel{max-width:1080px!important;padding:12px!important}
      .marbleTop{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
      .marbleTopLeft{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.marbleSave{font-size:11px;color:var(--muted);font-weight:850}
      .marblePlayers{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px;margin-bottom:9px}
      .marblePlayer{position:relative;min-width:0;padding:10px;border:2px solid transparent;border-radius:17px;background:var(--card2);overflow:hidden}
      .marblePlayer.active{border-color:var(--mp-color);box-shadow:0 8px 22px color-mix(in srgb,var(--mp-color) 20%,transparent)}
      .marblePlayer.bankrupt{opacity:.42;filter:grayscale(.7)}.marblePlayer:before{content:'';position:absolute;left:0;top:0;bottom:0;width:5px;background:var(--mp-color)}
      .marblePlayer strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:13px}.marblePlayer span{display:block;margin-top:4px;color:var(--muted);font-size:10.5px;font-weight:850}.marblePlayer .cash{color:var(--text);font-size:14px}
      .marbleBoardWrap{width:100%;overflow:auto;border-radius:24px;background:linear-gradient(135deg,#dbeafe,#eff6ff);padding:5px}
      html[data-theme='dark'] .marbleBoardWrap{background:linear-gradient(135deg,#0f172a,#172554)}
      .marbleBoard{position:relative;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));grid-template-rows:repeat(7,minmax(0,1fr));gap:4px;width:min(100%,880px);aspect-ratio:1;margin:auto;min-width:340px}
      .marbleTile{position:relative;min-width:0;overflow:hidden;padding:5px 4px;border:1px solid rgba(100,116,139,.26);border-radius:12px;background:rgba(255,255,255,.94);box-shadow:0 4px 10px rgba(15,23,42,.06);color:#0f172a}
      html[data-theme='dark'] .marbleTile{background:#172033;color:#f8fafc;border-color:#334155}
      .marbleTile.city{border-top:5px solid var(--group)}.marbleTile.special{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;background:linear-gradient(145deg,#fff,#e0f2fe)}
      html[data-theme='dark'] .marbleTile.special{background:linear-gradient(145deg,#111827,#172554)}
      .marbleTile.current{outline:3px solid color-mix(in srgb,var(--pri) 72%,white);z-index:2}.marbleTileName{display:block;font-size:clamp(7px,1.45vw,11px);font-weight:1000;line-height:1.08;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.marbleTileMeta{display:block;margin-top:3px;color:#64748b;font-size:clamp(6px,1.15vw,9px);font-weight:900;white-space:nowrap}.marbleTileIcon{font-size:clamp(14px,3vw,28px);font-weight:1000;line-height:1}.marbleOwner{position:absolute;inset:auto 3px 3px;height:4px;border-radius:999px;background:var(--owner)}
      .marbleBuilds{position:absolute;right:3px;top:3px;display:flex;gap:2px;align-items:end}.marbleBuilds i{display:block;width:4px;height:7px;border-radius:2px 2px 0 0;background:#64748b}.marbleBuilds .lm{width:8px;height:12px;background:#f59e0b;clip-path:polygon(50% 0,100% 35%,86% 100%,14% 100%,0 35%)}.marbleCapitalCrown{position:absolute;left:4px;top:2px;font-size:10px;color:#f59e0b;font-weight:1000}
      .marbleTokens{position:absolute;left:3px;bottom:8px;display:flex;gap:1px;flex-wrap:wrap;max-width:85%}.marbleToken{display:grid;place-items:center;width:12px;height:12px;border:1px solid rgba(255,255,255,.9);border-radius:50%;background:var(--pc);color:#fff;font-size:7px;font-weight:1000;box-shadow:0 2px 4px rgba(15,23,42,.25)}
      .marbleCenter{grid-area:2/2/7/7;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;min-width:0;padding:10px;border:1px solid color-mix(in srgb,var(--pri) 16%,var(--line));border-radius:22px;background:radial-gradient(circle at 50% 0,color-mix(in srgb,var(--pri3) 18%,var(--card)),var(--card) 67%);box-shadow:inset 0 0 30px rgba(59,130,246,.05)}
      .marbleTurn{font-size:clamp(10px,2vw,15px);font-weight:1000;text-align:center}.marbleDice{display:flex;gap:7px;margin:8px 0}.marbleDie{display:grid;place-items:center;width:clamp(31px,7vw,58px);aspect-ratio:1;border:1px solid var(--line);border-radius:14px;background:#fff;color:#0f172a;box-shadow:0 8px 18px rgba(15,23,42,.12);font-size:clamp(18px,4vw,34px);font-weight:1000}.marbleMessage{max-width:430px;min-height:34px;color:var(--muted);font-size:clamp(8px,1.7vw,12px);font-weight:850;line-height:1.45;text-align:center}.marbleRoll{margin-top:8px;min-height:44px!important;padding:10px 16px!important}.marbleRound{margin-top:5px;color:var(--muted);font-size:9.5px;font-weight:900}
      .marbleDecision{position:absolute;z-index:10;inset:8%;display:flex;flex-direction:column;justify-content:center;padding:14px;border:1px solid var(--line);border-radius:20px;background:color-mix(in srgb,var(--card) 97%,transparent);box-shadow:0 18px 50px rgba(15,23,42,.28);backdrop-filter:blur(10px)}.marbleDecision[hidden]{display:none!important}.marbleDecision h3{margin:0;font-size:clamp(14px,3vw,21px)}.marbleDecision p{margin:7px 0 10px;color:var(--muted);font-size:11px;font-weight:850;line-height:1.5}.marbleDecisionActions{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;max-height:150px;overflow:auto}.marbleDecisionActions button{font-size:11px;padding:8px 10px}.marbleDecisionClose{margin-top:7px;text-align:center;color:var(--muted);font-size:9px;font-weight:850}
      .marbleBottom{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,.9fr);gap:8px;margin-top:9px}.marbleInfo,.marbleLog{min-height:100px;padding:10px;border:1px solid var(--line);border-radius:17px;background:var(--card2)}.marbleInfo strong,.marbleLog strong{font-size:12px}.marbleInfoBody{margin-top:6px;color:var(--muted);font-size:11px;font-weight:800;line-height:1.55}.marbleLogList{margin-top:6px;max-height:95px;overflow:auto;display:grid;gap:3px;color:var(--muted);font-size:9.5px;font-weight:800;line-height:1.4}
      .marbleSetup{position:absolute;z-index:20;inset:4%;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;border:1px solid var(--line);border-radius:24px;background:color-mix(in srgb,var(--card) 97%,transparent);box-shadow:0 22px 60px rgba(15,23,42,.25);text-align:center}.marbleSetup[hidden]{display:none!important}.marbleSetup h3{margin:0;font-size:clamp(20px,4vw,34px)}.marbleSetup p{max-width:520px;margin:8px 0;color:var(--muted);font-size:12px;font-weight:850;line-height:1.6}.marbleModeRow{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin:10px 0}.marbleModeRow button[aria-pressed='true']{color:#fff;background:linear-gradient(135deg,var(--pri),var(--pri2));border-color:transparent}.marbleStartBtn{min-width:180px}.marbleLegend{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin-top:8px}.marbleLegend span{padding:4px 7px;border-radius:999px;background:var(--card2);color:var(--muted);font-size:9px;font-weight:900}
      @media(max-width:700px){.marblePanel{padding:7px!important}.marblePlayers{grid-template-columns:repeat(2,minmax(0,1fr))}.marblePlayer{padding:8px}.marbleBottom{grid-template-columns:1fr}.marbleBoard{gap:2px}.marbleTile{padding:3px 2px;border-radius:8px}.marbleCenter{padding:6px;border-radius:14px}.marbleDecision{inset:3%;padding:10px}.marbleDecision p{font-size:9.5px}.marbleDecisionActions button{font-size:9px;padding:6px 7px}.marbleRoll{min-height:36px!important;padding:7px 10px!important;font-size:11px!important}}
      @media(max-width:390px){.marbleTileMeta{display:none}.marbleBuilds i{width:3px}.marbleToken{width:10px;height:10px;font-size:6px}.marbleMessage{max-height:44px;overflow:auto}.marbleSetup{inset:2%;padding:12px}.marbleSetup p{font-size:10px}}
    `;
    document.head.appendChild(style);
  }

  function addCard(){
    const grid=$('#gameHub .gameCardGrid');
    if(!grid || $('#gameCardMarble')) return;
    const button=document.createElement('button');
    button.className='gameCard'; button.type='button'; button.id='gameCardMarble';
    button.innerHTML='<span class="gameCover coverMarble"></span><span class="gameCardInfo"><b>O.Poong 월드</b><span id="gameCardMarbleMeta">4인 부동산 전략</span></span>';
    button.addEventListener('click',()=>window.openMiniGame(GAME_ID));
    grid.appendChild(button);
    try{ window.OpoongGameCount?.refresh?.(); }catch(_){}
  }

  function addPanel(){
    const gameView=$('#view-game');
    if(!gameView || $('#gameMarblePanel')) return;
    const shop=$('#gameColorShop');
    const panel=document.createElement('div');
    panel.id='gameMarblePanel'; panel.className='gamePlayCard miniGamePanel marblePanel'; panel.hidden=true;
    panel.innerHTML=`
      <div class="marbleTop">
        <div class="marbleTopLeft"><button id="marbleNewGame" class="smallbtn ghost" type="button">새 게임</button><button id="marbleRules" class="smallbtn ghost" type="button">규칙</button></div>
        <span class="marbleSave">자동 저장 · 한 기기에서 4인 플레이 가능</span>
      </div>
      <div id="marblePlayers" class="marblePlayers"></div>
      <div class="marbleBoardWrap">
        <div id="marbleBoard" class="marbleBoard" aria-label="O.Poong 월드 게임판">
          <section class="marbleCenter">
            <div id="marbleTurn" class="marbleTurn">O.Poong 월드</div>
            <div class="marbleDice"><div id="marbleDie1" class="marbleDie">1</div><div id="marbleDie2" class="marbleDie">1</div></div>
            <div id="marbleMessage" class="marbleMessage">게임을 시작해 주세요.</div>
            <button id="marbleRoll" class="bigBtn marbleRoll" type="button">주사위 굴리기</button>
            <div id="marbleRound" class="marbleRound">최대 ${MAX_ROUNDS}라운드</div>
          </section>
          <section id="marbleDecision" class="marbleDecision" hidden><h3 id="marbleDecisionTitle"></h3><p id="marbleDecisionText"></p><div id="marbleDecisionActions" class="marbleDecisionActions"></div><div class="marbleDecisionClose">선택하면 다음 단계로 진행됩니다.</div></section>
          <section id="marbleSetup" class="marbleSetup">
            <h3>O.Poong 월드</h3>
            <p>4명이 주사위를 굴려 도시를 사고 건물을 올립니다. 3단계 건설 뒤에는 랜드마크를 세울 수 있고, 수도 지정으로 핵심 도시의 통행료를 더 높일 수 있어요.</p>
            <div class="marbleModeRow"><button class="smallbtn ghost" type="button" data-marble-mode="ai" aria-pressed="true">나 + AI 3명</button><button class="smallbtn ghost" type="button" data-marble-mode="local" aria-pressed="false">4인 로컬</button></div>
            <button id="marbleStart" class="bigBtn marbleStartBtn" type="button">게임 시작</button>
            <div class="marbleLegend"><span>도시 매입</span><span>건물 3단계</span><span>랜드마크</span><span>수도 지정</span><span>인수</span><span>세계여행</span></div>
          </section>
        </div>
      </div>
      <div class="marbleBottom"><div class="marbleInfo"><strong>현재 칸</strong><div id="marbleInfoBody" class="marbleInfoBody">게임이 시작되면 도시 정보가 표시됩니다.</div></div><div class="marbleLog"><strong>게임 기록</strong><div id="marbleLogList" class="marbleLogList"></div></div></div>`;
    if(shop?.parentNode) shop.parentNode.insertBefore(panel, shop); else gameView.appendChild(panel);
  }

  function groupOwnedBy(owner, group){
    return TILE_DEFS.every((d,i)=> d.group!==group || state.tiles[i].owner===owner);
  }
  function propertyValue(index){
    const d=defAt(index), t=tileAt(index); if(!d || d.type!=='city' || !t) return 0;
    return d.price + t.level*Math.round(d.price*.55) + (t.landmark ? Math.round(d.price*1.35) : 0);
  }
  function playerAssets(id){
    if(!state) return 0;
    const p=state.players[id];
    return p.cash + state.tiles.reduce((sum,t,i)=> t.owner===id ? sum+propertyValue(i) : sum,0);
  }
  function rentFor(index){
    const d=defAt(index), t=tileAt(index); if(!d || d.type!=='city' || t.owner==null) return 0;
    let rent=d.rent*(1+t.level*1.05);
    if(t.landmark) rent*=2.65;
    if(groupOwnedBy(t.owner,d.group)) rent*=1.55;
    if(state.players[t.owner]?.capitalTile===index) rent*=1.5;
    return Math.round(rent);
  }
  function buildCost(index){ const d=defAt(index); return Math.round(d.price*.55); }
  function landmarkCost(index){ const d=defAt(index); return Math.round(d.price*1.35); }
  function buyoutCost(index){ return Math.round(propertyValue(index)*1.75); }

  function render(){
    if(!state) return;
    renderPlayers(); renderBoard(); renderCenter(); renderInfo(); renderLog(); updateCardMeta();
    persist();
  }

  function renderPlayers(){
    const box=$('#marblePlayers'); if(!box) return;
    box.innerHTML=state.players.map((p,i)=>{
      const owned=state.tiles.filter(t=>t.owner===p.id).length;
      const crown=p.capitalTile!=null ? ` · 수도 ${defAt(p.capitalTile)?.name||''}` : '';
      return `<div class="marblePlayer ${i===state.turn&&!p.bankrupt?'active':''} ${p.bankrupt?'bankrupt':''}" style="--mp-color:${p.color}"><strong>${escapeHtml(p.name)}${p.ai?' · AI':''}</strong><span class="cash">${p.bankrupt?'파산':money(p.cash)}</span><span>도시 ${owned}개${crown}</span></div>`;
    }).join('');
  }

  function escapeHtml(s){ return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function renderBoard(){
    const board=$('#marbleBoard'); if(!board) return;
    $$('.marbleTile',board).forEach(el=>el.remove());
    TILE_DEFS.forEach((d,i)=>{
      const pos=tileGridPos(i), t=tileAt(i), tile=document.createElement('div');
      const owner=t.owner==null?null:state.players[t.owner];
      tile.className=`marbleTile ${d.type==='city'?'city':'special'} ${currentPlayer()?.pos===i?'current':''}`;
      tile.style.gridRow=pos.r; tile.style.gridColumn=pos.c;
      if(d.group) tile.style.setProperty('--group',GROUP_COLORS[d.group]);
      if(owner) tile.style.setProperty('--owner',owner.color);
      const playersHere=state.players.filter(p=>!p.bankrupt&&p.pos===i);
      const capitalOwner=state.players.find(p=>p.capitalTile===i&&!p.bankrupt);
      const builds=t.landmark ? '<i class="lm"></i>' : Array.from({length:t.level},()=>'<i></i>').join('');
      tile.innerHTML=d.type==='city'
        ? `${capitalOwner?'<span class="marbleCapitalCrown">♛</span>':''}<span class="marbleTileName">${escapeHtml(d.name)}</span><span class="marbleTileMeta">${owner?money(rentFor(i)):money(d.price)}</span><span class="marbleBuilds">${builds}</span>${owner?'<span class="marbleOwner"></span>':''}<span class="marbleTokens">${playersHere.map(p=>`<i class="marbleToken" style="--pc:${p.color}">${p.id+1}</i>`).join('')}</span>`
        : `<span class="marbleTileIcon">${escapeHtml(d.icon||'★')}</span><span class="marbleTileName">${escapeHtml(d.name)}</span><span class="marbleTokens">${playersHere.map(p=>`<i class="marbleToken" style="--pc:${p.color}">${p.id+1}</i>`).join('')}</span>`;
      tile.title=d.type==='city'?`${d.name} · 매입 ${money(d.price)} · 기본 통행료 ${money(d.rent)}`:d.name;
      board.appendChild(tile);
    });
  }

  function renderCenter(){
    const p=currentPlayer();
    const turn=$('#marbleTurn'), msg=$('#marbleMessage'), roll=$('#marbleRoll'), round=$('#marbleRound');
    if(turn) turn.textContent=state.ended?'게임 종료':`${p?.name||'-'}의 차례`;
    if(msg) msg.textContent=state.lastAction||'';
    if($('#marbleDie1')) $('#marbleDie1').textContent=state.dice?.[0]||1;
    if($('#marbleDie2')) $('#marbleDie2').textContent=state.dice?.[1]||1;
    if(round) round.textContent=`라운드 ${state.round} / ${MAX_ROUNDS} · 출발 통과 +${money(START_BONUS)}`;
    if(roll){
      const can=state.started&&!state.ended&&state.phase==='roll'&&p&&!p.ai&&!p.bankrupt;
      roll.disabled=!can;
      roll.textContent=state.ended?'게임 종료':p?.ai?'AI 진행 중…':'주사위 굴리기';
    }
  }

  function renderInfo(){
    const box=$('#marbleInfoBody'); if(!box||!state) return;
    const p=currentPlayer(); const d=defAt(p?.pos||0); const t=tileAt(p?.pos||0);
    if(!d){ box.textContent='-'; return; }
    if(d.type==='city'){
      const owner=t.owner==null?'은행':state.players[t.owner].name;
      const level=t.landmark?'랜드마크':t.level?`건물 ${t.level}단계`:'빈 땅';
      const monopoly=t.owner!=null&&groupOwnedBy(t.owner,d.group)?' · 지역 독점 보너스':' ';
      const capital=state.players[t.owner]?.capitalTile===p.pos?' · 수도':' ';
      box.innerHTML=`<b>${escapeHtml(d.name)}</b> · ${GROUP_NAMES[d.group]}<br>소유: ${escapeHtml(owner)} · ${level}${capital}<br>매입 ${money(d.price)} · 현재 통행료 ${money(t.owner==null?d.rent:rentFor(p.pos))}${monopoly}`;
    }else box.innerHTML=`<b>${escapeHtml(d.name)}</b><br>${specialDescription(d.type)}`;
  }
  function specialDescription(type){
    return ({start:`지나갈 때마다 ${money(START_BONUS)}를 받습니다.`,chance:'무작위 이벤트가 발생합니다.',capital:'보유 도시 하나를 수도로 지정해 통행료를 1.5배로 만듭니다.',island:'다음 한 턴을 쉽니다.',travel:'원하는 도시로 바로 이동할 수 있습니다.',tax:'현금의 12%를 세금으로 냅니다.'})[type]||'';
  }
  function renderLog(){ const box=$('#marbleLogList'); if(box) box.innerHTML=state.log.map(x=>`<div>• ${escapeHtml(x)}</div>`).join(''); }

  function updateCardMeta(){
    const meta=$('#gameCardMarbleMeta'); if(!meta) return;
    const stats=safeJson(STATS_KEY,{wins:0,games:0});
    meta.textContent=stats.games?`AI전 ${stats.wins||0}승 · 자동 저장`:'4인 부동산 전략 · 자동 저장';
  }

  function showDecision(title,text,actions){
    const box=$('#marbleDecision'), titleEl=$('#marbleDecisionTitle'), textEl=$('#marbleDecisionText'), actionEl=$('#marbleDecisionActions');
    if(!box||!actionEl) return;
    state.phase='decision';
    titleEl.textContent=title; textEl.textContent=text; actionEl.innerHTML='';
    actions.forEach(a=>{
      const b=document.createElement('button'); b.type='button'; b.className=`smallbtn ${a.primary?'primary':'ghost'}`; b.textContent=a.label;
      b.addEventListener('click',()=>{ box.hidden=true; decisionResolver=null; a.run(); });
      actionEl.appendChild(b);
    });
    box.hidden=false; renderCenter(); persist();
  }
  function hideDecision(){ const box=$('#marbleDecision'); if(box) box.hidden=true; }

  function animateDice(finalA, finalB, done){
    let n=0; clearAuto(); state.phase='moving';
    const tick=()=>{
      n++;
      state.dice=[1+Math.floor(Math.random()*6),1+Math.floor(Math.random()*6)];
      renderCenter();
      if(n<8){ autoTimer=setTimeout(tick,55); return; }
      state.dice=[finalA,finalB]; renderCenter(); setTimeout(done,100);
    };
    tick();
  }

  function rollDice(){
    const p=currentPlayer();
    if(!p||state.ended||state.phase!=='roll'||p.bankrupt) return;
    const a=1+Math.floor(Math.random()*6), b=1+Math.floor(Math.random()*6), steps=a+b;
    animateDice(a,b,()=>{
      pushLog(`${p.name}: 주사위 ${a} + ${b} = ${steps}`);
      movePlayer(p.id,steps,()=>resolveLanding(p.id));
    });
  }

  function movePlayer(id,steps,done){
    const p=state.players[id]; if(!p) return done?.();
    let left=steps;
    const step=()=>{
      if(left<=0){ render(); return done?.(); }
      const prev=p.pos; p.pos=(p.pos+1)%TILE_DEFS.length;
      if(p.pos===0 && prev!==0){ p.cash+=START_BONUS; pushLog(`${p.name}: 출발 통과 +${money(START_BONUS)}`); }
      left--; renderBoard(); renderPlayers(); renderCenter();
      autoTimer=setTimeout(step,85);
    };
    step();
  }

  function teleportPlayer(id,index,done){
    const p=state.players[id]; if(!p) return done?.();
    if(index < p.pos){ p.cash+=START_BONUS; pushLog(`${p.name}: 세계여행으로 출발을 지나 +${money(START_BONUS)}`); }
    p.pos=index; render(); setTimeout(()=>done?.(),160);
  }

  function resolveLanding(id){
    const p=state.players[id]; if(!p||p.bankrupt) return nextTurn();
    const d=defAt(p.pos), t=tileAt(p.pos); render();
    if(d.type==='city') return resolveCity(id,p.pos);
    if(d.type==='start'){ pushLog(`${p.name}: 출발 도착`); return finishTurn(); }
    if(d.type==='chance') return resolveChance(id);
    if(d.type==='capital') return resolveCapital(id);
    if(d.type==='island'){
      if(p.shield>0){ p.shield--; pushLog(`${p.name}: 휴식권으로 무인도를 통과했습니다.`); }
      else { p.skip=1; pushLog(`${p.name}: 무인도! 다음 턴을 쉽니다.`); }
      return finishTurn();
    }
    if(d.type==='travel') return resolveTravel(id);
    if(d.type==='tax'){
      const fee=Math.max(100,Math.round(p.cash*.12));
      payBank(id,fee,`${p.name}: 세금 ${money(fee)}`);
      return finishTurn();
    }
    finishTurn();
  }

  function resolveCity(id,index){
    const p=state.players[id], d=defAt(index), t=tileAt(index);
    if(t.owner==null){
      if(p.ai){
        if(shouldAiBuy(p,index)){ buyCity(id,index); }
        else pushLog(`${p.name}: ${d.name} 매입을 포기했습니다.`);
        return finishTurn();
      }
      const can=p.cash>=d.price;
      return showDecision(`${d.name} 매입`,`${money(d.price)}에 땅을 살까요? 기본 통행료는 ${money(d.rent)}입니다.`,[
        {label:`매입 ${money(d.price)}`,primary:true,run:()=>{ if(can) buyCity(id,index); finishTurn(); }},
        {label:'그냥 지나가기',run:()=>{ pushLog(`${p.name}: ${d.name} 매입을 포기했습니다.`); finishTurn(); }}
      ].filter(a=>can||!a.primary));
    }
    if(t.owner===id) return resolveOwnCity(id,index);
    return resolveOpponentCity(id,index);
  }

  function buyCity(id,index){
    const p=state.players[id],d=defAt(index),t=tileAt(index);
    if(t.owner!=null||p.cash<d.price) return false;
    p.cash-=d.price; t.owner=id; t.level=0; t.landmark=false;
    pushLog(`${p.name}: ${d.name} 매입 -${money(d.price)}`); render(); return true;
  }

  function resolveOwnCity(id,index){
    const p=state.players[id], d=defAt(index), t=tileAt(index);
    if(t.landmark){ pushLog(`${p.name}: 랜드마크 ${d.name}에 도착했습니다.`); return finishTurn(); }
    const landmark=t.level>=3;
    const cost=landmark?landmarkCost(index):buildCost(index);
    const label=landmark?`랜드마크 ${money(cost)}`:`건물 ${t.level+1}단계 ${money(cost)}`;
    if(p.ai){
      if(p.cash>cost+550 && (landmark || Math.random()<.72)) buildProperty(id,index);
      return finishTurn();
    }
    if(p.cash<cost){ pushLog(`${p.name}: ${d.name} 건설 자금이 부족합니다.`); return finishTurn(); }
    showDecision(`${d.name} 건설`, landmark?'최종 단계! 랜드마크를 건설하면 통행료가 크게 상승하고 인수되지 않습니다.':`건물을 ${t.level+1}단계로 올릴까요?`,[
      {label,primary:true,run:()=>{buildProperty(id,index);finishTurn();}},
      {label:'건설 안 함',run:()=>finishTurn()}
    ]);
  }

  function buildProperty(id,index){
    const p=state.players[id],d=defAt(index),t=tileAt(index); if(t.owner!==id||t.landmark) return false;
    if(t.level>=3){
      const cost=landmarkCost(index); if(p.cash<cost) return false;
      p.cash-=cost; t.landmark=true; pushLog(`${p.name}: ${d.name} 랜드마크 건설! -${money(cost)}`);
    } else {
      const cost=buildCost(index); if(p.cash<cost) return false;
      p.cash-=cost; t.level++; pushLog(`${p.name}: ${d.name} 건물 ${t.level}단계 -${money(cost)}`);
    }
    render(); return true;
  }

  function resolveOpponentCity(id,index){
    const p=state.players[id], t=tileAt(index), owner=state.players[t.owner], d=defAt(index), rent=rentFor(index);
    const survived=payPlayer(id,t.owner,rent,`${p.name}: ${owner.name}의 ${d.name} 통행료 ${money(rent)}`);
    if(!survived || p.bankrupt) return finishTurn();
    if(t.landmark) return finishTurn();
    const cost=buyoutCost(index);
    if(p.ai){
      if(p.cash>cost+700 && Math.random()<.34) takeOver(id,index,cost);
      return finishTurn();
    }
    if(p.cash<cost) return finishTurn();
    showDecision(`${d.name} 인수`,`${owner.name}의 도시를 ${money(cost)}에 인수할 수 있어요. 랜드마크가 세워지기 전까지만 가능합니다.`,[
      {label:`인수 ${money(cost)}`,primary:true,run:()=>{takeOver(id,index,cost);finishTurn();}},
      {label:'인수 안 함',run:()=>finishTurn()}
    ]);
  }

  function takeOver(id,index,cost){
    const buyer=state.players[id], t=tileAt(index), seller=state.players[t.owner], d=defAt(index);
    if(!seller||t.landmark||buyer.cash<cost) return false;
    buyer.cash-=cost; seller.cash+=cost;
    if(seller.capitalTile===index) seller.capitalTile=null;
    t.owner=id;
    pushLog(`${buyer.name}: ${seller.name}에게서 ${d.name} 인수 -${money(cost)}`); render(); return true;
  }

  function payPlayer(fromId,toId,amount,label){
    const from=state.players[fromId],to=state.players[toId]; amount=Math.max(0,Math.round(amount));
    if(from.cash>=amount){ from.cash-=amount; to.cash+=amount; pushLog(label); render(); return true; }
    to.cash+=Math.max(0,from.cash); from.cash=0; pushLog(`${label} · 자금 부족`); bankruptPlayer(fromId,`${from.name}이 파산했습니다.`); return false;
  }
  function payBank(id,amount,label){
    const p=state.players[id]; amount=Math.max(0,Math.round(amount));
    if(p.cash>=amount){ p.cash-=amount; pushLog(label); render(); return true; }
    p.cash=0; pushLog(`${label} · 자금 부족`); bankruptPlayer(id,`${p.name}이 파산했습니다.`); return false;
  }

  function bankruptPlayer(id,message){
    const p=state.players[id]; if(!p||p.bankrupt) return;
    p.bankrupt=true; p.capitalTile=null;
    state.tiles.forEach(t=>{ if(t.owner===id){ t.owner=null; t.level=0; t.landmark=false; } });
    pushLog(message); render();
    checkGameEnd();
  }

  function resolveChance(id){
    const p=state.players[id], card=CHANCE_CARDS[Math.floor(Math.random()*CHANCE_CARDS.length)];
    pushLog(`${p.name} · 찬스: ${card.title}`); render();
    const apply=()=>{
      if(card.amount>0){ p.cash+=card.amount; pushLog(`${p.name}: +${money(card.amount)}`); return finishTurn(); }
      if(card.amount<0){ payBank(id,-card.amount,`${p.name}: -${money(-card.amount)}`); return finishTurn(); }
      if(card.action==='shield'){ p.shield++; pushLog(`${p.name}: 휴식권 1장 획득`); return finishTurn(); }
      if(card.action==='forward4') return movePlayer(id,4,()=>resolveLanding(id));
      if(card.action==='ownCity'){
        const own=TILE_DEFS.map((d,i)=>d.type==='city'&&state.tiles[i].owner===id?i:-1).filter(i=>i>=0);
        if(!own.length) return finishTurn();
        const target=own.reduce((best,i)=>propertyValue(i)>propertyValue(best)?i:best,own[0]);
        return teleportPlayer(id,target,()=>resolveLanding(id));
      }
      finishTurn();
    };
    if(p.ai) return setTimeout(apply,420);
    showDecision(card.title,card.text,[{label:'확인',primary:true,run:apply}]);
  }

  function resolveCapital(id){
    const p=state.players[id];
    const owned=TILE_DEFS.map((d,i)=>d.type==='city'&&state.tiles[i].owner===id?i:-1).filter(i=>i>=0);
    if(!owned.length){ pushLog(`${p.name}: 수도로 지정할 보유 도시가 없습니다.`); return finishTurn(); }
    if(p.ai){
      const target=owned.reduce((best,i)=>propertyValue(i)>propertyValue(best)?i:best,owned[0]);
      p.capitalTile=target; pushLog(`${p.name}: ${defAt(target).name}을 수도로 지정했습니다.`); return finishTurn();
    }
    showDecision('수도 지정','보유 도시 하나를 수도로 지정하세요. 수도는 통행료가 1.5배가 되며, 나중에 다시 바꿀 수 있습니다.',owned.map(i=>({label:`♛ ${defAt(i).name}`,primary:i===p.capitalTile,run:()=>{p.capitalTile=i;pushLog(`${p.name}: ${defAt(i).name}을 수도로 지정했습니다.`);finishTurn();}})));
  }

  function resolveTravel(id){
    const p=state.players[id];
    const cities=TILE_DEFS.map((d,i)=>d.type==='city'?i:-1).filter(i=>i>=0);
    if(p.ai){
      const unowned=cities.filter(i=>state.tiles[i].owner==null&&p.cash>defAt(i).price+500);
      const own=cities.filter(i=>state.tiles[i].owner===id&&!state.tiles[i].landmark);
      const pool=unowned.length?unowned:own.length?own:cities;
      const target=pool.reduce((best,i)=>propertyValue(i)>propertyValue(best)?i:best,pool[0]);
      pushLog(`${p.name}: 세계여행 → ${defAt(target).name}`);
      return teleportPlayer(id,target,()=>resolveLanding(id));
    }
    showDecision('세계여행','이동할 도시를 선택하세요. 출발선을 지나면 보너스도 받습니다.',cities.map(i=>({label:defAt(i).name,run:()=>{pushLog(`${p.name}: 세계여행 → ${defAt(i).name}`);teleportPlayer(id,i,()=>resolveLanding(id));}})));
  }

  function shouldAiBuy(p,index){
    const d=defAt(index); if(p.cash<d.price+450) return false;
    const ownedInGroup=TILE_DEFS.reduce((n,x,i)=>n+(x.group===d.group&&state.tiles[i].owner===p.id?1:0),0);
    return Math.random() < .72 + ownedInGroup*.07;
  }

  function finishTurn(){
    hideDecision();
    if(checkGameEnd()) return;
    state.phase='transition'; render();
    autoTimer=setTimeout(nextTurn,280);
  }

  function nextTurn(){
    clearAuto(); if(!state||state.ended) return;
    const previous=state.turn;
    let next=previous;
    for(let i=0;i<state.players.length;i++){
      next=(next+1)%state.players.length;
      if(!state.players[next].bankrupt) break;
    }
    if(next<=previous) state.round++;
    state.turn=next; state.phase='roll';
    if(state.round>MAX_ROUNDS){ return finishByAssets(); }
    const p=currentPlayer();
    if(p.skip>0){ p.skip--; pushLog(`${p.name}: 무인도 효과로 이번 턴을 쉽니다.`); render(); return autoTimer=setTimeout(nextTurn,650); }
    pushLog(`${p.name}의 차례입니다.`); render();
    if(p.ai) autoTimer=setTimeout(rollDice,650);
  }

  function checkGameEnd(){
    const alive=activePlayers();
    if(alive.length<=1){ finishGame(alive[0]||null,'마지막 생존'); return true; }
    return false;
  }

  function finishByAssets(){
    const alive=activePlayers().slice().sort((a,b)=>playerAssets(b.id)-playerAssets(a.id));
    finishGame(alive[0]||null,`${MAX_ROUNDS}라운드 자산 승부`);
  }

  function finishGame(winner,reason){
    if(!state||state.ended) return;
    state.ended=true; state.phase='ended'; clearAuto(); hideDecision();
    const ranking=state.players.slice().sort((a,b)=>playerAssets(b.id)-playerAssets(a.id));
    pushLog(winner?`${winner.name} 승리! (${reason})`:`게임 종료 (${reason})`);
    const stats=safeJson(STATS_KEY,{wins:0,games:0}); stats.games=(stats.games||0)+1;
    if(state.mode==='ai'&&winner?.id===0) stats.wins=(stats.wins||0)+1;
    saveJson(STATS_KEY,stats); localStorage.removeItem(SAVE_KEY); render();
    const actions=[{label:'새 게임',primary:true,run:()=>openSetup(true)},{label:'결과 닫기',run:()=>{}}];
    showDecision('게임 종료',`${winner?winner.name+' 승리!':'승자 없음'} · ${ranking.map((p,i)=>`${i+1}위 ${p.name} ${money(playerAssets(p.id))}`).join(' / ')}`,actions);
  }

  function startNewGame(mode){
    clearAuto(); hideDecision();
    state=newState(mode);
    const setup=$('#marbleSetup'); if(setup) setup.hidden=true;
    render();
    if(currentPlayer()?.ai) autoTimer=setTimeout(rollDice,500);
  }

  function openSetup(force=false){
    clearAuto(); hideDecision();
    if(force){ state=null; localStorage.removeItem(SAVE_KEY); }
    const setup=$('#marbleSetup'); if(setup) setup.hidden=false;
    if(!state){
      state={started:false,ended:false,mode:'ai',turn:0,round:1,phase:'setup',dice:[1,1],tiles:makeTiles(),players:makePlayers('ai'),log:[],lastAction:'게임 모드를 선택하세요.'};
    }
    render();
  }

  function openRules(){
    if(!state?.started || state.ended) return;
    if(state.phase==='decision' || state.phase==='moving' || state.phase==='transition') return;
    const previousPhase=state.phase;
    showDecision('게임 규칙','도시를 매입하고 내 도시에 다시 도착해 건물을 3단계까지 올린 뒤 랜드마크를 건설하세요. 같은 지역의 도시를 모두 가지면 통행료가 추가 상승합니다. 수도 지정 칸에서는 보유 도시 하나를 수도로 지정할 수 있고, 상대 도시가 랜드마크가 아니라면 통행료 지불 후 인수할 수도 있습니다.',[{label:'확인',primary:true,run:()=>{state.phase=previousPhase;hideDecision();render();if(currentPlayer()?.ai&&state.phase==='roll')autoTimer=setTimeout(rollDice,500);}}]);
  }

  function bind(){
    $('#marbleRoll')?.addEventListener('click',rollDice);
    $('#marbleNewGame')?.addEventListener('click',()=>{ if(!state?.started || state.ended || window.confirm('현재 게임을 끝내고 새로 시작할까요?')) openSetup(true); });
    $('#marbleRules')?.addEventListener('click',openRules);
    $('#marbleStart')?.addEventListener('click',()=>{
      const mode=$('[data-marble-mode][aria-pressed="true"]')?.dataset.marbleMode || 'ai'; startNewGame(mode);
    });
    $$('[data-marble-mode]').forEach(btn=>btn.addEventListener('click',()=>{
      $$('[data-marble-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
    }));
  }

  function openGame(){
    clearAuto();
    $$('#view-game .miniGamePanel').forEach(el=>{el.hidden=true;});
    const hub=$('#gameHub'); if(hub) hub.hidden=true;
    const top=$('#miniGameTopbar'); if(top) top.hidden=false;
    const title=$('#miniGameTitle'); if(title) title.textContent='O.Poong 월드';
    const shop=$('#gameColorShop'); if(shop) shop.hidden=true;
    const panel=$('#gameMarblePanel'); if(panel) panel.hidden=false;
    const saved=loadState();
    if(saved && !saved.ended){ state=saved; const setup=$('#marbleSetup'); if(setup) setup.hidden=true; render(); if(currentPlayer()?.ai&&state.phase==='roll') autoTimer=setTimeout(rollDice,650); }
    else openSetup(false);
  }

  function stopGame(){ clearAuto(); hideDecision(); persist(); }

  function wrapGameFunctions(){
    baseOpenMiniGame=window.openMiniGame;
    baseShowMiniGameHub=window.showMiniGameHub;
    baseStopActiveMiniGame=window.stopActiveMiniGame;
    if(typeof baseOpenMiniGame!=='function') return false;
    window.openMiniGame=function(game){ if(game===GAME_ID) return openGame(); stopGame(); return baseOpenMiniGame.apply(this,arguments); };
    if(typeof baseShowMiniGameHub==='function') window.showMiniGameHub=function(){ stopGame(); const result=baseShowMiniGameHub.apply(this,arguments); const panel=$('#gameMarblePanel'); if(panel) panel.hidden=true; return result; };
    if(typeof baseStopActiveMiniGame==='function') window.stopActiveMiniGame=function(){ stopGame(); return baseStopActiveMiniGame.apply(this,arguments); };
    return true;
  }

  function install(){
    if(installed) return;
    if(typeof window.openMiniGame!=='function' || !$('#gameHub .gameCardGrid')){ setTimeout(install,120); return; }
    installed=true; injectStyles(); addCard(); addPanel(); bind(); wrapGameFunctions(); updateCardMeta();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
})();
