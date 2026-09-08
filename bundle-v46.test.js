'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');

const index=read('index.html');
const bootstrap=read('bootstrap-v14.js');
const sw=read('service-worker.js');
const update=read('update-v1.js');

assert.ok(index.includes('styles.css?v=46'),'index stylesheet query is not v46');
assert.ok(index.includes('bootstrap-v14.js?v=46'),'index bootstrap query is not v46');
assert.ok(bootstrap.includes("const VERSION = '46'"),'bootstrap version is not 46');
assert.ok(bootstrap.includes("service-worker.js?v=46"),'bootstrap service-worker registration is not v46');
assert.ok(sw.includes("const VERSION='46'"),'service-worker version is not 46');
assert.ok(sw.includes("const CACHE='okello-food-v46'"),'service-worker cache name is not v46');
assert.ok(update.includes("const APP_VERSION = 'v46'"),'update indicator is not v46');

const manifestMatch=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert.ok(manifestMatch,'bootstrap script manifest was not found');
const scripts=[...manifestMatch[1].matchAll(/'([^']+\.js\?v=46)'/g)].map(m=>m[1]);
assert.equal(scripts.length,57,'v46 should boot exactly 57 runtime scripts');
for(const script of scripts)assert.ok(sw.includes(`'./${script}'`),`service worker does not cache bootstrap script ${script}`);

const cachedScripts=[...sw.matchAll(/'\.\/([^']+\.js\?v=46)'/g)].map(m=>m[1]).filter(name=>name!=='bootstrap-v14.js?v=46');
assert.deepEqual([...new Set(cachedScripts)].sort(),[...new Set(scripts)].sort(),'service-worker runtime JS cache set and bootstrap manifest differ');

function before(a,b){
  const ai=scripts.indexOf(a),bi=scripts.indexOf(b);
  assert.ok(ai>=0&&bi>=0&&ai<bi,`${a} must load before ${b}`);
}
before('storage-migration-v1.js?v=46','state-repository-v46.js?v=46');
before('state-repository-v46.js?v=46','count-unit-migration-v46.js?v=46');
before('count-unit-migration-v46.js?v=46','ghana-foods.js?v=46');
before('state-repository-v46.js?v=46','catalog-storage-v46.js?v=46');
before('food-data-layer-v2.js?v=46','amount-quality-v3.js?v=46');
before('piece-entry-v41.js?v=46','countable-servings-v46.js?v=46');
before('speech-guard-v46.js?v=46','recipe-assistant-v1.js?v=46');
before('activity-v1.js?v=46','activity-safety-v46.js?v=46');
before('backup-v3.js?v=46','trust-v46.js?v=46');
before('countable-servings-v46.js?v=46','build-my-meal-v46.js?v=46');
assert.equal(scripts[scripts.length-1],'trust-v46.js?v=46','trust-v46 must load last');

for(const file of [
  'state-repository-v46.js','count-unit-migration-v46.js','catalog-storage-v46.js','food-data-layer-v2.js',
  'amount-quality-v3.js','product-data-v2.js','speech-guard-v46.js','activity-safety-v46.js','beta-metrics-v46.js',
  'backup-v3.js','target-safety-v46.js','countable-servings-v46.js','nutrition-integrity-v46.js',
  'evidence-review-v46.js','build-my-meal-v46.js','meal-text-preprocessor-v46.js','trust-v46.js'
]) assert.ok(fs.existsSync(path.join(__dirname,file)),`${file} is missing from repository`);

for(const old of ['?v=45']){
  assert.equal(index.includes(old),false,`index still contains ${old}`);
  assert.equal(bootstrap.includes(old),false,`bootstrap still contains ${old}`);
  assert.equal(sw.includes(old),false,`service worker still contains ${old}`);
}

console.log('bundle-v46: PASS');
