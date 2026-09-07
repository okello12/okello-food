(() => {
  'use strict';

  const CURRENT='okello_food_tracker_v3';
  const LEGACY='okello_food_tracker_v2';
  const QUARANTINE='okello_food_tracker_v3_quarantine_v1';
  const FAVOURITES='okello_food_favourites_v1';
  const SHOPPING='okello_shopping_products_v1';
  const MIGRATION_VERSION=3;
  const SCHEMA_VERSION=3;
  const FOOD_ID_ALIASES=Object.freeze({
    okro:'ghana_okro_stew',
    okro_base:'ghana_okro_stew_base',
    ghana_okro_soup:'ghana_okro_stew'
  });

  const defaultState=()=>({
    schemaVersion:SCHEMA_VERSION,
    targets:{calories:2300,protein:150},
    logs:{},
    customFoods:[],
    recipes:[],
    mealTemplates:[],
    definitionEvents:[],
    pieceCalibration:{observations:[]},
    coOccurrencePairs:[]
  });

  function isObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
  function parseObject(raw){
    if(raw==null)return null;
    try{
      const parsed=JSON.parse(raw);
      return isObject(parsed)?parsed:null;
    }catch(_){return null;}
  }
  function resolveFoodId(value){
    let id=String(value??'');
    const seen=new Set();
    while(FOOD_ID_ALIASES[id]&&!seen.has(id)){
      seen.add(id);
      id=FOOD_ID_ALIASES[id];
    }
    return id;
  }
  function rewriteFoodId(holder,key='foodId'){
    if(!holder||holder[key]==null)return false;
    const before=String(holder[key]);
    const after=resolveFoodId(before);
    if(after===before)return false;
    holder[key]=after;
    return true;
  }
  function rewriteIdArray(holder,key){
    if(!holder||!Array.isArray(holder[key]))return false;
    let changed=false;
    holder[key]=holder[key].map(value=>{
      const before=String(value??'');
      const after=resolveFoodId(before);
      if(after!==before)changed=true;
      return after;
    });
    return changed;
  }
  function ensureArray(state,key){
    if(Array.isArray(state[key]))return false;
    state[key]=[];
    return true;
  }
  function ensureObject(state,key,fallback={}){
    if(isObject(state[key]))return false;
    state[key]={...fallback};
    return true;
  }

  // Mutate only fields that genuinely require a schema or identifier change.
  // We do not reconstruct or reorder an otherwise valid state object. This is
  // important because app.js may serialise the same keys in a different order;
  // property order alone must never cause a migration write on every launch.
  function upgradeState(input){
    const state=isObject(input)?input:defaultState();
    let changed=!isObject(input);

    const existingSchema=Number(state.schemaVersion)||0;
    if(existingSchema<SCHEMA_VERSION){state.schemaVersion=SCHEMA_VERSION;changed=true;}

    if(ensureObject(state,'targets',{calories:2300,protein:150}))changed=true;
    if(!(Number(state.targets.calories)>0)){state.targets.calories=2300;changed=true;}
    if(!(Number(state.targets.protein)>0)){state.targets.protein=150;changed=true;}
    if(ensureObject(state,'logs'))changed=true;
    if(ensureArray(state,'customFoods'))changed=true;
    if(ensureArray(state,'recipes'))changed=true;
    if(ensureArray(state,'mealTemplates'))changed=true;
    if(ensureArray(state,'definitionEvents'))changed=true;
    if(ensureArray(state,'coOccurrencePairs'))changed=true;
    if(ensureObject(state,'pieceCalibration'))changed=true;
    if(!Array.isArray(state.pieceCalibration.observations)){state.pieceCalibration.observations=[];changed=true;}

    // Logs are canonicalised by id, but their nutrition and amount snapshots are
    // not recalculated or touched. Personal food memory derives from these logs,
    // so leaving the old id here would split one food into two learned identities.
    for(const entries of Object.values(state.logs||{})){
      for(const entry of Array.isArray(entries)?entries:[]) if(rewriteFoodId(entry))changed=true;
    }

    for(const recipe of state.recipes){
      for(const ingredient of Array.isArray(recipe?.ingredients)?recipe.ingredients:[]) if(rewriteFoodId(ingredient))changed=true;
    }

    for(const template of state.mealTemplates){
      for(const item of Array.isArray(template?.items)?template.items:[]) if(rewriteFoodId(item))changed=true;
      for(const component of Array.isArray(template?.components)?template.components:[]) if(rewriteFoodId(component))changed=true;
      if(rewriteIdArray(template,'foodIds'))changed=true;
    }

    for(const pair of state.coOccurrencePairs){
      for(const key of ['foodAId','foodBId','leftFoodId','rightFoodId']) if(rewriteFoodId(pair,key))changed=true;
      if(rewriteIdArray(pair,'foodIds'))changed=true;
    }

    for(const obs of state.pieceCalibration.observations) if(rewriteFoodId(obs))changed=true;

    // Optional/future state-backed shelf entries are canonicalised only if the
    // field already exists. The current barcode Personal Shelf is keyed by product
    // code and has no food identity to rewrite.
    if(Array.isArray(state.shelfEntries)){
      for(const item of state.shelfEntries) if(rewriteFoodId(item))changed=true;
    }

    // Remove generated legacy okro catalogue identities after all durable
    // references have been rewritten. okro remains accepted as an input alias via
    // resolveFoodId, but it is no longer a distinct learned or selectable identity.
    const retiredGeneratedIds=new Set(['ghana_okro_soup','okro_base']);
    const beforeCustom=state.customFoods.length;
    state.customFoods=state.customFoods.filter(food=>!retiredGeneratedIds.has(String(food?.id||'')));
    if(state.customFoods.length!==beforeCustom)changed=true;

    // Runtime user-created soups/composites may legitimately be unclassified.
    // Static library records are classified by the meal data contract later in boot.
    state.customFoods=state.customFoods.map(food=>{
      if(!food||typeof food!=='object')return food;
      const cat=food.cat;
      const valid=food.basis==='base-only'||food.basis==='includes-protein'||food.basis==='unknown';
      if(!food.libraryVersion&&['Soup','Complete meal'].includes(cat)&&!valid){
        changed=true;
        return {...food,basis:'unknown'};
      }
      return food;
    });

    return {state,changed};
  }

  // Auxiliary stores are rewritten only when they actually contain a food id.
  // Corrupt auxiliary data is left byte-for-byte untouched; it never triggers the
  // v3 corrupt-state quarantine path.
  function upgradeAuxiliaryStores(){
    const writes=[];
    try{
      const raw=localStorage.getItem(FAVOURITES);
      if(raw!=null){
        try{
          const list=JSON.parse(raw);
          if(Array.isArray(list)){
            const next=[];
            const seen=new Set();
            let changed=false;
            for(const value of list){
              const before=String(value??'');
              const after=resolveFoodId(before);
              if(after!==before)changed=true;
              if(!seen.has(after)){seen.add(after);next.push(after);}else changed=true;
            }
            if(changed){localStorage.setItem(FAVOURITES,JSON.stringify(next));writes.push(FAVOURITES);}
          }
        }catch(_){}
      }
    }catch(_){}

    try{
      const raw=localStorage.getItem(SHOPPING);
      if(raw!=null){
        try{
          const shelf=JSON.parse(raw);
          let changed=false;
          if(isObject(shelf)&&isObject(shelf.products)){
            for(const product of Object.values(shelf.products)) if(rewriteFoodId(product))changed=true;
          }
          if(changed){localStorage.setItem(SHOPPING,JSON.stringify(shelf));writes.push(SHOPPING);}
        }catch(_){}
      }
    }catch(_){}
    return writes;
  }

  function readQuarantine(){
    try{
      const stored=localStorage.getItem(QUARANTINE);
      if(stored==null)return null;
      try{
        const q=JSON.parse(stored);
        if(isObject(q)&&typeof q.raw==='string')return q;
      }catch(_){}
      return {
        format:'okello-storage-quarantine-raw-v1',
        sourceKey:CURRENT,
        capturedAt:null,
        reason:'invalid-current-raw-only',
        raw:stored,
        rawOnly:true
      };
    }catch(_){return null;}
  }
  function quarantineRecord(raw){
    return {
      format:'okello-storage-quarantine-v1',
      sourceKey:CURRENT,
      capturedAt:new Date().toISOString(),
      reason:'invalid-current',
      raw:String(raw)
    };
  }
  function saveQuarantine(raw){
    const existing=readQuarantine();
    if(existing)return {saved:true,created:false,record:existing};
    const record=quarantineRecord(raw);
    const wrapped=JSON.stringify(record);

    try{
      localStorage.setItem(QUARANTINE,wrapped);
      return {saved:true,created:true,record};
    }catch(_){}

    try{
      localStorage.removeItem(CURRENT);
      try{
        localStorage.setItem(QUARANTINE,wrapped);
        return {saved:true,created:true,record};
      }catch(_){}
      try{
        localStorage.setItem(QUARANTINE,String(raw));
        return {saved:true,created:true,record:{...record,rawOnly:true}};
      }catch(_){}
      try{localStorage.setItem(CURRENT,String(raw));}catch(_restore){}
      return {saved:false,created:false,record:null};
    }catch(_){
      try{localStorage.setItem(CURRENT,String(raw));}catch(_restore){}
      return {saved:false,created:false,record:null};
    }
  }

  let volatileRecoveryRaw=null;
  let result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,upgraded:false,legacyRetained:true,recoveryPending:false,quarantined:false,auxiliaryWrites:[]};

  try{
    const currentRaw=localStorage.getItem(CURRENT);
    if(currentRaw!==null){
      const current=parseObject(currentRaw);
      if(current){
        const upgraded=upgradeState(current);
        if(upgraded.changed)localStorage.setItem(CURRENT,JSON.stringify(upgraded.state));
        const auxiliaryWrites=upgradeAuxiliaryStores();
        const q=readQuarantine();
        result={
          version:MIGRATION_VERSION,
          status:q?(upgraded.changed?'current-upgraded-with-quarantine':'current-with-quarantine'):(upgraded.changed?'current-upgraded':'current'),
          migrated:false,
          created:false,
          upgraded:upgraded.changed,
          legacyRetained:true,
          recoveryPending:!!q,
          quarantined:!!q,
          auxiliaryWrites
        };
      }else{
        volatileRecoveryRaw=currentRaw;
        const q=saveQuarantine(currentRaw);
        if(q.saved){
          localStorage.setItem(CURRENT,JSON.stringify(defaultState()));
          result={
            version:MIGRATION_VERSION,
            status:'invalid-current-quarantined-defaulted',
            migrated:false,
            created:true,
            upgraded:false,
            legacyRetained:true,
            recoveryPending:true,
            quarantined:true,
            quarantineCreated:q.created,
            auxiliaryWrites:[]
          };
        }else{
          result={
            version:MIGRATION_VERSION,
            status:'invalid-current-preserved-unquarantined',
            migrated:false,
            created:false,
            upgraded:false,
            legacyRetained:true,
            recoveryPending:true,
            quarantined:false,
            quarantineCreated:false,
            auxiliaryWrites:[]
          };
        }
      }
    }else{
      const legacyRaw=localStorage.getItem(LEGACY);
      const legacy=parseObject(legacyRaw);
      if(legacy){
        const upgraded=upgradeState(legacy);
        localStorage.setItem(CURRENT,JSON.stringify(upgraded.state));
        const auxiliaryWrites=upgradeAuxiliaryStores();
        result={version:MIGRATION_VERSION,status:'migrated-v2-to-v3',migrated:true,created:true,upgraded:true,legacyRetained:true,recoveryPending:false,quarantined:false,auxiliaryWrites};
      }else{
        localStorage.setItem(CURRENT,JSON.stringify(defaultState()));
        result={
          version:MIGRATION_VERSION,
          status:legacyRaw===null?'created-fresh-v3':'invalid-legacy-defaulted',
          migrated:false,
          created:true,
          upgraded:false,
          legacyRetained:true,
          recoveryPending:false,
          quarantined:false,
          auxiliaryWrites:[]
        };
      }
    }
  }catch(_){
    result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,upgraded:false,legacyRetained:true,recoveryPending:false,quarantined:false,auxiliaryWrites:[]};
  }

  function readCurrent(){
    try{return parseObject(localStorage.getItem(CURRENT));}
    catch(_){return null;}
  }
  function recoveryRecord(){
    const q=readQuarantine();
    if(q)return q;
    if(volatileRecoveryRaw==null)return null;
    return {
      format:'okello-storage-quarantine-v1',
      sourceKey:CURRENT,
      capturedAt:new Date().toISOString(),
      reason:'invalid-current-volatile',
      raw:String(volatileRecoveryRaw)
    };
  }
  function downloadRecovery(){
    const record=recoveryRecord();
    if(!record)return false;
    try{
      const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json'});
      const a=document.createElement('a');
      a.href=URL.createObjectURL(blob);
      const stamp=String(record.capturedAt||new Date().toISOString()).replace(/[:.]/g,'-');
      a.download=`okello-food-recovery-${stamp}.json`;
      a.click();
      setTimeout(()=>URL.revokeObjectURL(a.href),1500);
      return true;
    }catch(_){return false;}
  }
  function clearQuarantine(){
    const q=readQuarantine();
    if(!q)return true;
    try{
      localStorage.removeItem(QUARANTINE);
      return true;
    }catch(_){return false;}
  }

  window.OkelloStorageMigration=Object.freeze({
    version:MIGRATION_VERSION,
    schemaVersion:SCHEMA_VERSION,
    currentKey:CURRENT,
    legacyKey:LEGACY,
    quarantineKey:QUARANTINE,
    favouritesKey:FAVOURITES,
    shoppingKey:SHOPPING,
    foodIdAliases:FOOD_ID_ALIASES,
    resolveFoodId,
    result:Object.freeze({...result,auxiliaryWrites:Object.freeze([...(result.auxiliaryWrites||[])])}),
    readCurrent,
    readQuarantine,
    downloadRecovery,
    clearQuarantine
  });

  function renderRecoveryNotice(){
    const q=readQuarantine();
    const needsNotice=!!q || String(result.status).startsWith('invalid-current');
    if(!needsNotice || document.getElementById('storageRecoveryNotice'))return;
    const shell=document.querySelector('.app-shell');
    if(!shell)return;

    const style=document.createElement('style');
    style.textContent=`
      .storage-recovery-notice{margin:14px 0 18px;padding:14px 15px;border:2px solid #a64b2a;border-radius:16px;background:#fff7f2;color:#3f261d}
      .storage-recovery-notice h3{margin:3px 0 7px}.storage-recovery-notice p{margin:0 0 10px;line-height:1.45}.storage-recovery-actions{display:flex;gap:8px;flex-wrap:wrap}.storage-recovery-actions button{min-height:40px}
    `;
    document.head.appendChild(style);

    const notice=document.createElement('section');
    notice.id='storageRecoveryNotice';
    notice.className='storage-recovery-notice';
    notice.setAttribute('role','alert');
    const persisted=!!q;
    notice.innerHTML=`
      <p class="eyebrow">DATA RECOVERY</p>
      <h3>Saved tracker data needed recovery</h3>
      <p>${persisted
        ? 'Okello Food found unreadable v3 data and preserved the original raw value in a separate recovery quarantine before creating a safe working state. Restore a recent backup before relying on the new empty/default history.'
        : 'Okello Food found unreadable v3 data but could not persist a quarantine copy. Do not log new data yet. Download the recovery copy now or restore a recent backup.'}</p>
      <div class="storage-recovery-actions">
        <button id="downloadStorageRecovery" class="secondary-btn" type="button">Download recovery copy</button>
        <button id="openBackupRecovery" class="primary-btn" type="button">Open Backup</button>
        ${persisted?'<button id="dismissStorageRecovery" class="text-btn" type="button">Dismiss after recovery</button>':''}
      </div>`;
    shell.insertBefore(notice,shell.firstChild);

    document.getElementById('downloadStorageRecovery')?.addEventListener('click',()=>downloadRecovery());
    document.getElementById('openBackupRecovery')?.addEventListener('click',()=>{
      const settingsTab=document.querySelector('[data-tab="settings"]');
      if(settingsTab)settingsTab.click();
      setTimeout(()=>document.getElementById('exportBtn')?.closest('.card')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    });
    document.getElementById('dismissStorageRecovery')?.addEventListener('click',()=>{
      const ok=window.confirm('Dismiss this recovery warning only after you have restored a good backup or downloaded the recovery copy. This will delete the quarantined raw data from this device. Continue?');
      if(!ok)return;
      if(clearQuarantine())notice.remove();
    });
  }

  renderRecoveryNotice();
})();
