'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const GHANA=fs.readFileSync(path.join(__dirname,'ghana-foods.js'),'utf8');
const WORLD=fs.readFileSync(path.join(__dirname,'world-foods.js'),'utf8');
const CONTRACT=fs.readFileSync(path.join(__dirname,'meal-data-contract-v1.js'),'utf8');
const STORE='okello_food_tracker_v3';

class FakeStorage{
  constructor(){this.map=new Map([[STORE,JSON.stringify({targets:{calories:2300,protein:150},logs:{},customFoods:[],recipes:[],mealTemplates:[]})]]);}
  getItem(k){return this.map.has(k)?this.map.get(k):null;}
  setItem(k,v){this.map.set(k,String(v));}
}

const storage=new FakeStorage();
const window={OkelloStorageMigration:{resolveFoodId:id=>String(id??'')}};
const context={window,localStorage:storage,console};

vm.runInNewContext(GHANA,context,{filename:'ghana-foods.js'});
vm.runInNewContext(WORLD,context,{filename:'world-foods.js'});

// Capture exactly what the shipped static seeders produce before the contract
// decorates anything. This makes CI fail when a new Soup or Complete meal lands
// without an explicit basis classification.
const original=JSON.parse(storage.getItem(STORE));
const staticFoods=JSON.parse(JSON.stringify(original.customFoods||[]));

vm.runInNewContext(CONTRACT,context,{filename:'meal-data-contract-v1.js'});
const api=context.window.OkelloMealDataContract;
const errors=api.validateStaticCatalogue(staticFoods);

if(errors.length){
  console.error('\nUnclassified static Soup/Complete meal records:');
  errors.forEach(e=>console.error(`- ${e.id} | ${e.cat} | ${e.name} | basis=${e.basis}`));
}
assert.equal(errors.length,0,`${errors.length} static Soup/Complete meal records are not explicitly classified`);

// Live backup regression: Complete meal is not a semantic shortcut for
// includes-protein. These two definitions explicitly require protein to be
// logged separately.
assert.equal(api.decorateFood({id:'ghana_waakye',cat:'Complete meal'}).basis,'base-only');
assert.equal(api.decorateFood({id:'ghana_rice_stew',cat:'Complete meal'}).basis,'base-only');
assert.equal(api.decorateFood({id:'ghana_jollof_chicken',cat:'Complete meal'}).basis,'includes-protein');

console.log('catalog-basis-audit-v1: PASS');
