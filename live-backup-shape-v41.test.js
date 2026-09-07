'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const MIGRATION=fs.readFileSync(path.join(__dirname,'storage-migration-v1.js'),'utf8');
const CONTRACT=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const STORE='okello_food_tracker_v3';

class FakeStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]));this.writes=[];this.removes=[];}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));this.writes.push({key:k,value:String(v)});}
  removeItem(k){this.map.delete(k);this.removes.push(k);}
  resetAudit(){this.writes=[];this.removes=[];}
}

function context(storage){
  const document={getElementById(){return null;},querySelector(){return null;},createElement(){return {style:{},appendChild(){},remove(){},setAttribute(){},addEventListener(){}};},head:{appendChild(){}}};
  const window={confirm(){return false;}};
  return {localStorage:storage,window,document,console,Blob:class Blob{},URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},setTimeout(){return 0;}};
}

// Exact structural characteristics taken from the user's 2026-09-07 live phone
// backup: no schemaVersion yet, six historic smart log snapshots, empty recipes /
// templates / favourites, both okro ids in customFoods, and weightLogs present.
const liveState={
  targets:{calories:2300,protein:150},
  logs:{
    '2026-09-06':[
      {id:'log_224f73a9-7a98-40a0-b019-f37c42e6d759',foodId:'ghana_waakye',name:'Waakye, rice & beans only',grams:250,meal:'Dinner',kcal:390,protein:14,fibre:8.5,ts:1788714045445,source:'smart',amountQuality:'estimated'},
      {id:'log_9319ec16-eb25-4b23-bf00-372eb5f5b29b',foodId:'egg',name:'Boiled egg',grams:150,meal:'Dinner',kcal:214.5,protein:18.9,fibre:0,ts:1788714045445,source:'smart',amountQuality:'estimated'},
      {id:'log_302fd7e6-c925-400a-b0e1-1fda21af76e1',foodId:'ghana_shito',name:'Shito',grams:15,meal:'Dinner',kcal:52.5,protein:.75,fibre:.6,ts:1788714045445,source:'smart',amountQuality:'estimated'},
      {id:'log_f91613bc-2aae-4405-94a0-738f5dc8a6ba',foodId:'banku',name:'Corn banku',grams:225,meal:'Dinner',kcal:326.25,protein:4.95,fibre:2.25,ts:1788714306570,source:'smart',amountQuality:'estimated'},
      {id:'log_51ed1220-d584-4fe1-95e6-57851c83912a',foodId:'egg',name:'Boiled egg',grams:150,meal:'Dinner',kcal:214.5,protein:18.9,fibre:0,ts:1788714306570,source:'smart',amountQuality:'estimated'},
      {id:'log_c57d6a3b-7f2f-4986-b522-d45502c40f19',foodId:'okro',name:'Okro soup, estimate',grams:350,meal:'Dinner',kcal:315,protein:24.5,fibre:8.75,ts:1788714306570,source:'smart',amountQuality:'estimated'}
    ]
  },
  customFoods:[
    {id:'ghana_waakye',name:'Waakye, rice & beans only',cat:'Complete meal',kcal:156,protein:5.6,fibre:3.4,libraryVersion:5,note:'Base waakye only; log shito, gari, spaghetti, egg, meat or fish separately'},
    {id:'ghana_okro_stew',name:'Okro stew',cat:'Soup',kcal:95,protein:5,fibre:2.8,libraryVersion:5,note:'Estimate; oil and assorted meat/fish matter'},
    {id:'ghana_okro_soup',name:'Okro soup / stew, estimate',cat:'Soup',kcal:95,protein:5,fibre:2.8,libraryVersion:5,note:'Estimate; oil and assorted meat/fish matter'},
    {id:'ghana_rice_stew',name:'Rice with tomato stew, mixed plate',cat:'Complete meal',kcal:170,protein:4.5,fibre:1.5,libraryVersion:5,note:'Plate estimate; meat/fish should be logged separately'}
  ],
  recipes:[],
  weightLogs:[],
  mealTemplates:[]
};

