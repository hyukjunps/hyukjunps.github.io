(() => {
  'use strict';

  const SAVE_KEY = 'opoong_avatar_gacha_v1';
  const STARTER = { id:'starter', icon:'🙂', name:'기본 오풍이', rarity:'starter' };
  const ITEMS = [
    {id:'dog',icon:'🐶',name:'멍멍 오풍',rarity:'common'},
    {id:'cat',icon:'🐱',name:'냥냥 오풍',rarity:'common'},
    {id:'rabbit',icon:'🐰',name:'토끼 오풍',rarity:'common'},
    {id:'frog',icon:'🐸',name:'개구리 오풍',rarity:'common'},
    {id:'fox',icon:'🦊',name:'여우 오풍',rarity:'common'},
    {id:'bear',icon:'🐻',name:'곰돌이 오풍',rarity:'common'},
    {id:'penguin',icon:'🐧',name:'펭귄 오풍',rarity:'rare'},
    {id:'panda',icon:'🐼',name:'판다 오풍',rarity:'rare'},
    {id:'tiger',icon:'🐯',name:'호랑이 오풍',rarity:'rare'},
    {id:'lion',icon:'🦁',name:'사자 오풍',rarity:'rare'},
    {id:'koala',icon:'🐨',name:'코알라 오풍',rarity:'rare'},
    {id:'robot',icon:'🤖',name:'로봇 오풍',rarity:'epic'},
    {id:'unicorn',icon:'🦄',name:'유니콘 오풍',rarity:'epic'},
    {id:'dragon',icon:'🐲',name:'드래곤 오풍',rarity:'epic'},
    {id:'wizard',icon:'🧙',name:'마법사 오풍',rarity:'epic'},
    {id:'crown',icon:'👑',name:'황금왕관 오풍',rarity:'legendary'},
    {id:'galaxy',icon:'🌌',name:'은하 오풍',rarity:'legendary'}
  ];

  const RARITY = {
    common:{label:'일반',rate:60,duplicate:5,exchange:40},
    rare:{label:'희귀',rate:28,duplicate:12,exchange:90},
    epic:{label:'에픽',rate:10,duplicate:30,exchange:220},
    legendary:{label:'전설',rate:2,duplicate:80,exchange:500}
  };

  let state = load();
  let drawing = false;

  function defaultState(){
    return {owned:[STARTER.id],equipped:STARTER.id,coins:0,rarePity:0,totalDraws:0,history:[]};
  }

  function load(){
    try{
      const raw = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null') || {};
      const valid = new Set([STARTER.id, ...ITEMS.map(x=>x.id)]);
      const owned = Array.from(new Set([STARTER.id, ...(Array.isArray(raw.owned)?raw.owned:[])] )).filter(id=>valid.has(id));
      const equipped = valid.has(raw.equipped) && owned.includes(raw.equipped) ? raw.equipped : STARTER.id;
      return {
        owned,
        equipped,
        coins:Math.max(0,Math.floor(Number(raw.coins)||0)),
        rarePity:Math.max(0,Math.min(9,Math.floor(Number(raw.rarePity)||0))),
        totalDraws:Math.max(0,Math.floor(Number(raw.totalDraws)||0)),
        history:Array.isArray(raw.history)?raw.history.slice(0,20):[]
      };
    }catch(_){ return defaultState(); }
  }

  function save(){
    try{ localStorage.setItem(SAVE_KEY,JSON.stringify(state)); }catch(_){}
  }

  function allItems(){ return [STARTER,...ITEMS]; }
  function itemById(id){ return allItems().find(x=>x.id===id) || STARTER; }
  function owns(id){ return state.owned.includes(id); }
  function points(){
    try{ return Math.max(0,Math.floor(Number(window.loadOpoongRewards?.().points)||0)); }
    catch(_){ return 0; }
  }

  function randomFloat(){
    try{
      if(window.crypto?.getRandomValues){
        const a = new Uint32Array(1); window.crypto.getRandomValues(a); return a[0] / 4294967296;
      }
    }catch(_){}
    return Math.random();
  }

  function chooseRarity(){
    const forced = state.rarePity >= 9;
    const r = randomFloat();
    if(forced){
      if(r < .70) return 'rare';
      if(r < .95) return 'epic';
      return 'legendary';
    }
    if(r < .60) return 'common';
    if(r < .88) return 'rare';
    if(r < .98) return 'epic';
    return 'legendary';
  }

  function oneDraw(){
    const rarity = chooseRarity();
    const pool = ITEMS.filter(x=>x.rarity===rarity);
    const item = pool[Math.floor(randomFloat()*pool.length)] || pool[0];
    const duplicate = owns(item.id);
    let coins = 0;
    if(duplicate){
      coins = RARITY[rarity].duplicate;
      state.coins += coins;
    }else{
      state.owned.push(item.id);
    }
    state.totalDraws += 1;
    state.rarePity = rarity === 'common' ? Math.min(9,state.rarePity+1) : 0;
    state.history.unshift({id:item.id,rarity,duplicate,coins,at:Date.now()});
    state.history = state.history.slice(0,20);
    return {item,rarity,duplicate,coins};
  }

  function injectStyles(){
    if(document.getElementById('opoongAvatarGachaStyles')) return;
    const s=document.createElement('style'); s.id='opoongAvatarGachaStyles'; s.textContent=`
      .avatarGachaSection{display:grid;gap:12px;padding:14px;border:1px solid color-mix(in srgb,var(--pri) 22%,var(--line));border-radius:24px;background:linear-gradient(135deg,color-mix(in srgb,var(--pri) 8%,var(--card)),var(--card));overflow:hidden;position:relative}
      .avatarGachaSection::after{content:"";position:absolute;right:-34px;top:-46px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--pri3) 28%,transparent),transparent 68%);pointer-events:none}
      .avatarGachaHead{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;position:relative;z-index:1}.avatarGachaHead h3{margin:0;font-size:17px}.avatarGachaHead p{margin:5px 0 0;color:var(--muted);font-size:11px;font-weight:800;line-height:1.55}
      .avatarGachaEquipped{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--line);border-radius:16px;background:var(--card);font-weight:950;font-size:11px}.avatarGachaEquipped i{font-style:normal;font-size:24px}
      .avatarGachaStats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.avatarGachaStat{padding:9px;border:1px solid var(--line);border-radius:15px;background:color-mix(in srgb,var(--card) 92%,transparent)}.avatarGachaStat span{display:block;color:var(--muted);font-size:10px;font-weight:850}.avatarGachaStat b{display:block;margin-top:4px;font-size:13px}
      .avatarGachaActions{display:grid;grid-template-columns:1fr 1fr;gap:8px}.avatarGachaBtn{min-height:48px;border:0;border-radius:16px;color:#fff;background:linear-gradient(135deg,var(--pri),var(--pri2));font-weight:1000}.avatarGachaBtn.alt{background:linear-gradient(135deg,#7c3aed,#4f46e5)}.avatarGachaBtn:disabled{opacity:.45;cursor:not-allowed}
      .avatarGachaNote{font-size:10px;color:var(--muted);font-weight:800;line-height:1.55}.avatarGachaOdds{font-size:10px;color:var(--muted)}.avatarGachaOdds summary{cursor:pointer;font-weight:950;color:var(--text)}.avatarGachaOddsGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:8px}.avatarGachaOddsGrid span{padding:7px;border-radius:12px;background:var(--card2);border:1px solid var(--line);text-align:center;font-weight:900}
      .avatarCollection{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.avatarCard{display:grid;gap:5px;padding:10px;border:1px solid var(--line);border-radius:16px;background:var(--card);min-width:0}.avatarCard.locked{opacity:.66}.avatarCard.active{border-color:color-mix(in srgb,var(--ok) 55%,var(--line));background:color-mix(in srgb,var(--ok) 6%,var(--card))}.avatarCardIcon{font-size:29px}.avatarCard b{font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.avatarCard small{color:var(--muted);font-size:9px;font-weight:850}.avatarCard button{border:1px solid var(--line);border-radius:11px;background:var(--card2);padding:7px 6px;font-size:9px;font-weight:950}.avatarCard button.primary{background:var(--pri);color:#fff;border-color:var(--pri)}.avatarCard button:disabled{opacity:.48}
      .avatarProfileChip{display:none;place-items:center;width:36px;height:36px;border-radius:14px;border:1px solid var(--line);background:var(--card);font-size:21px;box-shadow:0 8px 18px rgba(15,23,42,.06)}.avatarProfileChip.on{display:grid}
      .avatarDrawBack[hidden]{display:none!important}.avatarDrawBack{position:fixed;z-index:51000;inset:0;display:grid;place-items:center;padding:16px;background:rgba(2,6,23,.70);backdrop-filter:blur(10px)}.avatarDrawModal{width:min(680px,96vw);max-height:88vh;overflow:auto;border-radius:28px;border:1px solid var(--line);background:var(--card);box-shadow:0 30px 100px rgba(0,0,0,.35);padding:16px}.avatarDrawTop{display:flex;align-items:center;justify-content:space-between;gap:10px}.avatarDrawTop b{font-size:19px}.avatarDrawTop button{border:1px solid var(--line);background:var(--card2);border-radius:12px;padding:8px 10px;font-weight:950}.avatarCapsule{display:grid;place-items:center;min-height:120px;font-size:64px;animation:avatarCapsulePop .65s cubic-bezier(.2,.8,.2,1)}@keyframes avatarCapsulePop{0%{transform:scale(.7) rotate(-10deg);opacity:.25}65%{transform:scale(1.08) rotate(4deg)}100%{transform:scale(1);opacity:1}}
      .avatarResultGrid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.avatarResult{padding:11px 7px;border:1px solid var(--line);border-radius:16px;background:var(--card2);text-align:center}.avatarResult i{display:block;font-style:normal;font-size:34px}.avatarResult b{display:block;margin-top:5px;font-size:10px}.avatarResult span{display:block;margin-top:3px;font-size:9px;font-weight:900}.avatarResult.common span{color:#64748b}.avatarResult.rare span{color:#2563eb}.avatarResult.epic span{color:#7c3aed}.avatarResult.legendary{box-shadow:0 0 0 2px color-mix(in srgb,#f59e0b 42%,transparent),0 0 28px color-mix(in srgb,#f59e0b 22%,transparent)}.avatarResult.legendary span{color:#d97706}
      @media(max-width:720px){.avatarGachaStats{grid-template-columns:repeat(2,1fr)}.avatarCollection{grid-template-columns:repeat(2,1fr)}.avatarResultGrid{grid-template-columns:repeat(2,1fr)}.avatarGachaOddsGrid{grid-template-columns:repeat(2,1fr)}}
    `; document.head.appendChild(s);
  }

  function ensureModal(){
    if(document.getElementById('avatarDrawBack')) return;
    const back=document.createElement('div'); back.id='avatarDrawBack'; back.className='avatarDrawBack'; back.hidden=true;
    back.innerHTML='<div class="avatarDrawModal" role="dialog" aria-modal="true" aria-label="아바타 뽑기 결과"><div class="avatarDrawTop"><b>아바타 캡슐 결과</b><button type="button" data-avatar-close>닫기</button></div><div id="avatarDrawBody"></div></div>';
    back.addEventListener('click',e=>{if(e.target===back||e.target.closest('[data-avatar-close]')) back.hidden=true;});
    document.body.appendChild(back);
  }

  function ensureProfileChip(){
    let chip=document.getElementById('avatarProfileChip');
    if(chip) return chip;
    chip=document.createElement('span'); chip.id='avatarProfileChip'; chip.className='avatarProfileChip'; chip.setAttribute('aria-label','장착 아바타');
    const anchor=document.getElementById('userBadge');
    if(anchor?.parentElement) anchor.parentElement.insertBefore(chip,anchor);
    return chip;
  }

  function applyEquipped(){
    const item=itemById(state.equipped);
    const chip=ensureProfileChip();
    if(chip){chip.textContent=item.icon;chip.title=item.name;chip.classList.toggle('on',state.equipped!==STARTER.id);}
  }

  function rarityLabel(r){ return r==='starter'?'기본':RARITY[r]?.label||r; }

  function collectionHtml(){
    return allItems().map(item=>{
      const owned=owns(item.id),active=state.equipped===item.id,meta=item.rarity==='starter'?null:RARITY[item.rarity];
      let control='';
      if(owned){
        control='<button type="button" class="'+(active?'':'primary')+'" '+(active?'disabled':'')+' data-avatar-equip="'+item.id+'">'+(active?'장착 중':'장착')+'</button>';
      }else{
        control='<button type="button" '+(state.coins<(meta?.exchange||999999)?'disabled':'')+' data-avatar-exchange="'+item.id+'">🪙 '+(meta?.exchange||0)+' 교환</button>';
      }
      return '<div class="avatarCard '+(owned?'':'locked')+' '+(active?'active':'')+'"><div class="avatarCardIcon">'+(owned?item.icon:'❔')+'</div><b>'+(owned?item.name:'미획득 아바타')+'</b><small>'+rarityLabel(item.rarity)+(owned?' · 보유':' · 코인 교환 가능')+'</small>'+control+'</div>';
    }).join('');
  }

  function ensureSection(){
    let section=document.getElementById('avatarGachaSection');
    if(section) return section;
    const shopItems=document.getElementById('gameShopItems');
    const shopSection=shopItems?.closest('.gameShopSection');
    if(!shopSection?.parentElement) return null;
    section=document.createElement('div'); section.id='avatarGachaSection'; section.className='avatarGachaSection';
    shopSection.parentElement.insertBefore(section,shopSection);
    section.addEventListener('click',e=>{
      const draw=e.target.closest('[data-avatar-draw]'); if(draw){drawAvatar(Number(draw.dataset.avatarDraw)||1);return;}
      const equip=e.target.closest('[data-avatar-equip]'); if(equip){equipAvatar(equip.dataset.avatarEquip);return;}
      const exchange=e.target.closest('[data-avatar-exchange]'); if(exchange){exchangeAvatar(exchange.dataset.avatarExchange);}
    });
    return section;
  }

  function render(){
    state=load();
    const section=ensureSection(); if(!section) return;
    const wallet=points();
    const equipped=itemById(state.equipped);
    const ownedCount=ITEMS.filter(x=>owns(x.id)).length;
    const pityLeft=Math.max(1,10-state.rarePity);
    section.innerHTML=`
      <div class="avatarGachaHead"><div><h3>🎁 아바타 캡슐</h3><p>O.Poong P로만 뽑는 프로필 아바타. 현금 결제는 없어요.</p></div><div class="avatarGachaEquipped"><i>${equipped.icon}</i><span>${equipped.name}</span></div></div>
      <div class="avatarGachaStats"><div class="avatarGachaStat"><span>보유 포인트</span><b>${wallet.toLocaleString('ko-KR')} P</b></div><div class="avatarGachaStat"><span>아바타 코인</span><b>🪙 ${state.coins.toLocaleString('ko-KR')}</b></div><div class="avatarGachaStat"><span>컬렉션</span><b>${ownedCount} / ${ITEMS.length}</b></div><div class="avatarGachaStat"><span>희귀+ 천장</span><b>${pityLeft}회 이내</b></div></div>
      <div class="avatarGachaActions"><button class="avatarGachaBtn" type="button" data-avatar-draw="1" ${wallet<100||drawing?'disabled':''}>1회 뽑기 · 100 P</button><button class="avatarGachaBtn alt" type="button" data-avatar-draw="5" ${wallet<450||drawing?'disabled':''}>5회 뽑기 · 450 P</button></div>
      <div class="avatarGachaNote">중복 획득 시 아바타 코인으로 자동 변환됩니다. 코인은 아래 미획득 아바타를 직접 교환하는 데 사용할 수 있어요. 10회 연속 희귀 이상이 나오지 않으면 다음 뽑기는 희귀 이상이 확정됩니다.</div>
      <details class="avatarGachaOdds"><summary>확률 및 중복 보상 보기</summary><div class="avatarGachaOddsGrid">${Object.entries(RARITY).map(([key,v])=>'<span>'+v.label+' '+v.rate+'%<br>중복 +'+v.duplicate+'🪙</span>').join('')}</div><div style="margin-top:7px;line-height:1.55">같은 등급 안에서는 각 아바타가 동일한 확률로 등장합니다. 천장 발동 시 희귀/에픽/전설은 70%/25%/5%로 추첨됩니다.</div></details>
      <div class="gameShopTitle"><b>내 아바타 컬렉션</b><span>보유 아바타 장착 · 미획득 코인 교환</span></div><div class="avatarCollection">${collectionHtml()}</div>`;
    applyEquipped();
  }

  function showResults(results){
    ensureModal();
    const back=document.getElementById('avatarDrawBack');
    const body=document.getElementById('avatarDrawBody');
    if(!back||!body) return;
    const best=[...results].sort((a,b)=>['common','rare','epic','legendary'].indexOf(b.rarity)-['common','rare','epic','legendary'].indexOf(a.rarity))[0];
    body.innerHTML='<div class="avatarCapsule">'+(best?.item.icon||'🎁')+'</div><div class="avatarResultGrid">'+results.map(r=>'<div class="avatarResult '+r.rarity+'"><i>'+r.item.icon+'</i><b>'+r.item.name+'</b><span>'+rarityLabel(r.rarity)+(r.duplicate?' · 중복 +'+r.coins+'🪙':' · NEW')+'</span></div>').join('')+'</div>';
    back.hidden=false;
  }

  function drawAvatar(count){
    if(drawing) return;
    count=count===5?5:1;
    const cost=count===5?450:100;
    const wallet=points();
    if(wallet<cost){window.gameRewardMessage?.('아바타 캡슐에 '+(cost-wallet)+' P가 부족해요.');return;}
    if(typeof window.shopSpend!=='function'){window.gameRewardMessage?.('포인트 지갑을 불러오지 못했어요.');return;}
    if(!window.shopSpend(cost,'아바타 캡슐')) return;
    drawing=true; render();
    const results=[];
    for(let i=0;i<count;i++) results.push(oneDraw());
    save();
    window.setTimeout(()=>{
      drawing=false;
      render();
      window.renderOpoongColorShop?.();
      window.updateFocusWallet?.();
      showResults(results);
      const newCount=results.filter(x=>!x.duplicate).length;
      window.gameRewardMessage?.('아바타 '+count+'회 뽑기 완료'+(newCount?' · NEW '+newCount+'개':'')+'!');
    },650);
  }

  function equipAvatar(id){
    if(!owns(id)) return;
    state.equipped=id; save(); applyEquipped(); render();
    window.gameRewardMessage?.(itemById(id).name+' 장착 완료');
  }

  function exchangeAvatar(id){
    const item=ITEMS.find(x=>x.id===id); if(!item||owns(id)) return;
    const cost=RARITY[item.rarity].exchange;
    if(state.coins<cost){window.gameRewardMessage?.('아바타 코인이 '+(cost-state.coins)+'개 부족해요.');return;}
    state.coins-=cost; state.owned.push(item.id); save(); render();
    window.gameRewardMessage?.(item.name+' 코인 교환 완료');
  }

  function install(){
    injectStyles(); ensureModal();
    if(!ensureSection()) return false;
    applyEquipped(); render();
    window.OpoongAvatarGacha={render,draw:drawAvatar,equip:equipAvatar,state:()=>load()};
    return true;
  }

  let tries=0; const timer=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(timer);},100);
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',install,{once:true}); else install();
  window.addEventListener('storage',e=>{if(e.key===SAVE_KEY||e.key==='opoong_rewards_v2')render();});
})();
