(() => {
  'use strict';

  let img = null;
  let sourceFile = null;
  let canvas = null;
  let ctx = null;
  let lastBlob = null;

  function formatBytes(n){
    if(!Number.isFinite(n)) return '-';
    if(n < 1024) return `${n} B`;
    if(n < 1024*1024) return `${(n/1024).toFixed(1)} KB`;
    return `${(n/1024/1024).toFixed(2)} MB`;
  }

  function injectStyles(){
    if(document.getElementById('imageCompressStyles')) return;
    const s=document.createElement('style');s.id='imageCompressStyles';s.textContent=`
      .compressLayout{display:grid;grid-template-columns:minmax(280px,.72fr) minmax(0,1.28fr);gap:14px}.compressDrop{display:block;border:2px dashed var(--line);border-radius:22px;padding:24px;text-align:center;background:var(--card2);cursor:pointer}.compressDrop input{display:none}.compressDrop b{display:block;font-size:17px}.compressDrop p{margin:7px 0 0;color:var(--muted);font-size:12px;font-weight:800;line-height:1.55}.compressControls{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:12px}.compressControl{padding:10px;border:1px solid var(--line);border-radius:15px;background:var(--card2)}.compressControl label{display:block;font-size:11px;font-weight:900;margin-bottom:6px}.compressControl input,.compressControl select{width:100%;padding:10px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text)}.compressQuality{grid-column:1/-1}.compressPreview{min-height:430px;border:1px solid var(--line);border-radius:22px;background:repeating-conic-gradient(#e5e7eb 0 25%,#f8fafc 0 50%) 50%/20px 20px;display:grid;place-items:center;overflow:auto;padding:16px}.compressPreview canvas{display:block;max-width:100%;max-height:650px;border-radius:12px;box-shadow:0 14px 34px rgba(15,23,42,.16)}.compressStats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.compressStat{padding:10px;border:1px solid var(--line);border-radius:14px;background:var(--card2);text-align:center}.compressStat span{display:block;color:var(--muted);font-size:10px;font-weight:850}.compressStat strong{display:block;margin-top:4px;font-size:14px}.compressEmpty{color:#64748b;font-weight:850;text-align:center;line-height:1.7}.compressNotice{margin-top:10px;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--card2);color:var(--muted);font-size:11px;font-weight:800;line-height:1.55}.compressActions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.compressActions .btn{flex:1;min-width:130px}@media(max-width:760px){.compressLayout{grid-template-columns:1fr}.compressStats{grid-template-columns:1fr 1fr}.compressPreview{min-height:320px}}
    `;document.head.appendChild(s);
  }

  function addTool(){
    const tabs=document.querySelector('.toolTabs');
    if(!tabs || document.querySelector('[data-tool="compress"]')) return;
    const btn=document.createElement('button');btn.className='toolTab';btn.dataset.tool='compress';btn.innerHTML='이미지 압축<span>크기·용량 줄이기</span>';btn.onclick=()=>window.openTool?window.openTool('compress'):showTool();tabs.appendChild(btn);
    const section=document.createElement('section');section.className='toolView';section.id='tool-compress';section.innerHTML=`
      <div class="compressLayout">
        <div class="card">
          <h2>이미지 크기·용량 줄이기</h2>
          <div class="sub">이미지는 브라우저 안에서만 처리되고 서버로 전송되지 않아요.</div>
          <label class="compressDrop" id="compressDrop"><input type="file" id="compressFile" accept="image/*"><b>이미지 선택</b><p>JPG · PNG · WEBP 등 이미지를 불러오세요.</p></label>
          <div class="compressControls">
            <div class="compressControl"><label>가로 px</label><input id="compressWidth" type="number" min="32" max="10000" value="1200"></div>
            <div class="compressControl"><label>세로 px</label><input id="compressHeight" type="number" min="32" max="10000" value="800"></div>
            <div class="compressControl"><label>출력 형식</label><select id="compressFormat"><option value="image/jpeg">JPG</option><option value="image/webp">WEBP</option><option value="image/png">PNG</option></select></div>
            <div class="compressControl"><label>비율 유지</label><select id="compressLock"><option value="1">유지</option><option value="0">직접 지정</option></select></div>
            <div class="compressControl compressQuality"><label>품질 <span id="compressQualityValue">82%</span></label><input id="compressQuality" type="range" min="20" max="100" value="82"></div>
          </div>
          <div class="compressActions"><button class="btn primary" id="compressRun" disabled>압축하기</button><button class="btn" id="compressHalf" disabled>가로·세로 50%</button><button class="btn" id="compressDownload" disabled>결과 저장</button></div>
          <div class="compressNotice">PNG는 무손실이라 품질 슬라이더 영향이 작아요. 사진 용량을 크게 줄이려면 JPG 또는 WEBP를 추천해요.</div>
        </div>
        <div class="card">
          <div class="imageStageTop"><div><h2 style="margin:0">결과 미리보기</h2><div class="sub">압축 전후 크기와 파일 용량을 비교해요.</div></div></div>
          <div class="compressPreview" id="compressPreview"><div class="compressEmpty" id="compressEmpty">이미지를 불러오면<br>여기에 결과가 표시돼요.</div><canvas id="compressCanvas" hidden></canvas></div>
          <div class="compressStats"><div class="compressStat"><span>원본 용량</span><strong id="compressOriginalSize">-</strong></div><div class="compressStat"><span>결과 용량</span><strong id="compressResultSize">-</strong></div><div class="compressStat"><span>원본 크기</span><strong id="compressOriginalDim">-</strong></div><div class="compressStat"><span>결과 크기</span><strong id="compressResultDim">-</strong></div></div>
          <div class="status" id="compressStatus">이미지를 선택해 주세요.</div>
        </div>
      </div>`;
    const root=document.querySelector('.wrap');const random=document.getElementById('tool-random');if(random)random.insertAdjacentElement('afterend',section);else root?.appendChild(section);
    bind();
    const initial=new URLSearchParams(location.search).get('tool');if(initial==='compress'){if(window.openTool)window.openTool('compress',false);else showTool();}
  }

  function showTool(){document.querySelectorAll('.toolTab').forEach(b=>b.classList.toggle('active',b.dataset.tool==='compress'));document.querySelectorAll('.toolView').forEach(v=>v.classList.toggle('active',v.id==='tool-compress'));history.replaceState(null,'','?tool=compress');}
  function status(msg,bad=false){const el=document.getElementById('compressStatus');if(el){el.textContent=msg;el.className=`status${bad?' bad':' ok'}`;}}

  function bind(){
    canvas=document.getElementById('compressCanvas');ctx=canvas.getContext('2d');const input=document.getElementById('compressFile');const drop=document.getElementById('compressDrop');input.addEventListener('change',()=>input.files?.[0]&&load(input.files[0]));['dragenter','dragover'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.style.borderColor='var(--pri)';}));['dragleave','drop'].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault();drop.style.borderColor='';}));drop.addEventListener('drop',e=>{const f=e.dataTransfer.files?.[0];if(f?.type.startsWith('image/'))load(f);});
    document.getElementById('compressQuality').addEventListener('input',e=>document.getElementById('compressQualityValue').textContent=`${e.target.value}%`);
    document.getElementById('compressWidth').addEventListener('input',e=>syncDimension('w',Number(e.target.value)));
    document.getElementById('compressHeight').addEventListener('input',e=>syncDimension('h',Number(e.target.value)));
    document.getElementById('compressHalf').addEventListener('click',()=>{if(!img)return;document.getElementById('compressWidth').value=Math.max(32,Math.round(img.naturalWidth*.5));document.getElementById('compressHeight').value=Math.max(32,Math.round(img.naturalHeight*.5));run();});
    document.getElementById('compressRun').addEventListener('click',run);document.getElementById('compressDownload').addEventListener('click',download);
  }

  function syncDimension(which,value){if(!img||document.getElementById('compressLock').value!=='1'||!value)return;const ratio=img.naturalWidth/img.naturalHeight;if(which==='w')document.getElementById('compressHeight').value=Math.max(32,Math.round(value/ratio));else document.getElementById('compressWidth').value=Math.max(32,Math.round(value*ratio));}

  function load(file){
    if(!file.type.startsWith('image/'))return status('이미지 파일만 사용할 수 있어요.',true);sourceFile=file;const url=URL.createObjectURL(file);const image=new Image();image.onload=()=>{img=image;document.getElementById('compressWidth').value=image.naturalWidth;document.getElementById('compressHeight').value=image.naturalHeight;document.getElementById('compressOriginalSize').textContent=formatBytes(file.size);document.getElementById('compressOriginalDim').textContent=`${image.naturalWidth}×${image.naturalHeight}`;document.getElementById('compressRun').disabled=false;document.getElementById('compressHalf').disabled=false;URL.revokeObjectURL(url);run();};image.onerror=()=>{URL.revokeObjectURL(url);status('이미지를 읽지 못했어요.',true);};image.src=url;
  }

  function run(){
    if(!img)return;const w=Math.max(32,Math.min(10000,Number(document.getElementById('compressWidth').value)||img.naturalWidth)),h=Math.max(32,Math.min(10000,Number(document.getElementById('compressHeight').value)||img.naturalHeight));const type=document.getElementById('compressFormat').value,q=Number(document.getElementById('compressQuality').value)/100;canvas.width=w;canvas.height=h;ctx.clearRect(0,0,w,h);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(type==='image/jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}ctx.drawImage(img,0,0,w,h);canvas.hidden=false;document.getElementById('compressEmpty').hidden=true;status('압축 결과를 만드는 중…');canvas.toBlob(blob=>{if(!blob)return status('결과 파일을 만들지 못했어요.',true);lastBlob=blob;document.getElementById('compressResultSize').textContent=formatBytes(blob.size);document.getElementById('compressResultDim').textContent=`${w}×${h}`;document.getElementById('compressDownload').disabled=false;const saved=sourceFile?.size?Math.max(0,Math.round((1-blob.size/sourceFile.size)*100)):0;status(blob.size<sourceFile.size?`완료 · 원본보다 약 ${saved}% 작아졌어요.`:'완료 · 설정에 따라 원본보다 용량이 커질 수도 있어요.');},type,type==='image/png'?undefined:q);
  }

  function download(){if(!lastBlob)return;const type=document.getElementById('compressFormat').value,ext=type==='image/png'?'png':type==='image/webp'?'webp':'jpg',base=(sourceFile?.name||'image').replace(/\.[^.]+$/,'');const url=URL.createObjectURL(lastBlob),a=document.createElement('a');a.href=url;a.download=`${base}-compressed.${ext}`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);}

  function install(){injectStyles();if(document.querySelector('.toolTabs'))addTool();else setTimeout(install,120);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();