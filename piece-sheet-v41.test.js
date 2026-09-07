'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const CONTRACT=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const PIECE=fs.readFileSync(path.join(__dirname,'piece-entry-v41.js'),'utf8');
const USUAL=fs.readFileSync(path.join(__dirname,'piece-usual-v41.js'),'utf8');
const SMART=fs.readFileSync(path.join(__dirname,'smart-portion-output-v41.js'),'utf8');
const SHEET_CONTRACT=fs.readFileSync(path.join(__dirname,'piece-sheet-contract-v41.js'),'utf8');
const SHEET_UI=fs.readFileSync(path.join(__dirname,'piece-sheet-v41.js'),'utf8');
const STORE='okello_food_tracker_v3';

class FakeStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]));}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
}

function boot(){
  const storage=new FakeStorage({[STORE]:JSON.stringify({customFoods:[],recipes:[],mealTemplates:[],definitionEvents:[],pieceCalibration:{observations:[]}})});
  const aliases={okro:'ghana_okro_stew',okro_base:'ghana_okro_stew_base',ghana_okro_soup:'ghana_okro_stew'};
  const window={OkelloStorageMigration:{resolveFoodId:id=>aliases[String(id??'')]||String(id??'')}};
  const context={window,localStorage:storage,console,Date,Math,JSON};
  vm.runInNewContext(CONTRACT,context,{filename:'meal-data-contract-v1.js'});
  vm.runInNewContext(PIECE,context,{filename:'piece-entry-v41.js'});
  vm.runInNewContext(USUAL,context,{filename:'piece-usual-v41.js'});
  vm.runInNewContext(SMART,context,{filename:'smart-portion-output-v41.js'});
  vm.runInNewContext(SHEET_CONTRACT,context,{filename:'piece-sheet-contract-v41.js'});
  vm.runInNewContext(SHEET_UI,context,{filename:'piece-sheet-v41.js'});
  return {
    piece:window.OkelloPieceEntry,
    usual:window.OkelloPieceUsual,
    smart:window.OkelloSmartPortionOutput,
    contract:window.OkelloPieceSheetContract,
    ui:window.OkelloPieceSheet
  };
}

function goat(){return {id:'goat',name:'Goat meat, edible cooked',emoji:'🍖',kcal:143,protein:27,fibre:0,portion:175};}

(function testUsualWinsOpeningButOverTargetIsImmediatelyVisible(){
  const {smart,contract,ui}=boot();
  const state={
    logs:{
      '2026-09-01':[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,enteredAmount:4,pieceKey:'medium',grams:200,estimatedGrams:200,meal:'Dinner',ts:1}],
      '2026-09-02':[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,enteredAmount:4,pieceKey:'medium',grams:200,estimatedGrams:200,meal:'Dinner',ts:2}],
      '2026-09-03':[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,enteredAmount:4,pieceKey:'medium',grams:200,estimatedGrams:200,meal:'Dinner',ts:3}]
    },
    pieceCalibration:{observations:[]}
  };
  const food=goat();
  const smartResult=smart.resultShape({state,food,targetGrams:187});
  assert.equal(smartResult.pieceSuggestion.pieceCount,3);
  const draft=contract.openDraft({state,food,meal:'Dinner',smartResult});
  assert.equal(draft.count,4,'Smart Portion silently replaced the learned usual opening count');
  assert.equal(draft.selectionSource,'personal-piece-usual');

  const p=ui.presentationFor(food,draft,state);
  assert.equal(p.currentGrams,200);
  assert.equal(p.targetGrams,187);
  assert.equal(p.overTarget,true,'opening usual above target was not visible on first render');
  assert.equal(p.smartPriority,'secondary');
  assert.match(p.statusText,/above the current Smart Portion target/);

  const html=ui.markupFor(p);
  assert.match(html,/ok-piece-live is-over/);
  assert.match(html,/13 g above the current Smart Portion target/);
  assert.match(html,/Use suggestion/);
})();

(function testFirstUseMakesSmartSuggestionProminentWithoutAutoApplyingIt(){
  const {smart,contract,ui}=boot();
  const state={logs:{},pieceCalibration:{observations:[]}};
  const food=goat();
  const smartResult=smart.resultShape({state,food,targetGrams:187});
  const draft=contract.openDraft({state,food,meal:'Dinner',smartResult});
  assert.equal(draft.count,1,'first-use Smart Portion should remain a recommendation, not the active count');
  assert.equal(draft.usualPiece,null);
  assert.equal(draft.smartSuggestion.pieceCount,3);

  const p=ui.presentationFor(food,draft,state);
  assert.equal(p.smartPriority,'prominent');
  const html=ui.markupFor(p);
  assert.match(html,/ok-piece-smart--prominent/);
  assert.match(html,/No usual amount learned yet/);
  assert.match(html,/Use suggestion/);
})();

(function testLiveNutritionRegionIsStructurallyStable(){
  const {smart,contract,ui}=boot();
  const state={logs:{},pieceCalibration:{observations:[]}};
  const food=goat();
  const draft=contract.openDraft({state,food,meal:'Dinner',smartResult:smart.resultShape({state,food,targetGrams:500})});
  const one=ui.markupFor(ui.presentationFor(food,draft,state));
  const twelveDraft=contract.setCount(draft,state,12);
  const twelve=ui.markupFor(ui.presentationFor(food,twelveDraft,state));

  for(const html of [one,twelve]){
    assert.match(html,/class="ok-piece-live/);
    assert.match(html,/class="ok-piece-metric"/);
    assert.match(html,/class="ok-piece-stepper"/);
    assert.match(html,/data-piece-confirm/);
  }
  assert.match(SHEET_UI,/\.ok-piece-live\{[^}]*min-height:112px/);
  assert.match(SHEET_UI,/font-variant-numeric:tabular-nums/);
  assert.match(SHEET_UI,/\.ok-piece-controls\{[^}]*min-height:188px/);
})();

(function testCalibrationDoesNotCompeteInsidePrimarySheet(){
  const {smart,contract,ui}=boot();
  const state={logs:{},pieceCalibration:{observations:[]}};
  const food=goat();
  const draft=contract.openDraft({state,food,meal:'Dinner',smartResult:smart.resultShape({state,food,targetGrams:187})});
  const html=ui.markupFor(ui.presentationFor(food,draft,state));
  assert.doesNotMatch(html,/calibrat|weigh one piece/i,'calibration prompt leaked into the primary amount sheet');
})();

(function testTransientDraftLifetimeIsExplicitInController(){
  assert.match(SHEET_UI,/function clearSession\([^)]*\)\{[\s\S]*?activeSession=null;/);
  assert.match(SHEET_UI,/clearSession\('confirm',false\)/);
  assert.match(SHEET_UI,/clearSession\('backdrop'\)/);
  assert.match(SHEET_UI,/clearSession\('close'\)/);
  assert.match(SHEET_UI,/clearSession\('escape'\)/);
  assert.match(SHEET_UI,/clearSession\('replaced',false\)/);
})();

console.log('piece-sheet-v41: PASS');
