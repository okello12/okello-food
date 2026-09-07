(() => {
  'use strict';

  const VERSION=1;
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

  function minimumTotalFor(foods,calc){
    const items=foods.map(food=>{
      const {min}=boundsFor(food);
      return {food,grams:min};
    });
    return totalsFor(items,calc);
  }

  function fitFoods(foods,budget,calc){
    const resolved=(Array.isArray(foods)?foods:[]).filter(Boolean);
    const kcalBudget=Number(budget);
    if(resolved.length<2||!(kcalBudget>0)||typeof calc!=='function'){
      return {fit:false,reason:'invalid-input',budget:Math.max(0,kcalBudget||0),items:[],trace:null};
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

    const initial=totalsFor(items,calc);
    const minimum=minimumTotalFor(resolved,calc);
    const trace={
      budget:kcalBudget,
      minimumKcal:minimum.kcal,
      initialKcal:initial.kcal,
      scale:initial.kcal>0?kcalBudget/initial.kcal:null,
      initialGrams:items.map(x=>x.grams),
      finalGrams:null,
      finalKcal:null
    };

    if(initial.kcal<=kcalBudget+EPSILON){
      trace.finalGrams=items.map(x=>x.grams);
      trace.finalKcal=initial.kcal;
      return {fit:true,reason:'fits',budget:kcalBudget,items,kcal:initial.kcal,protein:initial.protein,fibre:initial.fibre,trace};
    }

    const scale=kcalBudget/initial.kcal;
    items=items.map(item=>({
      ...item,
      grams:roundWithinBounds(item.grams*scale,item.min,item.max)
    }));
    const final=totalsFor(items,calc);
    trace.finalGrams=items.map(x=>x.grams);
    trace.finalKcal=final.kcal;

    if(final.kcal>kcalBudget+EPSILON){
      return {fit:false,reason:'minimums-exceed-budget',budget:kcalBudget,items:[],kcal:0,protein:0,fibre:0,trace};
    }

    return {fit:true,reason:'scaled-within-bounds',budget:kcalBudget,items,kcal:final.kcal,protein:final.protein,fibre:final.fibre,trace};
  }

  function build(ids,budget,{resolve,calc}={}){
    if(typeof resolve!=='function')return {fit:false,reason:'missing-resolver',budget:Number(budget)||0,items:[],trace:null};
    const foods=(Array.isArray(ids)?ids:[]).map(resolve).filter(Boolean);
    const result=fitFoods(foods,budget,calc);
    if(result.fit){
      result.items=result.items.map((item,index)=>({
        id:item.food?.id||String(ids?.[index]??''),
        food:item.food,
        grams:item.grams,
        min:item.min,
        max:item.max
      }));
    }
    return result;
  }

  const api=Object.freeze({
    version:VERSION,
    stepGrams:STEP_GRAMS,
    boundsFor,
    allocationWeight,
    roundWithinBounds,
    minimumTotalFor,
    fitFoods,
    build
  });

  if(typeof window!=='undefined')window.OkelloSmartMealFit=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
