(() => {
  const style = document.createElement('style');
  style.textContent = `
    .imageDrop{display:block!important;width:100%!important;min-width:0!important;overflow:hidden!important}
    .imageDrop b,.imageDrop p{white-space:normal!important;word-break:keep-all!important;overflow-wrap:break-word!important}
    .editorTabs{grid-template-columns:repeat(4,minmax(0,1fr))!important}
    @media(max-width:760px){.editorTabs{grid-template-columns:repeat(4,minmax(76px,1fr))!important}}
  `;
  document.head.appendChild(style);

  function cleanup() {
    const tab = document.querySelector('.editorTab[data-edit="removebg"]');
    const panel = document.getElementById('edit-removebg');
    if (tab) tab.remove();
    if (panel) panel.remove();

    const imageToolTab = document.querySelector('[data-tool="image"] span');
    const label = '필터·자르기·그리기·모자이크';
    if (imageToolTab && imageToolTab.textContent !== label) imageToolTab.textContent = label;

    const drop = document.getElementById('imageDrop');
    if (drop) {
      drop.style.display = 'block';
      drop.style.width = '100%';
    }
  }

  function init() {
    cleanup();
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      cleanup();
      if (document.getElementById('imageDrop') || tries >= 20) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();