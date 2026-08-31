(() => {
  'use strict';

  const SAVE_KEY='opoong_avatar_gacha_v1';
  const PET_KEY='opoong_pet_v1';
  const STARTER={id:'starter',icon:'🙂',name:'기본 오풍이',rarity:'starter'};

  const ITEMS=[
    {id:'dog',icon:'🐶',name:'멍멍 오풍',rarity:'common'},{id:'cat',icon:'🐱',name:'냥냥 오풍',rarity:'common'},
    {id:'rabbit',icon:'🐰',name:'토끼 오풍',rarity:'common'},{id:'frog',icon:'🐸',name:'개구리 오풍',rarity:'common'},
    {id:'fox',icon:'🦊',name:'여우 오풍',rarity:'common'},{id:'bear',icon:'🐻',name:'곰돌이 오풍',rarity:'common'},
    {id:'hamster',icon:'🐹',name:'햄스터 오풍',rarity:'common'},{id:'chick',icon:'🐥',name:'병아리 오풍',rarity:'common'},
    {id:'monkey',icon:'🐵',name:'원숭이 오풍',rarity:'common'},{id:'pig',icon:'🐷',name:'꿀꿀 오풍',rarity:'common'},
    {id:'cow',icon:'🐮',name:'젖소 오풍',rarity:'common'},{id:'mouse',icon:'🐭',name:'쥐돌이 오풍',rarity:'common'},
    {id:'duck',icon:'🦆',name:'오리 오풍',rarity:'common'},{id:'bee',icon:'🐝',name:'꿀벌 오풍',rarity:'common'},
    {id:'turtle',icon:'🐢',name:'거북이 오풍',rarity:'common'},{id:'fish',icon:'🐟',name:'물고기 오풍',rarity:'common'},
    {id:'crab',icon:'🦀',name:'게 오풍',rarity:'common'},{id:'snail',icon:'🐌',name:'달팽이 오풍',rarity:'common'},

    {id:'penguin',icon:'🐧',name:'펭귄 오풍',rarity:'rare'},{id:'panda',icon:'🐼',name:'판다 오풍',rarity:'rare'},
    {id:'tiger',icon:'🐯',name:'호랑이 오풍',rarity:'rare'},{id:'lion',icon:'🦁',name:'사자 오풍',rarity:'rare'},
    {id:'koala',icon:'🐨',name:'코알라 오풍',rarity:'rare'},{id:'owl',icon:'🦉',name:'부엉이 오풍',rarity:'rare'},
    {id:'raccoon',icon:'🦝',name:'너구리 오풍',rarity:'rare'},{id:'deer',icon:'🦌',name:'사슴 오풍',rarity:'rare'},
    {id:'shark',icon:'🦈',name:'상어 오풍',rarity:'rare'},{id:'dolphin',icon:'🐬',name:'돌고래 오풍',rarity:'rare'},
    {id:'parrot',icon:'🦜',name:'앵무새 오풍',rarity:'rare'},{id:'otter',icon:'🦦',name:'수달 오풍',rarity:'rare'},
    {id:'alpaca',icon:'🦙',name:'알파카 오풍',rarity:'rare'},{id:'eagle',icon:'🦅',name:'독수리 오풍',rarity:'rare'},
    {id:'wolf',icon:'🐺',name:'늑대 오풍',rarity:'rare'},{id:'octopus',icon:'🐙',name:'문어 오풍',rarity:'rare'},

    {id:'robot',icon:'🤖',name:'로봇 오풍',rarity:'epic'},{id:'unicorn',icon:'🦄',name:'유니콘 오풍',rarity:'epic'},
    {id:'dragon',icon:'🐲',name:'드래곤 오풍',rarity:'epic'},{id:'wizard',icon:'🧙',name:'마법사 오풍',rarity:'epic'},
    {id:'alien',icon:'👽',name:'외계 오풍',rarity:'epic'},{id:'ninja',icon:'🥷',name:'닌자 오풍',rarity:'epic'},
    {id:'astronaut',icon:'🧑‍🚀',name:'우주비행사 오풍',rarity:'epic'},{id:'knight',icon:'🛡️',name:'기사 오풍',rarity:'epic'},
    {id:'phoenix',icon:'🔥',name:'불사조 오풍',rarity:'epic'},{id:'mermaid',icon:'🧜',name:'인어 오풍',rarity:'epic'},
    {id:'snowman',icon:'☃️',name:'설원 오풍',rarity:'epic'},{id:'ghost',icon:'👻',name:'유령 오풍',rarity:'epic'},

    {id:'crown',icon:'👑',name:'황금왕관 오풍',rarity:'legendary'},{id:'galaxy',icon:'🌌',name:'은하 오풍',rarity:'legendary'},
    {id:'comet',icon:'☄️',name:'혜성 오풍',rarity:'legendary'},{id:'sun',icon:'🌞',name:'태양 오풍',rarity:'legendary'},
    {id:'moon',icon:'🌙',name:'월광 오풍',rarity:'legendary'},{id:'crystal',icon:'💎',name:'크리스탈 오풍',rarity:'legendary'},
    {id:'thunder',icon:'⚡',name:'번개 오풍',rarity:'legendary'},{id:'royal',icon:'🏰',name:'로열 오풍',rarity:'legendary'},

    {id:'cosmos',icon:'🪐',name:'코스모스 오풍',rarity:'mythic'},{id:'infinity',icon:'♾️',name:'인피니티 오풍',rarity:'mythic'},
    {id:'starborn',icon:'🌠',name:'스타본 오풍',rarity:'mythic'},{id:'celestial',icon:'✨',name:'셀레스티얼 오풍',rarity:'mythic'}
  ];

  const RARITY={
    common:{label:'일반',rate:74,duplicate:3,exchange:60,petXp:2},
    rare:{label:'희귀',rate:21,duplicate:10,exchange:180,petXp:5},
    epic:{label:'에픽',rate:4.5,duplicate:35,exchange:700,petXp:14},
    legendary:{label:'전설',rate:.45,duplicate:120,exchange:2500,petXp:45},
    mythic:{label:'신화',rate:.05,duplicate:400,exchange:8000,petXp:120}
  };
  const ORDER=['common','rare','epic','legendary','mythic'];

  let state=load();
  let drawing=false;
  let revealTimers=[];

  function defaultState(){return{owned:[STARTER.id],equipped:STARTER.id,coins:0,rarePity:0,epicPity:0,totalDraws:0,history:[]};}
  function load(){
    try{
      const raw=JSON.parse(localStorage.getItem(SAVE_KEY)||'null')||{};
      const valid=new Set([STARTER.id,...ITEMS.map(x=>x.id)]);
      const owned=Array.from(new Set([STARTER.id,...(Array.isArray(raw.owned)?raw.owned:[])])).filter(id=>valid.has(id));
      return{
        owned,
        equipped:valid.has(raw.equipped)&&owned.includes(raw.equipped)?raw.equipped:STARTER.id,
        coins:Math.max(0,Math.floor(Number(raw.coins)||0)),
        rarePity:Math.max(0,Math.min(19,Math.floor(Number(raw.rarePity)||0))),
        epicPity:Math.max(0,Math.min(59,Math.floor(Number(raw.epicPity)||0))),
        totalDraws:Math.max(0,Math.floor(Number(raw.totalDraws)||0)),
        history:Array.isArray(raw.history)?raw.history.slice(0,30):[]
      };
    }catch(_){return defaultState();}
  }
  function save(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(_){}}
  function allItems(){return[STARTER,...ITEMS];}
  function itemById(id){return allItems().find(x=>x.id===id)||STARTER;}
  function owns(id){return state.owned.includes(id);}
  function points(){try{return Math.max(0,Math.floor(Number(window.loadOpoongRewards?.().points)||0));}catch(_){return 0;}}
  function rarityLabel(r){return r==='starter'?'기본':RARITY[r]?.label||r;}
  function randomFloat(){try{if(window.crypto?.getRandomValues){const a=new Uint32Array(1);window.crypto.getRandomValues(a);return a[0]/4294967296;}}catch(_){}return Math.random();}

  function chooseRarity(){
    const r=randomFloat();
    if(state.epicPity>=59){if(r<.90)return'epic';if(r<.99)return'legendary';return'mythic';}
    if(state.rarePity>=19){if(r<.80)return'rare';if(r<.985)return'epic';if(r<.998)return'legendary';return'mythic';}
    if(r<.74)return'common';
    if(r<.95)return'rare';
    if(r<.995)return'epic';
    if(r<.9995)return'legendary';
    return'mythic';
  }

  function petLevelInfo(){
    try{const p=JSON.parse(localStorage.getItem(PET_KEY)||'null')||{};return{level:Math.max(1,Math.floor(Number(p.level)||1)),xp:Math.max(0,Math.floor(Number(p.xp)||0))};}
    catch(_){return{level:1,xp:0};}
  }
  function grantPetXp(amount,label){
    amount=Math.max(0,Math.floor(Number(amount)||0));if(!amount)return;
    try{
      const p=JSON.parse(localStorage.getItem(PET_KEY)||'null')||{level:1,xp:0,hunger:80,happy:80,clean:80,energy:80,created:Date.now(),last:Date.now(),acc:''};
      p.level=Math.max(1,Math.floor(Number(p.level)||1));p.xp=Math.max(0,Math.floor(Number(p.xp)||0));
      if(p.level<500){
        p.xp+=amount;
        while(p.level<500&&p.xp>=p.level*100){p.xp-=p.level*100;p.level++;}
        if(p.level>=500){p.level=500;p.xp=0;}
      }
      localStorage.setItem(PET_KEY,JSON.stringify(p));
      window.dispatchEvent(new CustomEvent('opoong-pet-updated',{detail:{source:'gacha',amount,label,level:p.level}}));
    }catch(_){}
  }

  function oneDraw(){
    const rarity=chooseRarity();
    const pool=ITEMS.filter(x=>x.rarity===rarity);
    const item=pool[Math.floor(randomFloat()*pool.length)]||pool[0];
    const duplicate=owns(item.id);
    let coins=0;
    if(duplicate){coins=RARITY[rarity].duplicate;state.coins+=coins;}else state.owned.push(item.id);
    state.totalDraws++;
    state.rarePity=rarity==='common'?Math.min(19,state.rarePity+1):0;
    state.epicPity=(rarity==='common'||rarity==='rare')?Math.min(59,state.epicPity+1):0;
    state.history.unshift({id:item.id,rarity,duplicate,coins,at:Date.now()});state.history=state.history.slice(0,30);
    const petXp=Math.max(1,Math.round(RARITY[rarity].petXp*(duplicate?.5:1)));
    grantPetXp(petXp,item.name);
    return{item,rarity,duplicate,coins,petXp};
  }

  function clearRevealTimers(){revealTimers.forEach(t=>clearTimeout(t));revealTimers=[];}

  function injectStyles(){
    if(document.getElementById('opoongAvatarGachaStyles'))return;
    const s=document.createElement('style');s.id='opoongAvatarGachaStyles';s.textContent=`
    .avatarGachaSection{display:grid;gap:12px;padding:14px;border:1px solid color-mix(in srgb,var(--pri) 22%,var(--line));border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--pri) 8%,var(--card)),var(--card));overflow:hidden;position:relative}.avatarGachaSection:after{content:"";position:absolute;right:-34px;top:-46px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--pri3) 30%,transparent),transparent 68%);pointer-events:none;animation:avatarSoftPulse 4s ease-in-out infinite}
    .avatarGachaHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;position:relative;z-index:1}.avatarGachaHead h3{margin:0;font-size:17px}.avatarGachaHead p{margin:5px 0 0;color:var(--muted);font-size:11px;font-weight:800;line-height:1.55}.avatarGachaEquipped{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:16px;background:var(--card);font-weight:950;font-size:11px}.avatarGachaEquipped i{font-style:normal;font-size:24px;animation:avatarIdle 2.4s ease-in-out infinite}
    .avatarGachaStats{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}.avatarGachaStat{padding:9px;border:1px solid var(--line);border-radius:15px;background:color-mix(in srgb,var(--card) 92%,transparent)}.avatarGachaStat span{display:block;color:var(--muted);font-size:10px;font-weight:850}.avatarGachaStat b{display:block;margin-top:4px;font-size:13px}.avatarGachaActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.avatarGachaBtn{position:relative;overflow:hidden;min-height:50px;border:0;border-radius:16px;color:#fff;background:linear-gradient(135deg,var(--pri),var(--pri2));font-weight:1000;box-shadow:0 12px 26px color-mix(in srgb,var(--pri) 22%,transparent)}.avatarGachaBtn.alt{background:linear-gradient(135deg,#7c3aed,#4f46e5)}.avatarGachaBtn:before{content:"";position:absolute;inset:-60% auto -60% -35%;width:25%;transform:rotate(20deg);background:rgba(255,255,255,.28);animation:avatarButtonShine 3.3s ease-in-out infinite}.avatarGachaBtn:disabled{opacity:.45;cursor:not-allowed}.avatarGachaNote{font-size:10px;color:var(--muted);font-weight:800;line-height:1.55}.avatarGachaOdds{font-size:10px;color:var(--muted)}.avatarGachaOdds summary{cursor:pointer;font-weight:950;color:var(--text)}.avatarGachaOddsGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin-top:8px}.avatarGachaOddsGrid span{padding:7px;border-radius:12px;background:var(--card2);border:1px solid var(--line);text-align:center;font-weight:900}
    .avatarCollection{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.avatarCard{display:grid;gap:5px;padding:10px;border:1px solid var(--line);border-radius:16px;background:var(--card);min-width:0;transition:.18s transform,.18s box-shadow}.avatarCard:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(15,23,42,.08)}.avatarCard.locked{opacity:.64}.avatarCard.active{border-color:color-mix(in srgb,var(--ok) 55%,var(--line));background:color-mix(in srgb,var(--ok) 6%,var(--card))}.avatarCardIcon{font-size:29px}.avatarCard.active .avatarCardIcon{animation:avatarEquipPop 1.8s ease-in-out infinite}.avatarCard b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.avatarCard small{color:var(--muted);font-size:9px;font-weight:850}.avatarCard button{border:1px solid var(--line);border-radius:11px;background:var(--card2);padding:7px 6px;font-size:9px;font-weight:950}.avatarCard button.primary{background:var(--pri);color:#fff;border-color:var(--pri)}.avatarCard button:disabled{opacity:.48}.avatarProfileChip{display:none;place-items:center;width:36px;height:36px;border-radius:14px;border:1px solid var(--line);background:var(--card);font-size:21px;box-shadow:0 8px 18px rgba(15,23,42,.06)}.avatarProfileChip.on{display:grid;animation:avatarIdle 2.4s ease-in-out infinite}
    .avatarDrawBack[hidden]{display:none!important}.avatarDrawBack{position:fixed;z-index:51000;inset:0;display:grid;place-items:center;padding:16px;background:rgba(2,6,23,.78);backdrop-filter:blur(14px);overflow:hidden}.avatarDrawBack:before,.avatarDrawBack:after{content:"";position:absolute;inset:-35%;pointer-events:none;opacity:.2;background:conic-gradient(from 0deg,transparent,#60a5fa,transparent,#a78bfa,transparent);animation:avatarSkySpin 8s linear infinite}.avatarDrawBack:after{animation-direction:reverse;animation-duration:12s;filter:blur(35px)}.avatarDrawBack.legendary{background:rgba(24,13,0,.84)}.avatarDrawBack.mythic{background:radial-gradient(circle at center,rgba(88,28,135,.5),rgba(2,6,23,.91) 62%)}
    .avatarDrawModal{position:relative;z-index:2;width:min(760px,96vw);max-height:90vh;overflow:auto;border-radius:30px;border:1px solid color-mix(in srgb,var(--pri3) 30%,var(--line));background:color-mix(in srgb,var(--card) 94%,transparent);box-shadow:0 34px 120px rgba(0,0,0,.46);padding:16px}.avatarDrawTop{display:flex;align-items:center;justify-content:space-between;gap:10px}.avatarDrawTop b{font-size:19px}.avatarDrawTop button{border:1px solid var(--line);background:var(--card2);border-radius:12px;padding:8px 10px;font-weight:950}.avatarRevealStage{position:relative;display:grid;place-items:center;min-height:300px;overflow:hidden}.avatarCapsule{position:relative;display:grid;place-items:center;width:124px;height:124px;border-radius:50%;font-size:64px;background:linear-gradient(180deg,#fff 0 48%,#ef4444 48% 100%);border:6px solid rgba(255,255,255,.8);box-shadow:0 24px 50px rgba(0,0,0,.24);animation:avatarCapsuleCharge 1.15s cubic-bezier(.36,.07,.19,.97) both}.avatarCapsule:after{content:"";position:absolute;left:0;right:0;top:47%;height:8px;background:#111827;border-radius:99px}.avatarCapsule:before{content:"";position:absolute;z-index:2;width:28px;height:28px;border-radius:50%;background:#fff;border:6px solid #111827}.avatarRevealStage.burst .avatarCapsule{animation:avatarCapsuleBurst .55s cubic-bezier(.2,.9,.2,1) forwards}.avatarRevealFlash{position:absolute;inset:0;opacity:0;pointer-events:none;background:radial-gradient(circle,#fff 0 8%,rgba(255,255,255,.9) 16%,transparent 60%)}.avatarRevealStage.burst .avatarRevealFlash{animation:avatarFlash .8s ease-out}.avatarParticle{position:absolute;left:50%;top:50%;width:8px;height:8px;border-radius:50%;background:#fff;box-shadow:0 0 14px #fff;opacity:0}.avatarRevealStage.burst .avatarParticle{animation:avatarParticleFly .9s ease-out var(--delay) forwards;transform:rotate(var(--angle)) translateY(-22px)}.avatarRevealMessage{position:absolute;bottom:22px;font-size:12px;font-weight:950;color:var(--muted);letter-spacing:.2px}.avatarResultGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.avatarResult{position:relative;overflow:hidden;padding:12px 7px;border:1px solid var(--line);border-radius:17px;background:var(--card2);text-align:center;opacity:0;transform:translateY(22px) scale(.9)}.avatarResult.show{animation:avatarResultIn .48s cubic-bezier(.2,.9,.2,1) forwards}.avatarResult:before{content:"";position:absolute;inset:-70%;background:conic-gradient(transparent,rgba(255,255,255,.35),transparent);animation:avatarCardShine 3s linear infinite}.avatarResult i,.avatarResult b,.avatarResult span,.avatarResult small{position:relative;z-index:1}.avatarResult i{display:block;font-style:normal;font-size:37px}.avatarResult b{display:block;margin-top:5px;font-size:10px}.avatarResult span{display:block;margin-top:3px;font-size:9px;font-weight:900}.avatarResult small{display:block;margin-top:3px;color:var(--muted);font-size:8px;font-weight:850}.avatarResult.common span{color:#64748b}.avatarResult.rare{box-shadow:0 0 20px rgba(37,99,235,.12)}.avatarResult.rare span{color:#2563eb}.avatarResult.epic{box-shadow:0 0 24px rgba(124,58,237,.18)}.avatarResult.epic span{color:#7c3aed}.avatarResult.legendary{border-color:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,.18),0 0 30px rgba(245,158,11,.28)}.avatarResult.legendary i{animation:avatarLegendPulse 1.1s ease-in-out infinite}.avatarResult.legendary span{color:#d97706}.avatarResult.mythic{border-color:#c084fc;background:radial-gradient(circle at 50% 15%,rgba(216,180,254,.35),var(--card2) 56%);box-shadow:0 0 0 2px rgba(192,132,252,.2),0 0 40px rgba(168,85,247,.38)}.avatarResult.mythic i{animation:avatarMythicFloat 1.1s ease-in-out infinite}.avatarResult.mythic span{color:#9333ea}.avatarResult.new:after{content:"NEW";position:absolute;right:6px;top:6px;z-index:2;padding:3px 5px;border-radius:999px;background:#059669;color:#fff;font-size:7px;font-weight:1000;animation:avatarNewPop .8s ease-in-out infinite alternate}
    @keyframes avatarSoftPulse{50%{transform:scale(1.13);opacity:.72}}@keyframes avatarIdle{50%{transform:translateY(-3px) rotate(2deg)}}@keyframes avatarEquipPop{50%{transform:scale(1.11) rotate(-3deg)}}@keyframes avatarButtonShine{0%,62%{left:-35%}82%,100%{left:125%}}@keyframes avatarSkySpin{to{transform:rotate(360deg)}}@keyframes avatarCapsuleCharge{0%{transform:translateY(20px) scale(.7);opacity:.15}20%{transform:translateX(-8px) rotate(-9deg) scale(.92);opacity:1}35%{transform:translateX(9px) rotate(9deg)}50%{transform:translateX(-13px) rotate(-12deg) scale(1.02)}65%{transform:translateX(12px) rotate(11deg)}80%{transform:translateX(-6px) rotate(-6deg) scale(1.08)}100%{transform:translateX(0) rotate(0) scale(1.12);filter:brightness(1.22)}}@keyframes avatarCapsuleBurst{0%{transform:scale(1.12)}45%{transform:scale(1.35);filter:brightness(2)}100%{transform:scale(.1);opacity:0;filter:brightness(3)}}@keyframes avatarFlash{0%{opacity:0}30%{opacity:1}100%{opacity:0}}@keyframes avatarParticleFly{0%{opacity:1;transform:rotate(var(--angle)) translateY(-15px) scale(.4)}100%{opacity:0;transform:rotate(var(--angle)) translateY(-190px) scale(1.2)}}@keyframes avatarResultIn{to{opacity:1;transform:translateY(0) scale(1)}}@keyframes avatarCardShine{to{transform:rotate(360deg)}}@keyframes avatarLegendPulse{50%{transform:scale(1.16) rotate(4deg);filter:drop-shadow(0 0 10px #fbbf24)}}@keyframes avatarMythicFloat{50%{transform:translateY(-7px) scale(1.13);filter:drop-shadow(0 0 14px #c084fc)}}@keyframes avatarNewPop{to{transform:scale(1.12)}}
    @media(max-width:720px){.avatarGachaStats{grid-template-columns:repeat(2,1fr)}.avatarGachaStats .avatarGachaStat:last-child{grid-column:1/-1}.avatarCollection{grid-template-columns:repeat(2,1fr)}.avatarResultGrid{grid-template-columns:repeat(2,1fr)}.avatarGachaOddsGrid{grid-template-columns:repeat(2,1fr)}}
    @media(prefers-reduced-motion:reduce){.avatarGachaSection:after,.avatarGachaEquipped i,.avatarProfileChip.on,.avatarCard.active .avatarCardIcon,.avatarGachaBtn:before,.avatarDrawBack:before,.avatarDrawBack:after,.avatarResult:before,.avatarResult.legendary i,.avatarResult.mythic i,.avatarResult.new:after{animation:none!important}.avatarCapsule{animation:none!important}.avatarResult{opacity:1;transform:none}}
    `;document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById('avatarDrawBack'))return;
    const back=document.createElement('div');back.id='avatarDrawBack';back.className='avatarDrawBack';back.hidden=true;
    back.innerHTML='<div class="avatarDrawModal" role="dialog" aria-modal="true" aria-label="아바타 뽑기 결과"><div class="avatarDrawTop"><b>아바타 캡슐</b><button type="button" data-avatar-close>닫기</button></div><div id="avatarDrawBody"></div></div>';
    back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-avatar-close]')){clearRevealTimers();back.hidden=true;back.classList.remove('legendary','mythic');}});
    document.body.appendChild(back);
  }
  function ensureProfileChip(){
    let chip=document.getElementById('avatarProfileChip');if(chip)return chip;
    chip=document.createElement('span');chip.id='avatarProfileChip';chip.className='avatarProfileChip';chip.setAttribute('aria-label','장착 아바타');
    const anchor=document.getElementById('userBadge');if(anchor?.parentElement)anchor.parentElement.insertBefore(chip,anchor);return chip;
  }
  function applyEquipped(){
    const item=itemById(state.equipped),chip=ensureProfileChip();
    if(chip){chip.textContent=item.icon;chip.title=item.name;chip.classList.toggle('on',state.equipped!==STARTER.id);}
    document.documentElement.dataset.opoongAvatar=state.equipped;
    window.dispatchEvent(new CustomEvent('opoong-avatar-change',{detail:{item}}));
  }

  function collectionHtml(){
    return allItems().map(item=>{
      const owned=owns(item.id),active=state.equipped===item.id,meta=item.rarity==='starter'?null:RARITY[item.rarity];
      const control=owned?'<button type="button" class="'+(active?'':'primary')+'" '+(active?'disabled':'')+' data-avatar-equip="'+item.id+'">'+(active?'장착 중':'장착')+'</button>':'<button type="button" '+(state.coins<(meta?.exchange||999999)?'disabled':'')+' data-avatar-exchange="'+item.id+'">🪙 '+(meta?.exchange||0)+' 교환</button>';
      return'<div class="avatarCard '+(owned?'':'locked')+' '+(active?'active':'')+'"><div class="avatarCardIcon">'+(owned?item.icon:'❔')+'</div><b>'+(owned?item.name:'미획득 아바타')+'</b><small>'+rarityLabel(item.rarity)+(owned?' · 보유':' · 코인 교환')+'</small>'+control+'</div>';
    }).join('');
  }

  function ensureSection(){
    let section=document.getElementById('avatarGachaSection');if(section)return section;
    const shopItems=document.getElementById('gameShopItems'),shopSection=shopItems?.closest('.gameShopSection');if(!shopSection?.parentElement)return null;
    section=document.createElement('div');section.id='avatarGachaSection';section.className='avatarGachaSection';shopSection.parentElement.insertBefore(section,shopSection);
    section.addEventListener('click',e=>{const d=e.target.closest('[data-avatar-draw]');if(d){drawAvatar(Number(d.dataset.avatarDraw)||1);return;}const eq=e.target.closest('[data-avatar-equip]');if(eq){equipAvatar(eq.dataset.avatarEquip);return;}const ex=e.target.closest('[data-avatar-exchange]');if(ex)exchangeAvatar(ex.dataset.avatarExchange);});
    return section;
  }

  function render(){
    state=load();const section=ensureSection();if(!section)return;
    const wallet=points(),equipped=itemById(state.equipped),ownedCount=ITEMS.filter(x=>owns(x.id)).length,pet=petLevelInfo();
    section.innerHTML=`<div class="avatarGachaHead"><div><h3>🎁 아바타 캡슐</h3><p>장착한 아바타는 프로필과 오풍 펫에 함께 적용돼요. 뽑기 결과에 따라 펫 XP도 조금씩 올라갑니다.</p></div><div class="avatarGachaEquipped"><i>${equipped.icon}</i><span>${equipped.name}</span></div></div>
    <div class="avatarGachaStats"><div class="avatarGachaStat"><span>보유 포인트</span><b>${wallet.toLocaleString('ko-KR')} P</b></div><div class="avatarGachaStat"><span>아바타 코인</span><b>🪙 ${state.coins.toLocaleString('ko-KR')}</b></div><div class="avatarGachaStat"><span>컬렉션</span><b>${ownedCount} / ${ITEMS.length}</b></div><div class="avatarGachaStat"><span>희귀+ 보장</span><b>${Math.max(1,20-state.rarePity)}회 이내</b></div><div class="avatarGachaStat"><span>오풍 펫</span><b>Lv.${Math.min(500,pet.level)}</b></div></div>
    <div class="avatarGachaActions"><button class="avatarGachaBtn" type="button" data-avatar-draw="1" ${wallet<100||drawing?'disabled':''}>1회 뽑기 · 100 P</button><button class="avatarGachaBtn alt" type="button" data-avatar-draw="5" ${wallet<450||drawing?'disabled':''}>5회 뽑기 · 450 P</button></div>
    <div class="avatarGachaNote">확률은 이전보다 낮아졌습니다. 20회 연속 희귀 이상 미등장 시 다음 뽑기는 희귀 이상, 60회 연속 에픽 이상 미등장 시 다음 뽑기는 에픽 이상입니다. 중복은 아바타 코인으로 바뀌며 원하는 미획득 아바타를 직접 교환할 수 있습니다.</div>
    <details class="avatarGachaOdds"><summary>확률 · 중복 보상 · 펫 연동 보기</summary><div class="avatarGachaOddsGrid">${Object.entries(RARITY).map(([k,v])=>'<span>'+v.label+' '+v.rate+'%<br>중복 +'+v.duplicate+'🪙<br>펫 XP +'+v.petXp+'</span>').join('')}</div><div style="margin-top:7px;line-height:1.55">같은 등급 안에서는 각 아바타가 동일한 확률로 등장합니다. 중복 아바타의 펫 XP는 표시값의 절반 수준으로 적용됩니다. 현금 결제 없이 O.Poong P만 사용합니다.</div></details>
    <div class="gameShopTitle"><b>내 아바타 컬렉션</b><span>총 ${ITEMS.length}종 · 프로필·오풍 펫 공용</span></div><div class="avatarCollection">${collectionHtml()}</div>`;
    applyEquipped();
  }

  function particleHtml(){let out='';for(let i=0;i<28;i++){out+='<i class="avatarParticle" style="--angle:'+(i*12.86)+'deg;--delay:'+(Math.random()*.15).toFixed(2)+'s"></i>';}return out;}
  function showResults(results){
    ensureModal();clearRevealTimers();
    const back=document.getElementById('avatarDrawBack'),body=document.getElementById('avatarDrawBody');if(!back||!body)return;
    const best=[...results].sort((a,b)=>ORDER.indexOf(b.rarity)-ORDER.indexOf(a.rarity))[0];
    back.classList.remove('legendary','mythic');if(best?.rarity==='legendary')back.classList.add('legendary');if(best?.rarity==='mythic')back.classList.add('mythic');
    body.innerHTML='<div id="avatarRevealStage" class="avatarRevealStage"><div class="avatarRevealFlash"></div>'+particleHtml()+'<div class="avatarCapsule">🎁</div><div class="avatarRevealMessage">캡슐이 반응하고 있어요…</div></div><div id="avatarResultGrid" class="avatarResultGrid" hidden>'+results.map((r,i)=>'<div class="avatarResult '+r.rarity+' '+(!r.duplicate?'new':'')+'" data-result-index="'+i+'"><i>'+r.item.icon+'</i><b>'+r.item.name+'</b><span>'+rarityLabel(r.rarity)+(r.duplicate?' · 중복 +'+r.coins+'🪙':' · NEW')+'</span><small>오풍 펫 XP +'+r.petXp+'</small></div>').join('')+'</div>';
    back.hidden=false;
    const stage=document.getElementById('avatarRevealStage'),grid=document.getElementById('avatarResultGrid');
    revealTimers.push(setTimeout(()=>{stage?.classList.add('burst');const msg=stage?.querySelector('.avatarRevealMessage');if(msg)msg.textContent=best?.rarity==='mythic'?'신화의 빛이 감지됐어요!':best?.rarity==='legendary'?'전설의 빛이 감지됐어요!':'결과 공개!';},950));
    revealTimers.push(setTimeout(()=>{if(stage)stage.hidden=true;if(grid)grid.hidden=false;results.forEach((_,i)=>revealTimers.push(setTimeout(()=>grid?.querySelector('[data-result-index="'+i+'"]')?.classList.add('show'),i*135)));},1550));
  }

  function drawAvatar(count){
    if(drawing)return;count=count===5?5:1;const cost=count===5?450:100,wallet=points();
    if(wallet<cost){window.gameRewardMessage?.('아바타 캡슐에 '+(cost-wallet)+' P가 부족해요.');return;}
    if(typeof window.shopSpend!=='function'){window.gameRewardMessage?.('포인트 지갑을 불러오지 못했어요.');return;}
    if(!window.shopSpend(cost,'아바타 캡슐'))return;
    drawing=true;render();const results=[];for(let i=0;i<count;i++)results.push(oneDraw());save();
    setTimeout(()=>{drawing=false;render();window.renderOpoongColorShop?.();window.updateFocusWallet?.();showResults(results);const n=results.filter(x=>!x.duplicate).length;window.gameRewardMessage?.('아바타 '+count+'회 뽑기 완료'+(n?' · NEW '+n+'개':'')+'!');},350);
  }
  function equipAvatar(id){if(!owns(id))return;state.equipped=id;save();applyEquipped();render();window.gameRewardMessage?.(itemById(id).name+' 장착 · 오풍 펫에도 적용');}
  function exchangeAvatar(id){const item=ITEMS.find(x=>x.id===id);if(!item||owns(id))return;const cost=RARITY[item.rarity].exchange;if(state.coins<cost){window.gameRewardMessage?.('아바타 코인이 '+(cost-state.coins)+'개 부족해요.');return;}state.coins-=cost;state.owned.push(item.id);grantPetXp(RARITY[item.rarity].petXp*2,'아바타 코인 교환');save();render();window.gameRewardMessage?.(item.name+' 교환 완료 · 펫 XP 보너스');}

  function install(){injectStyles();ensureModal();if(!ensureSection())return false;applyEquipped();render();window.OpoongAvatarGacha={render,draw:drawAvatar,equip:equipAvatar,state:()=>load(),items:()=>ITEMS.slice()};return true;}
  let tries=0;const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer);},100);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.addEventListener('storage',e=>{if(e.key===SAVE_KEY||e.key==='opoong_rewards_v2'||e.key===PET_KEY)render();});
  window.addEventListener('opoong-pet-updated',()=>render());
})();
