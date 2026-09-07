(() => {
  'use strict';

  const VERSION=2;
  const STEP_GRAMS=5;
  const EPSILON=1e-9;

  const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

  function boundsFor(food){
    const portion=Number(food?.portion)>0?Number(food.portion):100;
    const min=Number(food?.min)>0?Number(food.min):portion*.7;
    const max=Number(food?.max)>0?Number(food.max):portion*1.35;
    return {min,max};
  }

  function allocationWeight(food){
    if(food?.cat==='Protein')return .42;
    if(food?.cat==='Starch')return .34;
    if(['Soup','Complete meal','Recipes'].includes(food?.cat))return .50;
    if(food?.cat==='Vegetables')return .15;
    return .20;
  }

  function roundWithinBounds(value,min,max){
    const rounded=Math.round(Number(value||0)/STEP_GRAMS)*STEP_GRAMS;
    return clamp(rounded,min,max);
  }

  function nutrition(calc,food,grams){
    const out=calc(food,grams)||{};
    return {
      kcal:Number(out.kcal)||0,
      protein:Number(out.protein)||0,
      fibre:Number(out.fibre)||0
    };
  }

  function totalsFor(items,calc){
    return items.reduce((acc,item)=>{
      const n=nutrition(calc,item.food,item.grams);
      acc.kcal+=n.kcal;
      acc.protein+=n.protein;
      acc.fibre+=n.fibre;
      return acc;
    },{kcal:0,protein:0,fibre:0});
  }

  function minimumItemsFor(foods){
    return foods.map(food=>{
      const {min,max}=boundsFor(food);
      return {food,grams:min,min,max};
    });
  }

  function minimumTotalFor(foods,calc){
    return totalsFor(minimumItemsFor(foods),calc);
  }

  function fitFoods(foods,budget,calc){
    const resolved=(Array.isArray(foods)?foods:[]).filter(Boolean);
    const kcalBudget=Number(budget);
    if(resolved.length<2||!(kcalBudget>0)||typeof calc!=='function'){
      return {fit:false,reason:'invalid-input',budget:Math.max(0,kcalBudget||0),items:[],kcal:0,protein:0,fibre:0,overByKcal:0,trace:null};
    }

    const weights=resolved.map(allocationWeight);
    const weightSum=weights.reduce((a,b)=>a+b,0);
    let items=resolved.map((food,index)=>{
      const {min,max}=boundsFor(food);
      const itemBudget=kcalBudget*(weights[index]/weightSum);
      const kcalPerGram=(Number(food.kcal)||0)/100;
      const ideal=kcalPerGram>0?itemBudget/kcalPerGram:min;
      const grams=roundWithinBounds(ideal,min,max);
      return {food,grams,min,max};
    });

    const minimumItems=minimumItemsFor(resolved);
    const minimum=totalsFor(minimumItems,calc);
    const initial=totalsFor(items,calc);
    const trace={
      budget:kcalBudget,
      minimumKcal:minimum.kcal,
      minimumGrams:minimumItems.map(x=>x.grams),
      initialKcal:initial.kcal,
      initialGrams:items.map(x=>x.grams),
      scale:initial.kcal>0?kcalBudget/initial.kcal:null,
      finalKcal:null,
      finalGrams:null
    };

    if(initial.kcal<=kcalBudget+EPSILON){
      trace.finalGrams=items.map(x=>x.grams);
      trace.finalKcal=initial.kcal;
      return {fit:true,reason:'fits',budget:kcalBudget,items,kcal:initial.kcal,protein:initial.protein,fibre:initial.fibre,overByKcal:0,trace};
    }

    const scale=kcalBudget/initial.kcal;
    const scaled=items.map(item=>({
      ...item,
      grams:roundWithinBounds(item.grams*scale,item.min,item.max)
    }));
    const final=totalsFor(scaled,calc);
    trace.finalGrams=scaled.map(x=>x.grams);
    trace.finalKcal=final.kcal;

    if(final.kcal<=kcalBudget+EPSILON){
      return {fit:true,reason:'scaled-within-bounds',budget:kcalBudget,items:scaled,kcal:final.kcal,protein:final.protein,fibre:final.fibre,overByKcal:0,trace};
    }

    // Rounding/reclamping can leave the proportional attempt slightly high even
    // when the true minimum meal fits. In that case the minimum itself is a
    // truthful in-budget answer. No second scaling pass is needed.
    if(minimum.kcal<=kcalBudget+EPSILON){
      trace.finalGrams=minimumItems.map(x=>x.grams);
      trace.finalKcal=minimum.kcal;
      return {fit:true,reason:'minimums-fit',budget:kcalBudget,items:minimumItems,kcal:minimum.kcal,protein:minimum.protein,fibre:minimum.fibre,overByKcal:0,trace};
    }

    // Never fabricate token portions to satisfy a continuous budget. When the
    // sensible floor is still too large, return that floor honestly so callers
    // can either reduce the component set or show the real minimum cost.
    return {
      fit:false,
      reason:'minimums-exceed-budget',
      budget:kcalBudget,
      items:minimumItems,
      kcal:minimum.kcal,
      protein:minimum.protein,
      fibre:minimum.fibre,
      overByKcal:minimum.kcal-kcalBudget,
      minimumViable:true,
      trace
    };
  }

  function build(ids,budget,{resolve,calc}={}){
    if(typeof resolve!=='function')return {fit:false,reason:'missing-resolver',budget:Number(budget)||0,items:[],kcal:0,protein:0,fibre:0,overByKcal:0,trace:null};
    const foods=(Array.isArray(ids)?ids:[]).map(resolve).filter(Boolean);
    const result=fitFoods(foods,budget,calc);
    result.items=(result.items||[]).map(item=>({
      id:item.food?.id||'',
      food:item.food,
      grams:item.grams,
      min:item.min,
      max:item.max
    }));
    return result;
  }

  function combinations(values,size,start=0,prefix=[],out=[]){
    if(prefix.length===size){out.push(prefix.slice());return out;}
    for(let i=start;i<=values.length-(size-prefix.length);i++){
      prefix.push(values[i]);
      combinations(values,size,i+1,prefix,out);
      prefix.pop();
    }
    return out;
  }

  function hasBaseLike(foods){
    return foods.some(food=>['Starch','Complete meal','Beans'].includes(food?.cat));
  }

  function hasProteinLike(foods){
    return foods.some(food=>food?.cat==='Protein'||food?.providesAnimalProtein===true);
  }

  function subsetScore(result){
    const foods=(result.items||[]).map(x=>x.food);
    return (hasBaseLike(foods)?1000:0)+(hasProteinLike(foods)?1000:0)+(result.items?.length||0)*100+(Number(result.protein)||0);
  }

  function chooseSuggestion(ids,budget,{resolve,calc}={}){
    const originalIds=Array.isArray(ids)?ids.filter(Boolean):[];
    const full=build(originalIds,budget,{resolve,calc});
    if(full.fit){
      return {...full,kind:'full',droppedIds:[],fullTrace:full.trace};
    }
    if(!full.items.length){
      return {...full,kind:'unavailable',droppedIds:originalIds.slice(),fullTrace:full.trace};
    }

    const resolvedFoods=originalIds.map(id=>({requestedId:id,food:resolve?.(id)})).filter(x=>x.food);
    for(let size=resolvedFoods.length-1;size>=2;size--){
      const fitting=[];
      for(const subset of combinations(resolvedFoods,size)){
        const result=fitFoods(subset.map(x=>x.food),budget,calc);
        if(!result.fit)continue;
        const keptIds=subset.map(x=>x.requestedId);
        fitting.push({
          ...result,
          items:result.items.map(item=>({id:item.food?.id||'',food:item.food,grams:item.grams,min:item.min,max:item.max})),
          keptIds,
          droppedIds:originalIds.filter(id=>!keptIds.includes(id))
        });
      }
      if(fitting.length){
        fitting.sort((a,b)=>subsetScore(b)-subsetScore(a));
        const chosen=fitting[0];
        return {...chosen,kind:'reduced',fullTrace:full.trace,reducedTrace:chosen.trace};
      }
    }

    // Nothing smaller can fit either. Return the full minimum-viable meal and
    // tell the caller exactly how far over the planning budget it sits.
    return {
      ...full,
      kind:'minimum-over-budget',
      fit:false,
      droppedIds:[],
      overByKcal:Math.max(0,(Number(full.kcal)||0)-(Number(budget)||0)),
      fullTrace:full.trace
    };
  }

  const api=Object.freeze({
    version:VERSION,
    stepGrams:STEP_GRAMS,
    boundsFor,
    allocationWeight,
    roundWithinBounds,
    minimumItemsFor,
    minimumTotalFor,
    fitFoods,
    build,
    chooseSuggestion
  });

  if(typeof window!=='undefined')window.OkelloSmartMealFit=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
