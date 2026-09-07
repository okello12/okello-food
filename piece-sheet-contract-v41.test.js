'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const CONTRACT=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const PIECE=fs.readFileSync(path.join(__dirname,'piece-entry-v41.js'),'utf8');
const USUAL=fs.readFileSync(path.join(__dirname,'piece-usual-v41.js'),'utf8');
const SMART=fs.readFileSync(path.join(__dirname,'smart-portion-output-v41.js'),'utf8');
const SHEET=fs.readFileSync(path.join(__dirname,'piece-sheet-contract-v41.js'),'utf8');
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
  vm.runInNewContext(SHEET,context,{filename:'piece-sheet-contract-v41.js'});
  return {
    piece:window.OkelloPieceEntry,
    usual:window.OkelloPieceUsual,
    smart:window.OkelloSmartPortionOutput,
    sheet:window.OkelloPieceSheetContract
  };
}

function learnedGoatState(piece){
  let state={
    logs:{
      a:[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',amountQuality:'estimated',meal:'Dinner',ts:1}],
      b:[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',amountQuality:'estimated',meal:'Dinner',ts:2}],
      c:[{foodId:'goat',enteredUnit:'pieces',pieceCount:5,pieceKey:'medium',amountQuality:'estimated',meal:'Dinner',ts:3}]
    },
    pieceCalibration:{observations:[]}
  };
  for(const [i,grams] of [54,56,58].entries()){
    const obs=piece.calibrationObservation({foodId:'goat',pieceKey:'medium',grams,id:`obs${i}`,observedAt:10+i});
    state=piece.applyCalibrationObservation(state,obs).state;
  }
  return state;
}

(function testPersonalUsualOpensSheetWhileSmartSuggestionStaysSecondary(){
  const {piece,smart,sheet}=boot();
  const state=learnedGoatState(piece);
  const food={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0,portion:170};
  const smartResult=smart.resultShape({state,food,targetGrams:187});
  const draft=sheet.openDraft({state,food,meal:'Dinner',smartResult});

  assert.equal(draft.mode,'pieces');
  assert.equal(draft.pieceKey,'medium');
  assert.equal(draft.count,4,'sheet should open on personal usual, not Smart Portion recommendation');
  assert.equal(draft.selectionSource,'personal-piece-usual');
  assert.equal(draft.amount.estimatedGrams,224);
  assert.ok(draft.smartSuggestion);
  assert.equal(draft.smartSuggestion.pieceCount,3);
  assert.equal(draft.targetGrams,187);

  const view=sheet.viewModel(food,draft);
  assert.equal(view.currentGrams,224);
  assert.equal(view.targetGrams,187);
  assert.equal(view.currentVsTargetGrams,37);
  assert.equal(view.smartUnusedGrams,19);

  const accepted=sheet.applySmartSuggestion(draft,state);
  assert.equal(accepted.count,3);
  assert.equal(accepted.amount.estimatedGrams,168);
  assert.equal(accepted.selectionSource,'smart-portion');
})();

(function testSwitchToGramsPrefillsConvertedAmountButClearsPieceProvenance(){
  const {piece,smart,sheet}=boot();
  const state=learnedGoatState(piece);
  const food={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0};
  const draft=sheet.openDraft({state,food,meal:'Dinner',smartResult:smart.resultShape({state,food,targetGrams:187})});
  const gramsDraft=sheet.switchToGrams(draft);

  assert.equal(gramsDraft.mode,'grams');
  assert.equal(gramsDraft.amount.grams,224);
  assert.equal(gramsDraft.amount.enteredUnit,'g');
  assert.equal(gramsDraft.amount.amountQuality,'estimated');
  assert.equal('pieceCount' in gramsDraft.amount,false);
  assert.equal('pieceKey' in gramsDraft.amount,false);
  assert.equal('estimatedGrams' in gramsDraft.amount,false);
  assert.ok(gramsDraft.resumePiece,'sheet may retain transient piece state for switching back');

  const final=sheet.finalAmount(gramsDraft);
  assert.equal(final.grams,224);
  assert.equal(final.amountQuality,'estimated');
  assert.equal('pieceCount' in final,false);
  assert.equal('pieceKey' in final,false);
  assert.equal('resumePiece' in final,false);

  const weighed=sheet.setGramValue(gramsDraft,221.5,'weighed');
  const weighedFinal=sheet.finalAmount(weighed);
  assert.equal(weighedFinal.grams,221.5);
  assert.equal(weighedFinal.amountQuality,'weighed');
  assert.equal('pieceKey' in weighedFinal,false);
})();

(function testSwitchBackRestoresTransientPieceDraftButDoesNotPolluteGramLog(){
  const {piece,sheet}=boot();
  const state=learnedGoatState(piece);
  const food={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0};
  const original=sheet.openDraft({state,food,meal:'Dinner'});
  const grams=sheet.switchToGrams(original);
  const back=sheet.switchToPieces(grams,state);
  assert.equal(back.mode,'pieces');
  assert.equal(back.count,4);
  assert.equal(back.pieceKey,'medium');
  assert.equal(back.amount.estimatedGrams,224);
})();

(function testStepperAndPieceSizeRecalculateWithoutChangingLayoutContractData(){
  const {piece,sheet}=boot();
  const state=learnedGoatState(piece);
  const food={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0};
  const draft=sheet.openDraft({state,food,meal:'Dinner'});
  const five=sheet.stepCount(draft,state,1);
  assert.equal(five.count,5);
  assert.equal(five.amount.estimatedGrams,280);
  const large=sheet.selectPieceKey(five,state,'large');
  assert.equal(large.count,5);
  assert.equal(large.pieceKey,'large');
  assert.equal(large.amount.estimatedGrams,400);
  const nutrition=sheet.nutritionFor(food,large);
  assert.equal(nutrition.kcal,572);
})();

(function testNoUsualStartsAtOnePieceAndNeverAutoAppliesSmartPortion(){
  const {smart,sheet}=boot();
  const state={pieceCalibration:{observations:[]},logs:{}};
  const food={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0};
  const smartResult=smart.resultShape({state,food,targetGrams:187});
  const draft=sheet.openDraft({state,food,meal:'Dinner',smartResult});
  assert.equal(draft.count,1);
  assert.equal(draft.selectionSource,'default-one-piece');
  assert.equal(draft.amount.estimatedGrams,50);
  assert.equal(draft.smartSuggestion.pieceCount,3);
})();

console.log('piece-sheet-contract-v41: PASS');
