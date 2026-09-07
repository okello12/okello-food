(() => {
  'use strict';

  const CURRENT='okello_food_tracker_v3';
  const LEGACY='okello_food_tracker_v2';
  const QUARANTINE='okello_food_tracker_v3_quarantine_v1';
  const MIGRATION_VERSION=3;
  const SCHEMA_VERSION=3;
  const FOOD_ID_ALIASES=Object.freeze({
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
    pieceCalibration:{observations:[]}
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
  function normalisePieceCalibration(value){
    const src=isObject(value)?value:{};
    return {
      ...src,
      observations:Array.isArray(src.observations)?src.observations:[]
    };
  }
  function normalise(state){
    const base=defaultState();
    const src=isObject(state)?state:{};
    return {
      ...base,
      ...src,
      schemaVersion:SCHEMA_VERSION,
      targets:{...base.targets,...(isObject(src.targets)?src.targets:{})},
      logs:isObject(src.logs)?src.logs:{},
      customFoods:Array.isArray(src.customFoods)?src.customFoods:[],
      recipes:Array.isArray(src.recipes)?src.recipes:[],
      mealTemplates:Array.isArray(src.mealTemplates)?src.mealTemplates:[],
      definitionEvents:Array.isArray(src.definitionEvents)?src.definitionEvents:[],
      pieceCalibration:normalisePieceCalibration(src.pieceCalibration)
    };
  }

  // Current-state schema upgrades are deliberately owned here. Nutrition and
  // amount snapshots are never recalculated: only identifiers and durable schema
  // containers are normalised. This keeps historical kcal/protein/fibre and
  // estimatedGrams exactly as they were written.
  function upgradeState(input){
    const state=normalise(input);

    for(const entries of Object.values(state.logs||{})){
      for(const entry of Array.isArray(entries)?entries:[]) rewriteFoodId(entry);
    }

    for(const recipe of state.recipes){
      for(const ingredient of Array.isArray(recipe?.ingredients)?recipe.ingredients:[]) rewriteFoodId(ingredient);
    }

    for(const template of state.mealTemplates){
      for(const item of Array.isArray(template?.items)?template.items:[]) rewriteFoodId(item);
      for(const component of Array.isArray(template?.components)?template.components:[]) rewriteFoodId(component);
    }

    for(const obs of state.pieceCalibration.observations) rewriteFoodId(obs);

    // smart-support historically injected ghana_okro_soup as a second runtime
    // identity for ghana_okro_stew. Remove that generated duplicate after all
    // durable references have been canonicalised. User-created foods are untouched.
    state.customFoods=state.customFoods.filter(food=>String(food?.id||'')!=='ghana_okro_soup');

    // Runtime user-created soups/composites may legitimately be unclassified.
    // Static library records are classified by the meal data contract later in boot.
    state.customFoods=state.customFoods.map(food=>{
      if(!food||typeof food!=='object')return food;
      const cat=food.cat;
      const valid=food.basis==='base-only'||food.basis==='includes-protein'||food.basis==='unknown';
      if(!food.libraryVersion&&['Soup','Complete meal'].includes(cat)&&!valid){
        return {...food,basis:'unknown'};
      }
      return food;
    });

    return state;
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
  let result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,upgraded:false,legacyRetained:true,recoveryPending:false,quarantined:false};

  try{
    const currentRaw=localStorage.getItem(CURRENT);
    if(currentRaw!==null){
      const current=parseObject(currentRaw);
      if(current){
        const upgraded=upgradeState(current);
        const changed=JSON.stringify(upgraded)!==JSON.stringify(current);
        if(changed)localStorage.setItem(CURRENT,JSON.stringify(upgraded));
        const q=readQuarantine();
        result={
          version:MIGRATION_VERSION,
          status:q?(changed?'current-upgraded-with-quarantine':'current-with-quarantine'):(changed?'current-upgraded':'current'),
          migrated:false,
          created:false,
          upgraded:changed,
          legacyRetained:true,
          recoveryPending:!!q,
          quarantined:!!q
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
            quarantineCreated:q.created
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
            quarantineCreated:false
          };
        }
      }
    }else{
      const legacyRaw=localStorage.getItem(LEGACY);
      const legacy=parseObject(legacyRaw);
      if(legacy){
        localStorage.setItem(CURRENT,JSON.stringify(upgradeState(legacy)));
        result={version:MIGRATION_VERSION,status:'migrated-v2-to-v3',migrated:true,created:true,upgraded:true,legacyRetained:true,recoveryPending:false,quarantined:false};
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
          quarantined:false
        };
      }
    }
  }catch(_){
    result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,upgraded:false,legacyRetained:true,recoveryPending:false,quarantined:false};
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
    foodIdAliases:FOOD_ID_ALIASES,
    resolveFoodId,
    result:Object.freeze({...result}),
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
