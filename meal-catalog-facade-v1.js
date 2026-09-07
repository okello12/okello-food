(() => {
  'use strict';

  const upstream=window.OkelloFoodCatalog;
  const contract=window.OkelloMealDataContract;
  if(!upstream||!contract)return;

  const STORE='okello_food_tracker_v3';
  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }
  function recipeByFoodId(foodId){
    const id=String(foodId||'');
    if(!id.startsWith('recipe_'))return null;
    const wanted=id.slice(7);
    return (readState().recipes||[]).find(r=>String(r?.id)===wanted)||null;
  }
  function getDecorated(id,seen=new Set()){
    const resolved=contract.resolveFoodId(id);
    if(seen.has(resolved))return null;
    const raw=upstream.getById?.(resolved)||upstream.getById?.(id);
    if(!raw)return null;
    const out=contract.decorateFood({...raw,id:resolved});
    if(String(out.id||'').startsWith('recipe_')){
      const recipe=recipeByFoodId(out.id);
      if(recipe){
        const next=new Set(seen);next.add(resolved);
        out.basis=contract.deriveRecipeBasis(recipe,ingredientId=>getDecorated(ingredientId,next));
      }else out.basis='unknown';
    }
    return out;
  }
  function decorateResult(value){
    if(!value||typeof value!=='object')return value;
    const food=value.food?getDecorated(value.food.id):null;
    if(food)return {...value,food,id:food.id};
    return getDecorated(value.id)||contract.decorateFood(value);
  }
  function allCanonical(){
    const source=Array.isArray(upstream.all?.())?upstream.all():[];
    const seen=new Set(),out=[];
    for(const raw of source){
      const food=getDecorated(raw?.id)||contract.decorateFood(raw);
      const id=String(food?.id||'');
      if(!id||seen.has(id))continue;
      seen.add(id);out.push(food);
    }
    return out;
  }

  const facade={
    ...upstream,
    version:`${upstream.version||'1'}+meal-contract-1`,
    getById:id=>getDecorated(id),
    findByName:term=>decorateResult(upstream.findByName?.(term)),
    all:allCanonical,
    calc:(foodOrId,grams)=>{
      const food=typeof foodOrId==='string'?getDecorated(foodOrId):contract.decorateFood(foodOrId);
      return upstream.calc?.(food||foodOrId,grams)||{kcal:0,protein:0,fibre:0};
    }
  };
  if(typeof upstream.search==='function')facade.search=(q,o)=>upstream.search(q,o).map(decorateResult).filter((row,index,arr)=>arr.findIndex(x=>String(x?.id)===String(row?.id))===index);
  if(typeof upstream.best==='function')facade.best=(q,o)=>decorateResult(upstream.best(q,o));
  if(typeof upstream.classify==='function')facade.classify=food=>upstream.classify(contract.decorateFood(food));
  if(typeof upstream.explain==='function')facade.explain=food=>upstream.explain(contract.decorateFood(food));
  if(typeof upstream.sourceSummary==='function')facade.sourceSummary=()=>upstream.sourceSummary();

  window.OkelloFoodCatalog=Object.freeze(facade);
  window.OkelloMealDataContractCatalog=window.OkelloFoodCatalog;

  const errors=contract.validateStaticCatalogue(window.OkelloFoodCatalog.all());
  window.OkelloMealDataContractValidation=Object.freeze({ok:errors.length===0,errors:Object.freeze(errors.map(x=>Object.freeze({...x})))});
  if(errors.length)console.error('Okello meal data contract: unclassified static soup/composite entries',errors);
})();