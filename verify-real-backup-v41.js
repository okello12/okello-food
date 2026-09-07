'use strict';

// Usage:
//   node verify-real-backup-v41.js /path/to/okello-food-complete-backup-YYYY-MM-DD.json
//
// The backup itself is never committed. This script feeds a real exported store
// through storage-migration-v1.js in an isolated fake localStorage, then performs
// a field-level audit and an idempotence pass.

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const MIGRATION=fs.readFileSync(path.join(__dirname,'storage-migration-v1.js'),'utf8');
const CURRENT='okello_food_tracker_v3';
const FAVOURITES='okello_food_favourites_v1';
const SHOPPING='okello_shopping_products_v1';
const QUARANTINE='okello_food_tracker_v3_quarantine_v1';

const inputPath=process.argv[2];
if(!inputPath){
  console.error('Usage: node verify-real-backup-v41.js <plain Okello backup JSON>');
  process.exit(2);
}

class FakeStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]));this.writes=[];this.removes=[];}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){const value=String(v);this.map.set(k,value);this.writes.push({key:k,value});}
  removeItem(k){this.map.delete(k);this.removes.push(k);}
  resetAudit(){this.writes=[];this.removes=[];}
  json(k){const raw=this.getItem(k);return raw==null?null:JSON.parse(raw);}
}

function contextFor(storage){
  const document={getElementById(){return null;},querySelector(){return null;},createElement(){return {style:{},appendChild(){},remove(){},setAttribute(){},addEventListener(){}};},head:{appendChild(){}},body:{appendChild(){}}};
  const window={confirm(){return false;}};
  return {localStorage:storage,window,document,Blob:class Blob{},URL:{createObjectURL(){return 'blob:test';},revokeObjectURL(){}},setTimeout(){return 0;},clearTimeout(){},console};
}
function run(storage){
  const context=contextFor(storage);
  vm.runInNewContext(MIGRATION,context,{filename:'storage-migration-v1.js'});
  return context.window.OkelloStorageMigration;
}
function isObject(v){return !!v&&typeof v==='object'&&!Array.isArray(v);}
function clone(v){return JSON.parse(JSON.stringify(v));}
function stateFromBackup(payload){return isObject(payload?.state)?payload.state:payload;}
function logRows(state){
  const out=[];
  for(const [day,entries] of Object.entries(state?.logs||{})){
    (Array.isArray(entries)?entries:[]).forEach((entry,index)=>out.push({day,index,entry}));
  }
  return out;
}
function snapshotWithoutFoodId(entry){
  const out={...entry};
  delete out.foodId;
  return out;
}
function templateItemCount(state){return (state?.mealTemplates||[]).reduce((n,t)=>n+(t?.items?.length||0)+(t?.components?.length||0),0);}

const payload=JSON.parse(fs.readFileSync(inputPath,'utf8'));
const before=clone(stateFromBackup(payload));
assert.ok(isObject(before),'backup state is not an object');

const seed={[CURRENT]:JSON.stringify(before)};
if(Array.isArray(payload?.favourites))seed[FAVOURITES]=JSON.stringify(payload.favourites);
if(isObject(payload?.shoppingProducts))seed[SHOPPING]=JSON.stringify(payload.shoppingProducts);
const storage=new FakeStorage(seed);
const first=run(storage);
assert.equal(storage.getItem(QUARANTINE),null,'valid exported store entered quarantine');
const after=storage.json(CURRENT);

const beforeLogs=logRows(before);
const afterLogs=logRows(after);
assert.equal(afterLogs.length,beforeLogs.length,'migration changed historical log count');

let aliasesRewritten=0;
let canonicalAlready=0;
for(let i=0;i<beforeLogs.length;i++){
  const a=beforeLogs[i], b=afterLogs[i];
  assert.equal(a.day,b.day,'log date order changed');
  assert.equal(a.index,b.index,'log index changed');
  assert.deepStrictEqual(snapshotWithoutFoodId(b.entry),snapshotWithoutFoodId(a.entry),`historical log fields changed at ${a.day}[${a.index}]`);
  if(a.entry?.foodId==='ghana_okro_soup'){
    assert.equal(b.entry?.foodId,'ghana_okro_stew',`old okro alias not canonicalised at ${a.day}[${a.index}]`);
    aliasesRewritten++;
  }else if(a.entry?.foodId==='ghana_okro_stew'){
    assert.equal(b.entry?.foodId,'ghana_okro_stew');
    canonicalAlready++;
  }else{
    assert.equal(b.entry?.foodId,a.entry?.foodId,`unexpected food id rewrite at ${a.day}[${a.index}]`);
  }
}

// Structural counts that must not shrink unexpectedly.
assert.equal((after.recipes||[]).length,(before.recipes||[]).length,'recipe count changed');
assert.equal((after.mealTemplates||[]).length,(before.mealTemplates||[]).length,'template count changed');
assert.equal(templateItemCount(after),templateItemCount(before),'template component count changed');

const firstRaw=storage.getItem(CURRENT);
storage.resetAudit();
const second=run(storage);
assert.equal(storage.getItem(CURRENT),firstRaw,'second migration pass changed main store bytes');
assert.equal(storage.writes.length,0,'second migration pass wrote to storage');
assert.equal(storage.removes.length,0,'second migration pass removed storage');
assert.equal(second.result.status,'current','second migration pass was not recognised as current');

const report={
  input:path.basename(inputPath),
  firstPassStatus:first.result.status,
  secondPassStatus:second.result.status,
  logsChecked:beforeLogs.length,
  oldOkroAliasesRewritten:aliasesRewritten,
  alreadyCanonicalOkroLogs:canonicalAlready,
  recipes:(before.recipes||[]).length,
  templates:(before.mealTemplates||[]).length,
  templateComponents:templateItemCount(before),
  customFoodsBefore:(before.customFoods||[]).length,
  customFoodsAfter:(after.customFoods||[]).length,
  schemaVersionBefore:before.schemaVersion??null,
  schemaVersionAfter:after.schemaVersion??null,
  addedDurableContainers:{
    definitionEvents:!Array.isArray(before.definitionEvents)&&Array.isArray(after.definitionEvents),
    pieceCalibration:!isObject(before.pieceCalibration)&&isObject(after.pieceCalibration),
    coOccurrencePairs:!Array.isArray(before.coOccurrencePairs)&&Array.isArray(after.coOccurrencePairs),
    mealTemplates:!Array.isArray(before.mealTemplates)&&Array.isArray(after.mealTemplates)
  },
  idempotentSecondPass:true
};

console.log(JSON.stringify(report,null,2));
console.log('real-backup migration verification: PASS');
