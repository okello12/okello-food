(() => {
  'use strict';

  const VERSION=3;
  const PLAIN_FORMAT='okello-backup-v3';
  const ENCRYPTED_FORMAT='okello-encrypted-v3';
  const $=id=>document.getElementById(id);
  const repo=window.OkelloStateRepository;
  const todayKey=()=>new Date().toISOString().slice(0,10);

  const STORES=Object.freeze([
    {key:'okello_food_tracker_v3',field:'state',type:'object',durability:'durable'},
    {key:'okello_food_favourites_v1',field:'favourites',type:'array',durability:'durable'},
    {key:'okello_satiety_v1',field:'satiety',type:'object',durability:'durable'},
    {key:'okello_activity_v1',field:'activity',type:'object-null',durability:'durable'},
    {key:'okello_photo_notes_v1',field:'photoNotes',type:'any-null',durability:'durable'},
    {key:'okello_shopping_products_v1',field:'shoppingProducts',type:'object-null',durability:'durable'},
    {key:'okello_first_run_v44',field:'firstRunProfile',type:'object-null',durability:'durable'},
    {key:'okello_beta_feedback_v1',field:'betaFeedback',type:'array',durability:'durable'},
    {key:'okello_recipe_voice_draft_v1',field:'recipeDraft',type:'string-null',durability:'draft'}
  ]);
  const DISPOSABLE=Object.freeze([
    'okello_scanner_debug_v1',
    'okello_scanner_last_error_v1',
    'okello_touch_fallback_count',
    'okello_smart_meal_last_trace_v42'
  ]);

  function toast(message){
    const node=$('toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),2200);
  }
  function isObject(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
  function parseStore(key){
    try{
      const raw=localStorage.getItem(key);
      if(raw==null)return null;
      if(key==='okello_recipe_voice_draft_v1')return raw;
      return JSON.parse(raw);
    }catch(_){return null;}
  }
  function validType(value,type){
    if(type==='object')return isObject(value);
    if(type==='object-null')return value==null||isObject(value);
    if(type==='array')return Array.isArray(value);
    if(type==='string-null')return value==null||typeof value==='string';
    if(type==='any-null')return true;
    return false;
  }
  function completeBundle(){
    const out={
      format:PLAIN_FORMAT,
      version:VERSION,
      exportedAt:new Date().toISOString(),
      storageModel:'local-device',
      manifest:{
        durableStores:STORES.filter(x=>x.durability==='durable').map(x=>x.key),
        draftStores:STORES.filter(x=>x.durability==='draft').map(x=>x.key),
        deliberatelyExcluded:[...DISPOSABLE]
      }
    };
    for(const spec of STORES){
      const value=parseStore(spec.key);
      if(value!==null||spec.field==='state')out[spec.field]=value;
    }
    if(!isObject(out.state))out.state={};
    if(!Array.isArray(out.favourites))out.favourites=[];
    if(!isObject(out.satiety))out.satiety={};
    if(!Array.isArray(out.betaFeedback))out.betaFeedback=[];
    return out;
  }
  function normaliseLegacy(input){
    if(!isObject(input))throw new Error('backup-not-object');
    if(isObject(input.state))return input;
    // Pre-wrapper exports stored the main state as the root object.
    return {format:'legacy-main-state',version:0,state:input};
  }
  function validateBundle(input){
    const bundle=normaliseLegacy(input);
    if(!isObject(bundle.state))throw new Error('backup-main-state-invalid');
    for(const spec of STORES){
      if(!Object.prototype.hasOwnProperty.call(bundle,spec.field))continue;
      if(!validType(bundle[spec.field],spec.type))throw new Error(`backup-field-invalid:${spec.field}`);
    }
    return bundle;
  }
  function serialiseForStore(spec,value){
    if(spec.key==='okello_recipe_voice_draft_v1')return value==null?null:String(value);
    return value==null?null:JSON.stringify(value);
  }
  function buildPlan(bundle){
    const plan=[];
    for(const spec of STORES){
      if(!Object.prototype.hasOwnProperty.call(bundle,spec.field))continue;
      const value=bundle[spec.field];
      const raw=serialiseForStore(spec,value);
      plan.push({spec,value,raw});
    }
    if(!plan.some(x=>x.spec.key==='okello_food_tracker_v3'))throw new Error('backup-main-state-missing');
    return plan;
  }
  function stagePlan(plan){
    const staged=[];
    try{
      for(const item of plan){
        const key=`okello_restore_stage_v3__${item.spec.key}`;
        const raw=item.raw==null?'__OKELLO_NULL__':item.raw;
        localStorage.setItem(key,raw);
        if(localStorage.getItem(key)!==raw)throw new Error('stage-verify-failed');
        staged.push(key);
      }
      return staged;
    }catch(err){
      staged.forEach(key=>{try{localStorage.removeItem(key);}catch(_){}});
      throw err;
    }
  }
  function cleanupStage(keys){for(const key of keys){try{localStorage.removeItem(key);}catch(_){}}}
  function restoreSnapshot(snapshot){
    for(const [key,raw] of Object.entries(snapshot)){
      try{
        if(raw==null)localStorage.removeItem(key);
        else if(key==='okello_food_tracker_v3'&&repo){
          const parsed=JSON.parse(raw);
          repo.replace(parsed,{source:'backup-v3-rollback'});
        }else localStorage.setItem(key,raw);
      }catch(err){console.error('Rollback could not restore',key,err);}
    }
  }
  function restoreBundle(input){
    const bundle=validateBundle(input);
    const plan=buildPlan(bundle);
    const stageKeys=stagePlan(plan);
    const snapshot={};
    for(const item of plan)snapshot[item.spec.key]=localStorage.getItem(item.spec.key);

    try{
      for(const item of plan){
        const {key}=item.spec;
        if(key==='okello_food_tracker_v3'&&repo){
          const result=repo.replace(item.value||{},{source:'backup-v3-restore'});
          if(!result?.ok)throw new Error(`main-restore-failed:${result?.reason||'unknown'}`);
        }else if(item.raw==null){
          localStorage.removeItem(key);
        }else{
          localStorage.setItem(key,item.raw);
        }
      }
      for(const item of plan){
        if(item.spec.key==='okello_food_tracker_v3'){
          if(!isObject(JSON.parse(localStorage.getItem(item.spec.key)||'null')))throw new Error('main-verify-failed');
        }else{
          const actual=localStorage.getItem(item.spec.key);
          if(item.raw==null){if(actual!==null)throw new Error(`verify-failed:${item.spec.key}`);}
          else if(actual!==item.raw)throw new Error(`verify-failed:${item.spec.key}`);
        }
      }
      cleanupStage(stageKeys);
      return {
        ok:true,
        legacy:bundle.version<3,
        restored:plan.map(x=>x.spec.key),
        deliberatelyExcluded:[...DISPOSABLE]
      };
    }catch(err){
      restoreSnapshot(snapshot);
      cleanupStage(stageKeys);
      throw err;
    }
  }
  function backupDateLabel(payload){
    const raw=isObject(payload)?payload.exportedAt:null;
    if(!raw)return 'this older backup (backup date unavailable)';
    const date=new Date(raw);
    if(Number.isNaN(date.getTime()))return 'this backup (date unavailable)';
    return new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(date);
  }
  function confirmRestore(payload){
    return window.confirm(`Restore backup from ${backupDateLabel(payload)}? The restore is validated and staged first, then replaces this device's Okello Food data.`);
  }
  function downloadText(text,name,type='application/json'){
    const blob=new Blob([text],{type});
    const anchor=document.createElement('a');
    anchor.href=URL.createObjectURL(blob);
    anchor.download=name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(()=>URL.revokeObjectURL(anchor.href),1500);
  }
  function bytesToB64(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s);}
  function b64ToBytes(value){const raw=atob(value);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  async function deriveKey(pass,salt){
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:180000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function exportPlain(){
    const payload=completeBundle();
    downloadText(JSON.stringify(payload,null,2),`okello-food-complete-backup-${todayKey()}.json`);
    toast('Complete v3 backup created');
  }
  async function importPlain(file){
    const parsed=validateBundle(JSON.parse(await file.text()));
    if(!confirmRestore(parsed)){toast('Restore cancelled');return false;}
    const result=restoreBundle(parsed);
    sessionStorage.setItem('okello_flash',result.legacy?'Older backup restored safely':'Complete backup restored safely');
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
    const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(payload))));
    const out={format:ENCRYPTED_FORMAT,version:VERSION,salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(cipher)};
    downloadText(JSON.stringify(out),`okello-food-private-${todayKey()}.okello`);
    toast('Encrypted complete v3 backup created');
  }
  async function importEncrypted(file){
    const pass=$('syncPassphrase')?.value||'';
    if(pass.length<8){toast('Enter the backup passphrase first');return false;}
    const enc=JSON.parse(await file.text());
    if(!['okello-encrypted-v1','okello-encrypted-v2',ENCRYPTED_FORMAT].includes(enc?.format))throw new Error('encrypted-format');
    const key=await deriveKey(pass,b64ToBytes(enc.salt));
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64ToBytes(enc.iv)},key,b64ToBytes(enc.data));
    const payload=validateBundle(JSON.parse(new TextDecoder().decode(plain)));
    if(!confirmRestore(payload)){toast('Restore cancelled');return false;}
    const result=restoreBundle(payload);
    sessionStorage.setItem('okello_flash',result.legacy?'Older encrypted backup restored safely':'Encrypted complete backup restored safely');
    location.reload();
    return true;
  }

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('#exportBtn,#encryptedExportBtn');
    if(!target)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const job=target.id==='exportBtn'?exportPlain():exportEncrypted();
    Promise.resolve(job).catch(err=>{console.error(err);toast('Could not create backup');});
  },true);
  document.addEventListener('change',event=>{
    const target=event.target;
    if(!target||!['importInput','encryptedImportInput'].includes(target.id))return;
    event.stopImmediatePropagation();
    const file=target.files?.[0];
    if(!file)return;
    const job=target.id==='importInput'?importPlain(file):importEncrypted(file);
    Promise.resolve(job).catch(err=>{console.error(err);toast('Restore failed. Your existing device data was kept.');}).finally(()=>{target.value='';});
  },true);

  function updateCopy(){
    const backupCard=$('exportBtn')?.closest('.card');
    const note=backupCard?.querySelector('.muted');
    if(note)note.textContent='Complete backup v3 includes food and weight history, recipes, favourites, satiety, activity, photo notes, saved shopping scans, first-run preferences, beta feedback and the current recipe draft. Restore validates and stages the bundle before replacing live data.';
    const secure=$('encryptedExportBtn')?.closest('.secure-transfer');
    const secureNote=secure?.querySelector('.secure-note');
    if(secureNote)secureNote.textContent='Encrypted backups use your passphrase locally. Scanner diagnostics, temporary runtime traces and touch-debug counters are deliberately excluded.';
  }
  updateCopy();

  window.OkelloBackup=Object.freeze({
    version:VERSION,
    format:PLAIN_FORMAT,
    encryptedFormat:ENCRYPTED_FORMAT,
    stores:STORES.map(x=>({...x})),
    deliberatelyExcluded:[...DISPOSABLE],
    bundle:completeBundle,
    validate:validateBundle,
    restore:restoreBundle
  });
})();