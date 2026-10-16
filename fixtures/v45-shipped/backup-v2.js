(() => {
  'use strict';

  const MAIN_STORE='okello_food_tracker_v3';
  const FAV_STORE='okello_food_favourites_v1';
  const SAT_STORE='okello_satiety_v1';
  const ACTIVITY_STORE='okello_activity_v1';
  const PHOTO_STORE='okello_photo_notes_v1';
  const SHOPPING_STORE='okello_shopping_products_v1';
  const PLAIN_FORMAT='okello-backup-v2';
  const ENCRYPTED_FORMAT='okello-encrypted-v2';
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const $=id=>document.getElementById(id);

  function toast(msg){
    const t=$('toast');
    if(!t) return;
    t.textContent=msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t=setTimeout(()=>t.classList.remove('show'),2200);
  }

  function readJson(key,fallback){
    try{
      const raw=localStorage.getItem(key);
      return raw==null ? fallback : JSON.parse(raw);
    }catch(_){
      return fallback;
    }
  }

  function isObject(v){ return !!v && typeof v==='object' && !Array.isArray(v); }

  function completeBundle(){
    return {
      format:PLAIN_FORMAT,
      version:2,
      exportedAt:new Date().toISOString(),
      state:readJson(MAIN_STORE,{}),
      favourites:readJson(FAV_STORE,[]),
      satiety:readJson(SAT_STORE,{}),
      activity:readJson(ACTIVITY_STORE,null),
      photoNotes:readJson(PHOTO_STORE,null),
      shoppingProducts:readJson(SHOPPING_STORE,null)
    };
  }

  function restoreBundle(input){
    if(!isObject(input)) throw new Error('backup');

    const wrapped=isObject(input.state);
    const restoredState=wrapped ? input.state : input;
    if(!isObject(restoredState)) throw new Error('state');

    localStorage.setItem(MAIN_STORE,JSON.stringify(restoredState));

    // Guard every auxiliary store so older backups still restore cleanly.
    if(wrapped && Array.isArray(input.favourites)){
      localStorage.setItem(FAV_STORE,JSON.stringify(input.favourites));
    }
    if(wrapped && isObject(input.satiety)){
      localStorage.setItem(SAT_STORE,JSON.stringify(input.satiety));
    }
    if(wrapped && isObject(input.activity)){
      localStorage.setItem(ACTIVITY_STORE,JSON.stringify(input.activity));
    }
    const hasPhotoNotes=wrapped && input.photoNotes!==undefined && input.photoNotes!==null;
    if(hasPhotoNotes){
      localStorage.setItem(PHOTO_STORE,JSON.stringify(input.photoNotes));
    }
    const hasShoppingProducts=wrapped && isObject(input.shoppingProducts);
    if(hasShoppingProducts){
      localStorage.setItem(SHOPPING_STORE,JSON.stringify(input.shoppingProducts));
    }

    return {
      legacy:!wrapped,
      restored:{
        state:true,
        favourites:wrapped && Array.isArray(input.favourites),
        satiety:wrapped && isObject(input.satiety),
        activity:wrapped && isObject(input.activity),
        photoNotes:hasPhotoNotes,
        shoppingProducts:hasShoppingProducts
      }
    };
  }

  function backupDateLabel(payload){
    const raw=isObject(payload) ? payload.exportedAt : null;
    if(!raw) return 'this older backup (backup date unavailable)';
    const d=new Date(raw);
    if(Number.isNaN(d.getTime())) return 'this backup (date unavailable)';
    return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(d);
  }

  function confirmRestore(payload){
    return window.confirm(`Restore backup from ${backupDateLabel(payload)}? This will replace the food, weight, activity and saved shopping data currently on this device.`);
  }

  function downloadText(text,name,type='application/json'){
    const blob=new Blob([text],{type});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=name;
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  function bytesToB64(bytes){
    let s='';
    bytes.forEach(b=>s+=String.fromCharCode(b));
    return btoa(s);
  }
  function b64ToBytes(s){
    const raw=atob(s);
    return Uint8Array.from(raw,c=>c.charCodeAt(0));
  }
  async function deriveKey(pass,salt){
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey(
      {name:'PBKDF2',salt,iterations:180000,hash:'SHA-256'},
      material,
      {name:'AES-GCM',length:256},
      false,
      ['encrypt','decrypt']
    );
  }

  async function exportPlain(){
    const payload=completeBundle();
    downloadText(JSON.stringify(payload,null,2),`okello-food-complete-backup-${todayKey()}.json`);
    toast('Complete backup created');
  }

  async function importPlain(file){
    const parsed=JSON.parse(await file.text());
    if(!confirmRestore(parsed)){ toast('Restore cancelled'); return false; }
    const result=restoreBundle(parsed);
    sessionStorage.setItem('okello_flash',result.legacy?'Older backup restored. New learning data was not present.':'Complete backup restored');
    location.reload();
    return true;
  }

  async function exportEncrypted(){
    const pass=$('syncPassphrase')?.value||'';
    if(pass.length<8){toast('Use at least 8 characters');return;}
    const payload=completeBundle();
    const salt=crypto.getRandomValues(new Uint8Array(16));
    const iv=crypto.getRandomValues(new Uint8Array(12));
    const key=await deriveKey(pass,salt);
    const cipher=new Uint8Array(await crypto.subtle.encrypt(
      {name:'AES-GCM',iv},
      key,
      new TextEncoder().encode(JSON.stringify(payload))
    ));
    const out={format:ENCRYPTED_FORMAT,version:2,salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(cipher)};
    downloadText(JSON.stringify(out),`okello-food-private-${todayKey()}.okello`);
    toast('Encrypted complete backup created');
  }

  async function importEncrypted(file){
    const pass=$('syncPassphrase')?.value||'';
    if(pass.length<8){toast('Enter the backup passphrase first');return false;}
    const enc=JSON.parse(await file.text());
    if(!['okello-encrypted-v1',ENCRYPTED_FORMAT].includes(enc?.format)) throw new Error('format');
    const salt=b64ToBytes(enc.salt);
    const iv=b64ToBytes(enc.iv);
    const cipher=b64ToBytes(enc.data);
    const key=await deriveKey(pass,salt);
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);
    const payload=JSON.parse(new TextDecoder().decode(plain));
    if(!confirmRestore(payload)){ toast('Restore cancelled'); return false; }
    const result=restoreBundle(payload);
    sessionStorage.setItem('okello_flash',result.legacy?'Older encrypted backup restored':'Encrypted complete backup restored');
    location.reload();
    return true;
  }

  // Capture first so the legacy handlers in app.js/features-v1.js do not create
  // a second, incomplete backup. This module is now the backup owner.
  document.addEventListener('click',e=>{
    const target=e.target?.closest?.('#exportBtn,#encryptedExportBtn');
    if(!target) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    if(target.id==='exportBtn'){
      exportPlain().catch(()=>toast('Could not create backup'));
    }else{
      exportEncrypted().catch(()=>toast('Could not create encrypted backup'));
    }
  },true);

  document.addEventListener('change',e=>{
    const target=e.target;
    if(!target || !['importInput','encryptedImportInput'].includes(target.id)) return;
    e.stopImmediatePropagation();
    const file=target.files?.[0];
    if(!file) return;
    const run=target.id==='importInput'
      ? importPlain(file).catch(()=>toast('That backup file could not be read'))
      : importEncrypted(file).catch(()=>toast('Could not restore: check the file and passphrase'));
    Promise.resolve(run).finally(()=>{ target.value=''; });
  },true);

  function updateCopy(){
    const backupCard=$('exportBtn')?.closest('.card');
    const note=backupCard?.querySelector('.muted');
    if(note) note.textContent='Your complete backup includes food history, recipes, favourites, satiety feedback, activity data, saved shopping scans and any saved photo meal notes. Restore always asks before replacing data on this device.';

    const secure=$('encryptedExportBtn')?.closest('.secure-transfer');
    const secureNote=secure?.querySelector('.secure-note');
    if(secureNote) secureNote.textContent='The passphrase is not stored. The encrypted backup includes food and weight history, favourites, satiety feedback, activity data, saved shopping scans and any saved photo meal notes. Older encrypted backups remain restorable.';
  }
  updateCopy();

  window.OkelloBackup=Object.freeze({version:2,bundle:completeBundle,restore:restoreBundle});
})();