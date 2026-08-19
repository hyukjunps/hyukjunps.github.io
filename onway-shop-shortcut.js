(() => {
  function addInstallControl() {
    const cards = [...document.querySelectorAll('.gameShopCard')];
    const card = cards.find(c => c.querySelector('h3')?.textContent.trim() === '온웨이에듀 바로가기');
    if (!card || card.querySelector('[data-onway-install="1"]')) return;

    const owned = /보유 중/.test(card.textContent || '') || ![...card.querySelectorAll('button')].some(b => /P로 팩 구매/.test(b.textContent || ''));
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'smallbtn primary gameShopAction';
    btn.dataset.onwayInstall = '1';
    btn.textContent = '홈 화면 바로가기 만들기';
    btn.disabled = !owned;
    btn.addEventListener('click', () => {
      window.location.href = './onway.html';
    });

    const actions = card.querySelector('.gameShopVariants') || card.querySelector('.gameShopCustom') || card.querySelector('.gameShopAction')?.parentElement || card;
    if (actions === card) card.appendChild(btn);
    else actions.appendChild(btn);
  }

  function patchDescription() {
    const cards = [...document.querySelectorAll('.gameShopCard')];
    const card = cards.find(c => c.querySelector('h3')?.textContent.trim() === '온웨이에듀 바로가기');
    if (!card) return;
    const p = card.querySelector('p');
    if (p) p.textContent = '상단 빠른 실행 버튼 + 홈 화면에 별도 온웨이 아이콘 만들기';
  }

  function init() {
    addInstallControl();
    patchDescription();
    const mo = new MutationObserver(() => { addInstallControl(); patchDescription(); });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();