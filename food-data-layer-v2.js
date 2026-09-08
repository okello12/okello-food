(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const SCHEMA_VERSION=2;
  const MANAGED_PREFIXES=['ghana_','world_'];
  const ALLOWED_CATEGORIES=new Set(['Starch','Protein','Beans','Vegetables','Dairy','Extras','Soup','Complete meal','Custom','Recipes','Raw ingredient']);
  const REGION_ALIASES=Object.freeze({
    'East & Southeast Asia':'East & Southeast Asia','Ghana':'Ghana','West Africa':'West Africa','East Africa':'East Africa','Southern Africa':'Southern Africa','North Africa & Middle East':'North Africa & Middle East','South Asia':'South Asia','East Asia':'East Asia','Southeast Asia':'Southeast Asia','Europe':'Europe','Latin America & Caribbean':'Latin America & Caribbean','North America':'North America','Global':'Global'
  });
  const NUTRIENTS=Object.freeze(['kcal','protein','fibre','salt','carbs','fat']);
  const diagnostics={schemaVersion:SCHEMA_VERSION,idCollisions:[],invalidFoods:[],incompleteFoods:[],semanticDuplicates:[],repairedFoods:[],removedFoods:[],runtimeInvalidFoods:[]};

  const clone=value=>value&&typeof value==='object'?{...value}:value;
  const normaliseText=value=>String(value||'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const isManaged=food=>MANAGED_PREFIXES.some(prefix=>String(food?.id||'').startsWith(prefix));
  const isFiniteNumber=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
  function nullableNumber(value){
    if(value===null||value===undefined||value==='')return null;
    const n=Number(value);
    return Number.isFinite(n)?n:null;
  }
  function sourceFor(food){const id=String(food?.id||'');if(id.startsWith('ghana_'))return 'ghana';if(id.startsWith('world_'))return 'world';return 'user';}
  function regionFor(food){
    if(String(food?.id||'').startsWith('ghana_'))return 'Ghana';
    const region=String(food?.region||'').trim();
    return REGION_ALIASES[region]||region||'Global';
  }
  function inferQuality(food){
    if(food?.quality)return String(food.quality);
    const text=(String(food?.name||'')+' '+String(food?.note||'')).toLowerCase();
    return /estimate|var(?:y|ies)|recipe|oil|fried|restaurant|takeaway|brand|sugar|butter|cream|batter|marinade/.test(text)?'Estimated':'Reference';
  }
  function evidenceFor(food){
    const quality=inferQuality(food);
    return {
      sourceName:food?.sourceName??food?.source_name??null,
      sourceFoodCode:food?.sourceFoodCode??food?.source_food_code??null,
      sourceYear:food?.sourceYear??food?.source_year??null,
      sourceType:food?.sourceType??food?.source_type??(/estimate/i.test(quality)?'recipe-estimate':'reference-unspecified'),
      basis:food?.basis??'per 100 g edible portion',
      recipeVariant:food?.recipeVariant??food?.recipe_variant??(/estimate|recipe|var/i.test(String(food?.note||''))?String(food.note||''):null),
      confidence:food?.confidence??(/estimate/i.test(quality)?'low':'unreviewed'),
      reviewedAt:food?.reviewedAt??food?.reviewed_at??null
    };
  }
  function nutritionCompleteness(food){
    const known={};const missing=[];
    for(const key of NUTRIENTS){
      const present=isFiniteNumber(food?.[key]);
      known[key]=present;
      if(!present)missing.push(key);
    }
    return {known,missing,coreComplete:known.kcal&&known.protein&&known.fibre};
  }
  function validateFood(food){
    const errors=[];
    if(!food||typeof food!=='object')return ['not an object'];
    if(!String(food.id||'').trim())errors.push('missing id');
    if(!String(food.name||'').trim())errors.push('missing name');
    if(!String(food.cat||'').trim())errors.push('missing category');
    else if(!ALLOWED_CATEGORIES.has(String(food.cat)))errors.push('unknown category');
    for(const [key,max] of [['kcal',1000],['protein',100],['fibre',100],['salt',100],['carbs',100],['fat',100]]){
      const value=food[key];
      if(value==null||value==='')continue;
      if(!Number.isFinite(Number(value))||Number(value)<0||Number(value)>max)errors.push(`invalid ${key}/100 g`);
    }
    if(!isFiniteNumber(food.portion)||Number(food.portion)<=0||Number(food.portion)>10000)errors.push('invalid portion');
    if(food.min!=null&&(!isFiniteNumber(food.min)||Number(food.min)<=0))errors.push('invalid min portion');
    if(food.max!=null&&(!isFiniteNumber(food.max)||Number(food.max)<=0))errors.push('invalid max portion');
    if(isFiniteNumber(food.min)&&isFiniteNumber(food.max)&&Number(food.min)>Number(food.max))errors.push('min exceeds max');
    return errors;
  }
  function normaliseManaged(food){
    const f={...food};
    f.id=String(f.id||'').trim();
    f.name=String(f.name||'').trim();
    f.cat=String(f.cat||'Custom').trim();
    // Missing is not zero. A true zero must be supplied explicitly as 0.
    f.kcal=nullableNumber(f.kcal);
    f.protein=nullableNumber(f.protein);
    f.fibre=nullableNumber(f.fibre);
    f.salt=nullableNumber(f.salt);
    f.carbs=nullableNumber(f.carbs);
    f.fat=nullableNumber(f.fat);
    f.portion=Math.max(1,Number(f.portion)||100);
    f.min=Math.max(1,Number(f.min)||Math.max(1,Math.round(f.portion*.7)));
    f.max=Math.max(f.min,Number(f.max)||Math.max(f.min,Math.round(f.portion*1.35)));
    if(f.portion<f.min)f.portion=f.min;
    if(f.portion>f.max)f.portion=f.max;
    f.region=regionFor(f);
    f.source=sourceFor(f);
    f.quality=inferQuality(f);
    Object.assign(f,evidenceFor(f));
    f.nutritionCompleteness=nutritionCompleteness(f);
    f.dataSchemaVersion=SCHEMA_VERSION;
    return f;
  }
  function sameNutrition(a,b){
    for(const key of ['kcal','protein','fibre']){
      const av=nullableNumber(a?.[key]),bv=nullableNumber(b?.[key]);
      if(av===null||bv===null){if(av!==bv)return false;continue;}
      const tolerance=key==='kcal'?1:.2;
      if(Math.abs(av-bv)>tolerance)return false;
    }
    return true;
  }
  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }

  const state=readState();
  state.customFoods=Array.isArray(state.customFoods)?state.customFoods:[];
  const output=[];const indexById=new Map();
  for(const original of state.customFoods){
    if(!original||typeof original!=='object')continue;
    if(original.id==='ghana_apple'){
      diagnostics.removedFoods.push({id:'ghana_apple',reason:'duplicate of world_apple'});
      continue;
    }
    let food=isManaged(original)?normaliseManaged(original):{...original};
    if(food.id==='ghana_shito'){
      food=normaliseManaged({...food,kcal:350,protein:5,fibre:4,portion:15,min:5,max:25,quality:'Estimated',note:'Generic estimate; oil varies greatly. For your own shito, use the recipe calculator or jar label.',normalizationVersion:3,sourceType:'recipe-estimate',confidence:'low'});
      diagnostics.repairedFoods.push({id:food.id,reason:'canonical shito estimate retained pending source review'});
    }
    if(isManaged(food)){
      const errors=validateFood(food);
      if(errors.length)diagnostics.invalidFoods.push({id:food.id,name:food.name,errors});
      const completeness=nutritionCompleteness(food);
      if(!completeness.coreComplete)diagnostics.incompleteFoods.push({id:food.id,name:food.name,missing:completeness.missing});
    }
    const id=String(food.id||'');
    if(id&&indexById.has(id)){
      const previous=indexById.get(id);
      diagnostics.idCollisions.push({id,kept:'latest'});
      output[previous]=food;
    }else{
      if(id)indexById.set(id,output.length);
      output.push(food);
    }
  }

  const managed=output.filter(isManaged);const byName=new Map();
  for(const food of managed){
    const key=normaliseText(food.name);if(!key)continue;
    if(!byName.has(key))byName.set(key,[]);
    byName.get(key).push(food);
  }
  for(const [name,items] of byName){
    if(items.length<2)continue;
    diagnostics.semanticDuplicates.push({name,ids:items.map(x=>x.id),identicalNutrition:items.every(x=>sameNutrition(items[0],x))});
  }

  state.customFoods=output;
  try{localStorage.setItem(STORE,JSON.stringify(state));}catch(_){}

  function currentManaged(){const s=readState();return (Array.isArray(s.customFoods)?s.customFoods:[]).filter(isManaged).map(food=>normaliseManaged(food));}
  function byIdMap(){return new Map(currentManaged().map(food=>[String(food.id),food]));}
  function regionForId(id){const key=String(id||'');if(key.startsWith('ghana_'))return 'Ghana';const food=byIdMap().get(key);return food?regionFor(food):'Global';}
  function stats(){
    const foods=currentManaged();const regions={},sources={},qualities={};
    for(const food of foods){regions[regionFor(food)]=(regions[regionFor(food)]||0)+1;sources[sourceFor(food)]=(sources[sourceFor(food)]||0)+1;qualities[inferQuality(food)]=(qualities[inferQuality(food)]||0)+1;}
    return {managedFoods:foods.length,regions,sources,qualities,incompleteFoods:foods.filter(f=>!nutritionCompleteness(f).coreComplete).length,invalidFoods:diagnostics.invalidFoods.length,idCollisions:diagnostics.idCollisions.length,duplicateNameWarnings:diagnostics.semanticDuplicates.length};
  }
  function auditFoods(foods){
    const bad=[];
    for(const food of Array.isArray(foods)?foods:[]){if(food?.raw)continue;const errors=validateFood(food);if(errors.length)bad.push({id:food?.id,name:food?.name,errors});}
    diagnostics.runtimeInvalidFoods=bad;return bad.map(x=>({...x,errors:[...x.errors]}));
  }

  const api=Object.freeze({
    schemaVersion:SCHEMA_VERSION,
    schema:Object.freeze({required:['id','name','cat','kcal','protein','fibre','portion'],nullableNutrition:[...NUTRIENTS],units:Object.freeze({kcal:'kcal per 100 g',protein:'g per 100 g',fibre:'g per 100 g',salt:'g per 100 g',carbs:'g per 100 g',fat:'g per 100 g',portion:'g'}),evidenceFields:Object.freeze(['sourceName','sourceFoodCode','sourceYear','sourceType','basis','recipeVariant','confidence','reviewedAt']),categories:Object.freeze([...ALLOWED_CATEGORIES])}),
    nullableNumber,
    completeness:food=>nutritionCompleteness(food),
    validate:food=>[...validateFood(food)],
    managed:()=>currentManaged(),
    byRegion:region=>currentManaged().filter(food=>regionFor(food)===region).map(clone),
    regionForId,
    stats,
    diagnostics:()=>JSON.parse(JSON.stringify(diagnostics)),
    auditFoods
  });
  window.OkelloFoodData=api;

  function renderHealthCard(){
    const settings=document.getElementById('tab-settings');if(!settings)return;
    let runtimeBad=[];if(window.OkelloFoodCatalog?.all)runtimeBad=api.auditFoods(window.OkelloFoodCatalog.all());
    const s=stats();let card=document.getElementById('catalogHealthCard');
    if(!card){card=document.createElement('section');card.id='catalogHealthCard';card.className='card';settings.appendChild(card);}
    const issues=s.invalidFoods+s.idCollisions+runtimeBad.length;
    card.innerHTML=`<p class="eyebrow">CATALOGUE INTEGRITY</p><h3>Schema v${SCHEMA_VERSION}: missing stays missing</h3><p class="muted">Nutrition fields are nullable. An unavailable nutrient is no longer converted to zero. Evidence metadata records source, basis, confidence and review status when known.</p><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0"><div class="score-card"><span>Managed foods</span><strong style="font-size:1.25rem">${s.managedFoods}</strong></div><div class="score-card"><span>Incomplete core</span><strong style="font-size:1.25rem">${s.incompleteFoods}</strong></div><div class="score-card"><span>Schema issues</span><strong style="font-size:1.25rem">${issues}</strong></div></div><p class="tiny-note">Incomplete does not mean poor nutrition. It means the source does not contain enough data for a complete assessment.</p>`;
  }
  setTimeout(renderHealthCard,0);setTimeout(renderHealthCard,900);
})();