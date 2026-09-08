'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const src=fs.readFileSync('count-unit-migration-v46.js','utf8');
new Function(src);

function run(initial){
  let live=JSON.parse(JSON.stringify(initial));
  let writes=0;
  const repo={
    read:()=>JSON.parse(JSON.stringify(live)),
    revision:()=>7+writes,
    replace:(next,{source}={})=>{
      assert.equal(source,'count-unit-migration-v46');
      live=JSON.parse(JSON.stringify(next));
      writes++;
      return {ok:true,revision:7+writes};
    }
  };
  const context={window:{OkelloStateRepository:repo},console};
  vm.createContext(context);
  vm.runInContext(src,context);
  return {state:live,writes,api:context.window.OkelloCountUnitMigrationV46};
}

const original={
  logs:{
    '2026-09-08':[
      {id:'egg1',foodId:'egg',enteredUnit:'pieces',pieceCount:3,pieceKey:'egg',countUnit:'egg',estimatedGrams:150},
      {id:'bread1',foodId:'bread',enteredUnit:'pieces',pieceCount:4,pieceKey:'slice',countUnit:'slice',estimatedGrams:160},
      {id:'tin1',foodId:'sardines',enteredUnit:'pieces',pieceCount:1,pieceKey:'tin',countUnit:'tin',estimatedGrams:100},
      {id:'legacy-only',foodId:'egg',enteredUnit:'pieces',pieceCount:2,countUnit:'egg',estimatedGrams:100},
      {id:'conflict',foodId:'bread',enteredUnit:'pieces',pieceCount:2,pieceKey:'slice',countUnit:'tin',estimatedGrams:80},
      {id:'grams',foodId:'rice',enteredUnit:'g',grams:200}
    ]
  }
};

const first=run(original);
assert.equal(first.writes,1,'v45-shaped state should write once');
const rows=first.state.logs['2026-09-08'];
for(const row of rows) assert.equal(Object.prototype.hasOwnProperty.call(row,'countUnit'),false,'countUnit must be retired');
assert.equal(rows[0].pieceKey,'egg');
assert.equal(rows[1].pieceKey,'slice');
assert.equal(rows[2].pieceKey,'tin');
assert.equal(rows[3].pieceKey,'egg','legacy countUnit must promote only when pieceKey is missing');
assert.equal(rows[4].pieceKey,'slice','pieceKey remains canonical on conflict');
assert.equal(rows[4].legacyCountUnitConflict,'tin','conflicting legacy value must remain visible as migration evidence');
assert.equal(rows[0].pieceCount,3);
assert.equal(rows[0].estimatedGrams,150,'nutrition/amount snapshots must remain unchanged');
assert.deepEqual(rows[5],original.logs['2026-09-08'][5],'unrelated gram log must remain byte-shape equivalent');
assert.equal(first.api.result.migrated,5);
assert.equal(first.api.result.promoted,1);
assert.equal(first.api.result.conflicts,1);

const second=run(first.state);
assert.equal(second.writes,0,'migration must be idempotent after countUnit retirement');
assert.equal(second.api.result.changed,false);
assert.equal(second.api.result.migrated,0);

console.log('count-unit-migration-v46: PASS');
