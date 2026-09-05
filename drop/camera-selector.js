(() => {
  if (!window.Html5Qrcode) return;

  const KEY = 'odrop-camera-id-v1';
  const originalGetCameras = Html5Qrcode.getCameras.bind(Html5Qrcode);
  let lastModeButton = null;
  let cameras = [];

  function savedId() {
    try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; }
  }

  function saveId(id) {
    try { localStorage.setItem(KEY, id); } catch (_) {}
  }

  Html5Qrcode.getCameras = async function () {
    const list = await originalGetCameras();
    const selected = savedId();
    if (!selected) return list;
    return list.map(c => c.id === selected ? { ...c, label: 'Back selected · ' + (c.label || '선택한 카메라') } : c);
  };

  const style = document.createElement('style');
  style.textContent = `
    .odrop-camera-select{margin:0 0 12px;padding:10px;border:1px solid var(--line);border-radius:15px;background:var(--card2)}
    .odrop-camera-select label{display:block;margin-bottom:6px;color:var(--muted);font-size:11px;font-weight:950}
    .odrop-camera-select select{width:100%;border:1px solid var(--line);border-radius:12px;padding:10px;background:var(--card);color:var(--text);font:inherit;font-size:12px;font-weight:850}
  `;
  document.head.appendChild(style);

  function ensureUi() {
    const reader = document.querySelector('#qrReader');
    if (!reader) return null;
    let wrap = document.querySelector('#odropCameraSelectWrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'odropCameraSelectWrap';
      wrap.className = 'odrop-camera-select';
      wrap.innerHTML = '<label for="odropCameraSelect">카메라 선택</label><select id="odropCameraSelect"><option>카메라 불러오는 중…</option></select>';
      reader.insertAdjacentElement('beforebegin', wrap);
      wrap.querySelector('select').addEventListener('change', async (e) => {
        const id = e.target.value;
        if (!id) return;
        saveId(id);
        const close = document.querySelector('#closeScannerBtn');
        if (close) close.click();
        setTimeout(() => {
          if (lastModeButton) lastModeButton.click();
        }, 250);
      });
    }
    return wrap;
  }

  async function refreshList() {
    const wrap = ensureUi();
    const select = wrap?.querySelector('select');
    if (!select) return;
    try {
      cameras = await originalGetCameras();
      const current = savedId();
      select.innerHTML = '';
      cameras.forEach((c, i) => {
        const opt = document.createElement('option');
        opt.value = c.id;
        opt.textContent = c.label || `카메라 ${i + 1}`;
        if (c.id === current) opt.selected = true;
        select.appendChild(opt);
      });
      if (!current && cameras.length) saveId(cameras[cameras.length - 1].id);
    } catch (e) {
      select.innerHTML = '<option>카메라 목록을 불러오지 못했어요</option>';
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('#scanOfferBtn,#scanAnswerBtn') : null;
    if (!btn) return;
    lastModeButton = btn;
    setTimeout(refreshList, 350);
  }, true);
})();