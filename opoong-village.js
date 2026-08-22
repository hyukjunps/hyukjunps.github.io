(() => {
  'use strict';

  const SAVE_KEY = 'opoong_village_v1';
  const MAP_SIZE = 6000;
  const TILE = 50;
  const ROAD_COST = 4;
  const MIN_ZOOM = .28;
  const MAX_ZOOM = 1.65;

  const GROUPS = [
    { cat:'주거', base:120, items:[
      ['작은 단독주택','🏠',2,2],['빨간지붕집','🏡',2,2],['파란지붕집','🏠',2,2],['오풍이 하우스','🏡',2,2],['목조주택','🛖',2,2],
      ['전원주택','🏡',2,2],['2층주택','🏘️',2,2],['테라스하우스','🏘️',3,2],['아파트','🏢',3,3],['고층아파트','🏙️',3,4],
      ['주상복합','🏢',3,3],['한옥','🏠',2,2],['별장','🏡',3,2],['호숫가집','🏡',2,2],['타운하우스','🏘️',3,2]
    ]},
    { cat:'상점', base:160, items:[
      ['편의점','🏪',2,2],['오풍 카페','☕',2,2],['빵집','🥐',2,2],['라면가게','🍜',2,2],['레스토랑','🍽️',2,2],
      ['피자가게','🍕',2,2],['버거가게','🍔',2,2],['아이스크림집','🍦',2,2],['서점','📚',2,2],['꽃집','💐',2,2],
      ['옷가게','👕',2,2],['슈퍼마켓','🛒',3,2],['백화점','🏬',4,3],['영화관','🎬',3,3],['호텔','🏨',3,4]
    ]},
    { cat:'공공', base:220, items:[
      ['오풍 시청','🏛️',4,3],['학교','🏫',4,3],['도서관','📚',3,3],['병원','🏥',4,3],['소방서','🚒',3,3],
      ['경찰서','🚓',3,3],['우체국','📮',2,2],['은행','🏦',3,2],['주민센터','🏢',3,2],['박물관','🏛️',4,3],
      ['과학관','🔭',4,3],['천문대','🔭',3,3],['대학교','🎓',5,4],['체육관','🏟️',4,3],['방송국','📡',4,3]
    ]},
    { cat:'자연', base:45, items:[
      ['참나무','🌳',1,1],['벚나무','🌸',1,1],['소나무','🌲',1,1],['단풍나무','🍁',1,1],['꽃정원','🌷',2,2],
      ['튤립화단','🌷',2,1],['연못','🪷',2,2],['작은 호수','💧',4,3],['시냇물','💦',3,1],['폭포','🌊',3,3],
      ['언덕','⛰️',3,2],['산','🏔️',5,4],['대나무숲','🎋',3,3],['농장','🌾',4,3],['과수원','🍎',4,3]
    ]},
    { cat:'놀이', base:170, items:[
      ['놀이터','🛝',3,2],['축구장','⚽',5,3],['농구장','🏀',3,3],['야구장','⚾',5,4],['수영장','🏊',4,3],
      ['놀이공원','🎡',6,5],['대관람차','🎡',3,3],['캠핑장','⛺',4,3],['피크닉장','🧺',3,3],['수족관','🐠',4,3]
    ]},
    { cat:'교통', base:250, items:[
      ['오풍 국제공항','🛫',8,6,'airport',2500],['활주로','🛬',10,2,'runway',900],['공항 터미널','🛄',5,4,'terminal',1300],['여객기','✈️',3,2,'plane',1200],['소형 비행기','🛩️',2,2,'plane',800],
      ['헬리포트','H',3,3,'heliport',500],['헬리콥터','🚁',2,2,'aircraft',700],['기차역','🚉',4,3,'station',850],['기차','🚆',4,1,'train',650],['버스','🚌',2,1,'vehicle',260],
      ['빨간 자동차','🚗',1,1,'vehicle',180],['파란 자동차','🚙',1,1,'vehicle',180],['택시','🚕',1,1,'vehicle',200],['트럭','🚚',2,1,'vehicle',240],['페리','⛴️',3,2,'ship',700]
    ]},
    { cat:'꾸미기', base:35, items:[
      ['가로등','💡',1,1],['벤치','🪑',1,1],['분수','⛲',2,2],['시계탑','🕰️',2,3],['마을 동상','🗿',1,2],
      ['오풍마을 간판','🪧',2,1],['울타리','🪵',1,1],['화분','🪴',1,1],['신호등','🚦',1,1],['횡단보도','▥',2,1],
      ['광장','◻️',3,3,'plaza'],['자전거도로','🚲',3,1,'path'],['다리','🌉',4,1,'bridge'],['터널','🚇',3,2,'tunnel'],['주차장','🅿️',4,3,'parking']
    ]}
  ];

  const ITEMS = [];
  GROUPS.forEach((group, gi) => group.items.forEach((entry, ii) => {
    const [name, icon, w, h, special, fixedPrice] = entry;
    ITEMS.push({
      id:`village-${gi}-${ii}`,
      cat:group.cat,
      name, icon, w, h,
      special:special || '',
      price:fixedPrice || Math.round((group.base + ii * Math.max(8, Math.floor(group.base * .07))) / 5) * 5
    });
  }));

  const DESTINATIONS = [
    { id:'jp', name:'일본 · 도쿄', flag:'🇯🇵', scene:'🗼🍣🌸🚄', price:80, text:'도쿄 타워와 벚꽃 거리를 여행했어요.' },
    { id:'us', name:'미국 · 뉴욕', flag:'🇺🇸', scene:'🗽🏙️🍕🚕', price:130, text:'뉴욕의 빌딩 숲과 자유의 여신상을 만났어요.' },
    { id:'fr', name:'프랑스 · 파리', flag:'🇫🇷', scene:'🗼🥐🎨☕', price:120, text:'파리의 카페와 미술관을 둘러봤어요.' },
    { id:'uk', name:'영국 · 런던', flag:'🇬🇧', scene:'🎡🏰🚌☕', price:120, text:'빨간 버스를 타고 런던을 돌아봤어요.' },
    { id:'it', name:'이탈리아 · 로마', flag:'🇮🇹', scene:'🏛️🍝🍕⛲', price:115, text:'로마의 광장과 유적을 산책했어요.' },
    { id:'au', name:'호주 · 시드니', flag:'🇦🇺', scene:'🎭🏖️🦘🌊', price:150, text:'시드니 항구와 해변을 여행했어요.' },
    { id:'sg', name:'싱가포르', flag:'🇸🇬', scene:'🌴🏙️🌺🍜', price:95, text:'야경과 정원이 멋진 싱가포르를 여행했어요.' },
    { id:'th', name:'태국 · 방콕', flag:'🇹🇭', scene:'🛕🥭🌴🛺', price:90, text:'방콕의 시장과 사원을 구경했어요.' },
    { id:'vn', name:'베트남 · 다낭', flag:'🇻🇳', scene:'🏖️🍜🌴🏮', price:85, text:'다낭의 해변과 야시장을 즐겼어요.' },
    { id:'ca', name:'캐나다 · 밴쿠버', flag:'🇨🇦', scene:'🍁🏔️🌲🚲', price:135, text:'산과 바다가 함께 있는 도시를 여행했어요.' },
    { id:'ch', name:'스위스', flag:'🇨🇭', scene:'🏔️🚞🧀🌼', price:145, text:'알프스와 산악열차를 즐겼어요.' },
    { id:'eg', name:'이집트 · 카이로', flag:'🇪🇬', scene:'🏜️🐪🔺☀️', price:155, text:'사막과 피라미드를 여행했어요.' }
  ];

  const PALETTES = {
    주거:[['#fff7ed','#fed7aa','#c2410c'],['#eff6ff','#bfdbfe','#2563eb'],['#fdf4ff','#f5d0fe','#a21caf'],['#f0fdf4','#bbf7d0','#15803d']],
    상점:[['#fff1f2','#fecdd3','#e11d48'],['#fdf4ff','#e9d5ff','#7e22ce'],['#fffbeb','#fde68a','#d97706']],
    공공:[['#f8fafc','#cbd5e1','#475569'],['#eff6ff','#bfdbfe','#1d4ed8'],['#ecfeff','#a5f3fc','#0e7490']],
    놀이:[['#fff7ed','#fdba74','#ea580c'],['#f0fdf4','#86efac','#16a34a'],['#fdf2f8','#f9a8d4','#db2777']],
    교통:[['#f8fafc','#cbd5e1','#334155'],['#eef2ff','#c7d2fe','#4338ca']],
    꾸미기:[['#f8fafc','#e2e8f0','#64748b']]
  };

  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let state = loadState();
  let selectedItemId = '';
  let demolishMode = false;
  let roadMode = false;
  let canvas = null;
  let ctx = null;
  let camera = { x:MAP_SIZE/2 - 700, y:MAP_SIZE/2 - 450, zoom:.58 };
  let pointer = null;
  let hoverWorld = null;
  let roadLastCell = null;
  let anim = 0;
  let lastFrame = 0;
  let travelDestination = null;

  function defaultState() {
    return { placed:[], roads:[], trips:{}, createdAt:Date.now() };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.placed)) return defaultState();
      parsed.roads = Array.isArray(parsed.roads) ? parsed.roads : [];
      parsed.trips = parsed.trips && typeof parsed.trips === 'object' ? parsed.trips : {};
      return parsed;
    } catch (_) { return defaultState(); }
  }

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function getItem(id) { return ITEMS.find((item) => item.id === id) || null; }
  function roadKey(gx, gy) { return `${gx},${gy}`; }
  function roadSet() { return new Set(state.roads); }

  function walletPoints() {
    try { if (typeof window.loadOpoongRewards === 'function') return Math.max(0, Number(window.loadOpoongRewards().points) || 0); } catch (_) {}
    return 0;
  }

  function spendPoints(price, label) {
    try { if (typeof window.shopSpend === 'function') return !!window.shopSpend(price, label); } catch (_) {}
    villageToast('O.Poong 포인트 지갑을 불러오지 못했어요.', 'bad');
    return false;
  }

  function refundPoints(amount, label) {
    try { if (typeof window.awardOpoongPoints === 'function') window.awardOpoongPoints(amount, label); } catch (_) {}
  }

  function stats() {
    let homes = 0, nature = 0, fun = 0;
    state.placed.forEach((p) => {
      const item = getItem(p.itemId); if (!item) return;
      if (item.cat === '주거') homes++;
      if (item.cat === '자연') nature++;
      if (item.cat === '놀이') fun++;
    });
    return {
      population: homes * 12 + state.placed.filter((p) => ['아파트','고층아파트'].includes(getItem(p.itemId)?.name)).length * 48,
      happiness: Math.min(100, 35 + nature * 2 + fun * 4 + Math.floor(state.placed.length / 8) + Math.min(10,Math.floor(state.roads.length/30))),
      buildings: state.placed.length,
      roads: state.roads.length
    };
  }

  function hasTravelHub() {
    let airport = false, plane = false;
    state.placed.forEach((p) => {
      const item = getItem(p.itemId);
      if (item?.special === 'airport') airport = true;
      if (item?.special === 'plane') plane = true;
    });
    return airport && plane;
  }

  function injectStyles() {
    if (document.getElementById('opoongVillageStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongVillageStyles';
    style.textContent = `
      .coverOpoongVillage{position:relative;overflow:hidden;background:linear-gradient(155deg,#dff7ff 0 38%,#9be8c2 38% 100%)}
      .coverOpoongVillage::before{content:'';position:absolute;left:13%;bottom:17%;width:55%;height:44%;background:linear-gradient(145deg,#fff6db,#f5d0a0);clip-path:polygon(8% 25%,55% 8%,96% 32%,48% 78%);filter:drop-shadow(14px 16px 8px rgba(15,23,42,.17))}
      .coverOpoongVillage::after{content:'✈';position:absolute;right:12%;top:12%;font-size:31px;color:#2563eb;transform:rotate(-15deg);font-weight:1000}
      .villageTop{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:10px}
      .villageStat{padding:10px 8px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(180deg,var(--card),color-mix(in srgb,var(--card) 88%,var(--bg)));text-align:center}.villageStat span{display:block;color:var(--muted);font-size:10.5px;font-weight:900}.villageStat strong{display:block;margin-top:4px;font-size:17px}
      .villageToolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px}.villageToolbar .smallbtn.active{color:#fff;background:linear-gradient(135deg,var(--pri),var(--pri2));border-color:transparent}.villageToolbar .roadActive{color:#fff!important;background:linear-gradient(135deg,#334155,#0f172a)!important;border-color:transparent!important}.villageToolbar .villageTravelReady{background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:0}
      .villageWorkspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:10px;align-items:stretch}
      .villageMapWrap{position:relative;min-height:590px;border:1px solid color-mix(in srgb,var(--line) 75%,transparent);border-radius:26px;overflow:hidden;background:#93d9b2;box-shadow:inset 0 0 0 1px rgba(255,255,255,.5),0 14px 38px rgba(15,23,42,.08)}
      #opoongVillageCanvas{display:block;width:100%;height:100%;min-height:590px;touch-action:none;cursor:grab}.villageBuild #opoongVillageCanvas{cursor:crosshair}.villageRoad #opoongVillageCanvas{cursor:cell}.villageDemolish #opoongVillageCanvas{cursor:not-allowed}
      .villageMapBadge{position:absolute;left:12px;top:12px;padding:8px 11px;border-radius:999px;background:rgba(15,23,42,.76);color:#fff;font-size:10.5px;font-weight:900;backdrop-filter:blur(10px);pointer-events:none;box-shadow:0 8px 18px rgba(15,23,42,.12)}
      .villageSide{min-height:590px;border:1px solid var(--line);border-radius:24px;background:linear-gradient(180deg,var(--card),color-mix(in srgb,var(--card) 93%,var(--bg)));padding:12px;display:flex;flex-direction:column;overflow:hidden}.villageSideHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.villageSideHead b{font-size:17px}.villageSelected{margin-top:8px;min-height:42px;padding:10px;border-radius:14px;background:color-mix(in srgb,var(--pri) 6%,var(--card));border:1px solid var(--line);font-size:11px;font-weight:850;line-height:1.45;color:var(--muted)}
      .villageCats{display:flex;gap:6px;overflow:auto;padding:8px 0;scrollbar-width:none}.villageCats::-webkit-scrollbar{display:none}.villageCat{border:1px solid var(--line);border-radius:999px;background:var(--card2);padding:7px 9px;font-size:10.5px;font-weight:900;white-space:nowrap}.villageCat.active{color:#fff;background:var(--pri);border-color:var(--pri)}
      .villageCatalog{display:grid;grid-template-columns:1fr 1fr;gap:7px;overflow:auto;max-height:450px;padding-right:2px}.villageItem{border:1px solid var(--line);border-radius:15px;background:var(--card2);padding:9px 7px;text-align:center;color:var(--text);min-height:92px;transition:.13s ease}.villageItem:hover{transform:translateY(-2px)}.villageItem.selected{border-color:var(--pri2);box-shadow:0 0 0 3px color-mix(in srgb,var(--pri2) 14%,transparent)}.villageItem i{display:block;font-style:normal;font-size:28px}.villageItem b{display:block;margin-top:4px;font-size:10.5px;line-height:1.25}.villageItem span{display:block;margin-top:4px;color:var(--muted);font-size:10px;font-weight:850}
      .villageRoadHelp{margin:8px 0 0;padding:10px;border-radius:14px;background:#f8fafc;border:1px solid #cbd5e1;color:#475569;font-size:10.5px;font-weight:850;line-height:1.5}
      .villageToast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%) translateY(12px);max-width:min(88%,520px);padding:11px 14px;border-radius:16px;background:rgba(15,23,42,.9);color:#fff;font-size:12px;font-weight:900;text-align:center;opacity:0;pointer-events:none;transition:.2s ease;z-index:3}.villageToast.show{opacity:1;transform:translateX(-50%) translateY(0)}.villageToast.bad{background:rgba(153,27,27,.94)}.villageToast.good{background:rgba(4,120,87,.94)}
      .villageTravelBack{position:fixed;inset:0;z-index:260;background:rgba(7,17,31,.62);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.villageTravelBack[hidden]{display:none!important}.villageTravelModal{width:min(760px,96vw);max-height:88vh;overflow:auto;border-radius:28px;background:var(--card);border:1px solid var(--line);box-shadow:0 30px 90px rgba(0,0,0,.28);padding:18px}.villageTravelHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.villageDestinations{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}.villageDestination{padding:14px 10px;border:1px solid var(--line);border-radius:18px;background:var(--card2);text-align:center}.villageDestination .flag{font-size:30px}.villageDestination b{display:block;margin-top:5px;font-size:12px}.villageDestination span{display:block;margin-top:4px;color:var(--muted);font-size:10.5px;font-weight:850}.villagePassport{margin-top:14px;padding:13px;border-radius:18px;border:1px dashed var(--line);background:color-mix(in srgb,var(--pri) 4%,var(--card));font-size:11px;font-weight:850;line-height:1.6}.villageTripScene{text-align:center;padding:28px 10px}.villageTripScene .flag{font-size:46px}.villageTripScene .scene{margin:20px 0;font-size:clamp(44px,9vw,80px);letter-spacing:10px}.villageTripScene h3{margin:8px 0 0;font-size:25px}.villageTripScene p{color:var(--muted);font-weight:800;line-height:1.7}
      @media(max-width:900px){.villageWorkspace{grid-template-columns:1fr}.villageSide{min-height:0}.villageCatalog{max-height:330px;grid-template-columns:repeat(3,1fr)}.villageMapWrap,#opoongVillageCanvas{min-height:500px}}
      @media(max-width:620px){.villageTop{grid-template-columns:1fr 1fr}.villageTop .villageStat:last-child{grid-column:1/-1}.villageCatalog{grid-template-columns:1fr 1fr}.villageDestinations{grid-template-columns:1fr 1fr}.villageMapWrap,#opoongVillageCanvas{min-height:445px}}
    `;
    document.head.appendChild(style);
  }

  function addCard() {
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if (!grid || document.getElementById('gameCardOpoongVillage')) return;
    const button = document.createElement('button');
    button.className = 'gameCard'; button.type = 'button'; button.id = 'gameCardOpoongVillage';
    button.innerHTML = `<span class="gameCover coverOpoongVillage"></span><span class="gameCardInfo"><b>오풍 마을</b><span id="gameCardOpoongVillageMeta">2.5D 마을을 계속 가꾸기</span></span>`;
    button.addEventListener('click', () => window.openMiniGame('opoong-village'));
    grid.appendChild(button);
  }

  function addPanel() {
    const gameView = document.getElementById('view-game');
    if (!gameView || document.getElementById('gameOpoongVillagePanel')) return;
    const shop = document.getElementById('gameColorShop');
    const anchor = shop || gameView.lastElementChild;
    const panel = document.createElement('div');
    panel.id = 'gameOpoongVillagePanel'; panel.className = 'gamePlayCard miniGamePanel'; panel.hidden = true;
    panel.innerHTML = `
      <div class="villageTop">
        <div class="villageStat"><span>O.Poong 포인트</span><strong id="villageWallet">0 P</strong></div>
        <div class="villageStat"><span>인구</span><strong id="villagePopulation">0명</strong></div>
        <div class="villageStat"><span>행복도</span><strong id="villageHappiness">35%</strong></div>
        <div class="villageStat"><span>건물</span><strong id="villageBuildings">0개</strong></div>
        <div class="villageStat"><span>도로</span><strong id="villageRoads">0칸</strong></div>
      </div>
      <div class="villageToolbar">
        <button class="smallbtn ghost" id="villageShopBtn" type="button">🏗️ 건설 상점</button>
        <button class="smallbtn ghost" id="villageRoadBtn" type="button">🛣️ 도로 건설</button>
        <button class="smallbtn ghost" id="villageDemolishBtn" type="button">🚜 철거</button>
        <button class="smallbtn ghost" id="villageCancelBtn" type="button">✋ 둘러보기</button>
        <button class="smallbtn ghost" id="villageCenterBtn" type="button">🎯 마을 중심</button>
        <button class="smallbtn ghost" id="villageZoomOut" type="button">－</button>
        <button class="smallbtn ghost" id="villageZoomIn" type="button">＋</button>
        <button class="smallbtn ghost" id="villageTravelBtn" type="button">✈️ 해외여행</button>
      </div>
      <div class="villageWorkspace">
        <div class="villageMapWrap" id="villageMapWrap">
          <canvas id="opoongVillageCanvas" width="1200" height="800" aria-label="오풍 마을 2.5D 건설 지도"></canvas>
          <div class="villageMapBadge">6000 × 6000 · 2.5D VIEW · 드래그 이동 · 휠/버튼 줌</div>
          <div class="villageToast" id="villageToast"></div>
        </div>
        <aside class="villageSide" id="villageSide">
          <div class="villageSideHead"><b>건설 상점</b><span class="pill">100 ITEMS</span></div>
          <div class="villageSelected" id="villageSelected">아이템을 선택한 뒤 지도에서 원하는 위치를 누르세요.</div>
          <div class="villageCats" id="villageCats"></div>
          <div class="villageCatalog" id="villageCatalog"></div>
          <div class="villageRoadHelp">도로는 상점에서 사는 오브젝트가 아니라, 상단의 <b>🛣️ 도로 건설</b>을 누른 뒤 지도 위를 드래그해 자유롭게 이어서 만듭니다. 1칸당 ${ROAD_COST} P.</div>
        </aside>
      </div>
      <div class="villageTravelBack" id="villageTravelBack" hidden><div class="villageTravelModal" id="villageTravelModal"></div></div>`;
    if (anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor); else gameView.appendChild(panel);

    document.getElementById('villageCancelBtn')?.addEventListener('click', cancelBuild);
    document.getElementById('villageRoadBtn')?.addEventListener('click', toggleRoadMode);
    document.getElementById('villageDemolishBtn')?.addEventListener('click', toggleDemolish);
    document.getElementById('villageCenterBtn')?.addEventListener('click', centerVillage);
    document.getElementById('villageZoomOut')?.addEventListener('click', () => zoomBy(.82));
    document.getElementById('villageZoomIn')?.addEventListener('click', () => zoomBy(1.2));
    document.getElementById('villageTravelBtn')?.addEventListener('click', openTravel);
    document.getElementById('villageShopBtn')?.addEventListener('click', () => document.getElementById('villageSide')?.scrollIntoView({behavior:'smooth',block:'nearest'}));
    document.getElementById('villageTravelBack')?.addEventListener('click', (e) => { if (e.target.id === 'villageTravelBack') closeTravel(); });
  }

  let activeCategory = '전체';
  function renderCatalog() {
    const cats = document.getElementById('villageCats');
    const catalog = document.getElementById('villageCatalog');
    if (!cats || !catalog) return;
    const names = ['전체', ...GROUPS.map((g) => g.cat)];
    cats.innerHTML = names.map((cat) => `<button class="villageCat ${activeCategory === cat ? 'active' : ''}" type="button" data-village-cat="${cat}">${cat}</button>`).join('');
    cats.querySelectorAll('[data-village-cat]').forEach((b) => b.addEventListener('click', () => { activeCategory = b.dataset.villageCat; renderCatalog(); }));
    const list = ITEMS.filter((item) => activeCategory === '전체' || item.cat === activeCategory);
    catalog.innerHTML = list.map((item) => `<button class="villageItem ${selectedItemId === item.id ? 'selected' : ''}" type="button" data-village-item="${item.id}"><i>${item.icon}</i><b>${item.name}</b><span>${item.price.toLocaleString()} P · ${item.w}×${item.h}</span></button>`).join('');
    catalog.querySelectorAll('[data-village-item]').forEach((b) => b.addEventListener('click', () => selectItem(b.dataset.villageItem)));
  }

  function updateModeClasses() {
    const panel = document.getElementById('gameOpoongVillagePanel');
    panel?.classList.toggle('villageBuild', !!selectedItemId);
    panel?.classList.toggle('villageRoad', roadMode);
    panel?.classList.toggle('villageDemolish', demolishMode);
    document.getElementById('villageRoadBtn')?.classList.toggle('roadActive', roadMode);
    document.getElementById('villageDemolishBtn')?.classList.toggle('active', demolishMode);
  }

  function selectItem(id) {
    const item = getItem(id); if (!item) return;
    selectedItemId = id; demolishMode = false; roadMode = false; roadLastCell = null;
    updateModeClasses();
    const selected = document.getElementById('villageSelected');
    if (selected) selected.textContent = `${item.icon} ${item.name} · ${item.price.toLocaleString()} P · 지도에서 배치할 위치를 눌러주세요.`;
    renderCatalog(); draw();
  }

  function cancelBuild() {
    selectedItemId = ''; demolishMode = false; roadMode = false; roadLastCell = null;
    updateModeClasses();
    const selected = document.getElementById('villageSelected'); if (selected) selected.textContent = '둘러보기 모드 · 지도를 드래그해서 이동하세요.';
    renderCatalog(); draw();
  }

  function toggleRoadMode() {
    roadMode = !roadMode; demolishMode = false; selectedItemId = ''; roadLastCell = null;
    updateModeClasses(); renderCatalog();
    const selected = document.getElementById('villageSelected');
    if (selected) selected.textContent = roadMode ? `도로 건설 모드 · 지도 위를 누르고 드래그하세요. 1칸 ${ROAD_COST} P.` : '둘러보기 모드';
    draw();
  }

  function toggleDemolish() {
    demolishMode = !demolishMode; selectedItemId = ''; roadMode = false; roadLastCell = null;
    updateModeClasses(); renderCatalog();
    const selected = document.getElementById('villageSelected'); if (selected) selected.textContent = demolishMode ? '철거 모드 · 건물이나 도로를 누르면 철거됩니다.' : '둘러보기 모드';
    draw();
  }

  let toastTimer = 0;
  function villageToast(message, kind = '') {
    const el = document.getElementById('villageToast'); if (!el) return;
    clearTimeout(toastTimer); el.textContent = message; el.className = `villageToast show${kind ? ' ' + kind : ''}`;
    toastTimer = setTimeout(() => { el.className = 'villageToast'; }, 2200);
  }

  function worldFromScreen(sx, sy) { return { x:camera.x + sx / camera.zoom, y:camera.y + sy / camera.zoom }; }

  function buildingAtTile(gx, gy) {
    const x = gx*TILE, y = gy*TILE;
    return state.placed.some((p) => {
      const item = getItem(p.itemId); if (!item) return false;
      return x < p.x + item.w*TILE && x+TILE > p.x && y < p.y + item.h*TILE && y+TILE > p.y;
    });
  }

  function roadOverlapsFootprint(x, y, item) {
    const gx0 = Math.floor(x/TILE), gy0 = Math.floor(y/TILE), gx1 = Math.ceil((x+item.w*TILE)/TILE), gy1 = Math.ceil((y+item.h*TILE)/TILE);
    const roads = roadSet();
    for (let gx=gx0; gx<gx1; gx++) for (let gy=gy0; gy<gy1; gy++) if (roads.has(roadKey(gx,gy))) return true;
    return false;
  }

  function overlaps(x, y, item, ignoreId = '') {
    const ax2 = x + item.w * TILE, ay2 = y + item.h * TILE;
    return state.placed.some((p) => {
      if (p.uid === ignoreId) return false;
      const other = getItem(p.itemId); if (!other) return false;
      const bx2 = p.x + other.w * TILE, by2 = p.y + other.h * TILE;
      return x < bx2 && ax2 > p.x && y < by2 && ay2 > p.y;
    });
  }

  function placeAt(worldX, worldY) {
    const item = getItem(selectedItemId); if (!item) return;
    const x = Math.max(0, Math.min(MAP_SIZE - item.w*TILE, Math.round(worldX/TILE)*TILE));
    const y = Math.max(0, Math.min(MAP_SIZE - item.h*TILE, Math.round(worldY/TILE)*TILE));
    if (overlaps(x,y,item)) return villageToast('다른 건물과 겹쳐요.', 'bad');
    if (roadOverlapsFootprint(x,y,item)) return villageToast('도로 위에는 건물을 지을 수 없어요.', 'bad');
    if (!spendPoints(item.price,item.name)) { updateHud(); return villageToast('포인트가 부족해요.', 'bad'); }
    state.placed.push({uid:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,itemId:item.id,x,y,placedAt:Date.now()});
    saveState(); updateHud(); draw(); villageToast(`${item.name} 건설 완료 · -${item.price.toLocaleString()} P`,'good');
  }

  function addRoadTile(gx, gy, quiet=false) {
    const max = MAP_SIZE/TILE;
    if (gx<0||gy<0||gx>=max||gy>=max) return false;
    const key=roadKey(gx,gy); if (state.roads.includes(key)) return false;
    if (buildingAtTile(gx,gy)) { if(!quiet)villageToast('건물 위에는 도로를 놓을 수 없어요.','bad'); return false; }
    if (!spendPoints(ROAD_COST,'오풍 마을 도로')) { if(!quiet)villageToast('도로를 더 지을 포인트가 부족해요.','bad'); updateHud(); return false; }
    state.roads.push(key); return true;
  }

  function roadLine(a,b) {
    let x0=a.gx,y0=a.gy,x1=b.gx,y1=b.gy;
    const dx=Math.abs(x1-x0),sx=x0<x1?1:-1,dy=-Math.abs(y1-y0),sy=y0<y1?1:-1;let err=dx+dy,changed=false;
    while(true){ if(addRoadTile(x0,y0,true))changed=true; if(x0===x1&&y0===y1)break; const e2=2*err;if(e2>=dy){err+=dy;x0+=sx}if(e2<=dx){err+=dx;y0+=sy} }
    if(changed){saveState();updateHud();draw();}
  }

  function roadCellFromWorld(w){return{gx:Math.floor(w.x/TILE),gy:Math.floor(w.y/TILE)}}

  function findPlacedAt(worldX, worldY) {
    for (let i=state.placed.length-1;i>=0;i--) {
      const p=state.placed[i],item=getItem(p.itemId);if(!item)continue;
      if(worldX>=p.x&&worldX<=p.x+item.w*TILE&&worldY>=p.y&&worldY<=p.y+item.h*TILE)return{p,item,index:i};
    }
    return null;
  }

  function demolishAt(worldX, worldY) {
    const found=findPlacedAt(worldX,worldY);
    if(found){const refund=Math.floor(found.item.price*.5);state.placed.splice(found.index,1);saveState();if(refund)refundPoints(refund,`오풍 마을 ${found.item.name} 철거 환급`);updateHud();draw();return villageToast(`${found.item.name} 철거 · ${refund.toLocaleString()} P 환급`,'good');}
    const cell=roadCellFromWorld({x:worldX,y:worldY}),key=roadKey(cell.gx,cell.gy),idx=state.roads.indexOf(key);
    if(idx>=0){state.roads.splice(idx,1);saveState();refundPoints(Math.floor(ROAD_COST/2),'오풍 마을 도로 철거 환급');updateHud();draw();return villageToast('도로 1칸 철거','good');}
    villageToast('철거할 것이 없어요.');
  }

  function resizeCanvas() {
    if(!canvas)return;const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);const w=Math.max(320,Math.floor(rect.width*dpr)),h=Math.max(380,Math.floor(rect.height*dpr));if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
  }

  function hash(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return Math.abs(h>>>0)}
  function paletteFor(item){const arr=PALETTES[item.cat]||PALETTES.꾸미기;return arr[hash(item.id)%arr.length]}

  function rounded(c,x,y,w,h,r,fill,stroke){c.beginPath();if(c.roundRect)c.roundRect(x,y,w,h,r);else c.rect(x,y,w,h);if(fill)c.fill();if(stroke)c.stroke();}

  function drawTerrain(c) {
    c.fillStyle='#9bd6ad';c.fillRect(0,0,MAP_SIZE,MAP_SIZE);
    c.fillStyle='rgba(255,255,255,.10)';for(let x=0;x<MAP_SIZE;x+=400)for(let y=0;y<MAP_SIZE;y+=400){if(((x+y)/400)%2===0)c.fillRect(x,y,400,400)}
    c.fillStyle='rgba(72,187,120,.18)';c.beginPath();c.ellipse(900,5000,720,430,0,0,Math.PI*2);c.fill();
    c.fillStyle='rgba(56,189,248,.28)';c.beginPath();c.ellipse(5050,850,620,360,0,0,Math.PI*2);c.fill();
    c.strokeStyle='rgba(14,116,144,.23)';c.lineWidth=88;c.lineCap='round';c.beginPath();c.moveTo(3750,-100);c.bezierCurveTo(3300,1500,4200,3300,3550,6100);c.stroke();
  }

  function drawGrid(c,width,height) {
    if(camera.zoom<.48)return;const z=camera.zoom,startX=Math.floor(camera.x/TILE)*TILE,endX=camera.x+width/z,startY=Math.floor(camera.y/TILE)*TILE,endY=camera.y+height/z;
    c.strokeStyle='rgba(22,101,52,.055)';c.lineWidth=1/z;c.beginPath();for(let x=startX;x<=endX;x+=TILE){c.moveTo(x,camera.y);c.lineTo(x,endY)}for(let y=startY;y<=endY;y+=TILE){c.moveTo(camera.x,y);c.lineTo(endX,y)}c.stroke();
  }

  function drawRoads(c) {
    const roads=roadSet();
    state.roads.forEach((key)=>{
      const [gx,gy]=key.split(',').map(Number),x=gx*TILE,y=gy*TILE;
      c.fillStyle='#3f4955';c.fillRect(x,y,TILE,TILE);
      c.fillStyle='rgba(255,255,255,.06)';c.fillRect(x+4,y+4,TILE-8,TILE-8);
      const n=roads.has(roadKey(gx,gy-1)),s=roads.has(roadKey(gx,gy+1)),w=roads.has(roadKey(gx-1,gy)),e=roads.has(roadKey(gx+1,gy));
      c.strokeStyle='rgba(250,204,21,.82)';c.lineWidth=2;c.setLineDash([9,8]);c.beginPath();
      if((n||s)&&!(w||e)){c.moveTo(x+TILE/2,y);c.lineTo(x+TILE/2,y+TILE)}else if((w||e)&&!(n||s)){c.moveTo(x,y+TILE/2);c.lineTo(x+TILE,y+TILE/2)}else if(n||s||w||e){c.moveTo(x+TILE/2,y+8);c.lineTo(x+TILE/2,y+TILE-8);c.moveTo(x+8,y+TILE/2);c.lineTo(x+TILE-8,y+TILE/2)}
      c.stroke();c.setLineDash([]);
      c.strokeStyle='rgba(15,23,42,.22)';c.lineWidth=1;c.strokeRect(x+.5,y+.5,TILE-1,TILE-1);
    });
  }

  function drawNature(c,p,item,now){
    const x=p.x,y=p.y,w=item.w*TILE,h=item.h*TILE,name=item.name;
    c.fillStyle='rgba(15,23,42,.13)';c.beginPath();c.ellipse(x+w*.55,y+h*.78,w*.34,h*.14,0,0,Math.PI*2);c.fill();
    if(name.includes('호수')||name.includes('연못')||name.includes('시냇물')||name.includes('폭포')){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#7dd3fc');g.addColorStop(1,'#38bdf8');c.fillStyle=g;rounded(c,x+6,y+8,w-12,h-14,Math.min(25,w*.18),true,false);c.strokeStyle='rgba(255,255,255,.5)';c.lineWidth=3;c.beginPath();c.arc(x+w*.45,y+h*.45,Math.min(w,h)*.18,0,Math.PI*1.2);c.stroke();return;}
    if(name.includes('산')||name.includes('언덕')){c.fillStyle=name.includes('산')?'#4d7c5e':'#6ca978';c.beginPath();c.moveTo(x+5,y+h-8);c.lineTo(x+w*.48,y+8);c.lineTo(x+w-6,y+h-8);c.closePath();c.fill();c.fillStyle='rgba(255,255,255,.65)';c.beginPath();c.moveTo(x+w*.48,y+8);c.lineTo(x+w*.35,y+h*.33);c.lineTo(x+w*.55,y+h*.27);c.lineTo(x+w*.65,y+h*.38);c.closePath();c.fill();return;}
    if(name.includes('꽃')||name.includes('튤립')){const colors=['#f472b6','#fb7185','#facc15','#a78bfa','#60a5fa'];for(let i=0;i<12;i++){const rx=x+12+(hash(item.id+i)%Math.max(12,w-24)),ry=y+12+(hash('y'+item.id+i)%Math.max(12,h-24));c.fillStyle=colors[i%colors.length];c.beginPath();c.arc(rx,ry,5,0,Math.PI*2);c.fill()}return;}
    if(name.includes('농장')||name.includes('과수원')){c.fillStyle='#d6b46a';rounded(c,x+5,y+7,w-10,h-12,10,true,false);c.strokeStyle='#8a6b2f';c.lineWidth=3;for(let yy=y+18;yy<y+h-8;yy+=16){c.beginPath();c.moveTo(x+10,yy);c.lineTo(x+w-10,yy);c.stroke()}return;}
    const sway=Math.sin(now/900+hash(item.id)*.01)*2;c.fillStyle='#8b5a2b';c.fillRect(x+w*.47,y+h*.42,Math.max(6,w*.08),h*.4);const canopy=name.includes('소나무')?'#16794c':name.includes('벚')?'#f9a8d4':name.includes('단풍')?'#f97316':'#34a36f';c.fillStyle=canopy;c.beginPath();c.arc(x+w*.5+sway,y+h*.35,Math.min(w,h)*.3,0,Math.PI*2);c.fill();c.fillStyle='rgba(255,255,255,.22)';c.beginPath();c.arc(x+w*.4+sway,y+h*.26,Math.min(w,h)*.11,0,Math.PI*2);c.fill();
  }

  function drawVehicle(c,p,item,now){
    const x=p.x,y=p.y,w=item.w*TILE,h=item.h*TILE,bob=Math.sin(now/650+hash(p.uid)*.01)*2;
    c.fillStyle='rgba(15,23,42,.16)';c.beginPath();c.ellipse(x+w*.5,y+h*.78,w*.38,h*.11,0,0,Math.PI*2);c.fill();
    if(item.special==='plane'||item.special==='aircraft'||item.special==='ship'){c.font=`${Math.max(28,Math.min(w,h)*.62)}px system-ui,"Apple Color Emoji","Segoe UI Emoji"`;c.textAlign='center';c.textBaseline='middle';c.fillText(item.icon,x+w/2,y+h/2+bob);return;}
    const color=['#ef4444','#3b82f6','#f59e0b','#10b981','#8b5cf6'][hash(item.id)%5];c.fillStyle=color;rounded(c,x+8,y+h*.28+bob,w-16,h*.42,Math.min(12,h*.15),true,false);c.fillStyle='#dbeafe';rounded(c,x+w*.28,y+h*.22+bob,w*.42,h*.2,7,true,false);c.fillStyle='#111827';c.beginPath();c.arc(x+w*.28,y+h*.72+bob,7,0,Math.PI*2);c.arc(x+w*.72,y+h*.72+bob,7,0,Math.PI*2);c.fill();
  }

  function drawRunway(c,p,item){const x=p.x,y=p.y,w=item.w*TILE,h=item.h*TILE;c.fillStyle='#5b6571';rounded(c,x+3,y+5,w-6,h-10,8,true,false);c.strokeStyle='#f8fafc';c.lineWidth=4;c.setLineDash([24,18]);c.beginPath();c.moveTo(x+18,y+h/2);c.lineTo(x+w-18,y+h/2);c.stroke();c.setLineDash([]);}

  function drawBuilding(c,p,item,alpha=1){
    const x=p.x,y=p.y,w=item.w*TILE,h=item.h*TILE;const pal=paletteFor(item);const tall=item.name.includes('고층')||item.name.includes('호텔')?Math.min(105,h*.48):item.name.includes('아파트')||item.name.includes('주상')?Math.min(78,h*.38):Math.min(52,h*.3);const depth=Math.max(10,Math.min(20,w*.08));const inset=Math.max(7,Math.min(16,w*.07));const bx=x+inset,by=y+inset+tall*.52,bw=w-inset*2-depth,bh=Math.max(32,h-inset*2-tall*.35);
    c.save();c.globalAlpha=alpha;c.fillStyle='rgba(15,23,42,.15)';c.beginPath();c.ellipse(x+w*.53,y+h*.88,w*.41,h*.11,0,0,Math.PI*2);c.fill();
    c.fillStyle=pal[1];c.beginPath();c.moveTo(bx+bw,by);c.lineTo(bx+bw+depth,by-depth*.6);c.lineTo(bx+bw+depth,by+bh-depth*.6);c.lineTo(bx+bw,by+bh);c.closePath();c.fill();
    c.fillStyle=pal[0];rounded(c,bx,by,bw,bh,Math.min(10,bw*.06),true,false);
    c.fillStyle=pal[2];c.beginPath();
    if(item.cat==='주거'&&!item.name.includes('아파트')&&!item.name.includes('주상')){c.moveTo(bx-3,by+5);c.lineTo(bx+bw*.5,by-tall*.55);c.lineTo(bx+bw+4,by+5);c.lineTo(bx+bw-depth*.18,by+17);c.lineTo(bx+bw*.5,by-tall*.32);c.lineTo(bx+depth*.18,by+17);c.closePath();c.fill();}
    else{c.moveTo(bx-2,by);c.lineTo(bx+depth,by-depth);c.lineTo(bx+bw+depth,by-depth);c.lineTo(bx+bw,by);c.closePath();c.fill();}
    const rows=Math.max(1,Math.floor(bh/32)),cols=Math.max(1,Math.floor(bw/34));c.fillStyle='rgba(125,211,252,.78)';for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){const ww=Math.min(12,bw/(cols*2.5)),wh=Math.min(14,bh/(rows*2.5));c.fillRect(bx+(col+1)*bw/(cols+1)-ww/2,by+16+r*(bh-22)/Math.max(1,rows)-wh/2,ww,wh)}
    if(item.cat==='상점'){c.fillStyle=pal[2];c.fillRect(bx+8,by+bh-19,bw-16,8)}
    if(item.special==='airport'||item.special==='terminal'){c.fillStyle='#e2e8f0';c.fillRect(bx+12,by+bh-25,bw-24,10)}
    c.restore();
  }

  function drawSpecial(c,p,item,now){
    if(item.cat==='자연')return drawNature(c,p,item,now);
    if(item.special==='runway')return drawRunway(c,p,item);
    if(['vehicle','train','plane','aircraft','ship'].includes(item.special))return drawVehicle(c,p,item,now);
    if(item.special==='parking'){const x=p.x,y=p.y,w=item.w*TILE,h=item.h*TILE;c.fillStyle='#64748b';rounded(c,x+4,y+5,w-8,h-10,8,true,false);c.strokeStyle='#f8fafc';c.lineWidth=3;for(let xx=x+22;xx<x+w-10;xx+=32){c.beginPath();c.moveTo(xx,y+15);c.lineTo(xx,y+h-15);c.stroke()}return;}
    if(item.special==='plaza'||item.special==='path'){const x=p.x,y=p.y,w=item.w*TILE,h=item.h*TILE;c.fillStyle=item.special==='path'?'#d6c6a5':'#d9d3c7';rounded(c,x+4,y+5,w-8,h-10,8,true,false);return;}
    drawBuilding(c,p,item,1);
  }

  function drawPreview(c){if(!hoverWorld)return;if(selectedItemId){const item=getItem(selectedItemId);if(!item)return;const x=Math.max(0,Math.min(MAP_SIZE-item.w*TILE,Math.round(hoverWorld.x/TILE)*TILE)),y=Math.max(0,Math.min(MAP_SIZE-item.h*TILE,Math.round(hoverWorld.y/TILE)*TILE));c.save();c.globalAlpha=.45;drawSpecial(c,{x,y,uid:'preview'},item,performance.now());c.restore();}else if(roadMode){const {gx,gy}=roadCellFromWorld(hoverWorld);c.fillStyle='rgba(255,255,255,.35)';c.fillRect(gx*TILE,gy*TILE,TILE,TILE)}}

  function draw(now=performance.now()) {
    if(!canvas||!ctx||document.getElementById('gameOpoongVillagePanel')?.hidden)return;resizeCanvas();const dpr=Math.min(2,window.devicePixelRatio||1),width=canvas.width/dpr,height=canvas.height/dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.save();ctx.scale(camera.zoom,camera.zoom);ctx.translate(-camera.x,-camera.y);drawTerrain(ctx);drawGrid(ctx,width,height);drawRoads(ctx);state.placed.slice().sort((a,b)=>(a.y+(getItem(a.itemId)?.h||1)*TILE)-(b.y+(getItem(b.itemId)?.h||1)*TILE)).forEach((p)=>{const item=getItem(p.itemId);if(item)drawSpecial(ctx,p,item,now)});drawPreview(ctx);ctx.strokeStyle='rgba(21,94,50,.25)';ctx.lineWidth=5/camera.zoom;ctx.strokeRect(0,0,MAP_SIZE,MAP_SIZE);ctx.restore();const hour=new Date().getHours();if(hour>=19||hour<6){ctx.fillStyle='rgba(15,23,42,.16)';ctx.fillRect(0,0,width,height)}
  }

  function startAnimation(){cancelAnimationFrame(anim);const loop=(now)=>{if(document.getElementById('gameOpoongVillagePanel')?.hidden)return;if(!lastFrame||now-lastFrame>90){draw(now);lastFrame=now}anim=requestAnimationFrame(loop)};anim=requestAnimationFrame(loop)}
  function stopAnimation(){cancelAnimationFrame(anim);anim=0}

  function clampCamera(){if(!canvas)return;const rect=canvas.getBoundingClientRect(),maxX=Math.max(0,MAP_SIZE-rect.width/camera.zoom),maxY=Math.max(0,MAP_SIZE-rect.height/camera.zoom);camera.x=Math.max(0,Math.min(maxX,camera.x));camera.y=Math.max(0,Math.min(maxY,camera.y))}
  function centerVillage(){if(state.placed.length){const avgX=state.placed.reduce((a,p)=>a+p.x,0)/state.placed.length,avgY=state.placed.reduce((a,p)=>a+p.y,0)/state.placed.length,rect=canvas?.getBoundingClientRect();camera.x=avgX-(rect?.width||700)/(2*camera.zoom);camera.y=avgY-(rect?.height||500)/(2*camera.zoom)}else{camera.x=MAP_SIZE/2-700;camera.y=MAP_SIZE/2-450}clampCamera();draw()}
  function zoomBy(mult,sx=null,sy=null){if(!canvas)return;const rect=canvas.getBoundingClientRect();sx=sx??rect.width/2;sy=sy??rect.height/2;const before=worldFromScreen(sx,sy);camera.zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,camera.zoom*mult));camera.x=before.x-sx/camera.zoom;camera.y=before.y-sy/camera.zoom;clampCamera();draw()}

  function bindCanvas(){
    canvas=document.getElementById('opoongVillageCanvas');if(!canvas||canvas.dataset.bound)return;canvas.dataset.bound='1';ctx=canvas.getContext('2d');
    canvas.addEventListener('pointerdown',(e)=>{canvas.setPointerCapture?.(e.pointerId);const rect=canvas.getBoundingClientRect(),w=worldFromScreen(e.clientX-rect.left,e.clientY-rect.top);hoverWorld=w;if(roadMode){roadLastCell=roadCellFromWorld(w);addRoadTile(roadLastCell.gx,roadLastCell.gy);saveState();updateHud();draw();pointer={id:e.pointerId,road:true,moved:true};return}pointer={id:e.pointerId,startX:e.clientX,startY:e.clientY,camX:camera.x,camY:camera.y,moved:false};});
    canvas.addEventListener('pointermove',(e)=>{const rect=canvas.getBoundingClientRect();hoverWorld=worldFromScreen(e.clientX-rect.left,e.clientY-rect.top);if(!pointer||pointer.id!==e.pointerId){draw();return}if(pointer.road){const cell=roadCellFromWorld(hoverWorld);if(!roadLastCell||cell.gx!==roadLastCell.gx||cell.gy!==roadLastCell.gy){roadLine(roadLastCell,cell);roadLastCell=cell}return}const dx=e.clientX-pointer.startX,dy=e.clientY-pointer.startY;if(Math.hypot(dx,dy)>7)pointer.moved=true;if(pointer.moved){camera.x=pointer.camX-dx/camera.zoom;camera.y=pointer.camY-dy/camera.zoom;clampCamera();draw()}});
    canvas.addEventListener('pointerup',(e)=>{if(!pointer||pointer.id!==e.pointerId)return;if(pointer.road){pointer=null;roadLastCell=null;saveState();updateHud();draw();return}const moved=pointer.moved;pointer=null;if(moved)return;const rect=canvas.getBoundingClientRect(),w=worldFromScreen(e.clientX-rect.left,e.clientY-rect.top);if(demolishMode)demolishAt(w.x,w.y);else if(selectedItemId)placeAt(w.x,w.y);else{const found=findPlacedAt(w.x,w.y);if(found)villageToast(`${found.item.icon} ${found.item.name} · 구매가 ${found.item.price.toLocaleString()} P`)}});
    canvas.addEventListener('pointercancel',()=>{pointer=null;roadLastCell=null});
    canvas.addEventListener('pointerleave',()=>{hoverWorld=null;draw()});
    canvas.addEventListener('wheel',(e)=>{e.preventDefault();const rect=canvas.getBoundingClientRect();zoomBy(e.deltaY<0?1.12:.89,e.clientX-rect.left,e.clientY-rect.top)},{passive:false});
    window.addEventListener('resize',()=>draw());
  }

  function updateHud(){const s=stats(),values={villageWallet:`${walletPoints().toLocaleString()} P`,villagePopulation:`${s.population.toLocaleString()}명`,villageHappiness:`${s.happiness}%`,villageBuildings:`${s.buildings}개`,villageRoads:`${s.roads}칸`};Object.entries(values).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v});const travel=document.getElementById('villageTravelBtn');if(travel){const ready=hasTravelHub();travel.classList.toggle('villageTravelReady',ready);travel.textContent=ready?'✈️ 해외여행 가능':'🔒 공항 + 비행기 필요'}const meta=document.getElementById('gameCardOpoongVillageMeta');if(meta)meta.textContent=`건물 ${s.buildings} · 도로 ${s.roads} · 인구 ${s.population.toLocaleString()}명`}

  function openTravel(){if(!hasTravelHub())return villageToast('해외여행을 하려면 오풍 국제공항과 비행기를 먼저 배치해야 해요.','bad');travelDestination=null;renderTravel();const back=document.getElementById('villageTravelBack');if(back)back.hidden=false}
  function closeTravel(){const back=document.getElementById('villageTravelBack');if(back)back.hidden=true;travelDestination=null}
  function renderTravel(){const modal=document.getElementById('villageTravelModal');if(!modal)return;if(travelDestination){const d=travelDestination;modal.innerHTML=`<div class="villageTravelHead"><b>오풍항공 여행</b><button class="smallbtn ghost" id="villageTravelClose" type="button">닫기</button></div><div class="villageTripScene"><div class="flag">${d.flag}</div><h3>${d.name}</h3><div class="scene">${d.scene}</div><p>${d.text}<br>여권에 ${d.flag} 도장이 찍혔어요.</p><button class="bigBtn" id="villageReturnHome" type="button">✈️ 오풍 마을로 돌아가기</button></div>`;document.getElementById('villageTravelClose')?.addEventListener('click',closeTravel);document.getElementById('villageReturnHome')?.addEventListener('click',closeTravel);return}const stamps=Object.entries(state.trips).map(([id,count])=>{const d=DESTINATIONS.find(x=>x.id===id);return d?`${d.flag} ${d.name} ×${count}`:''}).filter(Boolean).join(' · ')||'아직 여권 도장이 없어요.';modal.innerHTML=`<div class="villageTravelHead"><div><b>✈️ 오풍 국제공항</b><div class="muted" style="margin-top:4px">목적지를 골라 여행하세요.</div></div><button class="smallbtn ghost" id="villageTravelClose" type="button">닫기</button></div><div class="villageDestinations">${DESTINATIONS.map(d=>`<button class="villageDestination" type="button" data-destination="${d.id}"><div class="flag">${d.flag}</div><b>${d.name}</b><span>${d.price} P · 방문 ${state.trips[d.id]||0}회</span></button>`).join('')}</div><div class="villagePassport"><b>📘 오풍 여권</b><br>${stamps}</div>`;document.getElementById('villageTravelClose')?.addEventListener('click',closeTravel);modal.querySelectorAll('[data-destination]').forEach(b=>b.addEventListener('click',()=>travelTo(b.dataset.destination)))}
  function travelTo(id){const d=DESTINATIONS.find(x=>x.id===id);if(!d)return;if(!spendPoints(d.price,`${d.name} 항공권`)){updateHud();return}state.trips[id]=(state.trips[id]||0)+1;saveState();travelDestination=d;updateHud();renderTravel()}

  function openVillage(){try{baseStopActiveMiniGame?.()}catch(_){}document.querySelectorAll('#view-game .miniGamePanel').forEach(el=>{el.hidden=true});const hub=document.getElementById('gameHub');if(hub)hub.hidden=true;const panel=document.getElementById('gameOpoongVillagePanel');if(panel)panel.hidden=false;state=loadState();cancelBuild();renderCatalog();bindCanvas();updateHud();setTimeout(()=>{resizeCanvas();clampCamera();draw();startAnimation()},30);panel?.scrollIntoView({behavior:'smooth',block:'start'})}
  function wrapGameFunctions(){baseOpenMiniGame=window.openMiniGame;baseShowMiniGameHub=window.showMiniGameHub;baseStopActiveMiniGame=window.stopActiveMiniGame;if(typeof baseOpenMiniGame!=='function')return false;window.openMiniGame=function(game){if(game==='opoong-village')return openVillage();stopAnimation();return baseOpenMiniGame.apply(this,arguments)};if(typeof baseShowMiniGameHub==='function')window.showMiniGameHub=function(){stopAnimation();const r=baseShowMiniGameHub.apply(this,arguments);const p=document.getElementById('gameOpoongVillagePanel');if(p)p.hidden=true;return r};if(typeof baseStopActiveMiniGame==='function')window.stopActiveMiniGame=function(){stopAnimation();return baseStopActiveMiniGame.apply(this,arguments)};return true}
  function install(){if(installed)return;if(typeof window.openMiniGame!=='function'||!document.querySelector('#gameHub .gameCardGrid')){setTimeout(install,120);return}installed=true;injectStyles();addCard();addPanel();renderCatalog();wrapGameFunctions();updateHud();if(ITEMS.length!==100)console.warn('O.Poong Village item count:',ITEMS.length)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();