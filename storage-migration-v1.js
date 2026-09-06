(() => {
  'use strict';

  const CURRENT='okello_food_tracker_v3';
  const LEGACY='okello_food_tracker_v2';
  const QUARANTINE='okello_food_tracker_v3_quarantine_v1';
  const MIGRATION_VERSION=2;
  const defaultState=()=>({targets:{calories:2300,protein:150},logs:{},customFoods:[],recipes:[]});

  function isObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
  function parseObject(raw){
    if(raw==null)return null;
    try{
      const parsed=JSON.parse(raw);
      return isObject(parsed)?parsed:null;
    }catch(_){return null;}
  }
  function normalise(state){
    const base=defaultState();
    const src=isObject(state)?state:{};
    return {
      ...base,
      ...src,
      targets:{...base.targets,...(isObject(src.targets)?src.targets:{})},
      logs:isObject(src.logs)?src.logs:{},
      customFoods:Array.isArray(src.customFoods)?src.customFoods:[],
      recipes:Array.isArray(src.recipes)?src.recipes:[]
    };
  }
  function readQuarantine(){
    try{
      const q=JSON.parse(localStorage.getItem(QUARANTINE)||'null');
      return isObject(q)&&typeof q.raw==='string'?q:null;
    }catch(_){return null;}
  }
  function saveQuarantine(raw){
    const existing=readQuarantine();
    if(existing)return {saved:true,created:false,record:existing};
    const record={
      format:'okello-storage-quarantine-v1',
      sourceKey:CURRENT,
      capturedAt:new Date().toISOString(),
      reason:'invalid-current',
      raw:String(raw)
    };
    try{
      localStorage.setItem(QUARANTINE,JSON.stringify(record));
      return {saved:true,created:true,record};
    }catch(_){return {saved:false,created:false,record:null};}
  }

  let volatileRecoveryRaw=null;
  let result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,legacyRetained:true,recoveryPending:false,quarantined:false};

  try{
    const currentRaw=localStorage.getItem(CURRENT);
    if(currentRaw!==null){
      const current=parseObject(currentRaw);
      if(current){
        const q=readQuarantine();
        result={
          version:MIGRATION_VERSION,
          status:q?'current-with-quarantine':'current',
          migrated:false,
          created:false,
          legacyRetained:true,
          recoveryPending:!!q,
          quarantined:!!q
        };
      }else{
        volatileRecoveryRaw=currentRaw;
        const q=saveQuarantine(currentRaw);
        if(q.saved){
          // Once the exact invalid value is safely preserved, create a deterministic
          // working v3 so downstream catalogue/data modules cannot silently overwrite
          // the only copy of the damaged data.
          localStorage.setItem(CURRENT,JSON.stringify(defaultState()));
          result={
            version:MIGRATION_VERSION,
            status:'invalid-current-quarantined-defaulted',
            migrated:false,
            created:true,
            legacyRetained:true,
            recoveryPending:true,
            quarantined:true,
            quarantineCreated:q.created
          };
        }else{
          // If quarantine itself cannot be persisted, leave the invalid v3 untouched.
          // The raw value remains available in memory for an immediate recovery download.
          result={
            version:MIGRATION_VERSION,
            status:'invalid-current-preserved-unquarantined',
            migrated:false,
            created:false,
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
        localStorage.setItem(CURRENT,JSON.stringify(normalise(legacy)));
        result={version:MIGRATION_VERSION,status:'migrated-v2-to-v3',migrated:true,created:true,legacyRetained:true,recoveryPending:false,quarantined:false};
      }else{
        localStorage.setItem(CURRENT,JSON.stringify(defaultState()));
        result={
          version:MIGRATION_VERSION,
          status:legacyRaw===null?'created-fresh-v3':'invalid-legacy-defaulted',
          migrated:false,
          created:true,
          legacyRetained:true,
          recoveryPending:false,
          quarantined:false
        };
      }
    }
  }catch(_){
    result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,legacyRetained:true,recoveryPending:false,quarantined:false};
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
    currentKey:CURRENT,
    legacyKey:LEGACY,
    quarantineKey:QUARANTINE,
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
