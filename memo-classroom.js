(function(){
  'use strict';

  const MEMO_KEY = 'opoong_home_memo_v1';
  const CLASSROOM_URL = 'https://classroom.google.com/';

  function qs(sel, root=document){ return root.querySelector(sel); }

  function injectStyles(){
    if(qs('#opoongMemoClassroomStyle')) return;
    const style = document.createElement('style');
    style.id = 'opoongMemoClassroomStyle';
    style.textContent = `
      .homeDashboardWidgets .widget[data-home-widget="memo"]{
        grid-column:1 / -1!important;
        min-height:190px!important;
        height:auto!important;
        display:flex!important;
        flex-direction:column!important;
      }
      .homeDashboardWidgets .widget[data-home-widget="memo"] .widgetBody{
        max-height:none!important;
        overflow:visible!important;
      }
      .opoongMemoWrap{display:flex;flex-direction:column;gap:9px;min-height:118px}
      .opoongMemoInput{
        width:100%;min-height:112px;resize:vertical;padding:13px 14px;
        border:1px solid var(--line);border-radius:17px;
        background:color-mix(in srgb,var(--card) 96%,var(--bg));color:var(--text);
        font:inherit;font-weight:750;line-height:1.65;outline:none;
      }
      .opoongMemoInput:focus{border-color:color-mix(in srgb,var(--pri) 55%,var(--line));box-shadow:0 0 0 4px color-mix(in srgb,var(--pri) 10%,transparent)}
      .opoongMemoMeta{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;color:var(--muted);font-size:11.5px;font-weight:850}
      .opoongMemoActions{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .opoongMemoSaved{color:var(--ok);font-weight:950}
      .opoongMemoCount{font-variant-numeric:tabular-nums}
      @media(max-width:760px){
        .homeDashboardWidgets .widget[data-home-widget="memo"]{grid-column:1 / -1!important;grid-row:auto!important}
      }
    `;
    document.head.appendChild(style);
  }

  function insertClassroomMenu(){
    const nav = qs('.sideNav .navGrid');
    if(!nav || qs('[data-opoong-classroom]')) return;
    const policy = qs('[data-view="policy"]', nav);
    const link = document.createElement('a');
    link.className = 'navBtn';
    link.href = CLASSROOM_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.setAttribute('data-opoong-classroom','1');
    link.innerHTML = '<span class="left"><span class="icon">클</span><span><span class="title">Google Classroom</span><br><span class="hint">수업·과제 바로가기</span></span></span><span>↗</span>';
    if(policy) nav.insertBefore(link, policy); else nav.appendChild(link);
  }

  function loadMemo(){
    try{return localStorage.getItem(MEMO_KEY) || '';}catch(_){return '';}
  }
  function saveMemo(value){
    try{localStorage.setItem(MEMO_KEY, value);}catch(_){}
  }

  function insertMemoWidget(){
    const widgets = qs('.homeDashboardWidgets');
    if(!widgets || qs('[data-home-widget="memo"]', widgets)) return;

    const widget = document.createElement('div');
    widget.className = 'widget';
    widget.setAttribute('data-home-widget','memo');
    widget.innerHTML = `
      <div class="widgetHead">
        <b>메모</b>
        <span class="pill" id="opoongMemoStatus">자동 저장</span>
      </div>
      <div class="widgetBody">
        <div class="opoongMemoWrap">
          <textarea id="opoongMemoInput" class="opoongMemoInput" maxlength="1000" placeholder="잊기 전에 적어두세요. 이 기기에만 저장됩니다." aria-label="O.Poong 메모"></textarea>
          <div class="opoongMemoMeta">
            <span id="opoongMemoSaved" class="opoongMemoSaved">저장됨</span>
            <span class="opoongMemoActions">
              <span id="opoongMemoCount" class="opoongMemoCount">0 / 1000</span>
              <button id="opoongMemoClear" class="smallbtn ghost" type="button">메모 지우기</button>
            </span>
          </div>
        </div>
      </div>`;

    widgets.appendChild(widget);

    const input = qs('#opoongMemoInput');
    const saved = qs('#opoongMemoSaved');
    const count = qs('#opoongMemoCount');
    const clear = qs('#opoongMemoClear');
    if(!input) return;

    input.value = loadMemo();
    function updateCount(){ if(count) count.textContent = input.value.length + ' / 1000'; }
    updateCount();

    let timer = 0;
    input.addEventListener('input', function(){
      updateCount();
      if(saved){ saved.textContent = '저장 중…'; saved.style.color = 'var(--muted)'; }
      clearTimeout(timer);
      timer = setTimeout(function(){
        saveMemo(input.value);
        if(saved){ saved.textContent = '저장됨'; saved.style.color = 'var(--ok)'; }
      }, 250);
    });

    clear?.addEventListener('click', function(){
      if(!input.value) return;
      if(!confirm('메모 내용을 모두 지울까요?')) return;
      input.value = '';
      saveMemo('');
      updateCount();
      if(saved){ saved.textContent = '저장됨'; saved.style.color = 'var(--ok)'; }
      input.focus();
    });
  }

  function augmentSearch(){
    try{
      if(Array.isArray(window.GLOBAL_SEARCH_STATIC)){
        const exists = window.GLOBAL_SEARCH_STATIC.some(x => x && x.title === 'Google Classroom');
        if(!exists) window.GLOBAL_SEARCH_STATIC.push({title:'Google Classroom',description:'수업·과제 바로가기',type:'바로가기',route:'home',keywords:'구글 클래스룸 classroom 과제 수업'});
      }
    }catch(_){}
  }

  function init(){
    injectStyles();
    insertClassroomMenu();
    insertMemoWidget();
    augmentSearch();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();

  window.addEventListener('pageshow', init);
})();

/* ===== O.Poong one-time nickname reward + single-charge heart router ===== */
(function(){
  'use strict';

  const USER_NAME_KEY = 'opoong_user_name_v1';
  const REWARDS_KEY = 'opoong_rewards_v2';
  const HEART_KEY = 'opoong_game_hearts_v1';
  const BONUS_HEART_KEY = 'opoong_bonus_hearts_seoyul_v1';
  const CLAIM_KEY = 'opoong_once_reward_seoyul_20260822_v1';
  const TARGET_NAME = '서율';
  const POINT_BONUS = 2000;
  const HEART_BONUS = 20;
  const HEART_MAX = 50;

  function loadBonusHearts(){
    try{return Math.max(0, Math.floor(Number(localStorage.getItem(BONUS_HEART_KEY)) || 0));}
    catch(_){return 0;}
  }

  function saveBonusHearts(value){
    try{localStorage.setItem(BONUS_HEART_KEY, String(Math.max(0, Math.floor(Number(value) || 0))));}
    catch(_){ }
  }

  function readBaseHeartState(){
    try{
      const raw = JSON.parse(localStorage.getItem(HEART_KEY) || '{}');
      return raw && typeof raw === 'object' ? raw : {};
    }catch(_){return {};}
  }

  function saveBaseHeartState(raw){
    try{localStorage.setItem(HEART_KEY, JSON.stringify(raw));return true;}
    catch(_){return false;}
  }

  function showRewardToast(){
    if(document.getElementById('opoongSeoyulRewardToast')) return;
    const toast = document.createElement('div');
    toast.id = 'opoongSeoyulRewardToast';
    toast.setAttribute('role','status');
    toast.setAttribute('aria-live','polite');
    toast.style.cssText = 'position:fixed;z-index:60000;left:50%;bottom:max(22px,env(safe-area-inset-bottom));transform:translateX(-50%);width:min(430px,calc(100% - 28px));padding:14px 16px;border:1px solid var(--line);border-radius:20px;background:var(--card);color:var(--text);box-shadow:0 20px 55px rgba(15,23,42,.24);font-weight:900;line-height:1.55;text-align:center;';
    toast.innerHTML = '<b style="display:block;font-size:15px">서율님 특별 보상 🎁</b><span style="display:block;margin-top:4px;color:var(--muted);font-size:12.5px">하트 +20 · 포인트 +2,000P가 지급됐어요.</span>';
    document.body.appendChild(toast);
    window.setTimeout(function(){
      toast.style.transition = 'opacity .25s ease, transform .25s ease';
      toast.style.opacity = '0';
      toast.style.transform = 'translate(-50%,8px)';
      window.setTimeout(function(){toast.remove();},280);
    },4200);
  }

  function refreshPointUi(){
    try{
      if(typeof window.renderOpoongColorShop === 'function') window.renderOpoongColorShop();
      if(typeof window.updateFocusWallet === 'function') window.updateFocusWallet();
      if(typeof window.renderHomeWidgets === 'function') window.renderHomeWidgets();
    }catch(_){ }
  }

  function grantRewardOnce(){
    try{
      if(localStorage.getItem(CLAIM_KEY) === '1') return false;
      const nickname = String(localStorage.getItem(USER_NAME_KEY) || '').trim();
      if(nickname !== TARGET_NAME) return false;
      const rewards = JSON.parse(localStorage.getItem(REWARDS_KEY) || '{}');
      rewards.points = Math.max(0, Math.floor(Number(rewards.points) || 0)) + POINT_BONUS;
      localStorage.setItem(REWARDS_KEY, JSON.stringify(rewards));
      saveBonusHearts(loadBonusHearts() + HEART_BONUS);
      localStorage.setItem(CLAIM_KEY, '1');
      refreshPointUi();
      showRewardToast();
      return true;
    }catch(_){return false;}
  }

  function installHeartRouter(){
    const api = window.OPOONG_GAME_HEARTS;
    if(!api || typeof api.get !== 'function' || typeof window.openMiniGame !== 'function') return false;
    if(api.__opoongSingleChargeRouter) return true;

    const baseGet = api.get.bind(api);
    const baseRender = typeof api.render === 'function' ? api.render.bind(api) : null;
    const routedOpenMiniGame = window.openMiniGame;

    function baseCount(){
      return Math.max(0, Math.floor(Number(baseGet()) || 0));
    }

    function totalHearts(){
      return baseCount() + loadBonusHearts();
    }

    function renderTotal(){
      if(baseRender) baseRender();
      const base = baseCount();
      const bonus = loadBonusHearts();
      const total = base + bonus;
      const count = document.getElementById('gameHeartCount');
      const modalCount = document.getElementById('gameHeartModalCount');
      const hub = document.getElementById('gameHub');
      if(count) count.textContent = bonus > 0 ? `${total}개 · 보너스 ${bonus}` : `${base} / ${api.max || HEART_MAX}`;
      if(modalCount) modalCount.textContent = bonus > 0 ? `${total}개 (보너스 ${bonus})` : `${base} / ${api.max || HEART_MAX}`;
      if(hub) hub.classList.toggle('heart-empty', total <= 0);
    }

    function spendAnyHeart(){
      const base = baseCount();
      if(base > 0){
        const raw = readBaseHeartState();
        raw.hearts = Math.max(0, base - 1);
        if(!saveBaseHeartState(raw)) return false;
        renderTotal();
        return true;
      }
      const bonus = loadBonusHearts();
      if(bonus > 0){
        saveBonusHearts(bonus - 1);
        renderTotal();
        return true;
      }
      return false;
    }

    api.get = totalHearts;
    api.spend = spendAnyHeart;
    api.getBonus = loadBonusHearts;
    api.render = renderTotal;
    api.__opoongSingleChargeRouter = true;

    const unifiedOpen = function(){
      const baseBefore = baseCount();
      const bonusBefore = loadBonusHearts();
      if(baseBefore <= 0 && bonusBefore <= 0){
        if(typeof api.openCharge === 'function') api.openCharge('하트가 없어요. 다음 무료 충전을 기다리거나 하트를 충전해 주세요.');
        return;
      }

      // With normal hearts, let the original inner heart gate spend first.
      // Extension games bypass that inner gate, so charge once after a successful open if the count did not change.
      if(baseBefore > 0){
        const result = routedOpenMiniGame.apply(this, arguments);
        const baseAfter = baseCount();
        if(baseAfter >= baseBefore){
          const raw = readBaseHeartState();
          raw.hearts = Math.max(0, baseAfter - 1);
          saveBaseHeartState(raw);
        }
        renderTotal();
        return result;
      }

      // Bonus-heart-only case: lend the inner gate one temporary base heart so core games can open.
      // Whether an extension game bypasses the gate or a core game consumes it, restore base to zero and spend exactly one bonus heart.
      const temp = readBaseHeartState();
      temp.hearts = 1;
      if(!saveBaseHeartState(temp)) return;
      let opened = false;
      try{
        const result = routedOpenMiniGame.apply(this, arguments);
        opened = true;
        return result;
      }finally{
        const after = readBaseHeartState();
        after.hearts = 0;
        saveBaseHeartState(after);
        if(opened) saveBonusHearts(Math.max(0, bonusBefore - 1));
        renderTotal();
      }
    };

    // Preserve the marker so game-hearts.js never installs a second gate around this router.
    unifiedOpen.__opoongHeartGate = true;
    unifiedOpen.__opoongSingleChargeRouter = true;
    unifiedOpen.__original = routedOpenMiniGame;
    window.openMiniGame = unifiedOpen;

    renderTotal();
    return true;
  }

  function initRewardAndHearts(){
    grantRewardOnce();
    installHeartRouter();
    let tries = 0;
    const timer = window.setInterval(function(){
      tries += 1;
      if(installHeartRouter() || tries >= 40) window.clearInterval(timer);
    },250);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initRewardAndHearts, {once:true});
  else initRewardAndHearts();

  window.addEventListener('pageshow', function(){
    grantRewardOnce();
    installHeartRouter();
    try{window.OPOONG_GAME_HEARTS?.render?.();}catch(_){ }
  });

  window.addEventListener('storage', function(event){
    if(event.key === HEART_KEY || event.key === BONUS_HEART_KEY){
      try{window.OPOONG_GAME_HEARTS?.render?.();}catch(_){ }
    }
  });
})();