const originalLogs=JSON.parse(JSON.stringify(liveState.logs));
const storage=new FakeStorage({[STORE]:JSON.stringify(liveState),'okello_food_favourites_v1':'[]'});
let ctx=context(storage);
vm.runInNewContext(MIGRATION,ctx,{filename:'storage-migration-v1.js'});
let migrated=JSON.parse(storage.getItem(STORE));

assert.equal(migrated.schemaVersion,3);
assert.equal(ctx.window.OkelloStorageMigration.resolveFoodId('okro'),'ghana_okro_stew');
assert.equal(ctx.window.OkelloStorageMigration.resolveFoodId('ghana_okro_soup'),'ghana_okro_stew');

const beforeRows=originalLogs['2026-09-06'];
const afterRows=migrated.logs['2026-09-06'];
assert.equal(afterRows.length,beforeRows.length);
for(let i=0;i<beforeRows.length;i++){
  const before={...beforeRows[i]};
  const after={...afterRows[i]};
  const expectedId=before.foodId==='okro'?'ghana_okro_stew':before.foodId;
  assert.equal(after.foodId,expectedId,`unexpected food identity change at log ${i}`);
  delete before.foodId;
  delete after.foodId;
  assert.deepEqual(after,before,`historical snapshot fields changed at log ${i}`);
}
const migratedOkro=afterRows.find(x=>x.id==='log_c57d6a3b-7f2f-4986-b522-d45502c40f19');
assert.equal(migratedOkro.foodId,'ghana_okro_stew');
assert.equal(migratedOkro.kcal,315);
assert.equal(migratedOkro.protein,24.5);
assert.equal(migratedOkro.fibre,8.75);
assert.equal(migratedOkro.grams,350);

assert.equal(migrated.customFoods.filter(x=>x.id==='ghana_okro_soup').length,0,'legacy runtime okro duplicate survived');
assert.equal(migrated.customFoods.filter(x=>x.id==='ghana_okro_stew').length,1,'canonical okro missing or duplicated');
assert.deepEqual(migrated.recipes,[]);
assert.deepEqual(migrated.mealTemplates,[]);
assert.deepEqual(migrated.weightLogs,[],'unowned existing state field was not preserved');
assert.deepEqual(migrated.pieceCalibration,{observations:[]});
assert.deepEqual(migrated.definitionEvents,[]);
assert.deepEqual(migrated.coOccurrencePairs,[]);

storage.resetAudit();
ctx=context(storage);
vm.runInNewContext(MIGRATION,ctx,{filename:'storage-migration-v1.js'});
assert.equal(storage.writes.length,0,'second pass on live-store shape was not a no-op');
assert.equal(storage.removes.length,0);

// Contract seeding is allowed to decorate future food definitions, but it must
// still leave every historic log snapshot byte-equivalent after the one-time id
// canonicalisation has already happened.
const beforeContractLogs=JSON.stringify(JSON.parse(storage.getItem(STORE)).logs);
ctx=context(storage);
vm.runInNewContext(MIGRATION,ctx,{filename:'storage-migration-v1.js'});
vm.runInNewContext(CONTRACT,ctx,{filename:'meal-data-contract-v1.js'});
const contracted=JSON.parse(storage.getItem(STORE));
assert.equal(JSON.stringify(contracted.logs),beforeContractLogs,'contract seeding changed historical logs');
const waakye=contracted.customFoods.find(x=>x.id==='ghana_waakye');
const riceStew=contracted.customFoods.find(x=>x.id==='ghana_rice_stew');
const okro=contracted.customFoods.find(x=>x.id==='ghana_okro_stew');
assert.equal(waakye.basis,'base-only');
assert.equal(riceStew.basis,'base-only');
assert.equal(okro.basis,'includes-protein');
assert.equal(okro.baseFoodId,'ghana_okro_stew_base');
assert.ok(contracted.customFoods.some(x=>x.id==='ghana_okro_stew_base'&&x.basis==='base-only'));

console.log('live-backup-shape-v41: PASS');
