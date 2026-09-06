(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const input = $('barcodeInput');
  const lookupBtn = $('lookupBarcodeBtn');
  if (!input || !lookupBtn) return;

  const style = document.createElement('style');
  style.textContent = `
    .barcode-actions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
    .scan-btn{min-height:48px;border:0;border-radius:12px;background:#1E4235;color:#fff;font-weight:800;padding:11px 16px}
    .scan-btn svg{width:20px;height:20px;vertical-align:-4px;margin-right:7px;fill:none;stroke:currentColor;stroke-width:2}
    .scanner-sheet[hidden]{display:none!important}
    .scanner-sheet{position:fixed;inset:0;z-index:1000;background:rgba(10,18,14,.72);display:flex;align-items:flex-end;justify-content:center;padding:14px}
    .scanner-panel{width:min(620px,100%);max-height:92%;overflow:auto;background:#FAF8F3;border-radius:24px 24px 18px 18px;padding:18px;box-shadow:0 22px 70px rgba(0,0,0,.28)}
    .scanner-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:12px}
    .scanner-head h3{font-family:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;color:#1E4235;margin:0;font-size:1.45rem}
    .scanner-head p{margin:4px 0 0;color:#657067;font-size:.88rem}
    .scanner-close{width:44px;height:44px;border-radius:50%;border:1px solid #DDD6C7;background:#fff;color:#14231C;font-size:1.25rem;font-weight:800}
    .scanner-frame{position:relative;overflow:hidden;border-radius:18px;background:#0e1411;min-height:280px;border:1px solid #2d4438}
    #scannerReader{min-height:280px}
    #scannerReader video{width:100%!important;height:auto!important;display:block;border-radius:16px}
    #scannerReader img{max-width:100%}
    #scannerReader__scan_region{background:#0e1411!important}
    #scannerReader__dashboard{background:#fff!important;padding:10px!important}
    #scannerReader__dashboard_section_swaplink{color:#1E4235!important}
    .scanner-target{pointer-events:none;position:absolute;left:10%;right:10%;top:50%;transform:translateY(-50%);height:112px;border:3px solid rgba(255,255,255,.9);border-radius:18px;box-shadow:0 0 0 999px rgba(0,0,0,.18)}
    .scanner-line{position:absolute;left:14%;right:14%;top:50%;height:2px;background:#B8862B;box-shadow:0 0 10px rgba(184,134,43,.8);animation:okScan 1.8s ease-in-out infinite alternate}
    @keyframes okScan{from{transform:translateY(-38px)}to{transform:translateY(38px)}}
    .scanner-status{margin:12px 0 0;color:#657067;font-size:.9rem;min-height:1.4em}
    .scanner-status.good{color:#326B51;font-weight:700}.scanner-status.bad{color:#A63A20;font-weight:700}
    .scanner-help{margin:10px 0 0;color:#657067;font-size:.8rem}
    @media(max-width:520px){.barcode-actions{grid-template-columns:1fr}.scanner-panel{padding:14px}.scanner-frame,#scannerReader{min-height:250px}}
    @media(prefers-reduced-motion:reduce){.scanner-line{animation:none}}
  `;
  document.head.appendChild(style);

  const originalLookupParent = lookupBtn.parentElement;
  const actions = document.createElement('div');
  actions.className = 'barcode-actions';
  const scanBtn = document.createElement('button');
  scanBtn.type = 'button';
  scanBtn.id = 'scanBarcodeBtn';
  scanBtn.className = 'scan-btn';
  scanBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>Scan barcode';

  if (originalLookupParent && originalLookupParent.classList.contains('barcode-row')) {
    lookupBtn.remove();
    actions.append(scanBtn, lookupBtn);
    originalLookupParent.insertAdjacentElement('afterend', actions);
  } else {
    lookupBtn.insertAdjacentElement('beforebegin', scanBtn);
  }

  const sheet = document.createElement('div');
  sheet.className = 'scanner-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'scannerTitle');
  sheet.innerHTML = `
    <div class="scanner-panel">
      <div class="scanner-head">
        <div><h3 id="scannerTitle">Scan food barcode</h3><p>Point the back camera at the barcode and hold still.</p></div>
        <button type="button" class="scanner-close" id="scannerCloseBtn" aria-label="Close scanner">×</button>
      </div>
      <div class="scanner-frame">
        <div id="scannerReader"></div>
        <div class="scanner-target" aria-hidden="true"></div>
        <div class="scanner-line" aria-hidden="true"></div>
      </div>
      <div id="scannerStatus" class="scanner-status" aria-live="polite">Camera starts only when you tap Scan barcode.</div>
      <p class="scanner-help">If camera access is blocked, allow Camera for this website in Safari settings or type the barcode manually.</p>
    </div>`;
  document.body.appendChild(sheet);

  const closeBtn = $('scannerCloseBtn');
  const status = $('scannerStatus');
  let scanner = null;
  let closing = false;
  let found = false;

  function setStatus(message, kind='') {
    status.textContent = message;
    status.className = 'scanner-status' + (kind ? ' ' + kind : '');
  }

  function loadScannerLibrary() {
    if (window.Html5Qrcode) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-okello-scanner-lib]');
      if (existing) {
        existing.addEventListener('load', resolve, {once:true});
        existing.addEventListener('error', reject, {once:true});
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
      s.async = true;
      s.dataset.okelloScannerLib = '1';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function stopScanner() {
    if (closing) return;
    closing = true;
    try {
      if (scanner && scanner.isScanning) await scanner.stop();
      if (scanner) await scanner.clear();
    } catch (_) {}
    scanner = null;
    closing = false;
  }

  async function closeScanner() {
    await stopScanner();
    sheet.hidden = true;
    document.body.style.overflow = '';
    scanBtn.focus();
  }

  async function onDecoded(text) {
    if (found) return;
    const code = String(text || '').replace(/\D/g, '');
    if (code.length < 8) return;
    found = true;
    input.value = code;
    setStatus(`Barcode ${code} found. Looking up product…`, 'good');
    try {
      if (navigator.vibrate) navigator.vibrate(60);
    } catch (_) {}
    await stopScanner();
    setTimeout(() => {
      sheet.hidden = true;
      document.body.style.overflow = '';
      lookupBtn.click();
      input.scrollIntoView({behavior:'smooth', block:'center'});
      found = false;
    }, 300);
  }

  async function startScanner() {
    found = false;
    sheet.hidden = false;
    document.body.style.overflow = 'hidden';
    setStatus('Preparing camera…');

    if (!window.isSecureContext) {
      setStatus('Camera scanning needs a secure HTTPS page.', 'bad');
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus('This browser cannot access the camera. Type the barcode manually.', 'bad');
      return;
    }

    try {
      await loadScannerLibrary();
      if (!window.Html5Qrcode) throw new Error('Scanner library unavailable');
      scanner = new window.Html5Qrcode('scannerReader', {verbose:false});
      const formats = window.Html5QrcodeSupportedFormats ? [
        window.Html5QrcodeSupportedFormats.EAN_13,
        window.Html5QrcodeSupportedFormats.EAN_8,
        window.Html5QrcodeSupportedFormats.UPC_A,
        window.Html5QrcodeSupportedFormats.UPC_E,
        window.Html5QrcodeSupportedFormats.CODE_128,
        window.Html5QrcodeSupportedFormats.CODE_39,
        window.Html5QrcodeSupportedFormats.ITF
      ].filter(Boolean) : undefined;
      const config = {fps:10, qrbox:{width:280,height:120}, aspectRatio:1.777};
      if (formats && formats.length) config.formatsToSupport = formats;
      await scanner.start({facingMode:{ideal:'environment'}}, config, onDecoded, () => {});
      setStatus('Scanning… keep the barcode inside the box.');
    } catch (err) {
      console.error(err);
      setStatus('I could not start the camera. Check camera permission, then try again or type the barcode.', 'bad');
      try { await stopScanner(); } catch (_) {}
    }
  }

  scanBtn.addEventListener('click', startScanner);
  closeBtn.addEventListener('click', closeScanner);
  sheet.addEventListener('click', (e) => { if (e.target === sheet) closeScanner(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && !sheet.hidden) closeScanner(); });
  window.addEventListener('pagehide', () => { stopScanner(); });
})();
