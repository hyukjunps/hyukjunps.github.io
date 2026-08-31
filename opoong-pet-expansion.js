(() => {
  'use strict';

  const PET_KEY='opoong_pet_v1';
  const AVATAR_KEY='opoong_avatar_gacha_v1';
  const MAX_EVOLUTION_LEVEL=500;
  const MILESTONES=[
    [1,'새싹 오풍'],[25,'푸른 오풍'],[50,'초록 오풍'],[75,'보랏빛 오풍'],[100,'별빛 오풍'],
    [125,'오로라 오풍'],[150,'번개 오풍'],[175,'수정 오풍'],[200,'네뷸라 오풍'],[225,'프리즘 오풍'],
    [250,'태양 오풍'],[275,'월광 오풍'],[300,'코스믹 오풍'],[325,'성운 오풍'],[350,'초신성 오풍'],
    [375,'차원 오풍'],[400,'은하수 오풍'],[425,'천공 오풍'],[450,'왕관 오풍'],[475,'영원 오풍'],[500,'O.Poong 레전드']
  ];
  const AVATAR_ICONS={
    starter:'',dog:'🐶',cat:'🐱',rabbit:'🐰',frog:'🐸',fox:'🦊',bear:'🐻',hamster:'🐹',chick:'🐥',monkey:'🐵',pig:'🐷',cow:'🐮',mouse:'🐭',duck:'🦆',bee:'🐝',turtle:'🐢',fish:'🐟',crab:'🦀',snail:'🐌',
    penguin:'🐧',panda:'🐼',tiger:'🐯',lion:'🦁',koala:'🐨',owl:'🦉',raccoon:'🦝',deer:'🦌',shark:'🦈',dolphin:'🐬',parrot:'🦜',otter:'🦦',alpaca:'🦙',eagle:'🦅',wolf:'🐺',octopus:'🐙',
    robot:'🤖',unicorn:'🦄',dragon:'🐲',wizard:'🧙',alien:'👽',ninja:'🥷',astronaut:'🧑‍🚀',knight:'🛡️',phoenix:'🔥',mermaid:'🧜',snowman:'☃️',ghost:'👻',
    crown:'👑',galaxy:'🌌',comet:'☄️',sun:'🌞',moon:'🌙',crystal:'💎',thunder:'⚡',royal:'🏰',cosmos:'🪐',infinity:'♾️',starborn:'🌠',celestial:'✨'
  };

  let lastLevel=0;
  let installed=false;

  function readJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'null')||fallback;}catch(_){return fallback;}}
  function petState(){const p=readJson(PET_KEY,{});return{...p,level:Math.max(1,Math.floor(Number(p.level)||1)),xp:Math.max(0,Math.floor(Number(p.xp)||0))};}
  function avatarState(){const a=readJson(AVATAR_KEY,{});return{equipped:String(a.equipped||'starter')};}
  function stageIndex(level){let idx=0;for(let i=0;i<MILESTONES.length;i++){if(level>=MILESTONES[i][0])idx=i;else break;}return idx;}
  function stageInfo(level){const capped=Math.min(MAX_EVOLUTION_LEVEL,Math.max(1,level)),idx=stageIndex(capped),cur=MILESTONES[idx],next=MILESTONES[idx+1]||null;return{idx,level:capped,name:cur[1],threshold:cur[0],next};}
  function palette(idx){
    const hue=(210+idx*31)%360;
    const hue2=(hue+48+idx*3)%360;
    const hue3=(hue+115)%360;
    return{a:`hsl(${hue} 78% 60%)`,b:`hsl(${hue2} 74% 46%)`,c:`hsl(${hue3} 88% 70%)`};
  }

  function injectStyles(){
    if(document.getElementById('opoongPetExpansionStyles'))return;
    const s=document.createElement('style');s.id='opoongPetExpansionStyles';s.textContent=`
      #gameOpoongPetPanel .petScene{position:relative;overflow:hidden;transition:background 1s ease,box-shadow .8s ease}.petEvolutionBackdrop{position:absolute;inset:-20%;pointer-events:none;opacity:.55;background:radial-gradient(circle at 50% 45%,var(--pet-aura),transparent 34%),conic-gradient(from 0deg,transparent,var(--pet-aura),transparent,var(--pet-accent),transparent);filter:blur(20px);animation:petEvolutionSpin 12s linear infinite}.petEvolutionStars{position:absolute;inset:0;pointer-events:none;overflow:hidden}.petEvolutionStar{position:absolute;width:5px;height:5px;border-radius:50%;background:#fff;box-shadow:0 0 12px #fff;opacity:.18;animation:petStarDrift var(--dur) ease-in-out infinite var(--delay)}
      #gameOpoongPetPanel .petChar{z-index:2;transition:background .8s ease,box-shadow .8s ease,transform .45s ease;width:190px;height:190px;background:linear-gradient(145deg,var(--pet-a),var(--pet-b))!important;box-shadow:0 24px 45px color-mix(in srgb,var(--pet-b) 26%,transparent),0 0 0 7px color-mix(in srgb,var(--pet-aura) 16%,transparent),0 0 52px color-mix(in srgb,var(--pet-aura) 30%,transparent)!important;animation:petIdleFloat 3s ease-in-out infinite}.petChar.hasAvatar:before,.petChar.hasAvatar:after{opacity:0}.petChar.hasAvatar .petMouth{opacity:0}.petAvatarSkin{position:absolute;z-index:4;inset:0;display:grid;place-items:center;font-size:92px;filter:drop-shadow(0 12px 12px rgba(15,23,42,.2));animation:petAvatarBob 2.4s ease-in-out infinite}.petAvatarBadge{position:absolute;z-index:5;right:-18px;bottom:3px;padding:6px 8px;border-radius:999px;background:rgba(15,23,42,.78);color:#fff;font-size:9px;font-weight:950;backdrop-filter:blur(8px)}
      .petEvolutionInfo{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:11px;align-items:center;margin:10px 0;padding:11px 13px;border:1px solid color-mix(in srgb,var(--pet-a) 30%,var(--line));border-radius:18px;background:linear-gradient(135deg,color-mix(in srgb,var(--pet-a) 9%,var(--card)),var(--card));overflow:hidden}.petEvolutionOrb{width:45px;height:45px;border-radius:16px;display:grid;place-items:center;background:linear-gradient(135deg,var(--pet-a),var(--pet-b));color:#fff;font-size:18px;font-weight:1000;box-shadow:0 9px 22px color-mix(in srgb,var(--pet-b) 26%,transparent);animation:petOrbPulse 2.1s ease-in-out infinite}.petEvolutionText{min-width:0}.petEvolutionText b{display:block;font-size:13px}.petEvolutionText span{display:block;margin-top:3px;color:var(--muted);font-size:10px;font-weight:850}.petEvolutionNext{font-size:10px;font-weight:950;color:var(--pri);text-align:right}.petEvolutionTrack{grid-column:2/-1;height:7px;border-radius:99px;background:var(--line);overflow:hidden}.petEvolutionTrack i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,var(--pet-a),var(--pet-accent));transition:width .5s ease}
      .petLevelBurst{position:absolute;z-index:9;inset:0;display:grid;place-items:center;pointer-events:none;background:radial-gradient(circle,rgba(255,255,255,.9),transparent 52%);animation:petLevelFlash 1.3s ease-out forwards}.petLevelBurst strong{padding:12px 18px;border-radius:999px;background:rgba(15,23,42,.86);color:#fff;font-size:19px;box-shadow:0 0 40px var(--pet-aura);animation:petLevelText 1.2s cubic-bezier(.2,.9,.2,1)}.petCareFloat{position:absolute;z-index:8;left:50%;top:53%;font-size:38px;pointer-events:none;animation:petCareFloat 1s ease-out forwards}.petMilestoneGlow{animation:petMilestoneGlow 1.2s ease-in-out 2!important}
      @keyframes petEvolutionSpin{to{transform:rotate(360deg)}}@keyframes petStarDrift{0%,100%{transform:translateY(7px) scale(.7);opacity:.12}50%{transform:translateY(-18px) scale(1.3);opacity:.72}}@keyframes petIdleFloat{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}@keyframes petAvatarBob{0%,100%{transform:translateY(1px) scale(.97)}50%{transform:translateY(-6px) scale(1.04)}}@keyframes petOrbPulse{50%{transform:scale(1.08) rotate(4deg);filter:brightness(1.15)}}@keyframes petLevelFlash{0%{opacity:0}22%{opacity:1}100%{opacity:0}}@keyframes petLevelText{0%{transform:scale(.5) rotate(-5deg);opacity:0}45%{transform:scale(1.14) rotate(2deg);opacity:1}100%{transform:scale(1);opacity:0}}@keyframes petCareFloat{0%{transform:translate(-50%,10px) scale(.55);opacity:0}20%{opacity:1}100%{transform:translate(-50%,-115px) scale(1.35) rotate(8deg);opacity:0}}@keyframes petMilestoneGlow{50%{transform:scale(1.08);box-shadow:0 0 0 10px color-mix(in srgb,var(--pet-aura) 13%,transparent),0 0 75px var(--pet-aura)}}
      @media(prefers-reduced-motion:reduce){.petEvolutionBackdrop,.petEvolutionStar,#gameOpoongPetPanel .petChar,.petAvatarSkin,.petEvolutionOrb{animation:none!important}}
    `;document.head.appendChild(s);
  }

  function ensureSceneDecor(scene){
    let bg=scene.querySelector('.petEvolutionBackdrop');if(!bg){bg=document.createElement('div');bg.className='petEvolutionBackdrop';scene.prepend(bg);}
    let stars=scene.querySelector('.petEvolutionStars');if(!stars){stars=document.createElement('div');stars.className='petEvolutionStars';for(let i=0;i<22;i++){const x=document.createElement('i');x.className='petEvolutionStar';x.style.left=((i*37)%97)+'%';x.style.top=((i*53)%91)+'%';x.style.setProperty('--dur',(2.2+(i%7)*.43)+'s');x.style.setProperty('--delay',(-i*.17)+'s');stars.appendChild(x);}scene.appendChild(stars);}
  }

  function ensureInfo(panel){
    let info=panel.querySelector('.petEvolutionInfo');if(info)return info;
    info=document.createElement('div');info.className='petEvolutionInfo';
    const scene=panel.querySelector('.petScene');if(scene?.parentNode)scene.parentNode.insertBefore(info,scene.nextSibling);else panel.prepend(info);return info;
  }

  function renderAvatar(char,avatarId){
    char.classList.toggle('hasAvatar',avatarId!=='starter');
    let skin=char.querySelector('.petAvatarSkin');
    if(avatarId==='starter'){skin?.remove();char.querySelector('.petAvatarBadge')?.remove();return;}
    if(!skin){skin=document.createElement('div');skin.className='petAvatarSkin';char.appendChild(skin);}
    skin.textContent=AVATAR_ICONS[avatarId]||'✨';
    let badge=char.querySelector('.petAvatarBadge');if(!badge){badge=document.createElement('span');badge.className='petAvatarBadge';char.appendChild(badge);}badge.textContent='아바타 연동';
  }

  function render(){
    const panel=document.getElementById('gameOpoongPetPanel');if(!panel)return false;
    const char=document.getElementById('petChar'),scene=panel.querySelector('.petScene');if(!char||!scene)return false;
    const pet=petState(),avatar=avatarState(),info=stageInfo(pet.level),p=palette(info.idx);
    panel.style.setProperty('--pet-a',p.a);panel.style.setProperty('--pet-b',p.b);panel.style.setProperty('--pet-accent',p.c);panel.style.setProperty('--pet-aura',p.c);
    scene.style.background=`radial-gradient(circle at 50% 35%,color-mix(in srgb,${p.c} 25%,transparent),transparent 34%),linear-gradient(180deg,color-mix(in srgb,${p.a} 26%,#dbeafe) 0 58%,color-mix(in srgb,${p.b} 18%,#dcfce7) 58%)`;
    ensureSceneDecor(scene);renderAvatar(char,avatar.equipped);
    const box=ensureInfo(panel);
    const next=info.next;let progress=100,nextText='최종 진화 달성';
    if(next){const span=Math.max(1,next[0]-info.threshold);progress=Math.max(0,Math.min(100,(info.level-info.threshold)/span*100));nextText=`다음 진화 Lv.${next[0]}`;}
    box.innerHTML=`<div class="petEvolutionOrb">${info.idx+1}</div><div class="petEvolutionText"><b>${info.name}</b><span>진화 단계 ${info.idx+1} / ${MILESTONES.length} · Lv.${Math.min(MAX_EVOLUTION_LEVEL,pet.level)}</span></div><div class="petEvolutionNext">${nextText}</div><div class="petEvolutionTrack"><i style="width:${progress.toFixed(1)}%"></i></div>`;
    const levelEl=document.getElementById('petLevel');if(levelEl&&pet.level>=MAX_EVOLUTION_LEVEL)levelEl.textContent='Lv.500';
    if(lastLevel&&pet.level>lastLevel){levelEffect(scene,pet.level,stageIndex(lastLevel)!==info.idx);}lastLevel=pet.level;
    return true;
  }

  function levelEffect(scene,level,milestone){
    scene.querySelector('.petLevelBurst')?.remove();const burst=document.createElement('div');burst.className='petLevelBurst';burst.innerHTML='<strong>'+(milestone?'✨ 진화 완료! ':'LEVEL UP! ')+'Lv.'+Math.min(MAX_EVOLUTION_LEVEL,level)+'</strong>';scene.appendChild(burst);setTimeout(()=>burst.remove(),1350);
    if(milestone){const char=document.getElementById('petChar');char?.classList.add('petMilestoneGlow');setTimeout(()=>char?.classList.remove('petMilestoneGlow'),2600);}
  }
  function careEffect(kind){
    const scene=document.querySelector('#gameOpoongPetPanel .petScene');if(!scene)return;const icon={feed:'🍚',play:'🎾',bath:'🫧',sleep:'🌙',snack:'🍪'}[kind]||'✨';const x=document.createElement('span');x.className='petCareFloat';x.textContent=icon;scene.appendChild(x);setTimeout(()=>x.remove(),1050);
  }

  function install(){
    injectStyles();if(installed){render();return true;}installed=true;
    document.addEventListener('click',e=>{const care=e.target.closest('#gameOpoongPetPanel [data-care]');if(care){careEffect(care.dataset.care);setTimeout(render,30);setTimeout(render,220);}const acc=e.target.closest('#gameOpoongPetPanel [data-acc]');if(acc){careEffect('spark');setTimeout(render,30);}});
    window.addEventListener('opoong-avatar-change',()=>render());window.addEventListener('opoong-pet-updated',()=>render());window.addEventListener('storage',e=>{if(e.key===PET_KEY||e.key===AVATAR_KEY)render();});
    const observer=new MutationObserver(()=>{const panel=document.getElementById('gameOpoongPetPanel');if(panel&&!panel.hidden)requestAnimationFrame(render);});observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden','class']});
    setInterval(()=>{const panel=document.getElementById('gameOpoongPetPanel');if(panel&&!panel.hidden)render();},1200);
    render();return true;
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  window.OpoongPetExpansion={render,stageInfo,maxEvolutionLevel:MAX_EVOLUTION_LEVEL};
})();
