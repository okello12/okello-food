(() => {
  'use strict';

  const VERSION=1;
  const STORE='okello_food_tracker_v3';
  const repo=window.OkelloStateRepository;
  if(!repo)return;
  const nativeGet=Storage.prototype.getItem;
  const MANAGED=/^(?:ghana_|world_)/;

  function isManaged(food){return MANAGED.test(String(food?.id||''));}

  // Ghana/world compatibility loaders still run before this module in v46.
  // Capture their canonical rows once, then remove those immutable library
  // records from durable user state. Existing history keeps foodId snapshots.
  const raw=nativeGet.call(localStorage,STORE);
  let state={};
  try{state=JSON.parse(raw||'{}')||{};}catch(_){state={};}
  const rows=Array.isArray(state.customFoods)?state.customFoods:[];
  const managed=[];const user=[];const byId=new Map();
  for(const food of rows){
    if(isManaged(food)){
      const id=String(food.id);if(byId.has(id))managed[byId.get(id)]={...food};else{byId.set(id,managed.length);managed.push({...food});}
    }else user.push(food);
  }
  const frozen=Object.freeze(managed.map(food=>Object.freeze({...food})));
  window.OkelloManagedCatalogV46=frozen;

  if(managed.length){
    const result=repo.replace({...state,customFoods:user},{source:'catalog-storage-separation-v46'});
    if(!result?.ok)console.error('Could not separate managed catalogue from user state',result);
  }

  // Legacy modules still expect the managed catalogue inside state.customFoods.
  // Give those readers a synthetic compatibility view while keeping the
  // durable store stripped. The repository itself captured native storage
  // access before this shim and therefore continues to read the true user state.
  //
  // Performance: dozens of modules read this key, some once per rendered food
  // card. The managed rows are frozen and the view is a pure function of the
  // stored string, so the last view is reused until the stored string changes.
  // Before v52 every read re-cloned ~270 catalogue rows, which made a single
  // "Add to today" take several seconds on a phone.
  let lastRaw,lastView;
  Storage.prototype.getItem=function(key){
    const value=nativeGet.call(this,key);
    if(this!==window.localStorage||String(key)!==STORE)return value;
    if(lastView!==undefined&&value===lastRaw)return lastView;
    try{
      const live=JSON.parse(value||'{}')||{};
      const custom=Array.isArray(live.customFoods)?live.customFoods.filter(food=>!isManaged(food)):[];
      const view=JSON.stringify({...live,customFoods:[...frozen,...custom]});
      lastRaw=value;lastView=view;
      return view;
    }catch(_){return value;}
  };

  // Any legacy whole-state write that carries the synthetic rows back toward
  // storage is stripped by the governed repository before persistence.
  repo.registerBeforeWrite(({next})=>{
    if(!next||typeof next!=='object')return next;
    if(Array.isArray(next.customFoods))next.customFoods=next.customFoods.filter(food=>!isManaged(food));
    return next;
  });

  function durableStats(){
    const durable=repo.read();const custom=Array.isArray(durable.customFoods)?durable.customFoods:[];
    return {managedRuntime:frozen.length,userCustom:custom.filter(food=>!isManaged(food)).length,managedPersisted:custom.filter(isManaged).length};
  }

  window.OkelloCatalogStorageV46=Object.freeze({version:VERSION,managed:frozen,isManaged,durableStats});
})();