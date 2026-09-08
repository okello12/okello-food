'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const src=fs.readFileSync(path.join(__dirname,'global-first-v47.js'),'utf8');
const index=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');

for(const key of ['mixed','ghana-west-africa','caribbean','south-asia','east-southeast-asia','north-africa-middle-east','uk-europe','latin-america']){
  assert.ok(src.includes(`['${key}'`)||src.includes(`${key}:`)||src.includes(`'${key}':`),`global-first region ${key} is missing`);
}
assert.ok(src.includes("select.value=existing?validRegion(existing):'mixed'"),'new users should default to mixed/global rather than one cuisine');
assert.ok(src.includes('This only changes your starter shortcuts'),'onboarding must explain that preference does not restrict search');
assert.ok(src.includes('Observed eating history still outranks this preference'),'preference must not become recommendation');
assert.ok(src.includes("record?.('familiar-food-region'"),'beta evidence should record only the selected discovery region, not diary contents');
assert.ok(index.includes('Food from around the world'),'static first paint should be globally inclusive');
assert.ok(!index.includes('Foods from Ghana and around the world'),'static foods heading should not frame the product as Ghana-first only');

console.log('global-first-v47: PASS');
