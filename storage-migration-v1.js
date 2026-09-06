(() => {
  'use strict';

  const CURRENT='okello_food_tracker_v3';
  const LEGACY='okello_food_tracker_v2';
  const MIGRATION_VERSION=1;
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

  let result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,legacyRetained:true};

  try{
    const currentRaw=localStorage.getItem(CURRENT);
    if(currentRaw!==null){
      const current=parseObject(currentRaw);
      result=current
        ? {version:MIGRATION_VERSION,status:'current',migrated:false,created:false,legacyRetained:true}
        : {version:MIGRATION_VERSION,status:'invalid-current-preserved',migrated:false,created:false,legacyRetained:true};
    }else{
      const legacyRaw=localStorage.getItem(LEGACY);
      const legacy=parseObject(legacyRaw);
      if(legacy){
        localStorage.setItem(CURRENT,JSON.stringify(normalise(legacy)));
        result={version:MIGRATION_VERSION,status:'migrated-v2-to-v3',migrated:true,created:true,legacyRetained:true};
      }else{
        localStorage.setItem(CURRENT,JSON.stringify(defaultState()));
        result={
          version:MIGRATION_VERSION,
          status:legacyRaw===null?'created-fresh-v3':'invalid-legacy-defaulted',
          migrated:false,
          created:true,
          legacyRetained:true
        };
      }
    }
  }catch(_){
    result={version:MIGRATION_VERSION,status:'storage-unavailable',migrated:false,created:false,legacyRetained:true};
  }

  function readCurrent(){
    try{return parseObject(localStorage.getItem(CURRENT));}
    catch(_){return null;}
  }

  window.OkelloStorageMigration=Object.freeze({
    version:MIGRATION_VERSION,
    currentKey:CURRENT,
    legacyKey:LEGACY,
    result:Object.freeze({...result}),
    readCurrent
  });
})();
