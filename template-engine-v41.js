(() => {
  'use strict';

  const VERSION=1;
  const resolveFoodId=id=>window.OkelloStorageMigration?.resolveFoodId?.(id)||String(id??'');

  function round1(n){return Math.round((Number(n)||0)*10)/10;}
  function finite(n){const x=Number(n);return Number.isFinite(x)?x:null;}
  function uid(prefix='plate'){
    if(globalThis.crypto?.randomUUID)return `${prefix}_${crypto.randomUUID()}`;
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  // New templates store quantities and provenance, not cached nutrition. They are
  // instructions for future meals, so current food definitions are applied when
  // the template is rendered or logged.
  function componentFromLog(entry){
    if(!entry||typeof entry!=='object')return null;
    const grams=finite(entry.grams);
    if(!(grams>0))return null;
    const out={
      foodId:resolveFoodId(entry.foodId),
      grams,
      meal:entry.meal||'Other',
      name:entry.name||'',
      emoji:entry.emoji||'🍽️'
    };
    for(const key of ['enteredAmount','enteredUnit','estimatedGrams','estimateBasisGrams','amountQuality','estimateSource','pieceKey']){
      if(entry[key]!==undefined)out[key]=entry[key];
    }
    return out;
  }

  function createTemplate(name,entries,options={}){
    const components=(entries||[]).map(componentFromLog).filter(Boolean);
    return {
      id:options.id||uid('template'),
      name:String(name||'Meal template').trim()||'Meal template',
      components,
      createdAt:options.createdAt||Date.now(),
      templateVersion:2
    };
  }

  // Legacy v23 templates stored whole log entries including kcal/protein/fibre.
  // Normalisation is read-only: those values are intentionally ignored whenever
  // the food can still be resolved from the current catalogue.
  function normaliseTemplate(template){
    const t=template&&typeof template==='object'?template:{};
    if(Array.isArray(t.components)){
      return {...t,components:t.components.map(c=>({...c,foodId:resolveFoodId(c?.foodId)}))};
    }
    const components=(Array.isArray(t.items)?t.items:[]).map(item=>{
      const c=componentFromLog(item);
      if(!c)return null;
      c.legacySnapshot={
        kcal:finite(item.kcal),
        protein:finite(item.protein),
        fibre:finite(item.fibre)
      };
      return c;
    }).filter(Boolean);
    return {...t,components};
  }

  function getFood(catalog,id){
    try{return catalog?.getById?.(resolveFoodId(id))||null;}catch(_){return null;}
  }
  function calc(catalog,food,grams){
    try{
      if(catalog?.calc){
        const v=catalog.calc(food,grams);
        return {kcal:Number(v?.kcal)||0,protein:Number(v?.protein)||0,fibre:Number(v?.fibre)||0};
      }
    }catch(_){}
    return {
      kcal:(Number(food?.kcal)||0)*grams/100,
      protein:(Number(food?.protein)||0)*grams/100,
      fibre:(Number(food?.fibre)||0)*grams/100
    };
  }

  function evaluateComponent(component,catalog){
    const c=component&&typeof component==='object'?component:{};
    const grams=finite(c.grams);
    if(!(grams>0))return {ok:false,reason:'invalid-amount',component:c};
    const food=getFood(catalog,c.foodId);
    if(!food){
      return {
        ok:false,
        reason:'unresolved-food',
        component:c,
        foodId:resolveFoodId(c.foodId),
        name:c.name||'Unknown food'
      };
    }
    const nutrition=calc(catalog,food,grams);
    return {
      ok:true,
      source:'current-definition',
      component:c,
      food,
      foodId:food.id||resolveFoodId(c.foodId),
      grams,
      kcal:nutrition.kcal,
      protein:nutrition.protein,
      fibre:nutrition.fibre
    };
  }

  function evaluateTemplate(template,catalog){
    const t=normaliseTemplate(template);
    const rows=(t.components||[]).map(c=>evaluateComponent(c,catalog));
    const resolved=rows.filter(x=>x.ok);
    const unresolved=rows.filter(x=>!x.ok);
    const totals=resolved.reduce((a,x)=>({
      kcal:a.kcal+x.kcal,
      protein:a.protein+x.protein,
      fibre:a.fibre+x.fibre
    }),{kcal:0,protein:0,fibre:0});
    return {
      template:t,
      rows,
      unresolved,
      complete:unresolved.length===0&&rows.length>0,
      kcal:totals.kcal,
      protein:totals.protein,
      fibre:totals.fibre
    };
  }

  function instantiateTemplate(template,catalog,options={}){
    const evaluation=evaluateTemplate(template,catalog);
    if(!evaluation.complete){
      return {ok:false,reason:'template-needs-repair',unresolved:evaluation.unresolved,entries:[]};
    }
    const now=Number(options.ts)||Date.now();
    const plateId=options.plateId||uid('plate');
    const defaultMeal=options.meal||null;
    const makeId=typeof options.makeId==='function'?options.makeId:()=>uid('templateitem');
    const entries=evaluation.rows.map(row=>{
      const c=row.component;
      const entry={
        id:makeId(),
        plateId,
        foodId:row.foodId,
        name:row.food.name||c.name||'',
        emoji:row.food.emoji||c.emoji||'🍽️',
        grams:round1(row.grams),
        meal:defaultMeal||c.meal||'Other',
        kcal:row.kcal,
        protein:row.protein,
        fibre:row.fibre,
        ts:now,
        source:'meal-template'
      };
      for(const key of ['enteredAmount','enteredUnit','estimatedGrams','estimateBasisGrams','amountQuality','estimateSource','pieceKey']){
        if(c[key]!==undefined)entry[key]=c[key];
      }
      return entry;
    });
    return {ok:true,plateId,entries,evaluation};
  }

  const api=Object.freeze({
    version:VERSION,
    componentFromLog,
    createTemplate,
    normaliseTemplate,
    evaluateComponent,
    evaluateTemplate,
    instantiateTemplate
  });

  window.OkelloTemplateEngine=api;
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})();
