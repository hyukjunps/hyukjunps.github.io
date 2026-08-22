(function(){
  'use strict';

  const MEMO_KEY = 'opoong_home_memo_v1';
  const CLASSROOM_URL = 'https://classroom.google.com/';

  function qs(sel, root=document){ return root.querySelector(sel); }
  function esc(value){
    return String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  }

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
