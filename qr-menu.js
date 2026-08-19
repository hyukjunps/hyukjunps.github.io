(() => {
  const QR_URL = "./qr.html";

  function addQrMenuItem() {
    const nav = document.querySelector(".navGrid");
    if (!nav || nav.querySelector('[data-opoong-qr-menu="1"]')) return;

    const link = document.createElement("a");
    link.className = "navBtn";
    link.href = QR_URL;
    link.dataset.opoongQrMenu = "1";
    link.setAttribute("aria-label", "QR 만들기");
    link.innerHTML = '<span class="left"><span class="icon">QR</span><span><span class="title">QR 만들기</span><br><span class="hint">링크·텍스트</span></span></span><span>›</span>';

    const game = nav.querySelector('[data-view="game"]');
    if (game) game.insertAdjacentElement("afterend", link);
    else nav.appendChild(link);
  }

  function addQrToSearch() {
    try {
      if (typeof GLOBAL_SEARCH_STATIC !== "undefined" && Array.isArray(GLOBAL_SEARCH_STATIC)) {
        const exists = GLOBAL_SEARCH_STATIC.some(item => item && item.action === "qr-maker");
        if (!exists) {
          const gameIndex = GLOBAL_SEARCH_STATIC.findIndex(item => item && item.route === "game");
          const item = {
            title: "QR 만들기",
            description: "링크·텍스트를 QR 코드로 만들기",
            type: "도구",
            route: "home",
            action: "qr-maker",
            keywords: "qr 큐알 큐알코드 qr코드 링크 공유 생성 만들기 클립보드"
          };
          if (gameIndex >= 0) GLOBAL_SEARCH_STATIC.splice(gameIndex + 1, 0, item);
          else GLOBAL_SEARCH_STATIC.push(item);
        }
      }
    } catch (error) {
      console.warn("O.Poong QR search entry:", error);
    }
  }

  function patchSearchOpen() {
    if (window.__opoongQrSearchPatched) return;
    if (typeof window.openGlobalSearchResult !== "function") return;

    const original = window.openGlobalSearchResult;
    window.openGlobalSearchResult = function(index) {
      try {
        if (typeof globalSearchVisibleResults !== "undefined") {
          const item = globalSearchVisibleResults[index];
          if (item && item.action === "qr-maker") {
            if (typeof window.closeGlobalSearch === "function") window.closeGlobalSearch();
            window.location.href = QR_URL;
            return;
          }
        }
      } catch (error) {
        console.warn("O.Poong QR search open:", error);
      }
      return original.apply(this, arguments);
    };
    window.__opoongQrSearchPatched = true;
  }

  function init() {
    addQrMenuItem();
    addQrToSearch();
    patchSearchOpen();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
