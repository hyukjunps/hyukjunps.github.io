(() => {
  function status(text, type='') {
    const el = document.getElementById('imageStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'status' + (type ? ' ' + type : '');
  }

  function getCanvas() {
    return document.getElementById('imageCanvas');
  }

  function hasTransparency(canvas) {
    try {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) return true;
      }
    } catch (_) {}
    return false;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function saveTransparentPng() {
    const canvas = getCanvas();
    if (!canvas || !canvas.width || !canvas.height) return;
    const transparent = hasTransparency(canvas);
    canvas.toBlob(blob => {
      if (!blob) return status('PNG 파일을 만들지 못했어요.', 'bad');
      downloadBlob(blob, 'O.Poong-image.png');
      status(transparent ? '투명 배경을 유지한 PNG로 저장했어요.' : 'PNG로 저장했어요. 현재 이미지에는 투명 영역이 없어요.', 'ok');
    }, 'image/png');
  }

  function saveJpegWithWarning() {
    const canvas = getCanvas();
    if (!canvas || !canvas.width || !canvas.height) return;
    const transparent = hasTransparency(canvas);
    if (transparent) {
      const proceed = window.confirm('JPG는 투명 배경을 지원하지 않아 투명한 부분이 흰색으로 저장돼요. 그래도 JPG로 저장할까요?');
      if (!proceed) return;
    }
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const t = temp.getContext('2d');
    t.fillStyle = '#ffffff';
    t.fillRect(0, 0, temp.width, temp.height);
    t.drawImage(canvas, 0, 0);
    temp.toBlob(blob => {
      if (!blob) return status('JPG 파일을 만들지 못했어요.', 'bad');
      downloadBlob(blob, 'O.Poong-image.jpg');
      status('JPG로 저장했어요.', 'ok');
    }, 'image/jpeg', 0.92);
  }

  function strengthenCheckerboard() {
    const style = document.createElement('style');
    style.textContent = `
      .imageStage{background-color:#fff!important;background-image:linear-gradient(45deg,#d1d5db 25%,transparent 25%),linear-gradient(-45deg,#d1d5db 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#d1d5db 75%),linear-gradient(-45deg,transparent 75%,#d1d5db 75%)!important;background-size:24px 24px!important;background-position:0 0,0 12px,12px -12px,-12px 0!important}
      .imageCanvas{background:transparent!important}
    `;
    document.head.appendChild(style);
  }

  function patchButtons() {
    const png = document.getElementById('savePng');
    const jpg = document.getElementById('saveJpg');
    if (!png || !jpg || png.dataset.transparentPatched === '1') return false;

    png.dataset.transparentPatched = '1';
    jpg.dataset.transparentPatched = '1';

    png.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      saveTransparentPng();
    }, true);

    jpg.addEventListener('click', e => {
      e.preventDefault();
      e.stopImmediatePropagation();
      saveJpegWithWarning();
    }, true);

    return true;
  }

  function init() {
    strengthenCheckerboard();
    if (patchButtons()) return;
    const mo = new MutationObserver(() => {
      if (patchButtons()) mo.disconnect();
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => mo.disconnect(), 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();