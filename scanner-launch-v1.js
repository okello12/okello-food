(() => {
  'use strict';

  const isiPhone=/iPhone|iPod/i.test(navigator.userAgent);
  const LAUNCH_SELECTOR='#hubScanBtn,#scanBarcodeBtn';
  const RELATED_SELECTOR='#hubScanBtn,#scanBarcodeBtn,#lookupBarcodeBtn';
  let repairScheduled=false;
  let repairCount=0;

  function scanner(){ return window.OkelloScanner || null; }

  function makeLocalScanButton(){
    const button=document.createElement('button');
    button.type='button';
    button.id='scanBarcodeBtn';
    button.className='scan-btn';
    button.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M7 12h10"/></svg>Scan barcode';
    return button;
  }

  function ensureLocalScanButton(){
    let button=document.getElementById('scanBarcodeBtn');
    if(button) return button;
    const lookup=document.getElementById('lookupBarcodeBtn');
    if(!lookup) return null;

    button=makeLocalScanButton();
    const parent=lookup.parentElement;
    if(parent?.classList.contains('barcode-actions')){
      parent.insertBefore(button,lookup);
      return button;
    }
    if(parent?.classList.contains('barcode-row')){
      const existing=parent.nextElementSibling?.classList.contains('barcode-actions')?parent.nextElementSibling:null;
      if(existing){ existing.insertBefore(button,existing.firstChild); return button; }
      const actions=document.createElement('div');
      actions.className='barcode-actions';
      lookup.remove();
      actions.append(button,lookup);
      parent.insertAdjacentElement('afterend',actions);
      return button;
    }
    lookup.insertAdjacentElement('beforebegin',button);
    return button;
  }

  function existingCapture(button){
    const wrapper=button?.parentElement?.classList.contains('direct-native-scan')?button.parentElement:null;
    if(!wrapper) return null;
    return wrapper.querySelector('input[type="file"]');
  }

  function ensureNativeCapture(button){
    if(!isiPhone||!button) return;
    if(existingCapture(button)) return;

    let wrapper=button.parentElement?.classList.contains('direct-native-scan')?button.parentElement:null;
    if(!wrapper){
      wrapper=document.createElement('span');
      wrapper.className='direct-native-scan';
      wrapper.style.display='inline-block';
      wrapper.style.position='relative';
      wrapper.style.width=getComputedStyle(button).display==='block'?'100%':'';
      button.parentNode.insertBefore(wrapper,button);
      wrapper.appendChild(button);
    }

    const capture=document.createElement('input');
    capture.type='file';
    capture.accept='image/*';
    capture.setAttribute('capture','environment');
    capture.setAttribute('aria-label','Open camera and scan barcode');
    capture.dataset.okelloLaunchCapture='1';
    capture.addEventListener('change',e=>{
      const file=e.target.files?.[0];
      if(file) scanner()?.scanPhoto?.(file);
      capture.value='';
    });
    wrapper.appendChild(capture);
  }

  function ensureLaunchSurfaces(){
    repairScheduled=false;
    const local=ensureLocalScanButton();
    if(isiPhone){
      ensureNativeCapture(local);
      ensureNativeCapture(document.getElementById('hubScanBtn'));
    }
    repairCount++;
  }

  function scheduleRepair(){
    if(repairScheduled) return;
    repairScheduled=true;
    requestAnimationFrame(ensureLaunchSurfaces);
  }

  // Ordinary browsers use one delegated listener. Replacement buttons inherit
  // scanner behaviour automatically, so no per-element rebinding is required.
  if(!isiPhone){
    document.addEventListener('click',e=>{
      const button=e.target?.closest?.(LAUNCH_SELECTOR);
      if(!button) return;
      const api=scanner();
      if(!api?.open) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      api.open();
    },true);
  }

  // iPhone must retain a genuine file-input user gesture. Watch only for scan
  // surfaces being replaced and put the native input back when necessary.
  const observer=new MutationObserver(mutations=>{
    for(const mutation of mutations){
      for(const node of mutation.addedNodes){
        if(!(node instanceof Element)) continue;
        if(node.matches?.(RELATED_SELECTOR)||node.querySelector?.(RELATED_SELECTOR)){
          scheduleRepair();
          return;
        }
      }
    }
  });
  observer.observe(document.body,{childList:true,subtree:true});
  ensureLaunchSurfaces();

  window.OkelloScannerLaunch=Object.freeze({
    version:1,
    isiPhone,
    repair:ensureLaunchSurfaces,
    get repairCount(){return repairCount;}
  });
})();
