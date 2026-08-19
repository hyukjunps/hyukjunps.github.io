(() => {
  const TOOLS = [
    {
      key: "qr",
      url: "./qr.html",
      title: "QR 만들기",
      hint: "링크·텍스트",
      icon: "QR",
      action: "qr-maker",
      description: "링크·텍스트를 QR 코드로 만들기",
      keywords: "qr 큐알 큐알코드 qr코드 링크 공유 생성 만들기 클립보드"
    },
    {
      key: "random",
      url: "./random.html",
      title: "랜덤 뽑기",
      hint: "자리·모둠·제비",
      icon: "🎲",
      action: "random-draw",
      description: "자리·모둠·제비·번호·꽝 랜덤 뽑기",
      keywords: "랜덤 뽑기 자리 자리뽑기 모둠 모둠뽑기 제비 제비뽑기 번호 번호뽑기 꽝 꽝뽑기 추첨 룰렛"
    }
  ];

  function addToolMenuItems() {
    const nav = document.querySelector(".navGrid");
    if (!nav) return;

    let anchor = nav.querySelector('[data-view="game"]');
    TOOLS.forEach(tool => {
      if (nav.querySelector(`[data-opoong-tool="${tool.key}"]`)) {
        anchor = nav.querySelector(`[data-opoong-tool="${tool.key}"]`);
        return;
      }
      const link = document.createElement("a");
      link.className = "navBtn";
      link.href = tool.url;
      link.dataset.opoongTool = tool.key;
      link.setAttribute("aria-label", tool.title);
      link.innerHTML = `<span class="left"><span class="icon">${tool.icon}</span><span><span class="title">${tool.title}</span><br><span class="hint">${tool.hint}</span></span></span><span>›</span>`;
      if (anchor) anchor.insertAdjacentElement("afterend", link);
      else nav.appendChild(link);
      anchor = link;
    });
  }

  function addToolsToSearch() {
    try {
      if (typeof GLOBAL_SEARCH_STATIC === "undefined" || !Array.isArray(GLOBAL_SEARCH_STATIC)) return;
      TOOLS.forEach(tool => {
        if (GLOBAL_SEARCH_STATIC.some(item => item && item.action === tool.action)) return;
        GLOBAL_SEARCH_STATIC.push({
          title: tool.title,
          description: tool.description,
          type: "도구",
          route: "home",
          action: tool.action,
          keywords: tool.keywords
        });
      });
    } catch (error) {
      console.warn("O.Poong tool search entries:", error);
    }
  }

  function patchSearchOpen() {
    if (window.__opoongToolSearchPatched) return;
    if (typeof window.openGlobalSearchResult !== "function") return;

    const original = window.openGlobalSearchResult;
    window.openGlobalSearchResult = function(index) {
      try {
        if (typeof globalSearchVisibleResults !== "undefined") {
          const item = globalSearchVisibleResults[index];
          const tool = TOOLS.find(x => item && item.action === x.action);
          if (tool) {
            if (typeof window.closeGlobalSearch === "function") window.closeGlobalSearch();
            window.location.href = tool.url;
            return;
          }
        }
      } catch (error) {
        console.warn("O.Poong tool search open:", error);
      }
      return original.apply(this, arguments);
    };
    window.__opoongToolSearchPatched = true;
  }

  function init() {
    addToolMenuItems();
    addToolsToSearch();
    patchSearchOpen();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
