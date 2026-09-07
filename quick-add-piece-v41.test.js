'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'quick-add-piece-v41.js'),'utf8');

(function testDelegatedOwnershipIsSourceLevelInvariant(){
  assert.ok(/document\.addEventListener\('click',[\s\S]*?,true\);/.test(SOURCE),'piece Quick Add must use a document-level capture click listener');
  for(const selector of ['#addFoodBtn','#useSmartPortionBtn','#gramsInput']){
    assert.ok(SOURCE.includes(selector),`delegated selector missing: ${selector}`);
  }
  assert.ok(SOURCE.includes('event.stopImmediatePropagation()'),'piece route must stop the legacy target handler');
  assert.ok(!/getElementById\(['"]addFoodBtn['"]\)\.addEventListener/.test(SOURCE),'must not bind directly to the replaceable Add button');
  assert.ok(!/querySelector\(['"]#addFoodBtn['"]\)\.addEventListener/.test(SOURCE),'must not bind directly to the replaceable Add button');
})();

function boot(){
  const listeners=[];
  const local=new Map();
  const piece={
    resolveFoodId:id=>String(id||''),
    optionsFor:id=>id==='goat'?[{pieceKey:'medium',grams:50}]:[],
    effectiveGrams:amount=>Number(amount?.estimatedGrams??amount?.grams)||0,
    createLogDraft:({food,amount,meal,source,ts})=>({
      id:'log-test',foodId:food.id,name:food.name,grams:Number(amount.estimatedGrams||amount.grams),estimatedGrams:amount.enteredUnit==='pieces'?Number(amount.estimatedGrams):undefined,
      enteredAmount:amount.enteredAmount,enteredUnit:amount.enteredUnit,pieceCount:amount.pieceCount,pieceKey:amount.pieceKey,estimateBasisGrams:amount.estimateBasisGrams,estimateSource:amount.estimateSource,
      meal,kcal:100,protein:20,fibre:0,source,amountQuality:amount.amountQuality,ts
    })
  };
  const document={
    addEventListener:(type,fn,capture)=>listeners.push({type,fn,capture}),
    getElementById:()=>null
  };
  const window={
    OkelloPieceEntry:piece,
    OkelloPieceSheet:{open:()=>true},
    OkelloPieceSheetContract:{openDraft:()=>null},
    OkelloSmartPortionOutput:{resultShape:x=>x},
    OkelloFoodCatalog:{getById:()=>null},
    addEventListener:()=>{}
  };
  const localStorage={
    getItem:k=>local.has(k)?local.get(k):null,
    setItem:(k,v)=>local.set(k,String(v))
  };
  const context={window,document,localStorage,sessionStorage:{setItem:()=>{}},location:{},Date,Math,JSON,Event:function(){},queueMicrotask:fn=>fn(),console};
  vm.runInNewContext(SOURCE,context,{filename:'quick-add-piece-v41.js'});
  return {api:window.OkelloQuickAddPiece,listeners};
}

(function testPureRoutingAndAppendHelpers(){
  const {api,listeners}=boot();
  assert.ok(api,'integration API did not boot');
  assert.equal(api.isPieceNative('goat',{}),true);
  assert.equal(api.isPieceNative('banku',{}),false);
  const state={logs:{}};
  const log={id:'x',foodId:'goat'};
  api.appendLogToState(state,log,'2026-09-07');
  assert.equal(state.logs['2026-09-07'].length,1);
  assert.equal(state.logs['2026-09-07'][0],log);
  const click=listeners.find(x=>x.type==='click');
  assert.ok(click&&click.capture===true,'click owner must remain capture delegated');
})();

console.log('quick-add-piece-v41: PASS');
