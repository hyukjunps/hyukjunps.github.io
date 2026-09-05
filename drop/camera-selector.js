(() => {
  if (!window.Html5Qrcode) return;

  const KEY = 'odrop-camera-id-v2';
  const originalGetCameras = Html5Qrcode.getCameras.bind(Html5Qrcode);
  let lastModeButton = null;
  let cameraList = [];

  function savedId() {
    try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; }
  }

  function saveId(id) {
    try { localStorage.setItem(KEY, id); } catch (_) {}
  }

  // The multi-QR scanner chooses the first camera matching "back/rear/environment".
  // Put the user's selected camera first and mark it as selected so it is actually used.
  Html5Qrcode.getCameras = async function () {
    const list = await originalGetCameras();
    const selected = savedId();
    if (!selected) return list;
    const chosen = list.find(c => c.id === selected);
    if (!chosen) return list;
    const rest = list.filter(c => c.id !== selected);
    return [{ ...chosen, label: 'Back selected · ' + (chosen.label || '선택한 카메라') }, ...rest];
  };

  const style = document.createElement('style');
  style.textContent = `
    #odropCameraPicker{position:relative;z-index:10030;margin:0 0 12px;padding:10px;border:1px solid var(--line);border-radius:15px;background:var(--card2);pointer-events:auto!important;touch-action:manipulation}
    #odropCameraPicker .cameraTitle{margin-bottom:7px;color:var(--muted);font-size:11px;font-weight:950}
    #odropCameraToggle{position:relative;z-index:10031;width:100%;min-height:46px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--card);color:var(--text);font:inherit;font-size:12px;font-weight:900;text-align:left;pointer-events:auto!important;touch-action:manipulation}
    #odropCameraList{position:relative;z-index:10032;display:none;gap:7px;margin-top:8px;pointer-events:auto!important}
    #odropCameraList.open{display:grid}
    #odropCameraList button{position:relative;z-index:10033;width:100%;min-height:44px;border:1px solid var(--line);border-radius:11px;padding:9px 11px;background:var(--card);color:var(--text);font:inherit;font-size:12px;font-weight:800;text-align:left;pointer-events:auto!important;touch-action:manipulation}
    #odropCameraList button.active{border-color:var(--pri);color:var(--pri);background:color-mix(in srgb,var(--pri) 8%,var(--card))}
    #qrReader{position:relative;z-index:1!important}
    #qrReader video{position:relative;z-index:1!important}
  `;
  document.head.appendChild(style);

  function cameraName(c, i) {
    const label = String(c?.label || '').trim();
    return label || `카메라 ${i + 1}`;
  }

  function ensureUi() {
    const reader = document.querySelector('#qrReader');
    if (!reader) return null;
    let wrap = document.querySelector('#odropCameraPicker');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'odropCameraPicker';
      wrap.innerHTML = `
        <div class="cameraTitle">카메라 선택</div>
        <button type="button" id="odropCameraToggle">카메라 목록 열기 ▾</button>
        <div id="odropCameraList"></div>`;
      reader.insertAdjacentElement('beforebegin', wrap);

      const toggle = wrap.querySelector('#odropCameraToggle');
      const list = wrap.querySelector('#odropCameraList');

      const toggleList = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        list.classList.toggle('open');
        toggle.textContent = list.classList.contains('open') ? '카메라 목록 닫기 ▴' : '카메라 목록 열기 ▾';
      };
      toggle.addEventListener('click', toggleList, true);
      toggle.addEventListener('touchend', toggleList, {capture:true, passive:false});

      list.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-camera-id]');
        if (!btn) return;
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        const id = btn.dataset.cameraId;
        if (!id) return;
        saveId(id);
        list.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.cameraId === id));
        toggle.textContent = '선택됨 · ' + btn.textContent;
        list.classList.remove('open');

        const close = document.querySelector('#closeScannerBtn');
        if (close) close.click();
        setTimeout(() => {
          if (lastModeButton) lastModeButton.click();
        }, 350);
      }, true);
    }
    return wrap;
  }

  async function refreshList() {
    const wrap = ensureUi();
    const listEl = wrap?.querySelector('#odropCameraList');
    const toggle = wrap?.querySelector('#odropCameraToggle');
    if (!listEl || !toggle) return;

    try {
      cameraList = await originalGetCameras();
      const current = savedId();
      listEl.innerHTML = '';

      cameraList.forEach((c, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.dataset.cameraId = c.id;
        btn.textContent = cameraName(c, i);
        if (c.id === current) btn.classList.add('active');
        listEl.appendChild(btn);
      });

      if (!current && cameraList.length) {
        const preferred = cameraList.find(c => /back|rear|environment|후면/i.test(c.label || '')) || cameraList[cameraList.length - 1];
        saveId(preferred.id);
      }

      const selected = cameraList.find(c => c.id === savedId());
      toggle.textContent = selected ? '현재 · ' + cameraName(selected, cameraList.indexOf(selected)) + ' ▾' : '카메라 목록 열기 ▾';
    } catch (e) {
      listEl.innerHTML = '<div style="padding:8px;color:var(--bad);font-size:12px;font-weight:800">카메라 목록을 불러오지 못했어요.</div>';
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target instanceof Element ? e.target.closest('#scanOfferBtn,#scanAnswerBtn') : null;
    if (!btn) return;
    lastModeButton = btn;
    setTimeout(refreshList, 250);
  }, true);
})();