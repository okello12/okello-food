'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const childProcess=require('child_process');

// This is not a physical-device export. It is the strongest reproducible
// substitute available in CI: execute the exact shipped v45 writer and backup
// blobs from production commit 8e6765ffd355f210fc8369756a5b5ebbdc00f0d6,
// then pass the generated backup state through the v46 migration.
const EXPECTED_BLOBS={
  'countable-servings-v45.js':'239e9d72c51a5317aac6bbcec20010068897deb6',
  'piece-entry-v41.js':'5e1d02f1ba82d9e62463864f993ded62a5b0b104',
  'backup-v2.js':'76261792a3cd80eb54df183e43325289d52cf06a'
};
for(const [file,expected] of Object.entries(EXPECTED_BLOBS)){
  const actual=childProcess.execFileSync('git',['hash-object',file],{encoding:'utf8'}).trim();
  assert.equal(actual,expected,`${file} is no longer byte-identical to the shipped v45 production blob`);
}

const pieceSrc=fs.readFileSync('piece-entry-v41.js','utf8');
const countableSrc=fs.readFileSync('countable-servings-v45.js','utf8');
const backupSrc=fs.readFileSync('backup-v2.js','utf8');
const migrationSrc=fs.readFileSync('count-unit-migration-v46.js','utf8');

function clone(value){return JSON.parse(JSON.stringify(value));}
function makeStorage(seed={}){
  const map=new Map(Object.entries(seed));
  return {
    getItem:key=>map.has(String(key))?map.get(String(key)):null,
    setItem:(key,value)=>map.set(String(key),String(value)),
    removeItem:key=>map.delete(String(key)),
    dump:()=>Object.fromEntries(map.entries())
  };
}

const initialState={
  schemaVersion:3,
  targets:{calories:2300,protein:150},
  logs:{},
  customFoods:[],
  recipes:[],
  mealTemplates:[],
  definitionEvents:[],
  pieceCalibration:{observations:[]},
  coOccurrencePairs:[]
};
const localStorage=makeStorage({'okello_food_tracker_v3':JSON.stringify(initialState)});
const elements={
  foodSelect:{value:'egg'},
  mealSelect:{value:'Lunch'}
};
const inertElement=()=>({
  id:'',hidden:false,textContent:'',innerHTML:'',value:'',readOnly:false,
  classList:{add(){},remove(){}},
  addEventListener(){},setAttribute(){},removeAttribute(){},hasAttribute(){return false;},
  insertAdjacentElement(){},closest(){return null;},querySelector(){return null;},querySelectorAll(){return [];},
  dispatchEvent(){return true;}
});
const document={
  getElementById:id=>elements[id]||null,
  createElement:()=>inertElement(),
  querySelector(){return null;},
  querySelectorAll(){return [];},
  addEventListener(){},
  head:{appendChild(){}},
  body:{appendChild(){}}
};
const windowObj={
  OkelloMealDataContract:{resolveFoodId:id=>String(id??'')},
  addEventListener(){},
  dispatchEvent(){},
  confirm:()=>true
};
const context={
  window:windowObj,
  document,
  localStorage,
  sessionStorage:makeStorage(),
  console,
  setTimeout:()=>0,
  clearTimeout(){},
  MutationObserver:class{observe(){} disconnect(){}},
  Event:class{constructor(type,opts={}){this.type=type;Object.assign(this,opts);}},
  CustomEvent:class{constructor(type,opts={}){this.type=type;this.detail=opts.detail;}},
  Blob:class{},
  URL:{createObjectURL:()=>'',revokeObjectURL(){}},
  location:{reload(){}},
  crypto:{randomUUID:()=> 'fixture-v45-egg-log',subtle:{}},
  TextEncoder:global.TextEncoder,
  TextDecoder:global.TextDecoder,
  Intl,
  Date,
  Math,
  JSON,
  Object,
  Array,
  Number,
  String,
  Boolean,
  Map,
  Set
};
vm.createContext(context);

// Load the exact piece/logging contract shipped in v45.
vm.runInContext(pieceSrc,context,{filename:'piece-entry-v41.js'});
assert.ok(context.window.OkelloPieceEntry,'piece-entry v45 API did not initialise');
context.window.OkelloFoodCatalog={
  getById:id=>String(id)==='egg'?{id:'egg',name:'Boiled egg',emoji:'🥚',kcal:155,protein:13,fibre:0,portion:150}:null
};

// Load the exact v45 countable-serving writer. Its startup selects the fake
// egg control, so commitCurrent() executes the real shipped write path.
vm.runInContext(countableSrc,context,{filename:'countable-servings-v45.js'});
const countable=context.window.OkelloCountableServingsV45;
assert.ok(countable,'v45 countable-serving API did not initialise');
assert.equal(countable.commitCurrent(),true,'exact v45 egg writer could not create a log');

// Load the exact v45 backup owner and export the resulting production-shaped
// state through completeBundle(), rather than hand-constructing a fixture.
vm.runInContext(backupSrc,context,{filename:'backup-v2.js'});
const bundle=context.window.OkelloBackup.bundle();
assert.equal(bundle.format,'okello-backup-v2');
assert.equal(bundle.version,2);
const v45Entries=Object.values(bundle.state.logs).flat();
assert.equal(v45Entries.length,1,'v45 fixture should contain exactly one logged egg');
const before=v45Entries[0];
assert.equal(before.foodId,'egg');
assert.equal(before.pieceCount,3);
assert.equal(before.pieceKey,'egg');
assert.equal(before.countUnit,'egg','shipped v45 writer must prove countUnit existed');
assert.equal(before.estimatedGrams,150);
assert.equal(before.estimateBasisGrams,50);
assert.equal(before.estimateSource,'reference-count-unit-v45');
assert.equal(before.amountQuality,'estimated');

function runMigration(state){
  let live=clone(state);
  let writes=0;
  const repo={
    read:()=>clone(live),
    revision:()=>20+writes,
    replace:(next,{source}={})=>{
      assert.equal(source,'count-unit-migration-v46');
      live=clone(next);
      writes++;
      return {ok:true,revision:20+writes};
    }
  };
  const migrationContext={window:{OkelloStateRepository:repo},console};
  vm.createContext(migrationContext);
  vm.runInContext(migrationSrc,migrationContext,{filename:'count-unit-migration-v46.js'});
  return {state:live,writes,result:migrationContext.window.OkelloCountUnitMigrationV46.result};
}

const first=runMigration(bundle.state);
assert.equal(first.writes,1,'real v45-writer-shaped state should migrate once');
const after=Object.values(first.state.logs).flat()[0];
const expected=clone(before);
delete expected.countUnit;
assert.deepEqual(clone(after),expected,'v46 migration may remove countUnit but must not alter any other historical field');
assert.equal(first.result.migrated,1);
assert.equal(first.result.promoted,0);
assert.equal(first.result.conflicts,0);

const firstBytes=JSON.stringify(first.state);
const second=runMigration(first.state);
assert.equal(second.writes,0,'second migration pass must perform no write');
assert.equal(JSON.stringify(second.state),firstBytes,'second migration pass must be byte-identical');
assert.equal(second.result.changed,false);

console.log('v45-countunit-backup-upgrade: PASS');
