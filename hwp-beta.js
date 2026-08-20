(() => {
  'use strict';

  const BETA_ACK_KEY = 'opoong_hwp_beta_ack_session_v1';
  const RHWP_URL = 'https://edwardkim.github.io/rhwp/';

  function injectStyles() {
    if (document.getElementById('opoongHwpBetaStyles')) return;
    const style = document.createElement('style');
    style.id = 'opoongHwpBetaStyles';
    style.textContent = `
      .hwpBetaBadge{
        display:inline-flex;align-items:center;justify-content:center;
        margin-left:6px;padding:3px 7px;border-radius:999px;
        background:color-mix(in srgb,var(--amber) 14%,var(--card));
        border:1px solid color-mix(in srgb,var(--amber) 32%,var(--line));
        color:var(--amber);font-size:9px;font-weight:1000;letter-spacing:.5px;
        vertical-align:2px;
      }
      .hwpBetaHero{
        display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;
        margin-bottom:14px;padding:16px 18px;border-radius:22px;
        border:1px solid color-mix(in srgb,var(--amber) 24%,var(--line));
        background:linear-gradient(135deg,color-mix(in srgb,var(--amber) 8%,var(--card)),var(--card));
      }
      .hwpBetaHero strong{font-size:17px}.hwpBetaHero p{margin:5px 0 0;color:var(--muted);font-size:13px;font-weight:800;line-height:1.6}
      .hwpBetaFrameWrap{overflow:hidden;border:1px solid var(--line);border-radius:24px;background:var(--card);box-shadow:var(--shadow2)}
      .hwpBetaFrame{display:block;width:100%;height:min(76vh,900px);min-height:620px;border:0;background:#fff}
      .hwpBetaFallback{padding:18px;color:var(--muted);font-size:13px;font-weight:800;line-height:1.7}
      .hwpBetaModalBack{
        position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;padding:18px;
        background:rgba(15,23,42,.52);backdrop-filter:blur(10px);
      }
      .hwpBetaModalBack[hidden]{display:none!important}
      .hwpBetaModal{
        width:min(100%,520px);padding:24px;border-radius:28px;border:1px solid var(--line);
        background:var(--card);color:var(--text);box-shadow:0 30px 90px rgba(15,23,42,.28)
      }
      .hwpBetaModalIcon{width:52px;height:52px;border-radius:18px;display:grid;place-items:center;margin-bottom:16px;background:color-mix(in srgb,var(--amber) 14%,var(--card));font-size:25px}
      .hwpBetaModal h3{margin:0;font-size:23px;letter-spacing:-.7px}
      .hwpBetaModal p{margin:12px 0 0;color:var(--muted);font-weight:800;line-height:1.75;font-size:14px}
      .hwpBetaModal ul{margin:14px 0 0;padding-left:20px;color:var(--muted);font-size:13px;font-weight:800;line-height:1.75}
      .hwpBetaModalActions{display:grid;grid-template-columns:1fr 1.4fr;gap:9px;margin-top:20px}
      @media(max-width:620px){
        .hwpBetaFrame{height:72vh;min-height:520px}
        .hwpBetaModal{padding:20px;border-radius:24px}
        .hwpBetaModalActions{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function addMenu() {
    const nav = document.querySelector('nav');
    if (!nav || document.querySelector('[data-view="hwp"]')) return;

    const onway = nav.querySelector('[data-view="onway"]');
    const item = document.createElement('a');
    item.className = 'navBtn';
    item.dataset.view = 'hwp';
    item.href = '/?page=hwp';
    item.innerHTML = '<span class="left"><span class="icon">한</span><span><span class="title">한글 <span class="hwpBetaBadge">BETA</span></span><br><span class="hint">HWP · HWPX 편집</span></span></span><span>›</span>';
    item.addEventListener('click', (event) => {
      event.preventDefault();
      if (typeof window.go === 'function') window.go('hwp');
      showBetaWarningIfNeeded();
    });

    if (onway) nav.insertBefore(item, onway);
    else nav.appendChild(item);
  }

  function addView() {
    if (document.getElementById('view-hwp')) return;
    const main = document.querySelector('main') || document.querySelector('.wrap');
    if (!main) return;

    const section = document.createElement('section');
    section.className = 'section view';
    section.id = 'view-hwp';
    section.innerHTML = `
      <div class="sectionHeader">
        <div>
          <h2>한글 <span class="hwpBetaBadge">BETA</span></h2>
          <p>HWP·HWPX 문서를 브라우저에서 열고 편집할 수 있어요.</p>
        </div>
      </div>
      <div class="hwpBetaHero">
        <div>
          <strong>아직 Beta 기능이에요</strong>
          <p>중요한 문서는 원본을 백업한 뒤 사용해 주세요. 일부 문서는 원본과 다르게 표시되거나 저장될 수 있어요.</p>
        </div>
        <button class="smallbtn ghost" type="button" id="hwpBetaOpenNew">새 창에서 열기</button>
      </div>
      <div class="hwpBetaFrameWrap">
        <iframe class="hwpBetaFrame" id="hwpBetaFrame" title="한글 Beta 편집기" loading="lazy" referrerpolicy="no-referrer" src="about:blank"></iframe>
        <div class="hwpBetaFallback">편집기가 보이지 않으면 ‘새 창에서 열기’를 이용해 주세요.</div>
      </div>
    `;

    const onwayView = document.getElementById('view-onway');
    if (onwayView && onwayView.parentNode) onwayView.parentNode.insertBefore(section, onwayView);
    else main.appendChild(section);

    section.querySelector('#hwpBetaOpenNew')?.addEventListener('click', () => window.open(RHWP_URL, '_blank', 'noopener,noreferrer'));
  }

  function addModal() {
    if (document.getElementById('hwpBetaWarningBack')) return;
    const back = document.createElement('div');
    back.id = 'hwpBetaWarningBack';
    back.className = 'hwpBetaModalBack';
    back.hidden = true;
    back.setAttribute('role', 'dialog');
    back.setAttribute('aria-modal', 'true');
    back.setAttribute('aria-labelledby', 'hwpBetaWarningTitle');
    back.innerHTML = `
      <div class="hwpBetaModal">
        <div class="hwpBetaModalIcon" aria-hidden="true">⚠️</div>
        <h3 id="hwpBetaWarningTitle">한글 편집기는 Beta 기능입니다</h3>
        <p>현재 개발 중인 기능으로 일부 HWP/HWPX 문서가 원본과 다르게 표시되거나 저장될 수 있습니다.</p>
        <ul>
          <li>글꼴·표·이미지·수식·문서 배치가 달라질 수 있어요.</li>
          <li>중요한 문서는 편집 전에 원본 파일을 백업해 주세요.</li>
        </ul>
        <div class="hwpBetaModalActions">
          <button class="btn ghost" type="button" id="hwpBetaCancel">취소</button>
          <button class="btn primary" type="button" id="hwpBetaConfirm">확인하고 사용하기</button>
        </div>
      </div>
    `;
    document.body.appendChild(back);

    back.querySelector('#hwpBetaCancel')?.addEventListener('click', () => {
      back.hidden = true;
      if (typeof window.go === 'function') window.go('home');
    });
    back.querySelector('#hwpBetaConfirm')?.addEventListener('click', () => {
      try { sessionStorage.setItem(BETA_ACK_KEY, '1'); } catch (_) {}
      back.hidden = true;
      loadEditor();
    });
    back.addEventListener('click', (event) => {
      if (event.target === back) back.querySelector('#hwpBetaCancel')?.click();
    });
  }

  function loadEditor() {
    const frame = document.getElementById('hwpBetaFrame');
    if (frame && frame.src === 'about:blank') frame.src = RHWP_URL;
  }

  function showBetaWarningIfNeeded() {
    let acknowledged = false;
    try { acknowledged = sessionStorage.getItem(BETA_ACK_KEY) === '1'; } catch (_) {}
    if (acknowledged) {
      loadEditor();
      return;
    }
    const back = document.getElementById('hwpBetaWarningBack');
    if (back) {
      back.hidden = false;
      setTimeout(() => back.querySelector('#hwpBetaConfirm')?.focus(), 0);
    }
  }

  function installRouteHook() {
    if (window.__opoongHwpBetaRouteHook) return;
    window.__opoongHwpBetaRouteHook = true;

    const tryWrap = () => {
      if (typeof window.go !== 'function' || window.go.__hwpBetaWrapped) return false;
      const baseGo = window.go;
      const wrapped = function(view, ...args) {
        const result = baseGo.call(this, view, ...args);
        if (view === 'hwp') showBetaWarningIfNeeded();
        return result;
      };
      wrapped.__hwpBetaWrapped = true;
      window.go = wrapped;
      return true;
    };

    if (!tryWrap()) {
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (tryWrap() || attempts > 40) clearInterval(timer);
      }, 100);
    }
  }

  function install() {
    injectStyles();
    addMenu();
    addView();
    addModal();
    installRouteHook();

    const page = new URLSearchParams(location.search).get('page');
    if (page === 'hwp') setTimeout(showBetaWarningIfNeeded, 0);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once:true });
  else install();
})();
