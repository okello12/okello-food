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
  assert.equal(api.preferredEntry('goat',state).enteredUnit,'pieces');
  assert.equal(api.preferredEntry('goat',state).pieceKey,'medium');
  assert.equal(api.preferredEntry('banku',state).enteredUnit,'g');
  assert.equal(api.preferredEntry('crab',state).pieceKey,'half');
  assert.equal(api.preferredEntry('mackerel',state).pieceKey,'half');

  const amount=api.estimatePieces(state,'goat','medium',5);
  assert.equal(amount.foodId,'goat');
  assert.equal(amount.enteredAmount,5);
  assert.equal(amount.enteredUnit,'pieces');
  assert.equal(amount.pieceCount,5);
  assert.equal(amount.estimatedGrams,250);
  assert.equal(amount.grams,amount.estimatedGrams,'piece amount grams diverged from estimatedGrams');
  assert.equal(amount.estimateBasisGrams,50);
  assert.equal(amount.amountQuality,'estimated');
  assert.equal(amount.estimateSource,'reference-piece-weight');

  const food={id:'goat',name:'Goat meat, edible cooked',emoji:'🍖',kcal:143,protein:27,fibre:0};
  const log=api.createLogDraft({food,amount,meal:'Dinner',plateId:'plate-1',ts:1000,id:'log-1'});
  assert.equal(log.foodId,'goat');
  assert.equal(log.grams,250);
  assert.equal(log.estimatedGrams,250);
  assert.equal(log.grams,log.estimatedGrams,'piece log grams diverged from estimatedGrams');
  assert.equal(log.kcal,357.5);
  assert.equal(log.protein,67.5);
  assert.equal(log.fibre,0);
  assert.equal(log.plateId,'plate-1');
  assert.equal(log.amountQuality,'estimated');
  assert.equal(log.estimateBasisGrams,50);
  assert.equal(log.estimateSource,'reference-piece-weight');
})();

(function testEstimatedGramsAreAuthoritativeForPieceEntries(){
  const {api}=boot();
  const food={id:'goat',name:'Goat',emoji:'🍖',kcal:143,protein:27,fibre:0};
  const deliberatelyDivergent={
    foodId:'goat',enteredUnit:'pieces',enteredAmount:4,pieceCount:4,pieceKey:'medium',
    grams:999,estimatedGrams:200,estimateBasisGrams:50,amountQuality:'estimated',estimateSource:'reference-piece-weight'
  };
  assert.equal(api.effectiveGrams(deliberatelyDivergent),200);
  const nutrition=api.nutritionSnapshot(food,deliberatelyDivergent);
  assert.equal(nutrition.kcal,286);
  assert.equal(nutrition.protein,54);
  const log=api.createLogDraft({food,amount:deliberatelyDivergent,meal:'Dinner',id:'normalised',ts:2});
  assert.equal(log.grams,200);
  assert.equal(log.estimatedGrams,200);
  assert.equal(log.kcal,286);
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
  assert.equal(amount.grams,280);
  assert.equal(amount.estimateBasisGrams,56);
  assert.equal(amount.estimateSource,'personal-piece-weight');
  assert.equal(JSON.stringify(historical),historicalSnapshot,'later calibration repriced a historical draft');
})();

(function testCalibrationIsScopedToExactPieceSize(){
  const {api}=boot();
  let state={pieceCalibration:{observations:[]}};
  const rows=[
    api.calibrationObservation({foodId:'goat',pieceKey:'medium',grams:54,id:'m1',observedAt:1}),
    api.calibrationObservation({foodId:'goat',pieceKey:'medium',grams:56,id:'m2',observedAt:2}),
    api.calibrationObservation({foodId:'goat',pieceKey:'large',grams:80,id:'l1',observedAt:3})
  ];
  for(const row of rows)state=api.applyCalibrationObservation(state,row).state;

  const mediumBefore=api.calibrationStatus(state,'goat','medium');
  const largeBefore=api.calibrationStatus(state,'goat','large');
  assert.equal(mediumBefore.observationCount,2);
  assert.equal(mediumBefore.calibrated,false,'large observation leaked into medium calibration');
  assert.equal(largeBefore.observationCount,1);
  assert.equal(largeBefore.calibrated,false);

  const m3=api.calibrationObservation({foodId:'goat',pieceKey:'medium',grams:58,id:'m3',observedAt:4});
  state=api.applyCalibrationObservation(state,m3).state;
  const mediumAfter=api.calibrationStatus(state,'goat','medium');
  const largeAfter=api.calibrationStatus(state,'goat','large');
  assert.equal(mediumAfter.observationCount,3);
  assert.equal(mediumAfter.personalPieceWeight,56);
  assert.equal(largeAfter.observationCount,1);
  assert.equal(api.calibrationObservation({foodId:'goat',pieceKey:'not-a-size',grams:50}),null);
})();

(function testSmartPortionPieceProjectionUsesCurrentCalibrationAndNeverRoundsUp(){
  const {api}=boot();
  let state={pieceCalibration:{observations:[]}};
  for(const [i,grams] of [54,56,58].entries()){
    const obs=api.calibrationObservation({foodId:'goat',pieceKey:'medium',grams,id:`s${i}`,observedAt:i+1});
    state=api.applyCalibrationObservation(state,obs).state;
  }
  const suggestion=api.pieceSuggestionForGrams(state,'goat',187);
  assert.ok(suggestion);
  assert.equal(suggestion.pieceCount,3);
  assert.equal(suggestion.pieceKey,'medium');
  assert.equal(suggestion.estimateBasisGrams,56);
  assert.equal(suggestion.estimatedGrams,168);
  assert.equal(suggestion.grams,168);
  assert.equal(suggestion.targetGrams,187);
  assert.equal(suggestion.deltaGrams,-19);
  assert.equal(suggestion.estimateSource,'personal-piece-weight');
  assert.ok(suggestion.estimatedGrams<=suggestion.targetGrams,'piece suggestion exceeded Smart Portion target');

  assert.equal(api.pieceSuggestionForGrams(state,'goat',40),null,'sub-piece calorie room should stay as grams');
  assert.equal(api.pieceSuggestionForGrams(state,'banku',187),null,'gram-native food gained a fake piece rendering');
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
  assert.equal(crab.grams,50);
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
  assert.equal(api.effectiveGrams(amount),187);

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
