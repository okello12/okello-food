(() => {
  'use strict';

  const standalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone===true;
  const isiPhone=/iPhone|iPod/i.test(navigator.userAgent);
  const iosStandalone=standalone&&isiPhone;

  if(iosStandalone) document.documentElement.classList.add('ok-ios-standalone');

  const style=document.createElement('style');
  style.textContent=`
    button,[role="button"],.file-label,input,select,textarea{touch-action:manipulation}
    button,[role="button"]{-webkit-tap-highlight-color:rgba(30,66,53,.14)}
    .online-sheet{z-index:2400!important}
    .scanner-sheet{z-index:2600!important}
    .ios-exit-sheet{z-index:2800!important}
    .ok-ios-standalone .ok-app-chrome,
    .ok-ios-standalone .global-hub{
      position:relative!important;
      top:auto!important;
      z-index:30!important;
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
    }
    .ok-ios-standalone .tabs{
      z-index:900!important;
      backdrop-filter:none!important;
      -webkit-backdrop-filter:none!important;
    }
    .ok-ios-standalone button:not(:disabled),
    .ok-ios-standalone [role="button"]:not([aria-disabled="true"]){pointer-events:auto}
  `;
  document.head.appendChild(style);

  if(!iosStandalone){
    window.OkelloInteraction=Object.freeze({version:1,iosStandalone:false});
    return;
  }

  // iPhone Home Screen mode has shown intermittent missed click delivery in the
  // app's stacked sticky/fixed UI. Convert a clean touch tap on a button into one
  // synchronous click and suppress the browser-generated duplicate. Scrolls and
  // drags are left alone.
  let active=null;
  let moved=false;
  let fallbackCount=0;
  const maxMove=12;

  function buttonFrom(target){
    const b=target?.closest?.('button,[role="button"]');
    if(!b||b.disabled||b.getAttribute('aria-disabled')==='true') return null;
    if(b.hidden||getComputedStyle(b).display==='none'||getComputedStyle(b).visibility==='hidden') return null;
    return b;
  }

  document.addEventListener('touchstart',e=>{
    if(e.touches.length!==1){active=null;return;}
    const b=buttonFrom(e.target);
    if(!b){active=null;return;}
    const t=e.touches[0];
    active={button:b,x:t.clientX,y:t.clientY};
    moved=false;
  },{passive:true,capture:true});

  document.addEventListener('touchmove',e=>{
    if(!active||!e.touches.length)return;
    const t=e.touches[0];
    if(Math.abs(t.clientX-active.x)>maxMove||Math.abs(t.clientY-active.y)>maxMove)moved=true;
  },{passive:true,capture:true});

  document.addEventListener('touchcancel',()=>{active=null;moved=false;},{passive:true,capture:true});

  document.addEventListener('touchend',e=>{
    const tap=active;
    active=null;
    if(!tap||moved){moved=false;return;}
    moved=false;
    const current=buttonFrom(e.target);
    if(!current||current!==tap.button)return;

    // Prevent WebKit from also synthesising a second click after this touch.
    e.preventDefault();
    fallbackCount++;
    try{sessionStorage.setItem('okello_touch_fallback_count',String(fallbackCount));}catch(_){}
    current.click();
  },{passive:false,capture:true});

  window.OkelloInteraction=Object.freeze({
    version:1,
    iosStandalone:true,
    get fallbackTaps(){return fallbackCount;}
  });
})();
