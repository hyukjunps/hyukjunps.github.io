(() => {
  'use strict';

  const KEY = 'opoong_progression_v1';
  const THEMES = [
    {id:'none',name:'기본',level:1,desc:'O.Poong 기본 테마'},
    {id:'aurora',name:'오로라',level:5,desc:'Lv.5 해금'},
    {id:'midnight',name:'미드나잇',level:10,desc:'Lv.10 해금'},
    {id:'prism',name:'프리즘',level:15,desc:'Lv.15 해금'}
  ];
  const TITLES = [
    {id:'starter',name:'오풍 새싹',test:s=>true},
    {id:'player',name:'게임 탐험가',test:s=>s.plays>=10},
    {id:'regular',name:'꾸준한 오풍러',test:s=>s.streak>=7},
    {id:'master',name:'미니게임 마스터',test:s=>s.plays>=50},
    {id:'legend',name:'O.Poong 레전드',test:s=>levelInfo(s.xp).level>=15}
  ];
  const ACHIEVEMENTS = [
    {id:'first',icon:'🎮',name:'첫 게임',desc:'게임 1회 플레이',test:s=>s.plays>=1,xp:40},
    {id:'ten',icon:'🕹️',name:'게임 탐험가',desc:'게임 10회 플레이',test:s=>s.plays>=10,xp:80},
    {id:'fifty',icon:'🏆',name:'게임 마스터',desc:'게임 50회 플레이',test:s=>s.plays>=50,xp:180},
    {id:'variety',icon:'🌈',name:'골고루 플레이',desc:'서로 다른 게임 7종 플레이',test:s=>Object.keys(s.games||{}).length>=7,xp:120},
    {id:'streak3',icon:'🔥',name:'3일 연속',desc:'3일 연속 O.Poong 방문',test:s=>s.streak>=3,xp:60},
    {id:'streak7',icon:'🔥',name:'일주일 출석',desc:'7일 연속 O.Poong 방문',test:s=>s.streak>=7,xp:140},
    {id:'pet10',icon:'🐾',name:'다정한 보호자',desc:'오풍 펫 10회 돌보기',test:s=>s.petCare>=10,xp:100},
    {id:'score10k',icon:'✨',name:'점수 수집가',desc:'게임 기록 숫자 합계 10,000 달성',test:s=>s.scoreTotal>=10000,xp:120},
    {id:'challenge3',icon:'🎯',name:'도전자',desc:'게임별 도전과제 3개 달성',test:s=>Object.keys(s.challenges||{}).filter(k=>s.challenges[k]).length>=3,xp:120},
    {id:'challenge8',icon:'👑',name:'도전과제 헌터',desc:'게임별 도전과제 8개 달성',test:s=>Object.keys(s.challenges||{}).filter(k=>s.challenges[k]).length>=8,xp:240}
  ];
  const CHALLENGES = [
    ['jump','O.Poong 점프','점수 100 이상',100],
    ['stack','블록 쌓기','기록 20 이상',20],
    ['snake','스네이크','점수 50 이상',50],
    ['click','클릭 테스트','CPS 5 이상',5],
    ['typing','타자 게임','300 이상',300],
    ['opoong-run','O.Poong Run','거리 500 이상',500],
    ['opoong-ramen','오풍이의 라면가게','15,000원 달성',15000],
    ['opoong-ghost','오풍 유령찾기','유령 10마리 이상',10],
    ['opoong-2048','2048','점수 5,000 이상',5000],
    ['opoong-cafe','오풍 카페','매출 8,000원 이상',8000],
    ['opoong-rhythm','오풍 리듬','점수 8,000 이상',8000],
    ['opoong-soccer','오풍 승부차기','5골 성공',5]
  ];

  let data = load();
  let modal = null;
  let activeTab = 'daily';

  function defaultData(){
    return {xp:0,plays:0,scoreTotal:0,petCare:0,streak:0,lastVisit:'',games:{},challenges:{},achievements:{},claimed:{},title:'starter',theme:'none',daily:null,weekly:null};
  }
  function load(){
    try{return Object.assign(defaultData(),JSON.parse(localStorage.getItem(KEY)||'null')||{});}catch(_){return defaultData();}
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(data));}catch(_){} renderSummary();}

  function localDate(d=new Date()){
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function yesterdayKey(){const d=new Date();d.setDate(d.getDate()-1);return localDate(d);}
  function weekKey(){const d=new Date();const day=(d.getDay()+6)%7;d.setHours(0,0,0,0);d.setDate(d.getDate()-day);return localDate(d);}
  function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
  function pick(pool,count,seed){const arr=[...pool],out=[];let h=hash(seed);while(arr.length&&out.length<count){h=(Math.imul(h,1664525)+1013904223)>>>0;out.push(arr.splice(h%arr.length,1)[0]);}return out;}

  function levelInfo(totalXp){
    let level=1,used=0,need=200;
    while(totalXp-used>=need&&level<99){used+=need;level++;need=200+(level-1)*75;}
    return {level,current:Math.max(0,totalXp-used),need};
  }

  function dailyPool(){return [
    {id:'play3',name:'게임 3판 플레이',target:3,rewardP:35,rewardXp:50,get:()=>todayStats().plays},
    {id:'different2',name:'서로 다른 게임 2종 플레이',target:2,rewardP:40,rewardXp:55,get:()=>Object.keys(todayStats().games).length},
    {id:'score1000',name:'오늘 기록 숫자 합계 1,000',target:1000,rewardP:45,rewardXp:60,get:()=>todayStats().score},
    {id:'pet3',name:'오풍 펫 3번 돌보기',target:3,rewardP:35,rewardXp:50,get:()=>todayStats().pet},
    {id:'play5',name:'게임 5판 플레이',target:5,rewardP:55,rewardXp:70,get:()=>todayStats().plays},
    {id:'different3',name:'서로 다른 게임 3종 플레이',target:3,rewardP:60,rewardXp:75,get:()=>Object.keys(todayStats().games).length}
  ];}
  function weeklyPool(){return [
    {id:'wplay20',name:'이번 주 게임 20판 플레이',target:20,rewardP:160,rewardXp:220,get:()=>weekStats().plays},
    {id:'wdiff7',name:'이번 주 게임 7종 플레이',target:7,rewardP:180,rewardXp:240,get:()=>Object.keys(weekStats().games).length},
    {id:'wscore10k',name:'이번 주 기록 숫자 합계 10,000',target:10000,rewardP:200,rewardXp:260,get:()=>weekStats().score},
    {id:'wpet10',name:'이번 주 오풍 펫 10번 돌보기',target:10,rewardP:150,rewardXp:200,get:()=>weekStats().pet},
    {id:'wplay35',name:'이번 주 게임 35판 플레이',target:35,rewardP:260,rewardXp:320,get:()=>weekStats().plays}
  ];}
  function emptyStats(){return {plays:0,score:0,pet:0,games:{}};}
  function ensurePeriods(){
    const dk=localDate(),wk=weekKey();
    if(!data.daily||data.daily.key!==dk)data.daily={key:dk,stats:emptyStats(),missions:pick(dailyPool(),3,dk).map(x=>x.id),claimed:{}};
    if(!data.weekly||data.weekly.key!==wk)data.weekly={key:wk,stats:emptyStats(),missions:pick(weeklyPool(),3,wk).map(x=>x.id),claimed:{}};
  }
  function todayStats(){ensurePeriods();return data.daily.stats;}
  function weekStats(){ensurePeriods();return data.weekly.stats;}

  function awardPoints(amount,label){try{window.awardOpoongPoints?.(amount,label);}catch(_){} }
  function addXp(amount){data.xp=Math.max(0,(data.xp||0)+Math.max(0,Math.floor(amount||0)));}
  function numeric(value){const s=String(value??'').replace(/,/g,'');const m=s.match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):0;}

  function visit(){
    const today=localDate();if(data.lastVisit===today)return;
    data.streak=data.lastVisit===yesterdayKey()?Math.max(1,(data.streak||0)+1):1;
    data.lastVisit=today;addXp(10);ensurePeriods();checkUnlocks();save();
  }

  function recordGame(game,result){
    if(!game||game==='opoong-village'||game==='opoong-pet'||game==='opoong-drum')return;
    ensurePeriods();const value=numeric(result?.primaryValue);
    data.plays=(data.plays||0)+1;data.scoreTotal=(data.scoreTotal||0)+Math.max(0,value);data.games[game]=(data.games[game]||0)+1;
    const d=todayStats(),w=weekStats();d.plays++;w.plays++;d.score+=Math.max(0,value);w.score+=Math.max(0,value);d.games[game]=(d.games[game]||0)+1;w.games[game]=(w.games[game]||0)+1;
    addXp(20+Math.min(80,Math.floor(Math.max(0,value)/100)));
    const challenge=CHALLENGES.find(c=>c[0]===game);if(challenge&&value>=challenge[3]&&!data.challenges[game]){data.challenges[game]=true;addXp(80);toast(`🎯 도전과제 달성 · ${challenge[1]}`);}
    checkUnlocks();save();renderModal();
  }

  function event(type,payload={}){
    ensurePeriods();
    if(type==='petCare'){
      const count=Math.max(1,Number(payload.count)||1);data.petCare=(data.petCare||0)+count;todayStats().pet+=count;weekStats().pet+=count;addXp(8*count);checkUnlocks();save();renderModal();
    }
  }

  function checkUnlocks(){
    for(const a of ACHIEVEMENTS){if(!data.achievements[a.id]&&a.test(data)){data.achievements[a.id]=Date.now();addXp(a.xp);toast(`${a.icon} 업적 달성 · ${a.name}`);}}
    const unlockedTitles=TITLES.filter(t=>t.test(data));if(!unlockedTitles.some(t=>t.id===data.title))data.title='starter';
    const lv=levelInfo(data.xp).level;const allowed=THEMES.filter(t=>lv>=t.level);if(!allowed.some(t=>t.id===data.theme))data.theme='none';applyTheme();
  }

  function claim(kind,id){
    ensurePeriods();const period=kind==='daily'?data.daily:data.weekly;const pool=kind==='daily'?dailyPool():weeklyPool();const m=pool.find(x=>x.id===id);if(!m||period.claimed[id])return;const value=m.get();if(value<m.target)return toast('아직 미션을 완료하지 못했어요.');period.claimed[id]=true;awardPoints(m.rewardP,`${kind==='daily'?'일일':'주간'} 미션 보상`);addXp(m.rewardXp);checkUnlocks();save();renderModal();toast(`보상 획득 · ${m.rewardP}P + ${m.rewardXp}XP`);}

  function applyTheme(){
    const view=document.getElementById('view-game');if(!view)return;view.dataset.progressTheme=data.theme||'none';
  }

  function injectStyles(){
    if(document.getElementById('opoongProgressStyles'))return;const s=document.createElement('style');s.id='opoongProgressStyles';s.textContent=`
      .progressStrip{margin:10px 0 12px;padding:12px 14px;border:1px solid var(--line);border-radius:20px;background:linear-gradient(135deg,color-mix(in srgb,var(--pri) 7%,var(--card)),var(--card));display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center}.progressLevel{width:52px;height:52px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(135deg,var(--pri),var(--pri2));color:#fff;font-weight:1000;font-size:16px}.progressInfo{min-width:0}.progressInfo b{display:block;font-size:14px}.progressInfo span{display:block;margin-top:3px;color:var(--muted);font-size:11px;font-weight:850}.progressTrack{height:8px;margin-top:7px;border-radius:99px;background:var(--line);overflow:hidden}.progressTrack i{display:block;height:100%;background:linear-gradient(90deg,var(--pri3),var(--pri));border-radius:99px}.progressOpen{border:1px solid var(--line);border-radius:14px;background:var(--card);padding:10px 12px;font-weight:950;color:var(--text)}
      .progressModalBack{position:fixed;inset:0;z-index:320;background:rgba(2,6,23,.62);backdrop-filter:blur(8px);display:grid;place-items:center;padding:16px}.progressModalBack[hidden]{display:none!important}.progressModal{width:min(900px,97vw);max-height:90vh;overflow:auto;border-radius:28px;background:var(--card);border:1px solid var(--line);box-shadow:0 30px 90px rgba(0,0,0,.3);padding:16px}.progressModalHead{display:flex;justify-content:space-between;align-items:center;gap:10px}.progressModalHead b{font-size:20px}.progressTabs{display:flex;gap:6px;overflow:auto;margin:12px 0;scrollbar-width:none}.progressTab{padding:8px 10px;border:1px solid var(--line);border-radius:999px;background:var(--card2);font-size:11px;font-weight:950;white-space:nowrap}.progressTab.active{background:var(--pri);color:#fff;border-color:var(--pri)}.progressGrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.missionCard,.achievementCard,.challengeCard,.themeCard,.titleCard{padding:12px;border:1px solid var(--line);border-radius:17px;background:var(--card2)}.missionCard b,.achievementCard b,.challengeCard b,.themeCard b,.titleCard b{display:block;font-size:12px}.missionCard p,.achievementCard p,.challengeCard p,.themeCard p,.titleCard p{margin:5px 0;color:var(--muted);font-size:10.5px;font-weight:800;line-height:1.5}.missionProgress{height:7px;border-radius:99px;background:var(--line);overflow:hidden;margin:8px 0}.missionProgress i{display:block;height:100%;background:linear-gradient(90deg,#60a5fa,#22c55e)}.missionClaim{width:100%;padding:8px;border:0;border-radius:11px;background:var(--pri);color:#fff;font-weight:950;font-size:10.5px}.missionClaim:disabled{background:var(--line);color:var(--muted)}.achievementCard.locked,.challengeCard.locked,.themeCard.locked,.titleCard.locked{opacity:.55;filter:grayscale(.5)}.badgeIcon{font-size:28px}.progressHero{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px}.progressHero div{padding:11px;border:1px solid var(--line);border-radius:15px;background:var(--card2);text-align:center}.progressHero span{display:block;color:var(--muted);font-size:10px;font-weight:850}.progressHero strong{display:block;margin-top:4px;font-size:16px}.themeUse,.titleUse{margin-top:8px;width:100%;padding:8px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-weight:900;font-size:10.5px}.themeUse.active,.titleUse.active{background:var(--pri);color:#fff;border-color:var(--pri)}.progressToast{position:fixed;left:50%;bottom:24px;z-index:390;transform:translate(-50%,15px);padding:11px 15px;border-radius:15px;background:rgba(15,23,42,.92);color:#fff;font-size:12px;font-weight:900;opacity:0;transition:.2s}.progressToast.show{opacity:1;transform:translate(-50%,0)}
      #view-game[data-progress-theme="aurora"] .gameLibrary,#view-game[data-progress-theme="aurora"] .gamePlayCard{background:linear-gradient(145deg,color-mix(in srgb,#a7f3d0 20%,var(--card)),color-mix(in srgb,#bfdbfe 22%,var(--card)))}#view-game[data-progress-theme="midnight"] .gameLibrary,#view-game[data-progress-theme="midnight"] .gamePlayCard{box-shadow:0 0 0 1px rgba(99,102,241,.18),0 18px 50px rgba(49,46,129,.16)}#view-game[data-progress-theme="prism"] .gameLibrary,#view-game[data-progress-theme="prism"] .gamePlayCard{background:linear-gradient(135deg,color-mix(in srgb,#fbcfe8 15%,var(--card)),color-mix(in srgb,#c4b5fd 16%,var(--card)),color-mix(in srgb,#bae6fd 18%,var(--card)))}
      @media(max-width:700px){.progressStrip{grid-template-columns:auto 1fr}.progressOpen{grid-column:1/-1}.progressGrid{grid-template-columns:1fr 1fr}.progressHero{grid-template-columns:1fr 1fr}}@media(max-width:440px){.progressGrid{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  function addUi(){
    const header=document.querySelector('#view-game .gameSectionHeader');if(!header||document.getElementById('opoongProgressStrip'))return;
    const strip=document.createElement('div');strip.id='opoongProgressStrip';strip.className='progressStrip';strip.innerHTML=`<div class="progressLevel" id="progressLevel">Lv.1</div><div class="progressInfo"><b id="progressTitle">오풍 새싹 · 🔥 1일</b><span id="progressXpText">0 / 200 XP</span><div class="progressTrack"><i id="progressXpBar" style="width:0%"></i></div></div><button class="progressOpen" id="progressOpen">미션 · 업적</button>`;header.insertAdjacentElement('afterend',strip);document.getElementById('progressOpen')?.addEventListener('click',()=>openModal('daily'));
    modal=document.createElement('div');modal.className='progressModalBack';modal.id='progressModalBack';modal.hidden=true;modal.innerHTML='<div class="progressModal" id="progressModal"></div>';document.body.appendChild(modal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
    const toastEl=document.createElement('div');toastEl.id='progressToast';toastEl.className='progressToast';document.body.appendChild(toastEl);
  }

  function renderSummary(){
    const li=levelInfo(data.xp),title=TITLES.find(t=>t.id===data.title)?.name||'오풍 새싹';const values={progressLevel:`Lv.${li.level}`,progressTitle:`${title} · 🔥 ${data.streak||1}일`,progressXpText:`${li.current} / ${li.need} XP`};Object.entries(values).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});const bar=document.getElementById('progressXpBar');if(bar)bar.style.width=`${Math.min(100,li.current/li.need*100)}%`;applyTheme();
  }

  function openModal(tab='daily'){activeTab=tab;if(modal)modal.hidden=false;renderModal();}
  function closeModal(){if(modal)modal.hidden=true;}
  function tabButton(id,label){return `<button class="progressTab ${activeTab===id?'active':''}" data-progress-tab="${id}">${label}</button>`;}

  function missionCards(kind){ensurePeriods();const period=kind==='daily'?data.daily:data.weekly,pool=kind==='daily'?dailyPool():weeklyPool();return period.missions.map(id=>{const m=pool.find(x=>x.id===id);if(!m)return'';const value=Math.min(m.target,m.get()),done=value>=m.target,claimed=!!period.claimed[id];return `<div class="missionCard"><b>${m.name}</b><p>${value.toLocaleString()} / ${m.target.toLocaleString()} · 보상 ${m.rewardP}P + ${m.rewardXp}XP</p><div class="missionProgress"><i style="width:${Math.min(100,value/m.target*100)}%"></i></div><button class="missionClaim" data-claim-kind="${kind}" data-claim-id="${id}" ${!done||claimed?'disabled':''}>${claimed?'받음':done?'보상 받기':'진행 중'}</button></div>`;}).join('');}
  function achievementCards(){return ACHIEVEMENTS.map(a=>{const unlocked=!!data.achievements[a.id];return `<div class="achievementCard ${unlocked?'':'locked'}"><div class="badgeIcon">${a.icon}</div><b>${a.name}</b><p>${a.desc}<br>${unlocked?'배지 획득 완료':`보상 ${a.xp}XP`}</p></div>`;}).join('');}
  function challengeCards(){return CHALLENGES.map(([id,name,desc])=>`<div class="challengeCard ${data.challenges[id]?'':'locked'}"><div class="badgeIcon">${data.challenges[id]?'✅':'🎯'}</div><b>${name}</b><p>${desc}<br>${data.challenges[id]?'도전과제 달성':'미달성'}</p></div>`).join('');}
  function themeCards(){const lv=levelInfo(data.xp).level;return THEMES.map(t=>{const unlocked=lv>=t.level,active=data.theme===t.id;return `<div class="themeCard ${unlocked?'':'locked'}"><div class="badgeIcon">${t.id==='aurora'?'🌌':t.id==='midnight'?'🌙':t.id==='prism'?'💎':'🎨'}</div><b>${t.name}</b><p>${t.desc}</p><button class="themeUse ${active?'active':''}" data-theme-use="${t.id}" ${unlocked?'':'disabled'}>${active?'사용 중':unlocked?'사용하기':'잠김'}</button></div>`;}).join('');}
  function titleCards(){return TITLES.map(t=>{const unlocked=t.test(data),active=data.title===t.id;return `<div class="titleCard ${unlocked?'':'locked'}"><div class="badgeIcon">🏷️</div><b>${t.name}</b><p>${unlocked?'해금됨':'조건을 달성하면 해금'}</p><button class="titleUse ${active?'active':''}" data-title-use="${t.id}" ${unlocked?'':'disabled'}>${active?'사용 중':unlocked?'사용하기':'잠김'}</button></div>`;}).join('');}

  function renderModal(){
    if(!modal||modal.hidden)return;ensurePeriods();checkUnlocks();const li=levelInfo(data.xp),box=document.getElementById('progressModal');if(!box)return;let content='';if(activeTab==='daily')content=missionCards('daily');else if(activeTab==='weekly')content=missionCards('weekly');else if(activeTab==='achievements')content=achievementCards();else if(activeTab==='challenges')content=challengeCards();else if(activeTab==='themes')content=themeCards();else if(activeTab==='titles')content=titleCards();box.innerHTML=`<div class="progressModalHead"><div><b>O.Poong 프로필</b><div class="muted" style="margin-top:4px">포인트와 별도로 XP를 모아 레벨·배지·칭호를 해금해요.</div></div><button class="smallbtn ghost" id="progressClose">닫기</button></div><div class="progressHero"><div><span>레벨</span><strong>Lv.${li.level}</strong></div><div><span>총 XP</span><strong>${data.xp.toLocaleString()}</strong></div><div><span>연속 출석</span><strong>🔥 ${data.streak}일</strong></div><div><span>업적 배지</span><strong>${Object.keys(data.achievements).length}개</strong></div></div><div class="progressTabs">${tabButton('daily','오늘 미션 3개')}${tabButton('weekly','주간 미션')}${tabButton('achievements','업적·배지')}${tabButton('challenges','게임 도전과제')}${tabButton('themes','희귀 테마')}${tabButton('titles','칭호')}</div><div class="progressGrid">${content}</div>`;document.getElementById('progressClose')?.addEventListener('click',closeModal);box.querySelectorAll('[data-progress-tab]').forEach(b=>b.addEventListener('click',()=>{activeTab=b.dataset.progressTab;renderModal();}));box.querySelectorAll('[data-claim-id]').forEach(b=>b.addEventListener('click',()=>claim(b.dataset.claimKind,b.dataset.claimId)));box.querySelectorAll('[data-theme-use]').forEach(b=>b.addEventListener('click',()=>{data.theme=b.dataset.themeUse;save();renderModal();}));box.querySelectorAll('[data-title-use]').forEach(b=>b.addEventListener('click',()=>{data.title=b.dataset.titleUse;save();renderModal();}));
  }

  let toastTimer=0;function toast(msg){const el=document.getElementById('progressToast');if(!el)return;clearTimeout(toastTimer);el.textContent=msg;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),2300);}

  function hookResults(){
    const installHook=()=>{
      if(window.OpoongGameResults&&!window.OpoongGameResults.__progressHook){const old=window.OpoongGameResults.show;window.OpoongGameResults.show=function(game,supplied){const result=old.apply(this,arguments);setTimeout(()=>recordGame(game,supplied||window.OpoongGameResults.getLast?.()),0);return result;};window.OpoongGameResults.__progressHook=true;}
      if(typeof window.showGameOverAd==='function'&&!window.showGameOverAd.__progressHook){const old=window.showGameOverAd;const wrapped=function(game){const r=old.apply(this,arguments);setTimeout(()=>{const last=window.OpoongGameResults?.getLast?.();if(last?.game===game)recordGame(game,last);},0);return r;};wrapped.__progressHook=true;window.showGameOverAd=wrapped;}
    };
    installHook();setTimeout(installHook,500);setTimeout(installHook,1600);
  }

  function install(){injectStyles();addUi();ensurePeriods();visit();checkUnlocks();save();renderSummary();hookResults();window.OpoongProgression={event,recordGame,get:()=>JSON.parse(JSON.stringify(data)),open:openModal};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();