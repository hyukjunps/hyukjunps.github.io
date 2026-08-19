(() => {
  const TOOL_URL = "./tools.html";

  function addToolsMenuItem() {
    const nav = document.querySelector(".navGrid");
    if (!nav || nav.querySelector('[data-opoong-tools="1"]')) return;

    nav.querySelectorAll('[data-opoong-tool]').forEach(el => el.remove());
    nav.querySelectorAll('[data-opoong-qr-menu]').forEach(el => el.remove());

    const link = document.createElement("a");
    link.className = "navBtn";
    link.href = TOOL_URL;
    link.dataset.opoongTools = "1";
    link.setAttribute("aria-label", "O.Poong Tools");
    link.innerHTML = '<span class="left"><span class="icon">🧰</span><span><span class="title">O.Poong Tools</span><br><span class="hint">QR·랜덤·이미지 편집</span></span></span><span>›</span>';

    const game = nav.querySelector('[data-view="game"]');
    if (game) game.insertAdjacentElement("afterend", link);
    else nav.appendChild(link);
  }

  function addSearchEntries() {
    try {
      if (typeof GLOBAL_SEARCH_STATIC === "undefined" || !Array.isArray(GLOBAL_SEARCH_STATIC)) return;
      const actions = new Set(["qr-maker", "random-draw", "image-editor", "opoong-tools"]);
      for (let i = GLOBAL_SEARCH_STATIC.length - 1; i >= 0; i--) {
        if (GLOBAL_SEARCH_STATIC[i] && actions.has(GLOBAL_SEARCH_STATIC[i].action)) GLOBAL_SEARCH_STATIC.splice(i, 1);
      }
      GLOBAL_SEARCH_STATIC.push({
        title: "O.Poong Tools",
        description: "QR·랜덤 뽑기·이미지 편집 도구 모음",
        type: "도구",
        route: "home",
        action: "opoong-tools",
        keywords: "tools 툴 도구 qr 큐알 랜덤 뽑기 자리 모둠 제비 번호 꽝 이미지 편집 사진 필터 자르기 그리기 모자이크"
      });
      GLOBAL_SEARCH_STATIC.push({
        title: "QR 만들기",
        description: "O.Poong Tools에서 QR 코드 만들기",
        type: "도구",
        route: "home",
        action: "qr-maker",
        keywords: "qr 큐알 qr코드 링크 텍스트 클립보드"
      });
      GLOBAL_SEARCH_STATIC.push({
        title: "랜덤 뽑기",
        description: "O.Poong Tools에서 자리·모둠·제비·번호·꽝 뽑기",
        type: "도구",
        route: "home",
        action: "random-draw",
        keywords: "랜덤 뽑기 자리 모둠 제비 번호 꽝 추첨"
      });
      GLOBAL_SEARCH_STATIC.push({
        title: "이미지 편집",
        description: "필터·자르기·그리기·모자이크",
        type: "도구",
        route: "home",
        action: "image-editor",
        keywords: "이미지 사진 편집 필터 자르기 크롭 그리기 펜 모자이크 블러"
      });
    } catch (error) {
      console.warn("O.Poong tools search:", error);
    }
  }

  function patchSearchOpen() {
    if (window.__opoongToolsSearchPatched || typeof window.openGlobalSearchResult !== "function") return;
    const original = window.openGlobalSearchResult;
    window.openGlobalSearchResult = function(index) {
      try {
        if (typeof globalSearchVisibleResults !== "undefined") {
          const item = globalSearchVisibleResults[index];
          if (item?.action === "opoong-tools") {
            if (typeof window.closeGlobalSearch === "function") window.closeGlobalSearch();
            window.location.href = TOOL_URL;
            return;
          }
          if (item?.action === "qr-maker") {
            if (typeof window.closeGlobalSearch === "function") window.closeGlobalSearch();
            window.location.href = TOOL_URL + "?tool=qr";
            return;
          }
          if (item?.action === "random-draw") {
            if (typeof window.closeGlobalSearch === "function") window.closeGlobalSearch();
            window.location.href = TOOL_URL + "?tool=random";
            return;
          }
          if (item?.action === "image-editor") {
            if (typeof window.closeGlobalSearch === "function") window.closeGlobalSearch();
            window.location.href = TOOL_URL + "?tool=image";
            return;
          }
        }
      } catch (error) {
        console.warn("O.Poong tools search open:", error);
      }
      return original.apply(this, arguments);
    };
    window.__opoongToolsSearchPatched = true;
  }

  function init() {
    addToolsMenuItem();
    addSearchEntries();
    patchSearchOpen();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();