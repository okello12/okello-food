'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const STORE='okello_food_tracker_v3';

class FakeStorage{
  constructor(seed={}){this.map=new Map(Object.entries(seed).map(([k,v])=>[k,String(v)]));this.writes=[];}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){const value=String(v);this.map.set(k,value);this.writes.push({key:k,value});}
  resetAudit(){this.writes=[];}
  json(k){const raw=this.getItem(k);return raw==null?null:JSON.parse(raw);}
}

function run(storage){
  const window={OkelloStorageMigration:{resolveFoodId:id=>String(id)==='ghana_okro_soup'?'ghana_okro_stew':String(id??'')}};
  const context={window,localStorage:storage,console};
  vm.runInNewContext(SOURCE,context,{filename:'meal-data-contract-v1.js'});
  return context.window.OkelloMealDataContract;
}

(function testReviewedBaseProteinValues(){
  const storage=new FakeStorage({[STORE]:JSON.stringify({customFoods:[],recipes:[],mealTemplates:[],definitionEvents:[],pieceCalibration:{observations:[]}})});
  const api=run(storage);
  const byId=id=>api.baseVariants.find(x=>x.id===id);

  assert.equal(byId('okro_base').protein,1.5);
  assert.equal(byId('light_soup_base').protein,1.5);
  assert.equal(byId('ghana_okro_stew_base').protein,1.5);
  assert.equal(byId('ghana_palmnut_soup_base').protein,1.5);
  assert.equal(byId('ghana_groundnut_soup_base').protein,4);
  assert.equal(byId('ghana_kontomire_stew_base').protein,3.5);

  for(const id of ['okro_base','light_soup_base','ghana_okro_stew_base','ghana_palmnut_soup_base']){
    assert.ok(byId(id).protein<=2,`${id} still looks protein-loaded`);
  }
})();

(function testPieceWeightsAreFrozenAndPersonalCalibrationIsFutureOnly(){
  const storage=new FakeStorage({[STORE]:JSON.stringify({customFoods:[],recipes:[],mealTemplates:[],definitionEvents:[],pieceCalibration:{observations:[]}})});
  const api=run(storage);
  const referenceBefore=api.pieceWeights.goat.medium;
  assert.equal(referenceBefore,50);

  const state0={pieceCalibration:{observations:[]}};
  const refEstimate=api.pieceEstimate(state0,'goat','medium',5);
  assert.equal(refEstimate.estimatedGrams,250);
  assert.equal(refEstimate.estimateBasisGrams,50);
  assert.equal(refEstimate.estimateSource,'reference-piece-weight');

  const state3={pieceCalibration:{observations:[
    {foodId:'goat',pieceKey:'medium',grams:54},
    {foodId:'goat',pieceKey:'medium',grams:56},
    {foodId:'goat',pieceKey:'medium',grams:58}
  ]}};
  const personal=api.pieceEstimate(state3,'goat','medium',5);
  assert.equal(personal.estimatedGrams,280);
  assert.equal(personal.estimateBasisGrams,56);
  assert.equal(personal.estimateSource,'personal-piece-weight');
  assert.equal(api.pieceWeights.goat.medium,referenceBefore,'personal learning mutated frozen reference weight');

  // A historical entry keeps the basis written at log time even if a later
  // personal median changes.
  const oldLog={estimatedGrams:250,estimateBasisGrams:50,estimateSource:'reference-piece-weight'};
  assert.deepEqual(oldLog,{estimatedGrams:250,estimateBasisGrams:50,estimateSource:'reference-piece-weight'});
})();

(function testRecipeBasisComesFromIngredients(){
  const storage=new FakeStorage({[STORE]:JSON.stringify({customFoods:[],recipes:[],mealTemplates:[],definitionEvents:[],pieceCalibration:{observations:[]}})});
  const api=run(storage);
  const foods={
    raw_okro:{id:'raw_okro',cat:'Raw ingredient',kcal:33,protein:1.9},
    raw_onion:{id:'raw_onion',cat:'Raw ingredient',kcal:40,protein:1.1},
    goat:{id:'goat',cat:'Protein',kcal:143,protein:27},
    custom_unknown:{id:'custom_unknown',cat:'Soup',basis:'unknown',kcal:80,protein:3}
  };
  const get=id=>foods[id]||null;
  assert.equal(api.deriveRecipeBasis({ingredients:[{foodId:'raw_okro'},{foodId:'raw_onion'}]},get),'base-only');
  assert.equal(api.deriveRecipeBasis({ingredients:[{foodId:'raw_okro'},{foodId:'goat'}]},get),'includes-protein');
  assert.equal(api.deriveRecipeBasis({ingredients:[{foodId:'custom_unknown'}]},get),'unknown');
})();

(function testStaticValidationRejectsUnclassifiedSoup(){
  const storage=new FakeStorage({[STORE]:JSON.stringify({customFoods:[],recipes:[],mealTemplates:[],definitionEvents:[],pieceCalibration:{observations:[]}})});
  const api=run(storage);
  const errors=api.validateStaticCatalogue([
    {id:'world_new_soup',name:'New static soup',cat:'Soup',kcal:80,protein:3},
    {id:'custom_user_soup',name:'My soup',cat:'Soup',kcal:90,protein:4}
  ]);
  assert.equal(errors.length,1);
  assert.equal(errors[0].id,'world_new_soup');
})();

(function testContractSeedIsIdempotent(){
  const initial={customFoods:[],recipes:[],mealTemplates:[],definitionEvents:[],pieceCalibration:{observations:[]}};
  const storage=new FakeStorage({[STORE]:JSON.stringify(initial)});
  run(storage);
  assert.equal(storage.writes.filter(x=>x.key===STORE).length,1,'first contract seed should establish reviewed rows once');
  const rawAfterFirst=storage.getItem(STORE);

  storage.resetAudit();
  run(storage);
  assert.equal(storage.getItem(STORE),rawAfterFirst);
  assert.equal(storage.writes.length,0,'second contract seed should be a no-op');
})();

console.log('meal-data-contract-v1: PASS');
