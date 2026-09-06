(() => {
  'use strict';

  const STORE = 'okello_food_tracker_v3';
  const SCHEMA_VERSION = 1;
  const MANAGED_PREFIXES = ['ghana_','world_'];
  const ALLOWED_CATEGORIES = new Set(['Starch','Protein','Beans','Vegetables','Dairy','Extras','Soup','Complete meal','Custom','Recipes','Raw ingredient']);
  const REGION_ALIASES = Object.freeze({
    'East & Southeast Asia':'East & Southeast Asia',
    'Ghana':'Ghana',
    'West Africa':'West Africa',
    'East Africa':'East Africa',
    'Southern Africa':'Southern Africa',
    'North Africa & Middle East':'North Africa & Middle East',
    'South Asia':'South Asia',
    'East Asia':'East Asia',
    'Southeast Asia':'Southeast Asia',
    'Europe':'Europe',
    'Latin America & Caribbean':'Latin America & Caribbean',
    'North America':'North America',
    'Global':'Global'
  });

  const diagnostics = {
    schemaVersion: SCHEMA_VERSION,
    idCollisions: [],
    invalidFoods: [],
    semanticDuplicates: [],
    repairedFoods: [],
    removedFoods: [],
    runtimeInvalidFoods: []
  };

  function clone(v){ return v && typeof v === 'object' ? {...v} : v; }
  function normaliseText(v){ return String(v || '').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim(); }
  function isManaged(food){ const id=String(food?.id || ''); return MANAGED_PREFIXES.some(p=>id.startsWith(p)); }
  function isFiniteNumber(v){ return Number.isFinite(Number(v)); }
  function sourceFor(food){ const id=String(food?.id || ''); if(id.startsWith('ghana_')) return 'ghana'; if(id.startsWith('world_')) return 'world'; return 'user'; }
  function regionFor(food){
    if(String(food?.id || '').startsWith('ghana_')) return 'Ghana';
    const r=String(food?.region || '').trim();
    return REGION_ALIASES[r] || r || 'Global';
  }
  function inferQuality(food){
    if(food?.quality) return String(food.quality);
    const text=(String(food?.name || '')+' '+String(food?.note || '')).toLowerCase();
    return /estimate|var(?:y|ies)|recipe|oil|fried|restaurant|takeaway|brand|sugar|butter|cream|batter|marinade/.test(text) ? 'Estimated' : 'Reference';
  }
  function validateFood(food){
    const errors=[];
    if(!food || typeof food!=='object') return ['not an object'];
    if(!String(food.id || '').trim()) errors.push('missing id');
    if(!String(food.name || '').trim()) errors.push('missing name');
    if(!String(food.cat || '').trim()) errors.push('missing category');
    else if(!ALLOWED_CATEGORIES.has(String(food.cat))) errors.push('unknown category');
    if(!isFiniteNumber(food.kcal) || Number(food.kcal)<0 || Number(food.kcal)>1000) errors.push('invalid kcal/100 g');
    if(!isFiniteNumber(food.protein) || Number(food.protein)<0 || Number(food.protein)>100) errors.push('invalid protein/100 g');
    if(!isFiniteNumber(food.fibre) || Number(food.fibre)<0 || Number(food.fibre)>100) errors.push('invalid fibre/100 g');
    if(!isFiniteNumber(food.portion) || Number(food.portion)<=0 || Number(food.portion)>10000) errors.push('invalid portion');
    if(food.min!=null && (!isFiniteNumber(food.min) || Number(food.min)<=0)) errors.push('invalid min portion');
    if(food.max!=null && (!isFiniteNumber(food.max) || Number(food.max)<=0)) errors.push('invalid max portion');
    if(isFiniteNumber(food.min) && isFiniteNumber(food.max) && Number(food.min)>Number(food.max)) errors.push('min exceeds max');
    return errors;
  }
  function normaliseManaged(food){
    const f={...food};
    f.id=String(f.id || '').trim();
    f.name=String(f.name || '').trim();
    f.cat=String(f.cat || 'Custom').trim();
    f.kcal=Number(f.kcal)||0;
    f.protein=Math.max(0,Number(f.protein)||0);
    f.fibre=Math.max(0,Number(f.fibre)||0);
    f.portion=Math.max(1,Number(f.portion)||100);
    f.min=Math.max(1,Number(f.min)||Math.max(1,Math.round(f.portion*.7)));
    f.max=Math.max(f.min,Number(f.max)||Math.max(f.min,Math.round(f.portion*1.35)));
    if(f.portion<f.min) f.portion=f.min;
    if(f.portion>f.max) f.portion=f.max;
    f.region=regionFor(f);
    f.source=sourceFor(f);
    f.quality=inferQuality(f);
    f.dataSchemaVersion=SCHEMA_VERSION;
    return f;
  }
  function sameNutrition(a,b){
    return Math.abs(Number(a.kcal)-Number(b.kcal))<=1 &&
      Math.abs(Number(a.protein)-Number(b.protein))<=0.2 &&
      Math.abs(Number(a.fibre)-Number(b.fibre))<=0.2;
  }

  function readState(){
    try{
      return JSON.parse(localStorage.getItem(STORE) || '{}') || {};
    }catch(_){ return {}; }
  }

  const state=readState();
  state.customFoods=Array.isArray(state.customFoods)?state.customFoods:[];
  const output=[];
  const indexById=new Map();

  for(const original of state.customFoods){
    if(!original || typeof original!=='object') continue;
    if(original.id==='ghana_apple'){
      diagnostics.removedFoods.push({id:'ghana_apple',reason:'duplicate of world_apple'});
      continue;
    }

    let food=isManaged(original)?normaliseManaged(original):{...original};
    if(food.id==='ghana_shito'){
      food={...food,kcal:350,protein:5,fibre:4,portion:15,min:5,max:25,quality:'Estimated',note:'Generic estimate; oil varies greatly. For your own shito, use the recipe calculator or jar label.',normalizationVersion:2};
      diagnostics.repairedFoods.push({id:food.id,reason:'canonical shito estimate'});
    }

    if(isManaged(food)){
      const errs=validateFood(food);
      if(errs.length) diagnostics.invalidFoods.push({id:food.id,name:food.name,errors:errs});
    }

    const id=String(food.id || '');
    if(id && indexById.has(id)){
      const previousIndex=indexById.get(id);
      diagnostics.idCollisions.push({id,kept:'latest'});
      output[previousIndex]=food;
    }else{
      if(id) indexById.set(id,output.length);
      output.push(food);
    }
  }

  const managed=output.filter(isManaged);
  const byName=new Map();
  for(const f of managed){
    const key=normaliseText(f.name);
    if(!key) continue;
    if(!byName.has(key)) byName.set(key,[]);
    byName.get(key).push(f);
  }
  for(const [name,items] of byName){
    if(items.length<2) continue;
    diagnostics.semanticDuplicates.push({
      name,
      ids:items.map(x=>x.id),
      identicalNutrition:items.every(x=>sameNutrition(items[0],x))
    });
  }

  state.customFoods=output;
  try{ localStorage.setItem(STORE,JSON.stringify(state)); }catch(_){}

  function currentManaged(){
    const s=readState();
    return (Array.isArray(s.customFoods)?s.customFoods:[]).filter(isManaged).map(clone);
  }
  function byIdMap(){ return new Map(currentManaged().map(f=>[String(f.id),f])); }
  function regionForId(id){
    const key=String(id || '');
    if(key.startsWith('ghana_')) return 'Ghana';
    const f=byIdMap().get(key);
    return f ? regionFor(f) : 'Global';
  }
  function stats(){
    const foods=currentManaged();
    const regions={}; const sources={}; const qualities={};
    for(const f of foods){
      regions[regionFor(f)]=(regions[regionFor(f)]||0)+1;
      sources[sourceFor(f)]=(sources[sourceFor(f)]||0)+1;
      qualities[inferQuality(f)]=(qualities[inferQuality(f)]||0)+1;
    }
    return {
      managedFoods:foods.length,
      regions,
      sources,
      qualities,
      invalidFoods:diagnostics.invalidFoods.length,
      idCollisions:diagnostics.idCollisions.length,
      duplicateNameWarnings:diagnostics.semanticDuplicates.length
    };
  }
  function byRegion(region){ return currentManaged().filter(f=>regionFor(f)===region); }
  function auditFoods(foods){
    const bad=[];
    for(const f of Array.isArray(foods)?foods:[]){
      if(f?.raw) continue;
      const errs=validateFood(f);
      if(errs.length) bad.push({id:f?.id,name:f?.name,errors:errs});
    }
    diagnostics.runtimeInvalidFoods=bad;
    return bad.map(x=>({...x,errors:[...x.errors]}));
  }

  const api=Object.freeze({
    schemaVersion:SCHEMA_VERSION,
    schema:Object.freeze({
      required:['id','name','cat','kcal','protein','fibre','portion'],
      units:Object.freeze({kcal:'per 100 g',protein:'g per 100 g',fibre:'g per 100 g',portion:'g'}),
      categories:Object.freeze([...ALLOWED_CATEGORIES])
    }),
    validate(food){ return [...validateFood(food)]; },
    managed(){ return currentManaged(); },
    byRegion(region){ return byRegion(region).map(clone); },
    regionForId,
    stats,
    diagnostics(){ return JSON.parse(JSON.stringify(diagnostics)); },
    auditFoods
  });
  window.OkelloFoodData=api;

  function renderHealthCard(){
    const settings=document.getElementById('tab-settings');
    if(!settings) return;
    let runtimeBad=[];
    if(window.OkelloFoodCatalog?.all) runtimeBad=api.auditFoods(window.OkelloFoodCatalog.all());
    const s=stats();
    let card=document.getElementById('catalogHealthCard');
    if(!card){
      card=document.createElement('section');
      card.id='catalogHealthCard';
      card.className='card';
      settings.appendChild(card);
    }
    const issues=s.invalidFoods+s.idCollisions+runtimeBad.length;
    card.innerHTML=`
      <p class="eyebrow">CATALOGUE INTEGRITY</p>
      <h3>One food schema, checked automatically</h3>
      <p class="muted">Ghanaian and world library foods now pass through the same validation layer before the tracker uses them.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0">
        <div class="score-card"><span>Managed foods</span><strong style="font-size:1.25rem">${s.managedFoods}</strong></div>
        <div class="score-card"><span>Schema errors</span><strong style="font-size:1.25rem">${s.invalidFoods+runtimeBad.length}</strong></div>
        <div class="score-card"><span>ID collisions</span><strong style="font-size:1.25rem">${s.idCollisions}</strong></div>
      </div>
      <p class="tiny-note">Schema v${SCHEMA_VERSION}. ${issues===0?'Catalogue health check passed.':`${issues} issue${issues===1?'':'s'} need attention.`} Duplicate-name warnings are reviewed separately because different cuisines can legitimately use similar names.</p>`;
  }

  setTimeout(renderHealthCard,0);
  setTimeout(renderHealthCard,900);
})();