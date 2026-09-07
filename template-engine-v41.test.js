'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'template-engine-v41.js'),'utf8');

function load(){
  const window={OkelloStorageMigration:{resolveFoodId:id=>String(id)==='ghana_okro_soup'?'ghana_okro_stew':String(id??'')}};
  const crypto={randomUUID:()=>`uuid-${Math.random().toString(36).slice(2)}`};
  const module={exports:{}};
  const context={window,crypto,module,globalThis:{crypto},Date,Math,console};
  vm.runInNewContext(SOURCE,context,{filename:'template-engine-v41.js'});
  return context.window.OkelloTemplateEngine;
}

function catalog(foods){
  const byId=new Map(foods.map(f=>[f.id,f]));
  return {
    getById(id){const f=byId.get(id);return f?{...f}:null;},
    calc(food,g){return {kcal:food.kcal*g/100,protein:food.protein*g/100,fibre:(food.fibre||0)*g/100};}
  };
}

(function testNewTemplatesPersistNoCachedNutrition(){
  const api=load();
  const t=api.createTemplate('Banku and okro',[
    {foodId:'banku',name:'Banku',emoji:'🥣',grams:540,meal:'Lunch',kcal:783,protein:11.88,fibre:5.4},
    {foodId:'ghana_okro_stew_base',name:'Okro base',emoji:'🥘',grams:300,meal:'Lunch',kcal:180,protein:4.5,fibre:8.4}
  ],{id:'t1',createdAt:1});
  assert.equal(t.templateVersion,2);
  assert.ok(Array.isArray(t.components));
  assert.equal('items' in t,false);
  for(const c of t.components){
    assert.equal('kcal' in c,false);
    assert.equal('protein' in c,false);
    assert.equal('fibre' in c,false);
  }
})();

(function testLegacyTemplateRepricesFromCurrentFoodDefinition(){
  const api=load();
  const c=catalog([{id:'future_soup',name:'Future soup base',emoji:'🍲',kcal:60,protein:1.5,fibre:2}]);
  const legacy={id:'old',name:'Old template',items:[{foodId:'future_soup',grams:400,meal:'Dinner',kcal:360,protein:28,fibre:8}]};
  const e=api.evaluateTemplate(legacy,c);
  assert.equal(e.complete,true);
  assert.equal(e.kcal,240,'render used stale template kcal instead of current definition');
  assert.equal(e.protein,6,'render used stale template protein instead of current definition');
})();

(function testInstantiationUsesCurrentDefinitionsAndAtomicPlateGrouping(){
  const api=load();
  const c=catalog([
    {id:'banku',name:'Banku',emoji:'🥣',kcal:145,protein:2.2,fibre:1},
    {id:'ghana_okro_stew_base',name:'Okro stew base',emoji:'🥘',kcal:60,protein:1.5,fibre:2.8}
  ]);
  const template={id:'t',name:'Banku plate',components:[
    {foodId:'banku',grams:540,meal:'Lunch'},
    {foodId:'ghana_okro_stew_base',grams:300,meal:'Lunch'}
  ]};
  let n=0;
  const out=api.instantiateTemplate(template,c,{plateId:'plate-1',ts:123,makeId:()=>`e${++n}`});
  assert.equal(out.ok,true);
  assert.equal(out.entries.length,2);
  assert.deepEqual(out.entries.map(x=>x.plateId),['plate-1','plate-1']);
  assert.equal(out.entries[0].kcal,783);
  assert.equal(out.entries[1].kcal,180);
  assert.equal(out.entries[0].source,'meal-template');
})();

(function testAliasResolvesBeforeEvaluation(){
  const api=load();
  const c=catalog([{id:'ghana_okro_stew',name:'Okro stew',emoji:'🥘',kcal:95,protein:5,fibre:2.8}]);
  const e=api.evaluateTemplate({items:[{foodId:'ghana_okro_soup',grams:200,kcal:1,protein:1,fibre:1}]},c);
  assert.equal(e.complete,true);
  assert.equal(e.rows[0].foodId,'ghana_okro_stew');
  assert.equal(e.kcal,190);
})();

(function testDeletedFoodDoesNotSilentlyUseStaleSnapshot(){
  const api=load();
  const c=catalog([]);
  const legacy={name:'Broken old template',items:[{foodId:'deleted_food',name:'Old food',grams:250,kcal:500,protein:40,fibre:2}]};
  const e=api.evaluateTemplate(legacy,c);
  assert.equal(e.complete,false);
  assert.equal(e.unresolved.length,1);
  assert.equal(e.kcal,0,'unresolved legacy snapshot was silently counted');
  const out=api.instantiateTemplate(legacy,c,{plateId:'p'});
  assert.equal(out.ok,false);
  assert.equal(out.reason,'template-needs-repair');
  assert.equal(out.entries.length,0);
})();

(function testAmountProvenanceSurvivesTemplateRoundTrip(){
  const api=load();
  const t=api.createTemplate('Goat plate',[{
    foodId:'goat',name:'Goat',grams:250,meal:'Dinner',enteredAmount:5,enteredUnit:'medium-piece',estimatedGrams:250,
    estimateBasisGrams:50,amountQuality:'estimated',estimateSource:'reference-piece-weight',pieceKey:'medium',kcal:357.5,protein:67.5
  }],{id:'t',createdAt:1});
  const c=catalog([{id:'goat',name:'Goat',emoji:'🍖',kcal:143,protein:27,fibre:0}]);
  const out=api.instantiateTemplate(t,c,{plateId:'plate',ts:100,makeId:()=> 'e'});
  const x=out.entries[0];
  assert.equal(x.enteredAmount,5);
  assert.equal(x.enteredUnit,'medium-piece');
  assert.equal(x.estimatedGrams,250);
  assert.equal(x.estimateBasisGrams,50);
  assert.equal(x.estimateSource,'reference-piece-weight');
})();

console.log('template-engine-v41: PASS');
