(() => {
  if (!('serviceWorker' in navigator)) return;

  const FIRST_SETUP_FRESH_RELOAD = 'opoong_first_setup_fresh_reload_v1';
  const FRESH_QUERY = '__opoongFresh';

  function cleanFreshQuery(){
    try{
      const url = new URL(location.href);
      if(!url.searchParams.has(FRESH_QUERY)) return;
      url.searchParams.delete(FRESH_QUERY);
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
    }catch(_){ }
  }

  function showUpdatingCover(){
    if(document.getElementById('opoongFirstSetupUpdating')) return;
    const cover = document.createElement('div');
    cover.id = 'opoongFirstSetupUpdating';
    cover.setAttribute('role','status');
    cover.setAttribute('aria-live','polite');
    cover.style.cssText = 'position:fixed;z-index:99999;inset:0;display:grid;place-items:center;padding:24px;background:var(--bg,#f5f7fb);color:var(--text,#0f172a);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center;';
    cover.innerHTML = '<div style="max-width:420px"><div style="font-size:32px;font-weight:1000;letter-spacing:-1px">O.Poong</div><div style="margin-top:12px;font-size:15px;font-weight:900">최신 버전을 적용하고 있어요.</div><div style="margin-top:7px;color:var(--muted,#64748b);font-size:12.5px;font-weight:800;line-height:1.6">초기 설정은 저장됐습니다. 화면이 자동으로 한 번 새로 열려요.</div></div>';
    document.body.appendChild(cover);
  }

  async function reloadFreshAfterFirstSetup(){
    try{
      if(sessionStorage.getItem(FIRST_SETUP_FRESH_RELOAD) === '1') return;
      sessionStorage.setItem(FIRST_SETUP_FRESH_RELOAD, '1');
    }catch(_){ }

    showUpdatingCover();

    try{
      const reg = await navigator.serviceWorker.getRegistration();
      if(reg) await reg.unregister();
    }catch(e){
      console.warn('O.Poong first setup SW cleanup:', e);
    }

    try{
      if('caches' in window){
        const keys = await caches.keys();
        await Promise.all(keys.filter(key => key.startsWith('todaypoongsan-')).map(key => caches.delete(key)));
      }
    }catch(e){
      console.warn('O.Poong first setup cache cleanup:', e);
    }

    try{
      const url = new URL(location.href);
      url.searchParams.set(FRESH_QUERY, String(Date.now()));
      location.replace(url.toString());
    }catch(_){
      location.reload();
    }
  }

  function wrapFirstSetupFinish(){
    const original = window.finishFirstSetup;
    if(typeof original !== 'function' || original.__opoongFreshAfterSetup) return false;

    const wrapped = function(){
      const wasPending = Boolean(document.body && document.body.classList.contains('setup-pending'));
      const result = original.apply(this, arguments);

      window.setTimeout(() => {
        const completed = wasPending && document.body && !document.body.classList.contains('setup-pending');
        if(completed) reloadFreshAfterFirstSetup();
      }, 0);

      return result;
    };
    wrapped.__opoongFreshAfterSetup = true;
    wrapped.__original = original;
    window.finishFirstSetup = wrapped;
    return true;
  }

  cleanFreshQuery();
  wrapFirstSetupFinish();
  document.addEventListener('DOMContentLoaded', wrapFirstSetupFinish, { once:true });

  /*
   * 일반 업데이트에서는 게임·집중모드·입력 작업을 보호하기 위해 현재 화면을
   * 강제로 새로고침하지 않는다. 단, 첫 설정을 완료한 직후에는 위 래퍼가 캐시와
   * 이전 서비스워커를 정리한 뒤 최신 앱을 자동으로 한 번 다시 연다.
   */
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      window.dispatchEvent(new CustomEvent('opoong-sw-updated'));
    } catch (_) {}
    console.info('O.Poong 업데이트가 적용됐어요. 현재 화면은 유지합니다.');
  });

  window.addEventListener('load', async () => {
    wrapFirstSetupFinish();
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return;

      await reg.update();

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      reg.addEventListener('updatefound', () => {
        const worker = reg.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    } catch (e) {
      console.warn('O.Poong PWA update check:', e);
    }
  });
})();

