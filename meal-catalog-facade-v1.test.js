'use strict';

const fs=require('fs');
const path=require('path');
const vm=require('vm');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'meal-catalog-facade-v1.js'),'utf8');

const foods=[
  {id:'okro',name:'Legacy okro',cat:'Soup',kcal:90,protein:7,fibre:2.5},
  {id:'ghana_okro_stew',name:'Canonical okro',cat:'Soup',kcal:95,protein:5,fibre:2.8},
  {id:'goat',name:'Goat',cat:'Protein',kcal:143,protein:27,fibre:0}
];
const byId=id=>foods.find(x=>x.id===id)||null;
const upstream={
  version:'base',
  getById:byId,
  all:()=>foods,
  calc:(food,g)=>({kcal:food.kcal*g/100,protein:food.protein*g/100,fibre:food.fibre*g/100})
};
const aliases={okro:'ghana_okro_stew'};
const contract={
  resolveFoodId:id=>aliases[String(id||'')]||String(id||''),
  decorateFood:food=>({...food}),
  deriveRecipeBasis:()=> 'unknown',
  validateStaticCatalogue:()=>[]
};
const window={OkelloFoodCatalog:upstream,OkelloMealDataContract:contract};
const context={window,localStorage:{getItem:()=>JSON.stringify({recipes:[]})},console,Set,JSON};
vm.runInNewContext(SOURCE,context,{filename:'meal-catalog-facade-v1.js'});

const facade=window.OkelloFoodCatalog;
assert.equal(facade.getById('okro').id,'ghana_okro_stew','legacy id must resolve to canonical food identity');
assert.equal(facade.getById('okro').name,'Canonical okro','canonical row must win over legacy alias nutrition');
const all=facade.all();
assert.equal(all.filter(x=>x.id==='ghana_okro_stew').length,1,'all() must not emit duplicate canonical identities');
assert.equal(all.some(x=>x.id==='okro'),false,'legacy alias must not survive the canonical catalog');
assert.equal(all.find(x=>x.id==='goat').id,'goat');

console.log('meal-catalog-facade-v1: PASS');
