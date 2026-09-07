'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const CONTRACT=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const USUAL=fs.readFileSync(path.join(__dirname,'piece-usual-v41.js'),'utf8');
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
  vm.runInNewContext(USUAL,context,{filename:'piece-usual-v41.js'});
  return window.OkelloPieceUsual;
}

(function testEstimatedGramQualityDoesNotEraseDirectPieceObservation(){
  const api=boot();
  const state={logs:{
    '2026-09-01':[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',grams:200,estimatedGrams:200,amountQuality:'estimated',meal:'Dinner',ts:1}],
    '2026-09-02':[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',grams:220,estimatedGrams:220,amountQuality:'estimated',meal:'Dinner',ts:2}],
    '2026-09-03':[{foodId:'goat',enteredUnit:'pieces',pieceCount:5,pieceKey:'medium',grams:275,estimatedGrams:275,amountQuality:'estimated',meal:'Dinner',ts:3}]
  }};
  const usual=api.usualPiecePortion(state,'goat','Dinner');
  assert.ok(usual);
  assert.equal(usual.pieceKey,'medium');
  assert.equal(usual.pieceCount,4,'direct piece count should learn even when gram conversion is estimated');
  assert.equal(usual.learningCount,3);
  assert.equal(usual.scope,'meal');
})();

(function testDifferentPieceSizesDoNotCombineToReachThreshold(){
  const api=boot();
  const state={logs:{
    a:[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',amountQuality:'estimated',ts:1}],
    b:[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',amountQuality:'estimated',ts:2}],
    c:[{foodId:'goat',enteredUnit:'pieces',pieceCount:2,pieceKey:'large',amountQuality:'estimated',ts:3}]
  }};
  assert.equal(api.usualPiecePortion(state,'goat','Dinner'),null);
})();

(function testMealUsualWinsWhenItHasEnoughEvidenceOtherwiseOverallWins(){
  const api=boot();
  const state={logs:{
    a:[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',meal:'Dinner',ts:1}],
    b:[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',meal:'Dinner',ts:2}],
    c:[{foodId:'goat',enteredUnit:'pieces',pieceCount:4,pieceKey:'medium',meal:'Dinner',ts:3}],
    d:[{foodId:'goat',enteredUnit:'pieces',pieceCount:2,pieceKey:'medium',meal:'Lunch',ts:4}],
    e:[{foodId:'goat',enteredUnit:'pieces',pieceCount:2,pieceKey:'medium',meal:'Lunch',ts:5}]
  }};
  const dinner=api.usualPiecePortion(state,'goat','Dinner');
  assert.equal(dinner.pieceCount,4);
  assert.equal(dinner.scope,'meal');
  const lunch=api.usualPiecePortion(state,'goat','Lunch');
  assert.equal(lunch.pieceCount,4,'insufficient lunch evidence should fall back to overall piece usual');
  assert.equal(lunch.scope,'overall');
})();

(function testGramOnlyEntriesNeverTrainPieceUsual(){
  const api=boot();
  const state={logs:{a:[
    {foodId:'goat',enteredUnit:'g',grams:200,amountQuality:'weighed',meal:'Dinner',ts:1},
    {foodId:'goat',enteredUnit:'g',grams:210,amountQuality:'weighed',meal:'Dinner',ts:2},
    {foodId:'goat',enteredUnit:'g',grams:205,amountQuality:'weighed',meal:'Dinner',ts:3}
  ]}};
  assert.equal(api.usualPiecePortion(state,'goat','Dinner'),null);
})();

console.log('piece-usual-v41: PASS');
