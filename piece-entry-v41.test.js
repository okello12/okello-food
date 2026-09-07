'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const CONTRACT=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const PIECE=fs.readFileSync(path.join(__dirname,'piece-entry-v41.js'),'utf8');
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
  return {storage,api:context.window.OkelloPieceEntry,contract:context.window.OkelloMealDataContract};
}

(function testReferencePieceEntryAndSnapshot(){
  const {api}=boot();
  const state={pieceCalibration:{observations:[]}};
  const options=api.optionsFor('goat',state);
  const medium=options.find(x=>x.pieceKey==='medium');
  assert.ok(medium);
  assert.equal(medium.grams,50);
  assert.equal(medium.estimateSource,'reference-piece-weight');
  assert.equal(medium.calibrated,false);

  const amount=api.estimatePieces(state,'goat','medium',5);
  assert.equal(amount.foodId,'goat');
  assert.equal(amount.enteredAmount,5);
  assert.equal(amount.enteredUnit,'pieces');
  assert.equal(amount.pieceCount,5);
  assert.equal(amount.estimatedGrams,250);
  assert.equal(amount.estimateBasisGrams,50);
  assert.equal(amount.amountQuality,'estimated');
  assert.equal(amount.estimateSource,'reference-piece-weight');

  const food={id:'goat',name:'Goat meat, edible cooked',emoji:'🍖',kcal:143,protein:27,fibre:0};
  const log=api.createLogDraft({food,amount,meal:'Dinner',plateId:'plate-1',ts:1000,id:'log-1'});
  assert.equal(log.foodId,'goat');
  assert.equal(log.grams,250);
  assert.equal(log.kcal,357.5);
  assert.equal(log.protein,67.5);
  assert.equal(log.fibre,0);
  assert.equal(log.plateId,'plate-1');
  assert.equal(log.amountQuality,'estimated');
  assert.equal(log.estimateBasisGrams,50);
  assert.equal(log.estimateSource,'reference-piece-weight');
})();

(function testThreeWeighingsPromotePersonalPieceWeightWithoutRepricingHistory(){
  const {api}=boot();
  let state={pieceCalibration:{observations:[]}};
  const historical=api.createLogDraft({
    food:{id:'goat',name:'Goat',emoji:'🍖',kcal:143,protein:27,fibre:0},
    amount:api.estimatePieces(state,'goat','medium',5),
    meal:'Dinner',ts:1000,id:'historical'
  });
  const historicalSnapshot=JSON.stringify(historical);

  for(const [i,grams] of [54,56,58].entries()){
    const observation=api.calibrationObservation({foodId:'goat',pieceKey:'medium',grams,observedAt:2000+i,id:`obs-${i}`});
    const before=JSON.stringify(state);
    const result=api.applyCalibrationObservation(state,observation);
    assert.equal(JSON.stringify(state),before,'calibration mutated its input state');
    state=result.state;
  }

  const status=api.calibrationStatus(state,'goat','medium');
  assert.equal(status.observationCount,3);
  assert.equal(status.observationsNeeded,0);
  assert.equal(status.calibrated,true);
  assert.equal(status.personalPieceWeight,56);

  const amount=api.estimatePieces(state,'goat','medium',5);
  assert.equal(amount.estimatedGrams,280);
  assert.equal(amount.estimateBasisGrams,56);
  assert.equal(amount.estimateSource,'personal-piece-weight');
  assert.equal(JSON.stringify(historical),historicalSnapshot,'later calibration repriced a historical draft');
})();

(function testDuplicateObservationIsIdempotent(){
  const {api}=boot();
  const state={pieceCalibration:{observations:[]}};
  const observation=api.calibrationObservation({foodId:'goat',pieceKey:'medium',grams:55,observedAt:1,id:'same'});
  const once=api.applyCalibrationObservation(state,observation);
  const twice=api.applyCalibrationObservation(once.state,observation);
  assert.equal(once.state.pieceCalibration.observations.length,1);
  assert.equal(twice.state.pieceCalibration.observations.length,1);
})();

(function testCrabHalfAndUnsupportedFood(){
  const {api}=boot();
  const state={pieceCalibration:{observations:[]}};
  const crab=api.estimatePieces(state,'crab','half',2);
  assert.equal(crab.estimatedGrams,50);
  assert.equal(crab.estimateBasisGrams,25);
  assert.deepEqual(api.optionsFor('ghana_oxtail',state),[]);
  assert.equal(api.estimatePieces(state,'ghana_oxtail','piece',2),null);
})();

(function testWeighedEntryStaysWeighed(){
  const {api}=boot();
  const amount=api.weighedGrams('goat',187);
  assert.equal(amount.foodId,'goat');
  assert.equal(amount.enteredAmount,187);
  assert.equal(amount.enteredUnit,'g');
  assert.equal(amount.grams,187);
  assert.equal(amount.amountQuality,'weighed');
  assert.equal('estimatedGrams' in amount,false);

  const log=api.createLogDraft({food:{id:'goat',name:'Goat',kcal:143,protein:27,fibre:0},amount,meal:'Lunch',id:'weighed',ts:5});
  assert.equal(log.amountQuality,'weighed');
  assert.equal(log.grams,187);
  assert.equal('estimatedGrams' in log,false);
  assert.equal('estimateBasisGrams' in log,false);
})();

(function testLegacyIdsResolveBeforePieceWork(){
  const {api}=boot();
  assert.equal(api.resolveFoodId('okro'),'ghana_okro_stew');
  assert.equal(api.resolveFoodId('okro_base'),'ghana_okro_stew_base');
})();

console.log('piece-entry-v41: PASS');
