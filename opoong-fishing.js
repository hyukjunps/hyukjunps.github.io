(() => {
  'use strict';

  const GAME = 'opoong-fishing';
  const BEST_KEY = 'opoong_fishing_best_v1';
  const PANEL_ID = 'gameOpoongFishingPanel';
  let state = null;
  let tick = 0;
  let waitTimer = 0;
  let biteTimer = 0;

  const FISH = [
    { name:'붕어', icon:'🐟', points:15, weight:36, strength:10 },
    { name:'잉어', icon:'🐠', points:25, weight:28, strength:14 },
    { name:'메기', icon:'🐡', points:40, weight:18, strength:19 },
    { name:'무지개송어', icon:'🐟✨', points:65, weight:11, strength:24 },
    { name:'황금잉어', icon:'🐠👑', points:120, weight:5, strength:32 },
    { name:'낡은 장화', icon:'🥾', points:3, weight:8, strength:7 }
  ];

  const q = (id) => document.getElementById(id);
  const best = () => Math.max(0, Number(localStorage.getItem(BEST_KEY) || 0) || 0);
  const saveBest = (score) => {
    const b = Math.max(best(), Math.floor(score || 0));
    try { localStorage.setItem(BEST_KEY, String(b)); } catch (_) {}
    return b;
  };

  function styles(){
    if(q('opoongFishingStyles')) return;
    const s = document.createElement('style');
    s.id = 'opoongFishingStyles';
    s.textContent = `
      .coverFishing{position:relative;overflow:hidden;display:grid;place-items:center;background:linear-gradient(180deg,#dbeafe 0 42%,#38bdf8 42% 61%,#0284c7 61%)}
      .coverFishing:before{content:'🎣';font-size:52px;transform:rotate(-8deg) translateY(-3px)}.coverFishing:after{content:'🐟';position:absolute;right:13%;bottom:17%;font-size:28px;transform:rotate(-10deg)}
      .freshHud{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:11px}.freshStat{padding:11px 8px;border:1px solid var(--line);border-radius:17px;background:var(--card);text-align:center}.freshStat span{display:block;color:var(--muted);font-size:10.5px;font-weight:900}.freshStat strong{display:block;margin-top:4px;font-size:19px;font-weight:1000}
      .fishingBox{border:1px solid var(--line);border-radius:26px;background:color-mix(in srgb,var(--card) 94%,var(--bg));padding:14px}.fishingLake{position:relative;min-height:430px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#bae6fd 0 34%,#7dd3fc 34% 47%,#0ea5e9 47% 66%,#0369a1 66%);border:1px solid #7dd3fc;user-select:none}.fishingLake:before{content:'';position:absolute;left:-5%;right:-5%;top:43%;height:18px;background:repeating-radial-gradient(ellipse at center,rgba(255,255,255,.25) 0 6px,transparent 7px 22px);opacity:.7}
      .fishingHill{position:absolute;left:-10%;right:-10%;top:22%;height:100px;background:#86efac;clip-path:polygon(0 75%,12% 42%,26% 70%,41% 32%,58% 71%,72% 38%,88% 68%,100% 44%,100% 100%,0 100%)}.fishingDock{position:absolute;left:7%;bottom:25%;width:35%;height:28px;border-radius:6px;background:repeating-linear-gradient(90deg,#92400e 0 24px,#b45309 24px 47px);box-shadow:0 7px 0 #78350f}.fishingRod{position:absolute;left:26%;bottom:35%;font-size:64px;transform:rotate(-18deg)}
      .fishingBobber{position:absolute;left:61%;top:58%;width:25px;height:34px;border-radius:12px 12px 17px 17px;background:linear-gradient(#ef4444 0 46%,#fff 46%);border:2px solid rgba(255,255,255,.7);box-shadow:0 8px 15px rgba(15,23,42,.22);transition:.18s;opacity:.45}.fishingBobber.wait{opacity:1;animation:fishingBob 1.1s ease-in-out infinite}.fishingBobber.bite{opacity:1;animation:fishingBite .16s linear infinite;box-shadow:0 0 0 12px rgba(254,240,138,.22),0 8px 15px rgba(15,23,42,.22)}
      @keyframes fishingBob{50%{transform:translateY(7px)}}@keyframes fishingBite{50%{transform:translateY(15px) rotate(6deg)}}.fishingSplash{position:absolute;left:61%;top:60%;transform:translate(-50%,-50%);font-size:46px;opacity:0}.fishingSplash.show{animation:fishingSplash .7s ease-out}@keyframes fishingSplash{0%{opacity:1;transform:translate(-50%,-50%) scale(.4)}100%{opacity:0;transform:translate(-50%,-70%) scale(1.5)}}
      .fishingCatch{position:absolute;right:7%;top:13%;min-width:150px;max-width:230px;padding:12px 14px;border-radius:18px;background:rgba(255,255,255,.9);border:1px solid rgba(255,255,255,.8);box-shadow:0 12px 30px rgba(15,23,42,.12);text-align:center}.fishingCatch .icon{font-size:36px}.fishingCatch b{display:block;margin-top:3px;font-size:15px}.fishingCatch span{display:block;margin-top:3px;color:#475569;font-size:10.5px;font-weight:850}
      .fishingBattle{position:absolute;left:50%;bottom:9%;z-index:4;transform:translateX(-50%);width:min(440px,88%);padding:13px 14px;border-radius:19px;background:rgba(15,23,42,.9);color:#fff;box-shadow:0 14px 35px rgba(15,23,42,.28);opacity:0;pointer-events:none;transition:.16s}.fishingBattle.show{opacity:1}.fishingBattleHead{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:12px;font-weight:1000}.fishingBattleFish{font-size:18px}.fishingBattleTrack{height:14px;margin-top:9px;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.16)}.fishingBattleBar{height:100%;width:100%;border-radius:inherit;background:linear-gradient(90deg,#22c55e,#facc15,#ef4444);transform-origin:left center;transition:width .08s linear}.fishingBattleHint{margin-top:7px;color:#cbd5e1;font-size:10.5px;font-weight:850;text-align:center}
      .fishingOverlay{position:absolute;inset:0;z-index:7;display:grid;place-items:center;padding:20px;background:rgba(15,23,42,.42);backdrop-filter:blur(5px)}.fishingOverlay[hidden]{display:none!important}.fishingOverlayCard{max-width:470px;padding:22px;border-radius:24px;background:var(--card);border:1px solid var(--line);text-align:center;box-shadow:0 24px 70px rgba(15,23,42,.2)}.fishingOverlayCard b{display:block;font-size:27px}.fishingOverlayCard p{margin:9px 0 16px;color:var(--muted);font-size:13px;font-weight:800;line-height:1.7}
      .fishingBottom{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:12px}.fishingAction{min-width:180px;min-height:54px;border:0;border-radius:18px;color:#fff;background:linear-gradient(135deg,#0284c7,#2563eb);font-weight:1000;box-shadow:0 12px 26px rgba(37,99,235,.22);touch-action:manipulation}.fishingAction.bite{background:linear-gradient(135deg,#f59e0b,#ef4444);animation:fishingButton .5s ease-in-out infinite alternate}.fishingAction.fight{background:linear-gradient(135deg,#ef4444,#7c3aed);animation:fishingButton .22s ease-in-out infinite alternate}@keyframes fishingButton{to{transform:scale(1.035)}}.fishingLog{flex:1;min-width:240px;color:var(--muted);font-size:11.5px;font-weight:850;line-height:1.55}
      @media(max-width:620px){.freshHud{grid-template-columns:1fr 1fr}.fishingLake{min-height:380px}.fishingCatch{right:4%;top:9%;min-width:120px}.fishingDock{width:42%}.fishingBattle{bottom:7%}}
    `;
    document.head.appendChild(s);
  }

  function panelHtml(){return `
    <div class="freshHud"><div class="freshStat"><span>남은 시간</span><strong id="fishingTime">60초</strong></div><div class="freshStat"><span>점수</span><strong id="fishingScore">0점</strong></div><div class="freshStat"><span>잡은 물고기</span><strong id="fishingCaught">0마리</strong></div><div class="freshStat"><span>최고 기록</span><strong id="fishingBest">${best().toLocaleString()}점</strong></div></div>
    <div class="fishingBox"><div class="fishingLake"><div class="fishingHill"></div><div class="fishingDock"></div><div class="fishingRod">🎣</div><div class="fishingBobber" id="fishingBobber"></div><div class="fishingSplash" id="fishingSplash">💦</div><div class="fishingCatch" id="fishingCatch"><div class="icon">🌊</div><b>오늘의 낚시</b><span>입질 뒤에는 물고기와 힘겨루기!</span></div><div class="fishingBattle" id="fishingBattle"><div class="fishingBattleHead"><span class="fishingBattleFish" id="fishingBattleFish">🐟 물고기</span><span id="fishingBattlePower">힘 0 / 0</span></div><div class="fishingBattleTrack"><div class="fishingBattleBar" id="fishingBattleBar"></div></div><div class="fishingBattleHint">버튼을 빠르게 연타해서 물고기의 힘을 0으로 만드세요!</div></div><div class="fishingOverlay" id="fishingOverlay"><div class="fishingOverlayCard"><b>오풍 낚시터 🎣</b><p>입질이 오면 먼저 빠르게 눌러 낚싯바늘을 걸고,<br>그다음 <b>“당기기!” 버튼을 여러 번 연타</b>해서 물고기를 이겨야 잡을 수 있어요.<br>희귀한 물고기일수록 힘이 세요.</p><button class="bigBtn" id="fishingStart" type="button">낚시 시작</button></div></div></div><div class="fishingBottom"><button class="fishingAction" id="fishingAction" type="button">낚싯대 던지기</button><div class="fishingLog" id="fishingLog">60초 동안 물고기와 힘겨루기해 최고 기록에 도전하세요.</div></div></div>`;}

  function fresh(){
    return {running:false,time:60,score:0,caught:0,phase:'ready',biteAt:0,currentFish:null,fishHp:0,fishMax:0,fightClicks:0};
  }

  function clearTimers(){
    clearInterval(tick); tick=0;
    clearTimeout(waitTimer); waitTimer=0;
    clearTimeout(biteTimer); biteTimer=0;
  }

  function hud(){
    if(!state) return;
    q('fishingTime') && (q('fishingTime').textContent=`${Math.max(0,Math.ceil(state.time))}초`);
    q('fishingScore') && (q('fishingScore').textContent=`${Math.floor(state.score).toLocaleString()}점`);
    q('fishingCaught') && (q('fishingCaught').textContent=`${state.caught}마리`);
    q('fishingBest') && (q('fishingBest').textContent=`${Math.max(best(),Math.floor(state.score)).toLocaleString()}점`);
  }

  function renderBattle(){
    const wrap=q('fishingBattle'), fish=q('fishingBattleFish'), power=q('fishingBattlePower'), bar=q('fishingBattleBar');
    const active=state?.phase==='fighting' && state.currentFish;
    wrap?.classList.toggle('show',Boolean(active));
    if(!active) return;
    if(fish) fish.textContent=`${state.currentFish.icon} ${state.currentFish.name}`;
    if(power) power.textContent=`힘 ${state.fishHp} / ${state.fishMax}`;
    if(bar) bar.style.width=`${Math.max(0,Math.min(100,state.fishHp/state.fishMax*100))}%`;
  }

  function phase(p){
    if(!state) return;
    state.phase=p;
    const b=q('fishingBobber'), a=q('fishingAction');
    b?.classList.toggle('wait',p==='waiting');
    b?.classList.toggle('bite',p==='bite'||p==='fighting');
    if(a){
      a.disabled=p==='waiting'||!state.running;
      a.classList.toggle('bite',p==='bite');
      a.classList.toggle('fight',p==='fighting');
      if(p==='bite') a.textContent='입질! 바늘 걸기!';
      else if(p==='fighting') a.textContent=`당기기! 연타! (${state.fishHp})`;
      else if(p==='waiting') a.textContent='기다리는 중…';
      else a.textContent='낚싯대 던지기';
    }
    renderBattle();
  }

  function choose(reaction){
    const bonus=reaction<230?2:reaction<420?1.35:.95;
    const list=FISH.map((fish,i)=>({fish,w:fish.weight*(i>=3?bonus:1)}));
    let r=Math.random()*list.reduce((s,x)=>s+x.w,0);
    for(const x of list){r-=x.w;if(r<=0)return x.fish;}
    return FISH[0];
  }

  function cast(){
    if(!state?.running||state.phase!=='ready') return;
    state.currentFish=null; state.fishHp=0; state.fishMax=0; state.fightClicks=0;
    phase('waiting');
    q('fishingLog') && (q('fishingLog').textContent='찌를 보고 기다리세요… 언제 입질이 올지 몰라요.');
    waitTimer=setTimeout(()=>{
      if(!state?.running||state.phase!=='waiting') return;
      state.biteAt=performance.now();
      phase('bite');
      q('fishingLog') && (q('fishingLog').textContent='입질이다! 먼저 눌러서 바늘을 걸어요!');
      biteTimer=setTimeout(()=>{
        if(!state?.running||state.phase!=='bite') return;
        phase('ready');
        q('fishingLog') && (q('fishingLog').textContent='바늘을 못 걸었어요. 다시 던져보세요.');
      },1200);
    },800+Math.random()*2100);
  }

  function hookFish(){
    clearTimeout(biteTimer);
    const reaction=Math.max(0,performance.now()-state.biteAt);
    const fish=choose(reaction);
    state.currentFish=fish;
    state.fishMax=fish.strength;
    state.fishHp=fish.strength;
    state.fightClicks=0;
    phase('fighting');
    q('fishingCatch') && (q('fishingCatch').innerHTML=`<div class="icon">${fish.icon}</div><b>${fish.name}이(가) 걸렸다!</b><span>힘 ${fish.strength} · 연타해서 끌어올리세요.</span>`);
    q('fishingLog') && (q('fishingLog').textContent=`${fish.name}과 힘겨루기 중! 당기기를 빠르게 연타하세요!`);
  }

  function winFight(){
    const caught=state.currentFish;
    if(!caught) return;
    state.score+=caught.points;
    if(caught.name!=='낡은 장화') state.caught++;
    const splash=q('fishingSplash');
    splash?.classList.remove('show'); void splash?.offsetWidth; splash?.classList.add('show');
    const box=q('fishingCatch');
    if(box) box.innerHTML=`<div class="icon">${caught.icon}</div><b>${caught.name} 포획 성공!</b><span>+${caught.points}점 · ${state.fightClicks}번 당겼어요.</span>`;
    q('fishingLog') && (q('fishingLog').textContent=`물고기를 이겼어요! 다시 낚싯대를 던져보세요.`);
    state.currentFish=null; state.fishHp=0; state.fishMax=0;
    phase('ready');
    hud();
  }

  function fightPull(){
    if(state.phase!=='fighting'||!state.currentFish) return;
    state.fightClicks++;
    state.fishHp=Math.max(0,state.fishHp-1);
    const a=q('fishingAction');
    if(a){a.textContent=`당기기! 연타! (${state.fishHp})`;a.animate?.([{transform:'scale(1)'},{transform:'scale(.96)'},{transform:'scale(1)'}],{duration:90});}
    renderBattle();
    if(state.fishHp<=0) winFight();
  }

  function pull(){
    if(!state?.running) return;
    if(state.phase==='ready') return cast();
    if(state.phase==='bite') return hookFish();
    if(state.phase==='fighting') return fightPull();
  }

  function start(){
    clearTimers();
    state=fresh(); state.running=true;
    q('fishingOverlay') && (q('fishingOverlay').hidden=true);
    phase('ready'); hud();
    tick=setInterval(()=>{
      if(!state?.running) return;
      state.time=Math.max(0,state.time-.1);
      hud();
      if(state.time<=0) end();
    },100);
  }

  function end(){
    if(!state?.running) return;
    state.running=false;
    clearTimers();
    state.currentFish=null;
    phase('ready');
    renderBattle();
    const score=Math.floor(state.score), b=saveBest(score);
    const meta=q('gameCardOpoongFishing')?.querySelector('.gameCardInfo span');
    if(meta) meta.textContent=`최고 ${b.toLocaleString()}점`;
    window.OpoongGameResults?.show(GAME,{title:'오풍 낚시터',primaryLabel:'낚시 점수',primaryValue:`${score.toLocaleString()}점`,stats:[{label:'잡은 물고기',value:`${state.caught}마리`},{label:'최고 기록',value:`${b.toLocaleString()}점`}]})||window.showGameOverAd?.(GAME);
  }

  function open(){
    clearTimers(); state=fresh(); hud(); phase('ready'); renderBattle();
    const o=q('fishingOverlay'); if(o) o.hidden=false;
    q(PANEL_ID)?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function stop(){
    clearTimers();
    if(state){state.running=false;state.currentFish=null;}
    renderBattle();
  }

  function mount(core){
    styles();
    core.addCard({id:'gameCardOpoongFishing',title:'오풍 낚시터',coverClass:'coverFishing',meta:`최고 ${best().toLocaleString()}점`,game:GAME});
    core.addPanel(PANEL_ID,panelHtml());
    q('fishingStart')?.addEventListener('click',start);
    q('fishingAction')?.addEventListener('click',pull);
  }

  function install(){
    const core=window.OpoongFreshGames;
    if(!core?.register){setTimeout(install,100);return;}
    core.register(GAME,{panelId:PANEL_ID,mount,open,stop});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
