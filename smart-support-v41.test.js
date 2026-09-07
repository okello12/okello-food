'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'smart-support.js'),'utf8');
const STORE='okello_food_tracker_v3';

class FakeStorage{
  constructor(state){this.map=new Map([[STORE,JSON.stringify(state)]]);this.writes=0;}
  getItem(k){return this.map.get(k)??null;}
  setItem(k,v){this.writes++;this.map.set(k,String(v));}
  state(){return JSON.parse(this.map.get(STORE));}
}

(function testSeedOnceAndNeverRecreateAlias(){
  const storage=new FakeStorage({customFoods:[{id:'ghana_okro_stew',name:'Okro stew'}]});
  const context={localStorage:storage,JSON};
  vm.runInNewContext(SOURCE,context,{filename:'smart-support.js'});
  let state=storage.state();
  assert.equal(state.customFoods.some(x=>x.id==='ghana_okro_soup'),false,'retired okro alias was recreated');
  assert.equal(state.customFoods.filter(x=>x.id==='ghana_light_soup').length,1,'light soup compatibility row missing');
  assert.equal(state.customFoods.find(x=>x.id==='ghana_light_soup').basis,'includes-protein');
  assert.equal(storage.writes,1,'first compatibility seed should write once');
  vm.runInNewContext(SOURCE,context,{filename:'smart-support.js'});
  assert.equal(storage.writes,1,'second pass must be a true no-op');
})();

(function testAlreadyCompleteStoreDoesNotWrite(){
  const light={id:'ghana_light_soup',basis:'includes-protein',baseFoodId:'light_soup_base'};
  const storage=new FakeStorage({customFoods:[light]});
  vm.runInNewContext(SOURCE,{localStorage:storage,JSON},{filename:'smart-support.js'});
  assert.equal(storage.writes,0,'already seeded store should not be rewritten');
})();

console.log('smart-support-v41: PASS');
