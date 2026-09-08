(() => {
  'use strict';

  const VERSION=1;
  const ADULT_KEY='okello_adult_beta_v46';
  const REMOTE_ACK_KEY='okello_remote_lookup_notice_v46';
  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);

  function readJson(key,fallback=null){try{const raw=localStorage.getItem(key);return raw==null?fallback:JSON.parse(raw);}catch(_){return fallback;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
  function toast(message){const node=$('toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2200);}

  function ensureAdultGate(){
    if(readJson(ADULT_KEY)?.confirmed===true)return;
    const gate=document.createElement('div');
    gate.id='v46AdultGate';
    gate.style.cssText='position:fixed;inset:0;z-index:5000;background:#FAF8F3;display:grid;place-items:center;padding:22px';
    gate.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="v46AdultTitle" style="width:min(520px,100%);background:#fff;border:1px solid #ddd6c7;border-radius:22px;padding:22px;box-shadow:0 22px 70px rgba(20,35,28,.18)"><p style="margin:0;color:#b8862b;font-weight:900;letter-spacing:.12em;font-size:.72rem">ADULT BETA</p><h2 id="v46AdultTitle" style="color:#1e4235;margin:.3rem 0 .6rem">Okello Food is currently for adults 18+</h2><p style="color:#5f6b62;line-height:1.5">This beta includes calorie, weight and activity features. It is not designed for children's weight management or clinical nutrition.</p><button id="v46AdultConfirm" type="button" style="width:100%;min-height:54px;border:0;border-radius:14px;background:#1e4235;color:#fff;font-weight:900;font-size:1rem">I am 18 or over · continue</button><button id="v46AdultExit" type="button" style="width:100%;min-height:48px;margin-top:8px;border:1px solid #ddd6c7;border-radius:14px;background:#fff;color:#14231c;font-weight:800">I am not continuing</button><p style="font-size:.78rem;color:#5f6b62;margin:12px 0 0"><a href="privacy.html" style="color:#1e4235">Privacy</a> · <a href="beta-terms.html" style="color:#1e4235">Beta terms</a></p></section>`;
    document.body.appendChild(gate);
    $('v46AdultConfirm').addEventListener('click',()=>{writeJson(ADULT_KEY,{confirmed:true,confirmedAt:new Date().toISOString(),version:VERSION});gate.remove();});
    $('v46AdultExit').addEventListener('click',()=>{gate.innerHTML='<section style="width:min(520px,100%);background:#fff;border:1px solid #ddd6c7;border-radius:22px;padding:22px"><h2 style="color:#1e4235">This beta is not available to you.</h2><p style="color:#5f6b62">Close this page or use your browser Back control.</p><button id="v46GoBack" style="min-height:48px;border:0;border-radius:12px;background:#1e4235;color:#fff;font-weight:800;padding:10px 16px">Go back</button></section>';document.getElementById('v46GoBack')?.addEventListener('click',()=>history.back());});
  }

  // The app no longer starts Web Speech recognition. Keyboard/OS dictation is
  // still available if the user chooses it, under the device provider's rules.
  function disableBrowserSpeech(){
    for(const id of ['nlVoice','recipeAiVoice']){
      const button=$(id);if(!button)continue;
      button.hidden=true;button.disabled=true;button.setAttribute('aria-hidden','true');
      const parent=button.parentElement;
      if(parent&&!parent.querySelector('.v46-dictation-note')){
        const note=document.createElement('small');note.className='v46-dictation-note';note.style.cssText='display:block;color:var(--muted);margin-top:6px';note.textContent='For dictation, use your phone keyboard microphone. Okello Food does not start browser speech recognition.';parent.appendChild(note);
      }
    }
  }
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#nlVoice,#recipeAiVoice')){
      event.preventDefault();event.stopImmediatePropagation();toast('Use your keyboard microphone for dictation.');
    }
  },true);

  function requiresRemoteNotice(target){
    return target?.closest?.('#hubOnlineBtn,#lookupBarcodeBtn');
  }
  document.addEventListener('click',event=>{
    const target=requiresRemoteNotice(event.target);if(!target)return;
    if(readJson(REMOTE_ACK_KEY)?.acknowledged===true)return;
    const kind=target.id==='hubOnlineBtn'?'search term':'barcode';
    const ok=window.confirm(`Online lookup: this ${kind} will be sent to Open Food Facts so it can return packaged-product data. Open Food Facts will also receive normal web request information such as your IP address. Continue?`);
    if(!ok){event.preventDefault();event.stopImmediatePropagation();return;}
    writeJson(REMOTE_ACK_KEY,{acknowledged:true,acknowledgedAt:new Date().toISOString(),version:VERSION});
  },true);

  function deleteLocalData(){
    if(!window.confirm('Delete all Okello Food data stored in this browser? This includes your diary, recipes, weight/activity history, preferences and local beta feedback. Export a backup first if you may need it.'))return;
    const keys=[];
    for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&key.startsWith('okello_'))keys.push(key);}
    for(const key of keys){try{localStorage.removeItem(key);}catch(_){}}
    try{sessionStorage.clear();}catch(_){}
    location.reload();
  }

  function ensureSettingsCard(){
    const settings=$('tab-settings');if(!settings||$('v46TrustCard'))return;
    const card=document.createElement('section');card.id='v46TrustCard';card.className='card';
    card.innerHTML=`<p class="eyebrow">PRIVACY & TRUST</p><h3>Local diary, explicit network use</h3><p class="muted">Your main diary stays in this browser. Online packaged-food lookups go to Open Food Facts only when you choose them. The beta does not use advertising trackers or third-party analytics, and in-app browser speech recognition is disabled.</p><div class="button-row"><a class="secondary-btn" href="privacy.html">Privacy & storage</a><a class="secondary-btn" href="third-party-notices.html">Third-party notices</a><a class="secondary-btn" href="beta-terms.html">Beta terms</a></div><p class="tiny-note">Adult beta: 18+. Food literacy/general wellbeing only, not diagnosis or treatment.</p><button id="v46DeleteLocal" class="text-btn danger" type="button" style="margin-top:10px">Delete all Okello Food data on this browser</button>`;
    const backup=$('exportBtn')?.closest('.card');if(backup)backup.insertAdjacentElement('afterend',card);else settings.appendChild(card);
    $('v46DeleteLocal').addEventListener('click',deleteLocalData);
  }

  ensureAdultGate();
  disableBrowserSpeech();
  ensureSettingsCard();
  setTimeout(disableBrowserSpeech,700);setTimeout(ensureSettingsCard,700);

  window.OkelloTrustV46=Object.freeze({version:VERSION,adultKey:ADULT_KEY,remoteNoticeKey:REMOTE_ACK_KEY,deleteLocalData,networkDestinations:Object.freeze(['GitHub Pages','Open Food Facts','Open Food Facts product images','jsDelivr'])});
})();