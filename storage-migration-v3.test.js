'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'storage-migration-v1.js'),'utf8');
const CURRENT='okello_food_tracker_v3';
const LEGACY='okello_food_tracker_v2';
const QUARANTINE='okello_food_tracker_v3_quarantine_v1';
const FAVOURITES='okello_food_favourites_v1';
const SHOPPING='okello_shopping_products_v1';

class FakeStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]));this.writes=[];this.removes=[];}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){const value=String(v);this.map.set(k,value);this.writes.push({key:k,value});}
  removeItem(k){this.map.delete(k);this.removes.push(k);}
  resetAudit(){this.writes=[];this.removes=[];}
  raw(k){return this.getItem(k);}
  json(k){const raw=this.getItem(k);return raw==null?null:JSON.parse(raw);}
}

function contextFor(storage){
  const document={
    getElementById(){return null;},
    querySelector(){return null;},
    createElement(){return {style:{},appendChild(){},remove(){},setAttribute(){},addEventListener(){}};},
    head:{appendChild(){}},
    body:{appendChild(){}}
  };
  const window={confirm(){return false;}};
  return {
    localStorage:storage,
    window,
    document,
    Blob:class Blob{},
    URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},
    setTimeout(){return 0;},
    clearTimeout(){},
    console
  };
}

function run(storage){
  const context=contextFor(storage);
  vm.runInNewContext(SOURCE,context,{filename:'storage-migration-v1.js'});
  return context.window.OkelloStorageMigration;
}

function fullState(overrides={}){
  return {
    schemaVersion:3,
    targets:{calories:2300,protein:150},
    logs:{},
    customFoods:[],
    recipes:[],
    mealTemplates:[],
    definitionEvents:[],
    pieceCalibration:{observations:[]},
    coOccurrencePairs:[],
    ...overrides
  };
}

function currentSeed(state,extra={}){
  return {[CURRENT]:JSON.stringify(state),...extra};
}

(function testAliasTouchesEveryDurableReferenceAndPreservesSnapshots(){
  const snapshot={
    id:'log-1',foodId:'ghana_okro_soup',name:'Old okro alias',grams:350,estimatedGrams:350,
    estimateBasisGrams:70,amountQuality:'estimated',estimateSource:'reference-piece-weight',
    kcal:333.125,protein:21.75,fibre:7.5,meal:'Dinner',ts:123456789
  };
  const state=fullState({
    logs:{'2026-09-01':[snapshot]},
    customFoods:[
      {id:'ghana_okro_stew',name:'Canonical okro',cat:'Soup',libraryVersion:5,basis:'includes-protein',kcal:95,protein:5,fibre:2.8},
      {id:'ghana_okro_soup',name:'Generated alias',cat:'Soup',libraryVersion:5,kcal:95,protein:5,fibre:2.8}
    ],
    recipes:[{id:1,name:'Pot',ingredients:[{foodId:'ghana_okro_soup',grams:500,kcal:475,protein:25,fibre:14}]}],
    mealTemplates:[{id:'t1',items:[{foodId:'ghana_okro_soup',kcal:120}],components:[{foodId:'ghana_okro_soup'}],foodIds:['ghana_okro_soup','goat']}],
    pieceCalibration:{observations:[{foodId:'ghana_okro_soup',pieceKey:'medium',grams:52}]},
    coOccurrencePairs:[{foodAId:'ghana_okro_soup',foodBId:'goat',count:4},{foodIds:['ghana_okro_soup','banku'],count:2}],
    shelfEntries:[{id:'saved-1',foodId:'ghana_okro_soup'}]
  });
  const storage=new FakeStorage(currentSeed(state,{
    [FAVOURITES]:JSON.stringify(['ghana_okro_soup','ghana_okro_stew','goat']),
    [SHOPPING]:JSON.stringify({version:1,products:{'123':{code:'123',foodId:'ghana_okro_soup'}},order:['123']})
  }));

  const beforeNutrition=JSON.stringify({
    grams:snapshot.grams,estimatedGrams:snapshot.estimatedGrams,estimateBasisGrams:snapshot.estimateBasisGrams,
    amountQuality:snapshot.amountQuality,estimateSource:snapshot.estimateSource,
    kcal:snapshot.kcal,protein:snapshot.protein,fibre:snapshot.fibre
  });

  const api=run(storage);
  const out=storage.json(CURRENT);
  const log=out.logs['2026-09-01'][0];
  const afterNutrition=JSON.stringify({
    grams:log.grams,estimatedGrams:log.estimatedGrams,estimateBasisGrams:log.estimateBasisGrams,
    amountQuality:log.amountQuality,estimateSource:log.estimateSource,
    kcal:log.kcal,protein:log.protein,fibre:log.fibre
  });

  assert.equal(log.foodId,'ghana_okro_stew');
  assert.equal(afterNutrition,beforeNutrition,'historical amount/nutrition snapshots changed');
  assert.equal(out.recipes[0].ingredients[0].foodId,'ghana_okro_stew');
  assert.equal(out.mealTemplates[0].items[0].foodId,'ghana_okro_stew');
  assert.equal(out.mealTemplates[0].components[0].foodId,'ghana_okro_stew');
  assert.deepEqual(out.mealTemplates[0].foodIds,['ghana_okro_stew','goat']);
  assert.equal(out.pieceCalibration.observations[0].foodId,'ghana_okro_stew');
  assert.equal(out.coOccurrencePairs[0].foodAId,'ghana_okro_stew');
  assert.deepEqual(out.coOccurrencePairs[1].foodIds,['ghana_okro_stew','banku']);
  assert.equal(out.shelfEntries[0].foodId,'ghana_okro_stew');
  assert.equal(out.customFoods.filter(x=>x.id==='ghana_okro_soup').length,0);
  assert.equal(out.customFoods.filter(x=>x.id==='ghana_okro_stew').length,1);
  assert.deepEqual(storage.json(FAVOURITES),['ghana_okro_stew','goat']);
  assert.equal(storage.json(SHOPPING).products['123'].foodId,'ghana_okro_stew');
  assert.equal(api.result.upgraded,true);

  storage.resetAudit();
  const rawAfterFirst=storage.raw(CURRENT);
  const favAfterFirst=storage.raw(FAVOURITES);
  const shelfAfterFirst=storage.raw(SHOPPING);
  const second=run(storage);
  assert.equal(storage.raw(CURRENT),rawAfterFirst);
  assert.equal(storage.raw(FAVOURITES),favAfterFirst);
  assert.equal(storage.raw(SHOPPING),shelfAfterFirst);
  assert.equal(storage.writes.length,0,'second migration pass wrote to storage');
  assert.equal(storage.removes.length,0,'second migration pass removed a key');
  assert.equal(second.result.status,'current');
  assert.equal(second.result.upgraded,false);
})();

