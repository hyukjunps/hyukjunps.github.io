(() => {
  const MAX_SIDE = 1400;
  let canvas, ctx, wrap, cropBox;
  let loaded = false;
  let originalDataUrl = '';
  let history = [];
  let historyIndex = -1;
  let interaction = null;
  let cropStart = null;
  let cropRect = null;
  let filterBase = null;
  let filterRaf = 0;

  const style = document.createElement('style');
  style.textContent = `
    .imageLayout{display:grid;grid-template-columns:minmax(280px,.72fr) minmax(0,1.28fr);gap:14px}
    .imageDrop{border:2px dashed var(--line);border-radius:22px;padding:22px;text-align:center;background:var(--card2);transition:.18s ease}
    .imageDrop.drag{border-color:var(--pri3);background:color-mix(in srgb,var(--pri) 8%,var(--card))}
    .imageDrop input{display:none}.imageDrop b{display:block;font-size:17px}.imageDrop p{margin:7px 0 0;color:var(--muted);font-size:12px;font-weight:750;line-height:1.55}
    .editorTabs{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px;margin:14px 0}.editorTab{border:1px solid var(--line);border-radius:14px;padding:10px 7px;background:var(--card2);color:var(--muted);font-weight:900}.editorTab.active{color:#fff;border-color:transparent;background:linear-gradient(135deg,var(--pri),var(--pri2))}
    .editorPanel{display:none}.editorPanel.active{display:block}.controlRow{display:grid;grid-template-columns:86px 1fr 48px;align-items:center;gap:9px;margin-top:11px}.controlRow label{font-size:12px;font-weight:900}.controlRow output{text-align:right;font-size:11px;color:var(--muted);font-weight:850}.controlRow input[type=range]{width:100%}
    .toolChoices{display:flex;flex-wrap:wrap;gap:7px;margin-top:11px}.choice{border:1px solid var(--line);border-radius:12px;padding:9px 10px;background:var(--card2);color:var(--text);font-weight:850;font-size:12px}.choice.active{color:var(--pri);border-color:color-mix(in srgb,var(--pri) 35%,var(--line));background:color-mix(in srgb,var(--pri) 9%,var(--card))}
    .imageStageCard{min-height:520px;display:flex;flex-direction:column}.imageStageTop{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:10px}.imageStageTop .actions{margin:0}.imageStage{flex:1;min-height:390px;border:1px solid var(--line);border-radius:22px;background:repeating-conic-gradient(#e5e7eb 0 25%,#f8fafc 0 50%) 50%/20px 20px;display:grid;place-items:center;overflow:auto;padding:14px;position:relative}.imageCanvasWrap{position:relative;display:inline-block;line-height:0;max-width:100%}.imageCanvas{display:block;max-width:100%;height:auto;border-radius:8px;box-shadow:0 12px 32px rgba(15,23,42,.14);touch-action:none}.cropBox{position:absolute;border:2px solid #2563eb;background:rgba(37,99,235,.10);pointer-events:none;display:none;box-shadow:0 0 0 9999px rgba(15,23,42,.34)}
    .imageEmpty{text-align:center;color:#64748b;font-weight:850;line-height:1.7;padding:30px}.imageMeta{margin-top:9px;color:var(--muted);font-size:11px;font-weight:800;text-align:center}.editorNotice{margin-top:11px;padding:11px 12px;border-radius:15px;border:1px solid var(--line);background:var(--card2);color:var(--muted);font-size:11.5px;font-weight:750;line-height:1.55}.editorNotice strong{color:var(--text)}
    .colorInput{width:46px;height:38px;padding:2px;border:1px solid var(--line);border-radius:10px;background:var(--card)}
    @media(max-width:760px){.imageLayout{grid-template-columns:1fr}.editorTabs{grid-template-columns:repeat(5,minmax(76px,1fr));overflow:auto}.imageStageCard{min-height:420px}.imageStage{min-height:310px}.controlRow{grid-template-columns:72px 1fr 44px}}
  `;
  document.head.appendChild(style);

  function addImageTool() {
    const tabs = document.querySelector('.toolTabs');
    if (!tabs || document.querySelector('[data-tool="image"]')) return;

    const btn = document.createElement('button');
    btn.className = 'toolTab';
    btn.dataset.tool = 'image';
    btn.innerHTML = '이미지 편집<span>필터·자르기·그리기·모자이크</span>';
    btn.onclick = () => window.openTool ? window.openTool('image') : showImageTool();
    tabs.appendChild(btn);
    tabs.style.gridTemplateColumns = 'repeat(3,minmax(0,1fr))';

    const section = document.createElement('section');
    section.className = 'toolView';
    section.id = 'tool-image';
    section.innerHTML = `
      <div class="imageLayout">
        <div class="card">
          <h2>이미지 편집</h2>
          <div class="sub">사진을 기기 안에서 바로 편집해요. 업로드한 이미지는 서버로 전송하지 않습니다.</div>
          <label class="imageDrop" id="imageDrop">
            <input id="imageFile" type="file" accept="image/*">
            <b>이미지 불러오기</b>
            <p>클릭해서 선택하거나 이곳에 이미지를 끌어다 놓으세요.</p>
          </label>
          <nav class="editorTabs" aria-label="이미지 편집 기능">
            <button class="editorTab active" data-edit="filter">필터</button>
            <button class="editorTab" data-edit="crop">자르기</button>
            <button class="editorTab" data-edit="draw">그리기</button>
            <button class="editorTab" data-edit="mosaic">모자이크</button>
            <button class="editorTab" data-edit="removebg">배경 제거</button>
          </nav>

          <div class="editorPanel active" id="edit-filter">
            <div class="controlRow"><label>밝기</label><input id="filterBrightness" type="range" min="-100" max="100" value="0"><output id="outBrightness">0</output></div>
            <div class="controlRow"><label>대비</label><input id="filterContrast" type="range" min="-100" max="100" value="0"><output id="outContrast">0</output></div>
            <div class="controlRow"><label>채도</label><input id="filterSaturation" type="range" min="-100" max="100" value="0"><output id="outSaturation">0</output></div>
            <div class="toolChoices"><button class="choice" data-filter-preset="gray">흑백</button><button class="choice" data-filter-preset="warm">따뜻하게</button><button class="choice" data-filter-preset="cool">차갑게</button><button class="choice" data-filter-preset="reset">초기화</button></div>
            <div class="actions"><button class="btn primary" id="applyFilter">필터 적용</button></div>
          </div>

          <div class="editorPanel" id="edit-crop">
            <div class="sub">사진 위에서 드래그해 남길 영역을 선택하세요.</div>
            <div class="toolChoices"><button class="choice active" data-ratio="free">자유</button><button class="choice" data-ratio="1">1:1</button><button class="choice" data-ratio="1.333333">4:3</button><button class="choice" data-ratio="1.777778">16:9</button></div>
            <div class="actions"><button class="btn primary" id="applyCrop">선택 영역 자르기</button><button class="btn" id="cancelCrop">선택 취소</button></div>
          </div>

          <div class="editorPanel" id="edit-draw">
            <div class="row"><div><label class="label">색상</label><input class="colorInput" id="drawColor" type="color" value="#2563eb"></div><div><label class="label">굵기</label><input class="input" id="drawSize" type="number" min="1" max="100" value="12"></div></div>
            <div class="sub" style="margin-top:10px">사진 위를 손가락이나 마우스로 그리세요.</div>
          </div>

          <div class="editorPanel" id="edit-mosaic">
            <label class="label">모자이크 크기</label><input class="input" id="mosaicSize" type="number" min="8" max="100" value="28">
            <div class="sub" style="margin-top:10px">가리고 싶은 부분을 사진 위에서 문질러 주세요.</div>
          </div>

          <div class="editorPanel" id="edit-removebg">
            <div class="sub">단색이나 비슷한 색의 배경에 적합한 로컬 배경 제거예요. 사진에서 배경 부분을 한 번 누르면 연결된 비슷한 색 영역을 투명하게 만듭니다.</div>
            <div class="controlRow"><label>허용 범위</label><input id="bgTolerance" type="range" min="5" max="100" value="38"><output id="outTolerance">38</output></div>
            <div class="editorNotice"><strong>베타</strong> · 복잡한 인물 사진의 머리카락처럼 경계가 섬세한 배경은 AI 배경 제거보다 정확도가 낮을 수 있어요.</div>
          </div>

          <div class="actions"><button class="btn" id="undoImage">↶ 실행 취소</button><button class="btn" id="redoImage">↷ 다시 실행</button><button class="btn" id="resetImage">원본 복원</button></div>
          <div class="status" id="imageStatus">이미지를 불러와 주세요.</div>
        </div>

        <div class="card imageStageCard">
          <div class="imageStageTop"><div><h2 style="margin:0">미리보기</h2><div class="sub">편집한 결과를 PNG 또는 JPG로 저장할 수 있어요.</div></div><div class="actions"><button class="btn primary" id="savePng" disabled>PNG 저장</button><button class="btn" id="saveJpg" disabled>JPG 저장</button></div></div>
          <div class="imageStage" id="imageStage"><div class="imageEmpty" id="imageEmpty">이미지를 불러오면<br>여기에 편집 화면이 나타나요.</div><div class="imageCanvasWrap" id="imageCanvasWrap" hidden><canvas class="imageCanvas" id="imageCanvas"></canvas><div class="cropBox" id="cropBox"></div></div></div>
          <div class="imageMeta" id="imageMeta"></div>
        </div>
      </div>`;
    const wrapRoot = document.querySelector('.wrap');
    const random = document.getElementById('tool-random');
    if (random) random.insertAdjacentElement('afterend', section);
    else wrapRoot.appendChild(section);
    bindEditor();

    const initial = new URLSearchParams(location.search).get('tool');
    if (initial === 'image') {
      if (window.openTool) window.openTool('image', false);
      else showImageTool();
    }
  }

  function showImageTool() {
    document.querySelectorAll('.toolTab').forEach(b => b.classList.toggle('active', b.dataset.tool === 'image'));
    document.querySelectorAll('.toolView').forEach(v => v.classList.toggle('active', v.id === 'tool-image'));
    history.replaceState(null, '', '?tool=image');
  }

  function bindEditor() {
    canvas = document.getElementById('imageCanvas');
    ctx = canvas.getContext('2d', { willReadFrequently: true });
    wrap = document.getElementById('imageCanvasWrap');
    cropBox = document.getElementById('cropBox');

    const input = document.getElementById('imageFile');
    const drop = document.getElementById('imageDrop');
    input.addEventListener('change', () => input.files[0] && loadFile(input.files[0]));
    ['dragenter','dragover'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('drag'); }));
    ['dragleave','drop'].forEach(type => drop.addEventListener(type, e => { e.preventDefault(); drop.classList.remove('drag'); }));
    drop.addEventListener('drop', e => { const file = e.dataTransfer.files?.[0]; if (file?.type.startsWith('image/')) loadFile(file); });

    document.querySelectorAll('.editorTab').forEach(btn => btn.addEventListener('click', () => setEditMode(btn.dataset.edit)));
    document.querySelectorAll('[data-ratio]').forEach(btn => btn.addEventListener('click', () => {
      document.querySelectorAll('[data-ratio]').forEach(x => x.classList.toggle('active', x === btn));
      cropRect = null; hideCrop();
    }));

    ['filterBrightness','filterContrast','filterSaturation'].forEach(id => {
      document.getElementById(id).addEventListener('input', () => {
        document.getElementById(id.replace('filter','out')).value = document.getElementById(id).value;
        previewFilter();
      });
    });
    document.querySelectorAll('[data-filter-preset]').forEach(btn => btn.addEventListener('click', () => applyPreset(btn.dataset.filterPreset)));
    document.getElementById('applyFilter').addEventListener('click', commitFilter);
    document.getElementById('applyCrop').addEventListener('click', applyCrop);
    document.getElementById('cancelCrop').addEventListener('click', () => { cropRect = null; hideCrop(); imageStatus('선택을 취소했어요.'); });
    document.getElementById('bgTolerance').addEventListener('input', e => document.getElementById('outTolerance').value = e.target.value);
    document.getElementById('undoImage').addEventListener('click', undo);
    document.getElementById('redoImage').addEventListener('click', redo);
    document.getElementById('resetImage').addEventListener('click', resetOriginal);
    document.getElementById('savePng').addEventListener('click', () => saveImage('png'));
    document.getElementById('saveJpg').addEventListener('click', () => saveImage('jpg'));

    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    canvas.addEventListener('pointerup', pointerUp);
    canvas.addEventListener('pointercancel', pointerUp);
  }

  function setEditMode(mode) {
    document.querySelectorAll('.editorTab').forEach(b => b.classList.toggle('active', b.dataset.edit === mode));
    document.querySelectorAll('.editorPanel').forEach(p => p.classList.toggle('active', p.id === 'edit-' + mode));
    interaction = mode;
    if (mode !== 'crop') { cropRect = null; hideCrop(); }
    if (mode !== 'filter') filterBase = null;
    if (loaded) imageStatus(mode === 'removebg' ? '사진에서 지울 배경 부분을 눌러 주세요.' : '편집할 수 있어요.', 'ok');
  }

  function loadFile(file) {
    if (!file.type.startsWith('image/')) return imageStatus('이미지 파일을 선택해 주세요.', 'bad');
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        originalDataUrl = canvas.toDataURL('image/png');
        loaded = true;
        document.getElementById('imageEmpty').hidden = true;
        wrap.hidden = false;
        document.getElementById('savePng').disabled = false;
        document.getElementById('saveJpg').disabled = false;
        history = []; historyIndex = -1; pushHistory();
        resetFilterControls();
        updateMeta();
        imageStatus(scale < 1 ? `큰 이미지를 ${canvas.width}×${canvas.height}px로 줄여 불러왔어요.` : '이미지를 불러왔어요.', 'ok');
      };
      img.onerror = () => imageStatus('이미지를 읽지 못했어요.', 'bad');
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  }

  function imageStatus(text, type='') {
    const el = document.getElementById('imageStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'status' + (type ? ' ' + type : '');
  }

  function resetFilterControls() {
    ['Brightness','Contrast','Saturation'].forEach(name => {
      document.getElementById('filter' + name).value = 0;
      document.getElementById('out' + name).value = 0;
    });
    filterBase = null;
  }

  function previewFilter() {
    if (!loaded) return imageStatus('먼저 이미지를 불러와 주세요.', 'bad');
    if (!filterBase) filterBase = ctx.getImageData(0,0,canvas.width,canvas.height);
    cancelAnimationFrame(filterRaf);
    filterRaf = requestAnimationFrame(() => {
      const b = Number(document.getElementById('filterBrightness').value);
      const c = Number(document.getElementById('filterContrast').value);
      const s = Number(document.getElementById('filterSaturation').value);
      const src = filterBase.data;
      const out = new ImageData(new Uint8ClampedArray(src), filterBase.width, filterBase.height);
      const d = out.data;
      const add = b * 2.55;
      const cv = c * 2.55;
      const cf = (259 * (cv + 255)) / (255 * (259 - cv));
      const sat = 1 + s / 100;
      for (let i=0;i<d.length;i+=4) {
        let r = cf * (d[i] - 128) + 128 + add;
        let g = cf * (d[i+1] - 128) + 128 + add;
        let bl = cf * (d[i+2] - 128) + 128 + add;
        const gray = 0.2126*r + 0.7152*g + 0.0722*bl;
        d[i] = gray + (r-gray)*sat;
        d[i+1] = gray + (g-gray)*sat;
        d[i+2] = gray + (bl-gray)*sat;
      }
      ctx.putImageData(out,0,0);
      imageStatus('필터 미리보기 중이에요. 적용을 누르면 확정돼요.');
    });
  }

  function applyPreset(name) {
    if (!loaded) return imageStatus('먼저 이미지를 불러와 주세요.', 'bad');
    const b = document.getElementById('filterBrightness');
    const c = document.getElementById('filterContrast');
    const s = document.getElementById('filterSaturation');
    if (name === 'gray') { b.value=0; c.value=8; s.value=-100; }
    if (name === 'warm') { b.value=5; c.value=6; s.value=18; }
    if (name === 'cool') { b.value=3; c.value=8; s.value=8; }
    if (name === 'reset') { b.value=0; c.value=0; s.value=0; }
    ['Brightness','Contrast','Saturation'].forEach(n => document.getElementById('out'+n).value = document.getElementById('filter'+n).value);
    previewFilter();
  }

  function commitFilter() {
    if (!loaded) return imageStatus('먼저 이미지를 불러와 주세요.', 'bad');
    if (!filterBase) return imageStatus('변경한 필터가 없어요.');
    pushHistory();
    filterBase = null;
    resetFilterControls();
    imageStatus('필터를 적용했어요.', 'ok');
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(canvas.width, (e.clientX-r.left) * canvas.width/r.width)),
      y: Math.max(0, Math.min(canvas.height, (e.clientY-r.top) * canvas.height/r.height)),
      cssX: Math.max(0, Math.min(r.width, e.clientX-r.left)),
      cssY: Math.max(0, Math.min(r.height, e.clientY-r.top)),
      rect: r
    };
  }

  function pointerDown(e) {
    if (!loaded) return;
    const mode = document.querySelector('.editorTab.active')?.dataset.edit || 'filter';
    if (mode === 'filter') return;
    canvas.setPointerCapture?.(e.pointerId);
    const p = pointerPos(e);
    if (mode === 'draw') {
      pushHistory();
      interaction = { type:'draw', x:p.x, y:p.y };
      ctx.strokeStyle = document.getElementById('drawColor').value;
      ctx.lineWidth = Math.max(1, Number(document.getElementById('drawSize').value));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(p.x,p.y);
    } else if (mode === 'mosaic') {
      pushHistory(); interaction = { type:'mosaic' }; mosaicAt(p.x,p.y);
    } else if (mode === 'crop') {
      cropStart = p; interaction = { type:'crop' }; cropRect = {x:p.x,y:p.y,w:0,h:0}; updateCropBox();
    } else if (mode === 'removebg') {
      pushHistory(); removeConnectedBackground(Math.floor(p.x),Math.floor(p.y));
    }
    e.preventDefault();
  }

  function pointerMove(e) {
    if (!loaded || !interaction || typeof interaction !== 'object') return;
    const p = pointerPos(e);
    if (interaction.type === 'draw') {
      ctx.lineTo(p.x,p.y); ctx.stroke(); interaction.x=p.x;interaction.y=p.y;
    } else if (interaction.type === 'mosaic') {
      mosaicAt(p.x,p.y);
    } else if (interaction.type === 'crop' && cropStart) {
      let x2=p.x,y2=p.y;
      const ratioBtn=document.querySelector('[data-ratio].active');
      const ratio=ratioBtn?.dataset.ratio==='free'?null:Number(ratioBtn?.dataset.ratio);
      if (ratio) {
        let dx=x2-cropStart.x,dy=y2-cropStart.y;
        const signX=dx<0?-1:1,signY=dy<0?-1:1;
        if (Math.abs(dx)/Math.max(1,Math.abs(dy))>ratio) dy=signY*Math.abs(dx)/ratio;
        else dx=signX*Math.abs(dy)*ratio;
        x2=Math.max(0,Math.min(canvas.width,cropStart.x+dx));
        y2=Math.max(0,Math.min(canvas.height,cropStart.y+dy));
      }
      cropRect={x:Math.min(cropStart.x,x2),y:Math.min(cropStart.y,y2),w:Math.abs(x2-cropStart.x),h:Math.abs(y2-cropStart.y)};
      updateCropBox();
    }
    e.preventDefault();
  }

  function pointerUp(e) {
    if (!interaction || typeof interaction !== 'object') return;
    if (interaction.type === 'draw') ctx.closePath();
    if (interaction.type === 'draw' || interaction.type === 'mosaic') updateMeta();
    interaction = null;
    try { canvas.releasePointerCapture?.(e.pointerId); } catch(_) {}
  }

  function mosaicAt(x,y) {
    const size = Math.max(8, Math.min(100, Number(document.getElementById('mosaicSize').value)||28));
    const half=size/2;
    const sx=Math.max(0,Math.floor(x-half)), sy=Math.max(0,Math.floor(y-half));
    const sw=Math.min(size,canvas.width-sx), sh=Math.min(size,canvas.height-sy);
    if(sw<1||sh<1)return;
    const block=Math.max(4,Math.round(size/5));
    const temp=document.createElement('canvas');temp.width=Math.max(1,Math.ceil(sw/block));temp.height=Math.max(1,Math.ceil(sh/block));
    const t=temp.getContext('2d');t.imageSmoothingEnabled=false;t.drawImage(canvas,sx,sy,sw,sh,0,0,temp.width,temp.height);
    ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(temp,0,0,temp.width,temp.height,sx,sy,sw,sh);ctx.restore();
  }

  function updateCropBox() {
    if (!cropRect || cropRect.w < 2 || cropRect.h < 2) return hideCrop();
    const r=canvas.getBoundingClientRect();
    cropBox.style.display='block';
    cropBox.style.left=(cropRect.x/canvas.width*r.width)+'px';
    cropBox.style.top=(cropRect.y/canvas.height*r.height)+'px';
    cropBox.style.width=(cropRect.w/canvas.width*r.width)+'px';
    cropBox.style.height=(cropRect.h/canvas.height*r.height)+'px';
  }
  function hideCrop(){if(cropBox)cropBox.style.display='none'}

  function applyCrop() {
    if (!loaded) return imageStatus('먼저 이미지를 불러와 주세요.', 'bad');
    if (!cropRect || cropRect.w<5 || cropRect.h<5) return imageStatus('사진 위에서 자를 영역을 드래그해 주세요.', 'bad');
    pushHistory();
    const x=Math.round(cropRect.x),y=Math.round(cropRect.y),w=Math.max(1,Math.round(cropRect.w)),h=Math.max(1,Math.round(cropRect.h));
    const temp=document.createElement('canvas');temp.width=w;temp.height=h;temp.getContext('2d').drawImage(canvas,x,y,w,h,0,0,w,h);
    canvas.width=w;canvas.height=h;ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(temp,0,0);
    cropRect=null;cropStart=null;hideCrop();filterBase=null;pushHistory();updateMeta();imageStatus('선택한 영역으로 잘랐어요.','ok');
  }

  function removeConnectedBackground(startX,startY) {
    if(startX<0||startY<0||startX>=canvas.width||startY>=canvas.height)return;
    const img=ctx.getImageData(0,0,canvas.width,canvas.height),d=img.data,w=canvas.width,h=canvas.height,n=w*h;
    const start=(startY*w+startX)*4,tr=d[start],tg=d[start+1],tb=d[start+2];
    const tol=Number(document.getElementById('bgTolerance').value)||38;
    const tol2=tol*tol*3;
    const seen=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;queue[tail++]=startY*w+startX;seen[startY*w+startX]=1;let removed=0;
    while(head<tail){const idx=queue[head++],x=idx%w,y=(idx/w)|0,p=idx*4;const dr=d[p]-tr,dg=d[p+1]-tg,db=d[p+2]-tb;if(dr*dr+dg*dg+db*db>tol2)continue;d[p+3]=0;removed++;
      if(x>0){const q=idx-1;if(!seen[q]){seen[q]=1;queue[tail++]=q}}
      if(x<w-1){const q=idx+1;if(!seen[q]){seen[q]=1;queue[tail++]=q}}
      if(y>0){const q=idx-w;if(!seen[q]){seen[q]=1;queue[tail++]=q}}
      if(y<h-1){const q=idx+w;if(!seen[q]){seen[q]=1;queue[tail++]=q}}
    }
    ctx.putImageData(img,0,0);filterBase=null;pushHistory();updateMeta();imageStatus(`${removed.toLocaleString()}픽셀의 연결된 배경을 투명하게 만들었어요.`,'ok');
  }

  function pushHistory() {
    if (!loaded) return;
    const url=canvas.toDataURL('image/png');
    if (history[historyIndex]===url) return;
    history=history.slice(0,historyIndex+1);history.push(url);if(history.length>12)history.shift();historyIndex=history.length-1;updateHistoryButtons();
  }
  function restoreDataUrl(url) {
    const img=new Image();img.onload=()=>{canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0);filterBase=null;cropRect=null;hideCrop();updateMeta();updateHistoryButtons()};img.src=url;
  }
  function undo(){if(historyIndex<=0)return;historyIndex--;restoreDataUrl(history[historyIndex]);imageStatus('이전 상태로 되돌렸어요.','ok')}
  function redo(){if(historyIndex>=history.length-1)return;historyIndex++;restoreDataUrl(history[historyIndex]);imageStatus('다시 적용했어요.','ok')}
  function updateHistoryButtons(){const u=document.getElementById('undoImage'),r=document.getElementById('redoImage');if(u)u.disabled=historyIndex<=0;if(r)r.disabled=historyIndex>=history.length-1}
  function resetOriginal(){if(!originalDataUrl)return;restoreDataUrl(originalDataUrl);history=[];historyIndex=-1;setTimeout(()=>pushHistory(),0);resetFilterControls();imageStatus('원본으로 복원했어요.','ok')}

  function updateMeta(){if(!loaded)return;document.getElementById('imageMeta').textContent=`${canvas.width} × ${canvas.height}px · 편집은 이 기기에서만 처리됩니다.`}
  function saveImage(type){if(!loaded)return;const a=document.createElement('a');if(type==='jpg'){const temp=document.createElement('canvas');temp.width=canvas.width;temp.height=canvas.height;const t=temp.getContext('2d');t.fillStyle='#fff';t.fillRect(0,0,temp.width,temp.height);t.drawImage(canvas,0,0);a.href=temp.toDataURL('image/jpeg',.92);a.download='O.Poong-image.jpg'}else{a.href=canvas.toDataURL('image/png');a.download='O.Poong-image.png'}a.click();imageStatus(`${type.toUpperCase()}로 저장했어요.`,'ok')}

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addImageTool, { once:true });
  else addImageTool();
})();