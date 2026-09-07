'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const CONTRACT=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const PIECE=fs.readFileSync(path.join(__dirname,'piece-entry-v41.js'),'utf8');
const SMART=fs.readFileSync(path.join(__dirname,'smart-portion-output-v41.js'),'utf8');
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
  vm.runInNewContext(SMART,context,{filename:'smart-portion-output-v41.js'});
  return {piece:window.OkelloPieceEntry,smart:window.OkelloSmartPortionOutput};
}

(function testCalibratedGoatBecomesActionablePieces(){
  const {piece,smart}=boot();
  let state={pieceCalibration:{observations:[]}};
  for(const [i,grams] of [54,56,58].entries()){
    const obs=piece.calibrationObservation({foodId:'goat',pieceKey:'medium',grams,id:`g${i}`,observedAt:i+1});
    state=piece.applyCalibrationObservation(state,obs).state;
  }
  const food={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0};
  const out=smart.resultShape({state,food,targetGrams:187,base:{dailyRemaining:500}});
  assert.equal(out.targetGrams,187);
  assert.equal(out.grams,168);
  assert.equal(out.dailyRemaining,500);
  assert.ok(out.pieceSuggestion);
  assert.equal(out.pieceSuggestion.pieceCount,3);
  assert.equal(out.pieceSuggestion.pieceKey,'medium');
  assert.equal(out.pieceSuggestion.estimateBasisGrams,56);
  assert.equal(out.pieceSuggestion.estimateSource,'personal-piece-weight');
  assert.equal(out.pieceSuggestion.estimatedGrams,168);
  assert.ok(out.grams<=out.targetGrams,'Smart Portion rounded a piece suggestion above the calorie target');

  const log=piece.createLogDraft({food,amount:out.pieceSuggestion,meal:'Dinner',id:'smart-piece',ts:10});
  assert.equal(log.grams,168);
  assert.equal(log.estimatedGrams,168);
  assert.equal(log.kcal,240.24,'logged kcal must use actionable piece grams');
  assert.equal(log.protein,45.36,'logged protein must use actionable piece grams');
  assert.notEqual(log.kcal,267.41,'logged kcal incorrectly used targetGrams');
})();

(function testReferencePieceWeightWorksBeforeCalibration(){
  const {smart}=boot();
  const food={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0};
  const out=smart.actionableAmount({state:{pieceCalibration:{observations:[]}},food,targetGrams:187});
  assert.equal(out.targetGrams,187);
  assert.equal(out.grams,150);
  assert.equal(out.pieceSuggestion.pieceCount,3);
  assert.equal(out.pieceSuggestion.estimateBasisGrams,50);
  assert.equal(out.pieceSuggestion.estimateSource,'reference-piece-weight');
})();

(function testGramNativeFoodStaysContinuous(){
  const {smart}=boot();
  const banku={id:'banku',name:'Banku',kcal:145,protein:2.2,fibre:1};
  const out=smart.resultShape({state:{pieceCalibration:{observations:[]}},food:banku,targetGrams:187,base:{held:55}});
  assert.equal(out.grams,187);
  assert.equal(out.targetGrams,187);
  assert.equal(out.pieceSuggestion,null);
  assert.equal(out.held,55);
})();

(function testTooLittleRoomForOnePieceStaysAsGrams(){
  const {smart}=boot();
  const goat={id:'goat',name:'Goat',kcal:143,protein:27,fibre:0};
  const out=smart.actionableAmount({state:{pieceCalibration:{observations:[]}},food:goat,targetGrams:40});
  assert.equal(out.grams,40);
  assert.equal(out.targetGrams,40);
  assert.equal(out.pieceSuggestion,null);
})();

console.log('smart-portion-output-v41: PASS');