(function testAlreadyCanonicalStoreIsByteStableNoOp(){
  const state=fullState({logs:{'2026-09-02':[{id:'x',foodId:'ghana_okro_stew',kcal:200,protein:10,fibre:4,grams:300}]}});
  // Deliberately unusual property order: no-op detection must not depend on JSON key order.
  const reordered={logs:state.logs,targets:state.targets,recipes:[],schemaVersion:3,customFoods:[],mealTemplates:[],definitionEvents:[],pieceCalibration:{observations:[]},coOccurrencePairs:[]};
  const raw=JSON.stringify(reordered);
  const storage=new FakeStorage({[CURRENT]:raw});
  const api=run(storage);
  assert.equal(storage.raw(CURRENT),raw,'canonical state was reserialised despite no migration work');
  assert.equal(storage.writes.length,0);
  assert.equal(api.result.status,'current');
  assert.equal(api.result.upgraded,false);
  assert.equal(api.schemaVersion,3);
})();

(function testBothIdsRemainTwoHistoricalEventsButOneIdentity(){
  const state=fullState({
    logs:{'2026-09-03':[
      {id:'old',foodId:'ghana_okro_soup',kcal:111,protein:7,fibre:2,grams:250},
      {id:'new',foodId:'ghana_okro_stew',kcal:222,protein:9,fibre:3,grams:300}
    ]},
    customFoods:[
      {id:'ghana_okro_soup',name:'Alias generated row',cat:'Soup',libraryVersion:5},
      {id:'ghana_okro_stew',name:'Canonical row',cat:'Soup',libraryVersion:5,basis:'includes-protein'}
    ]
  });
  const storage=new FakeStorage(currentSeed(state));
  run(storage);
  const logs=storage.json(CURRENT).logs['2026-09-03'];
  assert.equal(logs.length,2,'migration must not merge historical events');
  assert.deepEqual(logs.map(x=>x.foodId),['ghana_okro_stew','ghana_okro_stew']);
  assert.deepEqual(logs.map(x=>x.kcal),[111,222]);
})();

(function testSchemaOnlyUpgradeWritesOnceThenStops(){
  const old={targets:{calories:2300,protein:150},logs:{},customFoods:[],recipes:[]};
  const storage=new FakeStorage({[CURRENT]:JSON.stringify(old)});
  const first=run(storage);
  assert.equal(first.result.status,'current-upgraded');
  assert.equal(storage.writes.filter(x=>x.key===CURRENT).length,1);
  assert.equal(storage.getItem(QUARANTINE),null,'valid current state must never enter quarantine');
  const upgraded=storage.json(CURRENT);
  assert.equal(upgraded.schemaVersion,3);
  assert.deepEqual(upgraded.pieceCalibration,{observations:[]});
  assert.deepEqual(upgraded.coOccurrencePairs,[]);

  storage.resetAudit();
  const raw=storage.raw(CURRENT);
  const second=run(storage);
  assert.equal(second.result.status,'current');
  assert.equal(storage.raw(CURRENT),raw);
  assert.equal(storage.writes.length,0,'schema-complete second pass must be a no-op');
  assert.equal(storage.getItem(QUARANTINE),null);
})();

(function testFreshInstallCreatesOnceAndNeverQuarantines(){
  const storage=new FakeStorage();
  const first=run(storage);
  assert.equal(first.result.status,'created-fresh-v3');
  assert.ok(storage.getItem(CURRENT));
  assert.equal(storage.getItem(QUARANTINE),null);
  assert.equal(storage.getItem(LEGACY),null);

  storage.resetAudit();
  const raw=storage.raw(CURRENT);
  const second=run(storage);
  assert.equal(second.result.status,'current');
  assert.equal(storage.raw(CURRENT),raw);
  assert.equal(storage.writes.length,0);
  assert.equal(storage.getItem(QUARANTINE),null);
})();

(function testCorruptAuxiliaryStoreDoesNotTouchHealthyV3(){
  const state=fullState();
  const raw=JSON.stringify(state);
  const storage=new FakeStorage({[CURRENT]:raw,[FAVOURITES]:'{not-json'});
  const api=run(storage);
  assert.equal(storage.raw(CURRENT),raw);
  assert.equal(storage.raw(FAVOURITES),'{not-json'});
  assert.equal(storage.getItem(QUARANTINE),null);
  assert.equal(storage.writes.length,0);
  assert.equal(api.result.status,'current');
})();

console.log('storage-migration-v3: PASS');
