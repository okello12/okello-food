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
    .scan-btn{min-height:48px;border:0;border-radius:12px;background:#1E4235;color:#fff;font-weight:800;padding:11px 16px;touch-action:manipulation;pointer-events:auto;width:100%}
    .scan-btn svg{width:20px;height:20px;vertical-align:-4px;margin-right:7px;fill:none;stroke:currentColor;stroke-width:2}
    .scanner-sheet[hidden]{display:none!important}.scanner-sheet{position:fixed;inset:0;z-index:2600;background:rgba(10,18,14,.72);display:flex;align-items:flex-end;justify-content:center;padding:14px}
    .scanner-panel{width:min(620px,100%);max-height:92%;overflow:auto;background:#FAF8F3;border-radius:24px 24px 18px 18px;padding:18px;box-shadow:0 22px 70px rgba(0,0,0,.28)}
    .scanner-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}.scanner-head h3{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;color:#1E4235;margin:0;font-size:1.45rem}.scanner-head p{margin:4px 0 0;color:#657067;font-size:.88rem}
    .scanner-close{width:44px;height:44px;border-radius:50%;border:1px solid #DDD6C7;background:#fff;color:#14231C;font-size:1.25rem;font-weight:800;touch-action:manipulation}
    .scanner-actions{display:grid;gap:9px;margin:10px 0}.scanner-action{min-height:50px;border-radius:12px;font-weight:850;padding:11px 13px;touch-action:manipulation;text-align:center;display:flex;align-items:center;justify-content:center;text-decoration:none;cursor:pointer}.scanner-action.primary{border:0;background:#1E4235;color:#fff}.scanner-action.secondary{border:1px solid #1E4235;background:#fff;color:#1E4235}
    .scanner-native-capture,.direct-native-scan{position:relative;overflow:hidden}.scanner-native-capture input,.direct-native-scan input{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-height:0!important;margin:0!important;padding:0!important;opacity:.001!important;cursor:pointer!important;border:0!important;z-index:5}.scanner-native-capture span{pointer-events:none;position:relative;z-index:1}.direct-native-scan>button{position:relative;z-index:1}
    .scanner-frame[hidden]{display:none!important}.scanner-frame{position:relative;overflow:hidden;border-radius:18px;background:#0e1411;min-height:280px;border:1px solid #2d4438}.scannerReader{min-height:280px}.scannerReader video{width:100%!important;height:auto!important;display:block;border-radius:16px}.scannerReader img{max-width:100%}.scanner-target{pointer-events:none;position:absolute;left:10%;right:10%;top:50%;transform:translateY(-50%);height:112px;border:3px solid rgba(255,255,255,.9);border-radius:18px;box-shadow:0 0 0 999px rgba(0,0,0,.18)}.scanner-line{position:absolute;left:14%;right:14%;top:50%;height:2px;background:#B8862B;box-shadow:0 0 10px rgba(184,134,43,.8);animation:okScan 1.8s ease-in-out infinite alternate}@keyframes okScan{from{transform:translateY(-38px)}to{transform:translateY(38px)}}
    .scanner-status{margin:12px 0 0;color:#657067;font-size:.9rem;min-height:1.4em}.scanner-status.good{color:#326B51;font-weight:700}.scanner-status.bad{color:#A63A20;font-weight:700}.scanner-help{margin:10px 0 0;color:#657067;font-size:.8rem}.scanner-pwa-note{padding:10px 11px;border-radius:12px;background:#f5f0df;color:#6b5519;font-size:.8rem;margin:9px 0}
    @media(max-width:520px){.barcode-actions{grid-template-columns:1fr}.scanner-panel{padding:14px}.scanner-frame,.scannerReader{min-height:250px}}
    @media(prefers-reduced-motion:reduce){.scanner-line{animation:none}}
  `;
  document.head.appendChild(style);

  const originalLookupParent=lookupBtn.parentElement;
  const actions=document.createElement('div');actions.className='barcode-actions';
  const scanBtn=document.createElement('button');scanBtn.type='button';scanBtn.id='scanBarcodeBtn';scanBtn.className='scan-btn';scanBtn.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>Scan barcode';
  if(originalLookupParent&&originalLookupParent.classList.contains('barcode-row')){lookupBtn.remove();actions.append(scanBtn,lookupBtn);originalLookupParent.insertAdjacentElement('afterend',actions);}else{lookupBtn.insertAdjacentElement('beforebegin',scanBtn);}

  const sheet=document.createElement('div');sheet.className='scanner-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-labelledby','scannerTitle');sheet.innerHTML=`
    <div class="scanner-panel">
      <div class="scanner-head"><div><h3 id="scannerTitle">Scan food barcode</h3><p>${isiPhone?'Use the iPhone camera. Okello Food will read the barcode from the photo.':'Use the live camera or take a barcode photo.'}</p></div><button type="button" class="scanner-close" id="scannerCloseBtn" aria-label="Close scanner">×</button></div>
      ${standalone&&isiPhone?'<div class="scanner-pwa-note">The installed iPhone app now uses the native camera-photo route instead of the unreliable live browser camera.</div>':''}
      <div class="scanner-actions">
        <div class="scanner-action primary scanner-native-capture"><span>📷 Open camera & scan barcode</span><input id="scannerPhotoInput" type="file" accept="image/*" capture="environment" aria-label="Open camera and scan barcode"></div>
        ${isiPhone?'':'<button id="scannerStartLiveBtn" class="scanner-action secondary" type="button">▣ Start live barcode camera</button>'}
      </div>
      <div id="scannerFrame" class="scanner-frame" hidden><div id="scannerReader" class="scannerReader"></div><div class="scanner-target" aria-hidden="true"></div><div class="scanner-line" aria-hidden="true"></div></div>
      <div id="scannerStatus" class="scanner-status" aria-live="polite">${isiPhone?'Tap Open camera & scan barcode.':'Choose a scan method.'}</div>
      <p class="scanner-help">You can always type the barcode manually on the Foods screen.</p>
    </div>`;
  document.body.appendChild(sheet);

  const closeBtn=$('scannerCloseBtn'),status=$('scannerStatus'),frame=$('scannerFrame'),photoInput=$('scannerPhotoInput'),startBtn=$('scannerStartLiveBtn');
  let scanner=null,closing=false,found=false,libraryPromise=null,lastActivation=0;

  function setStatus(message,kind=''){status.textContent=message;status.className='scanner-status'+(kind?' '+kind:'');}
  function loadScannerLibrary(){
    if(window.Html5Qrcode)return Promise.resolve();
    if(libraryPromise)return libraryPromise;
    libraryPromise=new Promise((resolve,reject)=>{
      const existing=document.querySelector('script[data-okello-scanner-lib]');
      if(existing){
        if(existing.dataset.loaded==='1')return resolve();
        existing.addEventListener('load',resolve,{once:true});
        existing.addEventListener('error',()=>{libraryPromise=null;reject(new Error('scanner-library-load-failed'));},{once:true});
        return;
      }
      const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';s.async=true;s.dataset.okelloScannerLib='1';
      s.onload=()=>{s.dataset.loaded='1';resolve();};
      s.onerror=()=>{libraryPromise=null;reject(new Error('scanner-library-load-failed'));};
      document.head.appendChild(s);
    });
    return libraryPromise;
  }

  async function stopScanner(){if(closing)return;closing=true;try{if(scanner&&scanner.isScanning)await scanner.stop();if(scanner)await scanner.clear();}catch(_){}scanner=null;closing=false;}
  async function closeScanner(){await stopScanner();sheet.hidden=true;frame.hidden=true;document.body.style.overflow='';try{scanBtn.focus({preventScroll:true});}catch(_){}}
  function openScanner(){found=false;sheet.hidden=false;frame.hidden=true;document.body.style.overflow='hidden';setStatus(isiPhone?'Tap Open camera & scan barcode.':'Choose a scan method.');loadScannerLibrary().catch(()=>{});}

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
    return [window.Html5QrcodeSupportedFormats.EAN_13,window.Html5QrcodeSupportedFormats.EAN_8,window.Html5QrcodeSupportedFormats.UPC_A,window.Html5QrcodeSupportedFormats.UPC_E,window.Html5QrcodeSupportedFormats.CODE_128,window.Html5QrcodeSupportedFormats.CODE_39,window.Html5QrcodeSupportedFormats.ITF].filter(v=>v!==undefined&&v!==null);
  }
  function scannerOptions(){const formats=supportedFormats();const options={verbose:false};if(formats.length)options.formatsToSupport=formats;return options;}

  async function startLive(){
    if(!startBtn||startBtn.dataset.busy==='1')return;
    startBtn.dataset.busy='1';found=false;frame.hidden=false;setStatus('Starting live camera…');
    if(!window.isSecureContext){setStatus('Live camera scanning needs HTTPS. Use the camera-photo option instead.','bad');startBtn.dataset.busy='0';return;}
    if(!navigator.mediaDevices?.getUserMedia){setStatus('This browser does not expose live camera access. Use the camera-photo option instead.','bad');startBtn.dataset.busy='0';return;}
    try{
      await loadScannerLibrary();
      if(!window.Html5Qrcode)throw new Error('scanner-library-unavailable');
      scanner=new window.Html5Qrcode('scannerReader',scannerOptions());
      await scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:280,height:120}},onDecoded,()=>{});
      setStatus('Scanning… keep the barcode inside the box.');
    }catch(err){console.error('Okello live scanner:',err);try{await stopScanner();}catch(_){}setStatus('Live camera could not start. Use the camera-photo option instead.','bad');}
    finally{startBtn.dataset.busy='0';}
  }

  async function scanPhoto(file){
    if(!file)return;
    openScanner();found=false;frame.hidden=false;setStatus('Reading barcode from the photo…');
    try{
      await stopScanner();await loadScannerLibrary();
      if(!window.Html5Qrcode)throw new Error('scanner-library-unavailable');
      scanner=new window.Html5Qrcode('scannerReader',scannerOptions());
      const text=await scanner.scanFile(file,true);await onDecoded(text);
    }catch(err){console.error('Okello photo scanner:',err);try{await stopScanner();}catch(_){}setStatus(String(err?.message||'').includes('scanner-library')?'The barcode reader could not load. Check your connection and retry.':'I could not find a barcode in that photo. Retake it with the barcode large, sharp and well lit.','bad');}
    finally{photoInput.value='';}
  }

  function createDirectCapture(button,id){
    if(!isiPhone||!button||button.dataset.nativeScan==='1')return;
    const wrapper=document.createElement('span');wrapper.className='direct-native-scan';wrapper.style.display='inline-block';wrapper.style.position='relative';wrapper.style.width=getComputedStyle(button).display==='block'?'100%':'';
    button.parentNode.insertBefore(wrapper,button);wrapper.appendChild(button);
    const capture=document.createElement('input');capture.id=id;capture.type='file';capture.accept='image/*';capture.setAttribute('capture','environment');capture.setAttribute('aria-label','Open camera and scan barcode');
    capture.addEventListener('change',e=>{const file=e.target.files?.[0];if(file)scanPhoto(file);capture.value='';});
    wrapper.appendChild(capture);button.dataset.nativeScan='1';
  }

  function runLaunch(e){
    if(isiPhone)return;
    const now=Date.now();if(now-lastActivation<450)return;lastActivation=now;
    e?.preventDefault?.();e?.stopPropagation?.();openScanner();
  }
  function bindLaunchButton(el){
    if(!el||el.dataset.okelloScannerBound==='1')return;
    el.dataset.okelloScannerBound='1';
    if(isiPhone){createDirectCapture(el,`nativeScan_${el.id}`);return;}
    el.addEventListener('click',runLaunch);
  }

  bindLaunchButton(scanBtn);
  const bindHub=()=>bindLaunchButton($('hubScanBtn'));
  bindHub();
  const hubObserver=new MutationObserver(()=>{bindHub();if($('hubScanBtn'))hubObserver.disconnect();});
  hubObserver.observe(document.body,{childList:true,subtree:true});

  closeBtn.addEventListener('click',closeScanner);
  if(startBtn)startBtn.addEventListener('click',startLive);
  photoInput.addEventListener('change',e=>scanPhoto(e.target.files?.[0]));
  sheet.addEventListener('click',e=>{if(e.target===sheet)closeScanner();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden&&!sheet.hidden)stopScanner();});
  window.addEventListener('pagehide',()=>stopScanner());

  window.OkelloScanner=Object.freeze({version:5,open:openScanner,startLive,close:closeScanner,scanPhoto});
})();
