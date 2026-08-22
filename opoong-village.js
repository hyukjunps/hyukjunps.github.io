(() => {
  'use strict';

  const SAVE_KEY = 'opoong_village_v1';
  const MAP_SIZE = 6000;
  const TILE = 50;
  const MIN_ZOOM = .25;
  const MAX_ZOOM = 1.55;

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
      ['직선 도로','🛣️',3,1,'road'],['곡선 도로','↪️',2,2,'road'],['다리','🌉',4,1,'bridge'],['터널','🚇',3,2,'tunnel'],['주차장','🅿️',4,3,'parking']
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

  let installed = false;
  let baseOpenMiniGame = null;
  let baseShowMiniGameHub = null;
  let baseStopActiveMiniGame = null;
  let state = loadState();
  let selectedItemId = '';
  let demolishMode = false;
  let canvas = null;
  let ctx = null;
  let camera = { x:MAP_SIZE/2 - 700, y:MAP_SIZE/2 - 450, zoom:.55 };
  let pointer = null;
  let anim = 0;
  let lastFrame = 0;
  let travelDestination = null;

  function defaultState() {
    return { placed:[], trips:{}, createdAt:Date.now() };
  }

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!parsed || !Array.isArray(parsed.placed)) return defaultState();
      parsed.trips = parsed.trips && typeof parsed.trips === 'object' ? parsed.trips : {};
      return parsed;
    } catch (_) { return defaultState(); }
  }

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (_) {}
  }

  function getItem(id) { return ITEMS.find((item) => item.id === id) || null; }

  function walletPoints() {
    try {
      if (typeof window.loadOpoongRewards === 'function') return Math.max(0, Number(window.loadOpoongRewards().points) || 0);
    } catch (_) {}
    return 0;
  }

  function spendPoints(price, label) {
    try {
      if (typeof window.shopSpend === 'function') return !!window.shopSpend(price, label);
    } catch (_) {}
    villageToast('O.Poong 포인트 지갑을 불러오지 못했어요.', 'bad');
    return false;
  }

  function refundPoints(amount, label) {
    try { if (typeof window.awardOpoongPoints === 'function') window.awardOpoongPoints(amount, label); } catch (_) {}
  }

  function stats() {
    let homes = 0, nature = 0, fun = 0, transport = 0;
    state.placed.forEach((p) => {
      const item = getItem(p.itemId); if (!item) return;
      if (item.cat === '주거') homes++;
      if (item.cat === '자연') nature++;
      if (item.cat === '놀이') fun++;
      if (item.cat === '교통') transport++;
    });
    return {
      population: homes * 12 + Math.max(0, state.placed.filter((p) => getItem(p.itemId)?.name === '아파트').length * 48),
      happiness: Math.min(100, 35 + nature * 2 + fun * 4 + Math.floor(state.placed.length / 8)),
      buildings: state.placed.length,
      transport
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
      .coverOpoongVillage{position:relative;overflow:hidden;background:linear-gradient(180deg,#bae6fd 0 42%,#86efac 42% 100%)}
      .coverOpoongVillage::before{content:'🏡';position:absolute;left:16%;bottom:12%;font-size:48px;filter:drop-shadow(0 8px 8px rgba(15,23,42,.18))}
      .coverOpoongVillage::after{content:'✈️';position:absolute;right:13%;top:13%;font-size:32px;transform:rotate(-12deg)}
      .villageTop{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px;margin-bottom:10px}
      .villageStat{padding:10px 8px;border:1px solid var(--line);border-radius:16px;background:var(--card);text-align:center}.villageStat span{display:block;color:var(--muted);font-size:10.5px;font-weight:900}.villageStat strong{display:block;margin-top:4px;font-size:17px}
      .villageToolbar{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin-bottom:10px}.villageToolbar .smallbtn.active{color:#fff;background:linear-gradient(135deg,var(--pri),var(--pri2));border-color:transparent}.villageToolbar .villageTravelReady{background:linear-gradient(135deg,#059669,#10b981);color:#fff;border:0}
      .villageWorkspace{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:10px;align-items:stretch}
      .villageMapWrap{position:relative;min-height:560px;border:1px solid var(--line);border-radius:24px;overflow:hidden;background:#bbf7d0;box-shadow:inset 0 0 0 1px rgba(255,255,255,.42)}
      #opoongVillageCanvas{display:block;width:100%;height:100%;min-height:560px;touch-action:none;cursor:grab}.villageBuild #opoongVillageCanvas{cursor:crosshair}.villageDemolish #opoongVillageCanvas{cursor:not-allowed}
      .villageMapBadge{position:absolute;left:12px;top:12px;padding:8px 10px;border-radius:999px;background:rgba(15,23,42,.78);color:#fff;font-size:11px;font-weight:900;backdrop-filter:blur(8px);pointer-events:none}
      .villageSide{min-height:560px;border:1px solid var(--line);border-radius:24px;background:var(--card);padding:12px;display:flex;flex-direction:column;overflow:hidden}
      .villageSideHead{display:flex;justify-content:space-between;align-items:center;gap:8px}.villageSideHead b{font-size:17px}.villageSelected{margin-top:8px;min-height:42px;padding:10px;border-radius:14px;background:color-mix(in srgb,var(--pri) 7%,var(--card));border:1px solid var(--line);font-size:11px;font-weight:850;line-height:1.45;color:var(--muted)}
      .villageCats{display:flex;gap:6px;overflow:auto;padding:8px 0;scrollbar-width:none}.villageCats::-webkit-scrollbar{display:none}.villageCat{border:1px solid var(--line);border-radius:999px;background:var(--card2);padding:7px 9px;font-size:10.5px;font-weight:900;white-space:nowrap}.villageCat.active{color:#fff;background:var(--pri);border-color:var(--pri)}
      .villageCatalog{display:grid;grid-template-columns:1fr 1fr;gap:7px;overflow:auto;max-height:430px;padding-right:2px}.villageItem{border:1px solid var(--line);border-radius:15px;background:var(--card2);padding:9px 7px;text-align:center;color:var(--text);min-height:92px;transition:.13s ease}.villageItem:hover{transform:translateY(-2px)}.villageItem.selected{border-color:var(--pri2);box-shadow:0 0 0 3px color-mix(in srgb,var(--pri2) 14%,transparent)}.villageItem i{display:block;font-style:normal;font-size:28px}.villageItem b{display:block;margin-top:4px;font-size:10.5px;line-height:1.25}.villageItem span{display:block;margin-top:4px;color:var(--muted);font-size:10px;font-weight:850}
      .villageToast{position:absolute;left:50%;bottom:18px;transform:translateX(-50%) translateY(12px);max-width:min(88%,520px);padding:11px 14px;border-radius:16px;background:rgba(15,23,42,.9);color:#fff;font-size:12px;font-weight:900;text-align:center;opacity:0;pointer-events:none;transition:.2s ease;z-index:3}.villageToast.show{opacity:1;transform:translateX(-50%) translateY(0)}.villageToast.bad{background:rgba(153,27,27,.94)}.villageToast.good{background:rgba(4,120,87,.94)}
      .villageTravelBack{position:fixed;inset:0;z-index:260;background:rgba(7,17,31,.62);backdrop-filter:blur(8px);display:grid;place-items:center;padding:18px}.villageTravelBack[hidden]{display:none!important}.villageTravelModal{width:min(760px,96vw);max-height:88vh;overflow:auto;border-radius:28px;background:var(--card);border:1px solid var(--line);box-shadow:0 30px 90px rgba(0,0,0,.28);padding:18px}.villageTravelHead{display:flex;align-items:center;justify-content:space-between;gap:10px}.villageDestinations{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-top:14px}.villageDestination{padding:14px 10px;border:1px solid var(--line);border-radius:18px;background:var(--card2);text-align:center}.villageDestination .flag{font-size:30px}.villageDestination b{display:block;margin-top:5px;font-size:12px}.villageDestination span{display:block;margin-top:4px;color:var(--muted);font-size:10.5px;font-weight:850}.villagePassport{margin-top:14px;padding:13px;border-radius:18px;border:1px dashed var(--line);background:color-mix(in srgb,var(--pri) 4%,var(--card));font-size:11px;font-weight:850;line-height:1.6}.villageTripScene{text-align:center;padding:28px 10px}.villageTripScene .flag{font-size:46px}.villageTripScene .scene{margin:20px 0;font-size:clamp(44px,9vw,80px);letter-spacing:10px}.villageTripScene h3{margin:8px 0 0;font-size:25px}.villageTripScene p{color:var(--muted);font-weight:800;line-height:1.7}
      @media(max-width:900px){.villageWorkspace{grid-template-columns:1fr}.villageSide{min-height:0}.villageCatalog{max-height:330px;grid-template-columns:repeat(3,1fr)}.villageMapWrap,#opoongVillageCanvas{min-height:480px}}
      @media(max-width:620px){.villageTop{grid-template-columns:1fr 1fr}.villageTop .villageStat:last-child{grid-column:1/-1}.villageCatalog{grid-template-columns:1fr 1fr}.villageDestinations{grid-template-columns:1fr 1fr}.villageMapWrap,#opoongVillageCanvas{min-height:430px}}
    `;
    document.head.appendChild(style);
  }

  function addCard() {
    const grid = document.querySelector('#gameHub .gameCardGrid');
    if (!grid || document.getElementById('gameCardOpoongVillage')) return;
    const button = document.createElement('button');
    button.className = 'gameCard'; button.type = 'button'; button.id = 'gameCardOpoongVillage';
    button.innerHTML = `<span class="gameCover coverOpoongVillage"></span><span class="gameCardInfo"><b>오풍 마을</b><span id="gameCardOpoongVillageMeta">내 마을을 계속 가꾸기</span></span>`;
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
        <div class="villageStat"><span>설치 아이템</span><strong id="villageBuildings">0개</strong></div>
        <div class="villageStat"><span>여권 도장</span><strong id="villageTrips">0개</strong></div>
      </div>
      <div class="villageToolbar">
        <button class="smallbtn ghost" id="villageShopBtn" type="button">🏗️ 건설 상점</button>
        <button class="smallbtn ghost" id="villageDemolishBtn" type="button">🚜 철거</button>
        <button class="smallbtn ghost" id="villageCancelBtn" type="button">✋ 배치 종료</button>
        <button class="smallbtn ghost" id="villageCenterBtn" type="button">🎯 마을 중심</button>
        <button class="smallbtn ghost" id="villageZoomOut" type="button">－</button>
        <button class="smallbtn ghost" id="villageZoomIn" type="button">＋</button>
        <button class="smallbtn ghost" id="villageTravelBtn" type="button">✈️ 해외여행</button>
      </div>
      <div class="villageWorkspace">
        <div class="villageMapWrap" id="villageMapWrap">
          <canvas id="opoongVillageCanvas" width="1200" height="760" aria-label="오풍 마을 건설 지도"></canvas>
          <div class="villageMapBadge">6000 × 6000 초대형 마을 · 드래그 이동 · 휠/버튼 줌</div>
          <div class="villageToast" id="villageToast"></div>
        </div>
        <aside class="villageSide" id="villageSide">
          <div class="villageSideHead"><b>건설 상점</b><span class="pill">100 ITEMS</span></div>
          <div class="villageSelected" id="villageSelected">아이템을 선택한 뒤 지도에서 원하는 위치를 누르세요. 배치할 때 포인트가 차감됩니다.</div>
          <div class="villageCats" id="villageCats"></div>
          <div class="villageCatalog" id="villageCatalog"></div>
        </aside>
      </div>
      <div class="villageTravelBack" id="villageTravelBack" hidden>
        <div class="villageTravelModal" id="villageTravelModal"></div>
      </div>`;
    if (anchor?.parentNode) anchor.parentNode.insertBefore(panel, anchor); else gameView.appendChild(panel);

    document.getElementById('villageCancelBtn')?.addEventListener('click', cancelBuild);
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

  function selectItem(id) {
    const item = getItem(id); if (!item) return;
    selectedItemId = id; demolishMode = false;
    document.getElementById('gameOpoongVillagePanel')?.classList.add('villageBuild');
    document.getElementById('gameOpoongVillagePanel')?.classList.remove('villageDemolish');
    const d = document.getElementById('villageDemolishBtn'); if (d) d.classList.remove('active');
    const selected = document.getElementById('villageSelected');
    if (selected) selected.textContent = `${item.icon} ${item.name} · ${item.price.toLocaleString()} P · 지도에서 배치할 위치를 눌러주세요.`;
    renderCatalog();
  }

  function cancelBuild() {
    selectedItemId = ''; demolishMode = false;
    const panel = document.getElementById('gameOpoongVillagePanel'); panel?.classList.remove('villageBuild','villageDemolish');
    const d = document.getElementById('villageDemolishBtn'); if (d) d.classList.remove('active');
    const selected = document.getElementById('villageSelected'); if (selected) selected.textContent = '둘러보기 모드 · 지도를 드래그해서 이동하세요.';
    renderCatalog();
  }

  function toggleDemolish() {
    demolishMode = !demolishMode; selectedItemId = '';
    const panel = document.getElementById('gameOpoongVillagePanel');
    panel?.classList.toggle('villageDemolish', demolishMode); panel?.classList.remove('villageBuild');
    const btn = document.getElementById('villageDemolishBtn'); btn?.classList.toggle('active', demolishMode);
    const selected = document.getElementById('villageSelected'); if (selected) selected.textContent = demolishMode ? '철거 모드 · 지도에서 없앨 아이템을 누르세요. 구매가의 50%가 환급됩니다.' : '둘러보기 모드';
    renderCatalog();
  }

  let toastTimer = 0;
  function villageToast(message, kind = '') {
    const el = document.getElementById('villageToast'); if (!el) return;
    clearTimeout(toastTimer); el.textContent = message; el.className = `villageToast show${kind ? ' ' + kind : ''}`;
    toastTimer = setTimeout(() => { el.className = 'villageToast'; }, 2200);
  }

  function worldFromScreen(sx, sy) {
    return { x:camera.x + sx / camera.zoom, y:camera.y + sy / camera.zoom };
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
    const x = Math.max(0, Math.min(MAP_SIZE - item.w * TILE, Math.round(worldX / TILE) * TILE));
    const y = Math.max(0, Math.min(MAP_SIZE - item.h * TILE, Math.round(worldY / TILE) * TILE));
    if (overlaps(x, y, item)) { villageToast('다른 아이템과 겹쳐요. 다른 곳에 배치해 주세요.', 'bad'); return; }
    if (!spendPoints(item.price, item.name)) { updateHud(); villageToast(`${item.name}을(를) 살 포인트가 부족해요.`, 'bad'); return; }
    state.placed.push({ uid:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`, itemId:item.id, x, y, placedAt:Date.now() });
    saveState(); updateHud(); draw(performance.now());
    villageToast(`${item.icon} ${item.name} 건설 완료 · -${item.price.toLocaleString()} P`, 'good');
  }

  function findPlacedAt(worldX, worldY) {
    for (let i = state.placed.length - 1; i >= 0; i--) {
      const p = state.placed[i], item = getItem(p.itemId); if (!item) continue;
      if (worldX >= p.x && worldX <= p.x + item.w*TILE && worldY >= p.y && worldY <= p.y + item.h*TILE) return { p, item, index:i };
    }
    return null;
  }

  function demolishAt(worldX, worldY) {
    const found = findPlacedAt(worldX, worldY); if (!found) { villageToast('철거할 아이템이 없어요.'); return; }
    const refund = Math.floor(found.item.price * .5);
    state.placed.splice(found.index, 1); saveState();
    if (refund > 0) refundPoints(refund, `오풍 마을 ${found.item.name} 철거 환급`);
    updateHud(); villageToast(`${found.item.name} 철거 · ${refund.toLocaleString()} P 환급`, 'good');
  }

  function resizeCanvas() {
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(320, Math.floor(rect.width * dpr)), h = Math.max(380, Math.floor(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function drawGrid(c, width, height) {
    const z = camera.zoom;
    const startX = Math.floor(camera.x / TILE) * TILE, endX = camera.x + width / z;
    const startY = Math.floor(camera.y / TILE) * TILE, endY = camera.y + height / z;
    c.strokeStyle = 'rgba(22,101,52,.10)'; c.lineWidth = 1 / z;
    c.beginPath();
    for (let x = startX; x <= endX; x += TILE) { c.moveTo(x, camera.y); c.lineTo(x, endY); }
    for (let y = startY; y <= endY; y += TILE) { c.moveTo(camera.x, y); c.lineTo(endX, y); }
    c.stroke();
  }

  function drawTerrain(c) {
    c.fillStyle = '#bbf7d0'; c.fillRect(0,0,MAP_SIZE,MAP_SIZE);
    c.fillStyle = 'rgba(250,204,21,.12)';
    for (let x=250; x<MAP_SIZE; x+=700) for (let y=350; y<MAP_SIZE; y+=820) c.fillRect(x,y,260,180);
    c.fillStyle = 'rgba(56,189,248,.14)';
    c.beginPath(); c.ellipse(5050,850,580,340,0,0,Math.PI*2); c.fill();
    c.fillStyle = 'rgba(34,197,94,.14)';
    c.beginPath(); c.ellipse(950,5000,700,420,0,0,Math.PI*2); c.fill();
    c.strokeStyle = 'rgba(15,118,110,.22)'; c.lineWidth = 90; c.lineCap = 'round';
    c.beginPath(); c.moveTo(3750,-100); c.bezierCurveTo(3300,1500,4200,3300,3550,6100); c.stroke();
  }

  function drawItem(c, placed, item, now) {
    const px = placed.x, py = placed.y, w = item.w*TILE, h = item.h*TILE;
    const vehicle = ['vehicle','train','plane','aircraft','ship'].includes(item.special);
    const bob = vehicle ? Math.sin(now/600 + placed.x*.01 + placed.y*.005) * 4 : 0;
    c.fillStyle = item.special === 'road' ? 'rgba(71,85,105,.72)' : 'rgba(255,255,255,.68)';
    c.beginPath(); if (c.roundRect) c.roundRect(px+4,py+4,w-8,h-8,Math.min(16,w*.12)); else c.rect(px+4,py+4,w-8,h-8); c.fill();
    if (item.special === 'road' || item.special === 'runway') {
      c.fillStyle = item.special === 'runway' ? '#64748b' : '#475569'; c.fillRect(px+5,py+h*.22,w-10,h*.56);
      c.strokeStyle = '#f8fafc'; c.lineWidth = 3; c.setLineDash([15,12]); c.beginPath(); c.moveTo(px+12,py+h/2); c.lineTo(px+w-12,py+h/2); c.stroke(); c.setLineDash([]);
    }
    c.font = `${Math.max(24,Math.min(w,h)*.48)}px system-ui,"Apple Color Emoji","Segoe UI Emoji"`; c.textAlign='center'; c.textBaseline='middle';
    c.fillStyle='#0f172a'; c.fillText(item.icon, px+w/2, py+h/2-5+bob);
    if (camera.zoom > .42 && w >= 90) {
      c.font = `900 ${Math.max(10,13/camera.zoom)}px system-ui,"Noto Sans KR",sans-serif`; c.fillStyle='rgba(15,23,42,.86)';
      c.fillText(item.name, px+w/2, py+h-12);
    }
  }

  function draw(now = performance.now()) {
    if (!canvas || !ctx || document.getElementById('gameOpoongVillagePanel')?.hidden) return;
    resizeCanvas();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.width / dpr, height = canvas.height / dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,width,height);
    ctx.save(); ctx.scale(camera.zoom,camera.zoom); ctx.translate(-camera.x,-camera.y);
    drawTerrain(ctx); drawGrid(ctx,width,height);
    state.placed.slice().sort((a,b) => a.y-b.y).forEach((p) => { const item=getItem(p.itemId); if(item) drawItem(ctx,p,item,now); });
    ctx.strokeStyle='rgba(22,101,52,.42)'; ctx.lineWidth=6/camera.zoom; ctx.strokeRect(0,0,MAP_SIZE,MAP_SIZE);
    ctx.restore();
    const hour = new Date().getHours(); if (hour >= 19 || hour < 6) { ctx.fillStyle='rgba(15,23,42,.20)'; ctx.fillRect(0,0,width,height); }
  }

  function startAnimation() {
    cancelAnimationFrame(anim);
    const loop = (now) => { if (document.getElementById('gameOpoongVillagePanel')?.hidden) return; if (!lastFrame || now-lastFrame>80) { draw(now); lastFrame=now; } anim=requestAnimationFrame(loop); };
    anim=requestAnimationFrame(loop);
  }

  function stopAnimation() { cancelAnimationFrame(anim); anim=0; }

  function clampCamera() {
    if (!canvas) return;
    const rect=canvas.getBoundingClientRect(); const maxX=Math.max(0,MAP_SIZE-rect.width/camera.zoom), maxY=Math.max(0,MAP_SIZE-rect.height/camera.zoom);
    camera.x=Math.max(0,Math.min(maxX,camera.x)); camera.y=Math.max(0,Math.min(maxY,camera.y));
  }

  function centerVillage() {
    if (state.placed.length) {
      const avgX=state.placed.reduce((a,p)=>a+p.x,0)/state.placed.length, avgY=state.placed.reduce((a,p)=>a+p.y,0)/state.placed.length;
      const rect=canvas?.getBoundingClientRect(); camera.x=avgX-(rect?.width||700)/(2*camera.zoom); camera.y=avgY-(rect?.height||500)/(2*camera.zoom);
    } else { camera.x=MAP_SIZE/2-700; camera.y=MAP_SIZE/2-450; }
    clampCamera(); draw();
  }

  function zoomBy(mult, sx=null, sy=null) {
    if (!canvas) return;
    const rect=canvas.getBoundingClientRect(); sx=sx??rect.width/2; sy=sy??rect.height/2;
    const before=worldFromScreen(sx,sy); camera.zoom=Math.max(MIN_ZOOM,Math.min(MAX_ZOOM,camera.zoom*mult)); camera.x=before.x-sx/camera.zoom; camera.y=before.y-sy/camera.zoom; clampCamera(); draw();
  }

  function bindCanvas() {
    canvas=document.getElementById('opoongVillageCanvas'); if(!canvas||canvas.dataset.bound)return; canvas.dataset.bound='1'; ctx=canvas.getContext('2d');
    canvas.addEventListener('pointerdown',(e)=>{ canvas.setPointerCapture?.(e.pointerId); pointer={id:e.pointerId,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,camX:camera.x,camY:camera.y,moved:false}; });
    canvas.addEventListener('pointermove',(e)=>{ if(!pointer||pointer.id!==e.pointerId)return; const dx=e.clientX-pointer.startX,dy=e.clientY-pointer.startY; if(Math.hypot(dx,dy)>7)pointer.moved=true; if(pointer.moved){camera.x=pointer.camX-dx/camera.zoom;camera.y=pointer.camY-dy/camera.zoom;clampCamera();draw();} });
    canvas.addEventListener('pointerup',(e)=>{ if(!pointer||pointer.id!==e.pointerId)return; const moved=pointer.moved; pointer=null; if(moved)return; const rect=canvas.getBoundingClientRect(),w=worldFromScreen(e.clientX-rect.left,e.clientY-rect.top); if(demolishMode)demolishAt(w.x,w.y); else if(selectedItemId)placeAt(w.x,w.y); else { const found=findPlacedAt(w.x,w.y); if(found)villageToast(`${found.item.icon} ${found.item.name} · 구매가 ${found.item.price.toLocaleString()} P`); } });
    canvas.addEventListener('wheel',(e)=>{e.preventDefault();const rect=canvas.getBoundingClientRect();zoomBy(e.deltaY<0?1.12:.89,e.clientX-rect.left,e.clientY-rect.top);},{passive:false});
    window.addEventListener('resize',()=>draw());
  }

  function updateHud() {
    const s=stats();
    const values={villageWallet:`${walletPoints().toLocaleString()} P`,villagePopulation:`${s.population.toLocaleString()}명`,villageHappiness:`${s.happiness}%`,villageBuildings:`${s.buildings}개`,villageTrips:`${Object.keys(state.trips).length}개`};
    Object.entries(values).forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});
    const travel=document.getElementById('villageTravelBtn'); if(travel){const ready=hasTravelHub();travel.classList.toggle('villageTravelReady',ready);travel.textContent=ready?'✈️ 해외여행 가능':'🔒 공항 + 비행기 필요';}
    const meta=document.getElementById('gameCardOpoongVillageMeta');if(meta)meta.textContent=`${s.buildings}개 설치 · 인구 ${s.population.toLocaleString()}명`;
  }

  function openTravel() {
    if (!hasTravelHub()) { villageToast('해외여행을 하려면 오풍 국제공항과 비행기를 먼저 마을에 배치해야 해요.', 'bad'); return; }
    travelDestination=null; renderTravel(); const back=document.getElementById('villageTravelBack'); if(back)back.hidden=false;
  }

  function closeTravel(){const back=document.getElementById('villageTravelBack');if(back)back.hidden=true;travelDestination=null;}

  function renderTravel() {
    const modal=document.getElementById('villageTravelModal');if(!modal)return;
    if(travelDestination){const d=travelDestination;modal.innerHTML=`<div class="villageTravelHead"><b>오풍항공 여행</b><button class="smallbtn ghost" id="villageTravelClose" type="button">닫기</button></div><div class="villageTripScene"><div class="flag">${d.flag}</div><h3>${d.name}</h3><div class="scene">${d.scene}</div><p>${d.text}<br>여권에 ${d.flag} 도장이 찍혔어요.</p><button class="bigBtn" id="villageReturnHome" type="button">✈️ 오풍 마을로 돌아가기</button></div>`;document.getElementById('villageTravelClose')?.addEventListener('click',closeTravel);document.getElementById('villageReturnHome')?.addEventListener('click',closeTravel);return;}
    const stamps=Object.entries(state.trips).map(([id,count])=>{const d=DESTINATIONS.find(x=>x.id===id);return d?`${d.flag} ${d.name} ×${count}`:'';}).filter(Boolean).join(' · ')||'아직 여권 도장이 없어요.';
    modal.innerHTML=`<div class="villageTravelHead"><div><b>✈️ 오풍 국제공항</b><div class="muted" style="margin-top:4px">목적지를 골라 여행하세요. 항공권은 O.Poong P로 결제됩니다.</div></div><button class="smallbtn ghost" id="villageTravelClose" type="button">닫기</button></div><div class="villageDestinations">${DESTINATIONS.map(d=>`<button class="villageDestination" type="button" data-destination="${d.id}"><div class="flag">${d.flag}</div><b>${d.name}</b><span>${d.price} P · 방문 ${state.trips[d.id]||0}회</span></button>`).join('')}</div><div class="villagePassport"><b>📘 오풍 여권</b><br>${stamps}</div>`;
    document.getElementById('villageTravelClose')?.addEventListener('click',closeTravel);modal.querySelectorAll('[data-destination]').forEach(b=>b.addEventListener('click',()=>travelTo(b.dataset.destination)));
  }

  function travelTo(id) {
    const d=DESTINATIONS.find(x=>x.id===id);if(!d)return;if(!spendPoints(d.price,`${d.name} 항공권`)){updateHud();return;}
    state.trips[id]=(state.trips[id]||0)+1;saveState();travelDestination=d;updateHud();renderTravel();
  }

  function openVillage() {
    try{baseStopActiveMiniGame?.();}catch(_){}
    document.querySelectorAll('#view-game .miniGamePanel').forEach(el=>{el.hidden=true;}); const hub=document.getElementById('gameHub');if(hub)hub.hidden=true;
    const panel=document.getElementById('gameOpoongVillagePanel');if(panel)panel.hidden=false;
    state=loadState();cancelBuild();renderCatalog();bindCanvas();updateHud();setTimeout(()=>{resizeCanvas();clampCamera();draw();startAnimation();},30);panel?.scrollIntoView({behavior:'smooth',block:'start'});
  }

  function wrapGameFunctions() {
    baseOpenMiniGame=window.openMiniGame;baseShowMiniGameHub=window.showMiniGameHub;baseStopActiveMiniGame=window.stopActiveMiniGame;if(typeof baseOpenMiniGame!=='function')return false;
    window.openMiniGame=function(game){if(game==='opoong-village')return openVillage();stopAnimation();return baseOpenMiniGame.apply(this,arguments);};
    if(typeof baseShowMiniGameHub==='function')window.showMiniGameHub=function(){stopAnimation();const r=baseShowMiniGameHub.apply(this,arguments);const p=document.getElementById('gameOpoongVillagePanel');if(p)p.hidden=true;return r;};
    if(typeof baseStopActiveMiniGame==='function')window.stopActiveMiniGame=function(){stopAnimation();return baseStopActiveMiniGame.apply(this,arguments);};
    return true;
  }

  function install() {
    if(installed)return;if(typeof window.openMiniGame!=='function'||!document.querySelector('#gameHub .gameCardGrid')){setTimeout(install,120);return;}
    installed=true;injectStyles();addCard();addPanel();renderCatalog();wrapGameFunctions();updateHud();
    if(ITEMS.length!==100)console.warn('O.Poong Village item count:',ITEMS.length);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