/* ===== O.Poong 급식·학사일정 14일 오프라인 캐시 ===== */
(() => {
  'use strict';

  const SCHOOL_CACHE_KEY = 'opoong_school_offline_v1';
  const PREFETCH_DAYS = 14;
  const SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000;
  const RETRY_INTERVAL_MS = 30 * 60 * 1000;
  const MEAL_BATCH_SIZE = 4;

  if(typeof fetchMealsDay !== 'function' || typeof fetchScheduleMonthProxy !== 'function'){
    console.warn('O.Poong school offline cache: target functions not found');
    return;
  }

  const originalFetchMealsDay = fetchMealsDay;
  const originalFetchScheduleMonthProxy = fetchScheduleMonthProxy;

  function emptyStore(){
    return {
      version: 1,
      updatedAt: 0,
      mealUpdatedAt: 0,
      scheduleUpdatedAt: 0,
      lastAttemptAt: 0,
      meals: {},
      schedules: {}
    };
  }

  function readStore(){
    try{
      const raw = JSON.parse(localStorage.getItem(SCHOOL_CACHE_KEY) || 'null');
      if(!raw || typeof raw !== 'object') return emptyStore();
      raw.meals = raw.meals && typeof raw.meals === 'object' ? raw.meals : {};
      raw.schedules = raw.schedules && typeof raw.schedules === 'object' ? raw.schedules : {};
      raw.updatedAt = Number(raw.updatedAt) || 0;
      raw.mealUpdatedAt = Number(raw.mealUpdatedAt) || 0;
      raw.scheduleUpdatedAt = Number(raw.scheduleUpdatedAt) || 0;
      raw.lastAttemptAt = Number(raw.lastAttemptAt) || 0;
      return raw;
    }catch(_){
      return emptyStore();
    }
  }

  function writeStore(store){
    try{
      localStorage.setItem(SCHOOL_CACHE_KEY, JSON.stringify(store));
    }catch(err){
      console.warn('O.Poong school offline cache: cache write failed', err);
    }
  }

  function mutateStore(mutator){
    const store = readStore();
    mutator(store);
    writeStore(store);
    return store;
  }

  function digitsDate(date){
    return String(date.getFullYear()) + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
  }

  function monthKey(date){
    return String(date.getFullYear()) + String(date.getMonth() + 1).padStart(2, '0');
  }

  function addDays(base, days){
    const d = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    d.setDate(d.getDate() + days);
    return d;
  }

  function syncWindow(){
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, PREFETCH_DAYS - 1);
    const dates = [];
    for(let i = 0; i < PREFETCH_DAYS; i++) dates.push(digitsDate(addDays(start, i)));
    const months = Array.from(new Set([monthKey(start), monthKey(end)]));
    return { start, end, dates, months };
  }

  function connectionAllowsAutoSync(){
    if(!navigator.onLine) return false;
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if(!connection) return true;
    if(connection.saveData) return false;

    const type = String(connection.type || '').toLowerCase();
    if(type === 'cellular' || type === 'none') return false;
    if(type && !['wifi', 'ethernet', 'unknown'].includes(type)) return false;
    return true;
  }

  function cacheMeal(ymd, meals){
    mutateStore(store => {
      store.meals[String(ymd)] = {
        savedAt: Date.now(),
        data: Array.isArray(meals) ? meals : []
      };
    });
  }

  function cachedMeal(ymd){
    const entry = readStore().meals[String(ymd)];
    return entry && Array.isArray(entry.data) ? entry.data : null;
  }

  function cacheSchedule(yyyymm, byDate){
    mutateStore(store => {
      store.schedules[String(yyyymm)] = {
        savedAt: Date.now(),
        data: byDate && typeof byDate === 'object' ? byDate : {}
      };
    });
  }

  function cachedSchedule(yyyymm){
    const entry = readStore().schedules[String(yyyymm)];
    return entry && entry.data && typeof entry.data === 'object' ? entry.data : null;
  }

  function prunePrefetchWindow(store, win){
    const allowedDates = new Set(win.dates);
    Object.keys(store.meals).forEach(key => {
      if(!allowedDates.has(key)) delete store.meals[key];
    });

    const allowedMonths = new Set(win.months);
    Object.keys(store.schedules).forEach(key => {
      if(!allowedMonths.has(key)) delete store.schedules[key];
    });
  }

  async function prefetchMeals(win){
    const grouped = {};
    for(let i = 0; i < win.dates.length; i += MEAL_BATCH_SIZE){
      const batch = win.dates.slice(i, i + MEAL_BATCH_SIZE);
      const rows = await Promise.all(batch.map(async ymd => {
        const meals = await originalFetchMealsDay(SD_SCHUL_CODE, ymd);
        return [ymd, meals];
      }));
      rows.forEach(([ymd, meals]) => { grouped[ymd] = meals; });
    }
    return grouped;
  }

  function syncStatusText(){
    const store = readStore();
    const stamp = store.updatedAt || Math.max(store.mealUpdatedAt, store.scheduleUpdatedAt);
    if(!stamp){
      return navigator.onLine ? '14일 저장 준비 중' : '오프라인 데이터 없음';
    }
    const d = new Date(stamp);
    const time = Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return navigator.onLine ? `14일 저장 · ${time}` : `오프라인 · ${time} 저장`;
  }

  function renderStatusBadges(){
    const label = syncStatusText();
    ['homeMealDate', 'homeSchDate'].forEach(id => {
      const anchor = document.getElementById(id);
      if(!anchor || !anchor.parentElement) return;
      let badge = anchor.parentElement.querySelector(`[data-opoong-school-cache="${id}"]`);
      if(!badge){
        badge = document.createElement('span');
        badge.className = 'pill';
        badge.dataset.opoongSchoolCache = id;
        badge.style.marginLeft = '6px';
        badge.style.fontSize = '10px';
        badge.title = '급식·학사일정은 연결 상태가 허용될 때 앞으로 14일치를 이 기기에 자동 저장합니다.';
        anchor.insertAdjacentElement('afterend', badge);
      }
      badge.textContent = label;
    });
  }

  async function syncFourteenDays(force = false){
    if(!connectionAllowsAutoSync()){
      renderStatusBadges();
      return false;
    }

    const current = readStore();
    if(!force && current.updatedAt && Date.now() - current.updatedAt < SYNC_INTERVAL_MS){
      renderStatusBadges();
      return true;
    }
    if(!force && current.lastAttemptAt && Date.now() - current.lastAttemptAt < RETRY_INTERVAL_MS){
      renderStatusBadges();
      return false;
    }

    mutateStore(store => { store.lastAttemptAt = Date.now(); });
    const win = syncWindow();
    let mealOk = false;
    let scheduleOk = false;

    try{
      const grouped = await prefetchMeals(win);
      mutateStore(store => {
        Object.entries(grouped).forEach(([ymd, meals]) => {
          store.meals[ymd] = { savedAt: Date.now(), data: Array.isArray(meals) ? meals : [] };
        });
        store.mealUpdatedAt = Date.now();
      });
      mealOk = true;
    }catch(err){
      console.warn('O.Poong school offline cache: meal prefetch failed', err);
    }

    try{
      const monthResults = await Promise.all(win.months.map(async yyyymm => {
        const byDate = await originalFetchScheduleMonthProxy(yyyymm);
        return [yyyymm, byDate];
      }));
      mutateStore(store => {
        monthResults.forEach(([yyyymm, byDate]) => {
          store.schedules[yyyymm] = { savedAt: Date.now(), data: byDate || {} };
        });
        store.scheduleUpdatedAt = Date.now();
      });
      scheduleOk = true;
    }catch(err){
      console.warn('O.Poong school offline cache: schedule prefetch failed', err);
    }

    mutateStore(store => {
      prunePrefetchWindow(store, win);
      if(mealOk || scheduleOk) store.updatedAt = Date.now();
    });

    if(mealOk || scheduleOk){
      document.documentElement.dataset.schoolOfflineReady = '1';
      try{
        window.dispatchEvent(new CustomEvent('opoong:school-offline-synced', {
          detail: { days: PREFETCH_DAYS, meals: mealOk, schedule: scheduleOk, updatedAt: Date.now() }
        }));
      }catch(_){ }
    }

    renderStatusBadges();
    return mealOk || scheduleOk;
  }

  fetchMealsDay = async function(sdCode, ymd){
    const key = String(ymd || '');
    if(navigator.onLine){
      try{
        const meals = await originalFetchMealsDay(sdCode, key);
        cacheMeal(key, meals);
        return meals;
      }catch(err){
        const cached = cachedMeal(key);
        if(cached !== null) return cached;
        throw err;
      }
    }

    const cached = cachedMeal(key);
    if(cached !== null) return cached;
    throw new Error('오프라인 저장 범위(앞으로 14일)에 없는 급식입니다.');
  };

  fetchScheduleMonthProxy = async function(yyyymm){
    const key = String(yyyymm || '');
    if(navigator.onLine){
      try{
        const byDate = await originalFetchScheduleMonthProxy(key);
        cacheSchedule(key, byDate);
        return byDate;
      }catch(err){
        const cached = cachedSchedule(key);
        if(cached !== null) return cached;
        throw err;
      }
    }

    const cached = cachedSchedule(key);
    if(cached !== null) return cached;
    throw new Error('오프라인 저장 범위(앞으로 14일)에 없는 학사일정입니다.');
  };

  window.OpoongOfflineSchoolData = {
    sync: () => syncFourteenDays(true),
    status: () => {
      const store = readStore();
      return {
        days: PREFETCH_DAYS,
        updatedAt: store.updatedAt || 0,
        mealDays: Object.keys(store.meals).length,
        scheduleMonths: Object.keys(store.schedules).length
      };
    }
  };

  function beginAutoSync(){
    renderStatusBadges();
    window.setTimeout(() => syncFourteenDays(false), 900);
  }

  if(document.readyState === 'complete') beginAutoSync();
  else window.addEventListener('load', beginAutoSync, { once:true });

  window.addEventListener('online', () => {
    renderStatusBadges();
    window.setTimeout(() => syncFourteenDays(false), 1200);
  });
  window.addEventListener('offline', renderStatusBadges);
  window.addEventListener('opoong:school-offline-synced', renderStatusBadges);
})();
