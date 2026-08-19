(() => {
  let attempts = 0;
  let timer = null;

  function patchOnce() {
    const cards = [...document.querySelectorAll('.gameShopCard')];
    const card = cards.find(c => c.querySelector('h3')?.textContent.trim() === '온웨이에듀 바로가기');
    if (!card) return false;

    const p = card.querySelector('p');
    const desc = '상단 빠른 실행 버튼 + 홈 화면에 별도 온웨이 아이콘 만들기';
    if (p && p.textContent !== desc) p.textContent = desc;

    if (card.querySelector('[data-onway-install="1"]')) return true;

    const buyButton = [...card.querySelectorAll('button')].find(b => /P로 팩 구매/.test(b.textContent || ''));
    const owned = !buyButton;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'smallbtn primary gameShopAction';
    btn.dataset.onwayInstall = '1';
    btn.textContent = '홈 화면 바로가기 만들기';
    btn.disabled = !owned;
    btn.addEventListener('click', () => {
      const url = new URL('./onway.html', window.location.href).href;
      const opened = window.open(url, '_blank', 'noopener,noreferrer');
      if (!opened) window.location.href = url;
    });
    card.appendChild(btn);
    return true;
  }

  function start() {
    if (patchOnce()) return;
    timer = setInterval(() => {
      attempts += 1;
      if (patchOnce() || attempts >= 20) {
        clearInterval(timer);
        timer = null;
      }
    }, 500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();