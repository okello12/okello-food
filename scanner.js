(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const input=$('barcodeInput');
  const lookupBtn=$('lookupBarcodeBtn');
  if(!input||!lookupBtn)return;

  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isiPhone=/iPhone|iPod/i.test(navigator.userAgent);

  const style=document.createElement('style');
  style.textContent=`
    .barcode-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .scan-btn{min-height:48px;border:0;border-radius:12px;background:#1E4235;color:#fff;font-weight:800;padding:11px 16px;touch-action:manipulation;pointer-events:auto}
    .scan-btn svg{width:20px;height:20px;vertical-align:-4px;margin-right:7px;fill:none;stroke:currentColor;stroke-width:2}
    .scanner-sheet[hidden]{display:none!important}.scanner-sheet{position:fixed;inset:0;z-index:2600;background:rgba(10,18,14,.72);display:flex;align-items:flex-end;justify-content:center;padding:14px}
    .scanner-panel{width:min(620px,100%);max-height:92%;overflow:auto;background:#FAF8F3;border-radius:24px 24px 18px 18px;padding:18px;box-shadow:0 22px 70px rgba(0,0,0,.28)}
    .scanner-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.scanner-head h3{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;color:#1E4235;margin:0;font-size:1.45rem}.scanner-head p{margin:4px 0 0;color:#657067;font-size:.88rem}
    .scanner-close{width:44px;height:44px;border-radius:50%;border:1px solid #DDD6C7;background:#fff;color:#14231C;font-size:1.25rem;font-weight:800;touch-action:manipulation}
    .scanner-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin:10px 0}.scanner-action{min-height:46px;border-radius:12px;font-weight:850;padding:10px 12px;touch-action:manipulation;text-align:center;display:flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}.scanner-action.primary{border:0;background:#1E4235;color:#fff}.scanner-action.secondary{border:1px solid #1E4235;background:#fff;color:#1E4235}.scanner-action.full{grid-column:1/-1}
    .scanner-frame[hidden]{display:none!important}.scanner-frame{position:relative;overflow:hidden;border-radius:18px;background:#0e1411;min-height:280px;border:1px solid #2d4438}.scannerReader{min-height:280px}.scannerReader video{width:100%!important;height:auto!important;display:block;border-radius:16px}.scannerReader img{max-width:100%}.scanner-target{pointer-events:none;position:absolute;left:10%;right:10%;top:50%;transform:translateY(-50%);height:112px;border:3px solid rgba(255,255,255,.9);border-radius:18px;box-shadow:0 0 0 999px rgba(0,0,0,.18)}.scanner-line{position:absolute;left:14%;right:14%;top:50%;height:2px;background:#B8862B;box-shadow:0 0 10px rgba(184,134,43,.8);animation:okScan 1.8s ease-in-out infinite alternate}@keyframes okScan{from{transform:translateY(-38px)}to{transform:translateY(38px)}}
    .scanner-status{margin:12px 0 0;color:#657067;font-size:.9rem;min-height:1.4em}.scanner-status.good{color:#326B51;font-weight:700}.scanner-status.bad{color:#A63A20;font-weight:700}.scanner-help{margin:10px 0 0;color:#657067;font-size:.8rem}.scanner-pwa-note{padding:10px 11px;border-radius:12px;background:#f5f0df;color:#6b5519;font-size:.8rem;margin:9px 0}
    @media(max-width:520px){.barcode-actions,.scanner-actions{grid-template-columns:1fr}.scanner-action.full{grid-column:auto}.scanner-panel{padding:14px}.scanner-frame,.scannerReader{min-height:250px}}
    @media(prefers-reduced-motion:reduce){.scanner-line{animation:none}}
  `;
  document.head.appendChild(style);

  const originalLookupParent=lookupBtn.parentElement;
  const actions=document.createElement('div');actions.className='barcode-actions';
  const scanBtn=document.createElement('button');scanBtn.type='button';scanBtn.id='scanBarcodeBtn';scanBtn.className='scan-btn';scanBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>Scan barcode';
  if(originalLookupParent&&originalLookupParent.classList.contains('barcode-row')){lookupBtn.remove();actions.append(scanBtn,lookupBtn);originalLookupParent.insertAdjacentElement('afterend',actions);}else{lookupBtn.insertAdjacentElement('beforebegin',scanBtn);}

  const sheet=document.createElement('div');sheet.className='scanner-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','scannerTitle');sheet.innerHTML=`
    <div class="scanner-panel">
      <div class="scanner-head"><div><h3 id="scannerTitle">Scan food barcode</h3><p>Use the live camera, or take a barcode photo.</p></div><button type="button" class="scanner-close" id="scannerCloseBtn" aria-label="Close scanner">×</button></div>
      ${standalone&&isiPhone?'<div class="scanner-pwa-note">Installed iPhone web apps can behave differently from Safari with camera permissions. The photo option is the most reliable fallback.</div>':''}
      <div class="scanner-actions">
        <button id="scannerStartLiveBtn" class="scanner-action primary" type="button">Start live camera</button>
        <label id="scannerTakePhotoLabel" class="scanner-action secondary" for="scannerPhotoInput" role="button" tabindex="0">Take barcode photo</label>
        ${standalone&&isiPhone?'<button id="scannerOpenSafariBtn" class="scanner-action secondary full" type="button">Open Okello Food in Safari</button>':''}
      </div>
      <input id="scannerPhotoInput" type="file" accept="image/*" capture="environment" hidden>
      <div id="scannerFrame" class="scanner-frame" hidden><div id="scannerReader" class="scannerReader"></div><div class="scanner-target" aria-hidden="true"></div><div class="scanner-line" aria-hidden="true"></div></div>
      <div id="scannerStatus" class="scanner-status" aria-live="polite">Choose live camera or barcode photo.</div>
      <p class="scanner-help">You can always type the barcode manually on the Foods screen if camera access is unavailable.</p>
    </div>`;
  document.body.appendChild(sheet);

  const closeBtn=$('scannerCloseBtn'),status=$('scannerStatus'),frame=$('scannerFrame'),photoInput=$('scannerPhotoInput'),startBtn=$('scannerStartLiveBtn'),photoLabel=$('scannerTakePhotoLabel');
  let scanner=null,closing=false,found=false,libraryPromise=null;

  function setStatus(message,kind=''){status.textContent=message;status.className='scanner-status'+(kind?' '+kind:'');}
  function loadScannerLibrary(){
    if(window.Html5Qrcode)return Promise.resolve();
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-okello-scanner-lib]');
      if(existing){
        if(existing.dataset.loaded==='1')return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>{libraryPromise=null;reject(new Error('scanner library failed'));},{once:true});
        return;
      }
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';s.async=true;s.dataset.okelloScannerLib='1';
      s.onload=()=>{s.dataset.loaded='1';resolve();};
      s.onerror=()=>{libraryPromise=null;reject(new Error('scanner library failed'));};
      document.head.appendChild(s);
    });
    return libraryPromise;
  }

  async function stopScanner(){if(closing)return;closing=true;try{if(scanner&&scanner.isScanning)await scanner.stop();if(scanner)await scanner.clear();}catch(_){}scanner=null;closing=false;}
  async function closeScanner(){await stopScanner();sheet.hidden=true;frame.hidden=true;document.body.style.overflow='';try{scanBtn.focus({preventScroll:true});}catch(_){}}
  function openScanner(){found=false;sheet.hidden=false;frame.hidden=true;document.body.style.overflow='hidden';setStatus('Choose live camera or barcode photo.');loadScannerLibrary().catch(()=>{});}

  async function onDecoded(text){
    if(found)return;
    const code=String(text||'').replace(/\D/g,'');if(code.length<8)return;
    found=true;input.value=code;setStatus(`Barcode ${code} found. Looking up product…`,'good');
    try{if(navigator.vibrate)navigator.vibrate(60);}catch(_){}
    await stopScanner();
    setTimeout(()=>{sheet.hidden=true;frame.hidden=true;document.body.style.overflow='';lookupBtn.click();input.scrollIntoView({behavior:'smooth',block:'center'});found=false;},220);
  }

  function supportedFormats(){
    if(!window.Html5QrcodeSupportedFormats)return [];
    return [
      window.Html5QrcodeSupportedFormats.EAN_13,
      window.Html5QrcodeSupportedFormats.EAN_8,
      window.Html5QrcodeSupportedFormats.UPC_A,
      window.Html5QrcodeSupportedFormats.UPC_E,
      window.Html5QrcodeSupportedFormats.CODE_128,
      window.Html5QrcodeSupportedFormats.CODE_39,
      window.Html5QrcodeSupportedFormats.ITF
    ].filter(v=>v!==undefined&&v!==null);
  }

  async function startLive(){
    if(startBtn.dataset.busy==='1')return;
    startBtn.dataset.busy='1';
    found=false;frame.hidden=false;setStatus('Requesting camera access…');
    if(!window.isSecureContext){setStatus('Camera scanning needs a secure HTTPS page.','bad');startBtn.dataset.busy='0';return;}
    if(!navigator.mediaDevices?.getUserMedia){setStatus('This browser cannot access the live camera. Use Take barcode photo instead.','bad');startBtn.dataset.busy='0';return;}
    let permissionStream=null;
    try{
      permissionStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
      setStatus('Preparing scanner…');
      await loadScannerLibrary();
      if(!window.Html5Qrcode)throw new Error('scanner library unavailable');
      permissionStream.getTracks().forEach(t=>t.stop());permissionStream=null;
      const formats=supportedFormats();
      const options={verbose:false};if(formats.length)options.formatsToSupport=formats;
      scanner=new window.Html5Qrcode('scannerReader',options);
      await scanner.start({facingMode:{ideal:'environment'}},{fps:10,qrbox:{width:280,height:120},aspectRatio:1.777},onDecoded,()=>{});
      setStatus('Scanning… keep the barcode inside the box.');
    }catch(err){
      console.error(err);
      try{permissionStream?.getTracks().forEach(t=>t.stop());}catch(_){}
      try{await stopScanner();}catch(_){}
      setStatus(standalone&&isiPhone?'Live camera could not start in the installed app. Use Take barcode photo or open in Safari.':'I could not start the camera. Check camera permission or use Take barcode photo.','bad');
    }finally{startBtn.dataset.busy='0';}
  }

  async function scanPhoto(file){
    if(!file)return;
    found=false;frame.hidden=false;setStatus('Reading barcode photo…');
    try{
      await stopScanner();
      await loadScannerLibrary();
      if(!window.Html5Qrcode)throw new Error('scanner library unavailable');
      const formats=supportedFormats();const options={verbose:false};if(formats.length)options.formatsToSupport=formats;
      scanner=new window.Html5Qrcode('scannerReader',options);
      const text=await scanner.scanFile(file,true);
      await onDecoded(text);
    }catch(err){console.error(err);try{await stopScanner();}catch(_){}setStatus('I could not find a barcode in that photo. Try again with the barcode filling most of the frame.','bad');}
    finally{photoInput.value='';}
  }

  function launchHandler(e){
    const target=e.target?.closest?.('#hubScanBtn,#scanBarcodeBtn');
    if(!target)return;
    e.preventDefault();
    e.stopPropagation();
    openScanner();
  }
  document.addEventListener('click',launchHandler,true);

  closeBtn.addEventListener('click',closeScanner);
  startBtn.addEventListener('click',startLive);
  photoInput.addEventListener('change',e=>scanPhoto(e.target.files?.[0]));
  photoLabel.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();photoInput.click();}});
  $('scannerOpenSafariBtn')?.addEventListener('click',()=>{const a=document.createElement('a');a.href=location.href;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();});
  sheet.addEventListener('click',e=>{if(e.target===sheet)closeScanner();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!sheet.hidden)stopScanner();});
  window.addEventListener('pagehide',()=>stopScanner());

  // iOS sometimes drops the synthetic click for controls inside layered web-app UI.
  // These touch fallbacks call scanner actions directly from the trusted touch event.
  if(isiPhone){
    let touch=null,moved=false;const maxMove=12;
    document.addEventListener('touchstart',e=>{
      if(e.touches.length!==1){touch=null;return;}
      const el=e.target?.closest?.('#hubScanBtn,#scanBarcodeBtn,#scannerStartLiveBtn,#scannerCloseBtn');
      if(!el){touch=null;return;}
      const t=e.touches[0];touch={el,x:t.clientX,y:t.clientY};moved=false;
    },{capture:true,passive:true});
    document.addEventListener('touchmove',e=>{if(!touch||!e.touches.length)return;const t=e.touches[0];if(Math.abs(t.clientX-touch.x)>maxMove||Math.abs(t.clientY-touch.y)>maxMove)moved=true;},{capture:true,passive:true});
    document.addEventListener('touchcancel',()=>{touch=null;moved=false;},{capture:true,passive:true});
    document.addEventListener('touchend',e=>{
      const tap=touch;touch=null;
      if(!tap||moved){moved=false;return;}moved=false;
      const end=e.target?.closest?.('#hubScanBtn,#scanBarcodeBtn,#scannerStartLiveBtn,#scannerCloseBtn');
      if(!end||end!==tap.el)return;
      e.preventDefault();
      e.stopPropagation();
      if(end.id==='scannerStartLiveBtn')startLive();
      else if(end.id==='scannerCloseBtn')closeScanner();
      else openScanner();
    },{capture:true,passive:false});
  }

  window.OkelloScanner=Object.freeze({version:3,open:openScanner,startLive,close:closeScanner,scanPhoto});
})();