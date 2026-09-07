'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const index=read('index.html');
const bootstrap=read('bootstrap-v14.js');
const sw=read('service-worker.js');
const update=read('update-v1.js');

assert.ok(index.includes('styles.css?v=44'),'index stylesheet query is not v44');
assert.ok(index.includes('bootstrap-v14.js?v=44'),'index bootstrap query is not v44');
assert.ok(bootstrap.includes("const VERSION = '44'"),'bootstrap version is not 44');
assert.ok(bootstrap.includes("service-worker.js?v=44"),'bootstrap service-worker registration is not v44');
assert.ok(sw.includes("const VERSION='44'"),'service-worker version is not 44');
assert.ok(sw.includes("const CACHE='okello-food-v44'"),'service-worker cache name is not v44');
assert.ok(update.includes("const APP_VERSION = 'v44'"),'update indicator is not v44');

for(const [name,text] of [['index',index],['bootstrap',bootstrap],['service-worker',sw]]){
  assert.equal(text.includes('?v=43'),false,`${name} still contains a v43 asset query`);
}

const manifestMatch=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert.ok(manifestMatch,'bootstrap script manifest was not found');
const scripts=[...manifestMatch[1].matchAll(/'([^']+\.js\?v=44)'/g)].map(m=>m[1]);
assert.equal(scripts.length,44,'v44 should boot exactly 44 runtime scripts');
for(const script of scripts){
  assert.ok(sw.includes(`'./${script}'`),`service worker does not cache bootstrap script ${script}`);
}

const cachedScripts=[...sw.matchAll(/'\.\/([^']+\.js\?v=44)'/g)].map(m=>m[1]).filter(name=>name!=='bootstrap-v14.js?v=44');
assert.deepEqual([...new Set(cachedScripts)].sort(),[...new Set(scripts)].sort(),'service-worker runtime JS cache set and bootstrap manifest differ');

const required=[
  'meal-data-contract-v1.js?v=44',
  'meal-catalog-facade-v1.js?v=44',
  'piece-entry-v41.js?v=44',
  'piece-usual-v41.js?v=44',
  'smart-portion-output-v41.js?v=44',
  'piece-sheet-contract-v41.js?v=44',
  'piece-sheet-v41.js?v=44',
  'template-engine-v41.js?v=44',
  'template-runtime-v41.js?v=44',
  'quick-add-piece-v41.js?v=44',
  'catalog-ui-v41.js?v=44',
  'smart-meal-fit-v41.js?v=44',
  'smart-meal-guard-v42.js?v=44',
  'smart-meal-runtime-v41.js?v=44',
  'beta-feedback-v43.js?v=44',
  'first-run-v44.js?v=44'
];
for(const script of required)assert.ok(scripts.includes(script),`v44 runtime module missing from bootstrap: ${script}`);

function before(a,b){
  const ai=scripts.indexOf(a),bi=scripts.indexOf(b);
  assert.ok(ai>=0&&bi>=0&&ai<bi,`${a} must load before ${b}`);
}
before('storage-migration-v1.js?v=44','smart-support.js?v=44');
before('smart-support.js?v=44','meal-data-contract-v1.js?v=44');
before('meal-data-contract-v1.js?v=44','app.js?v=44');
before('app.js?v=44','meal-catalog-facade-v1.js?v=44');
before('meal-catalog-facade-v1.js?v=44','food-intelligence-v1.js?v=44');
before('piece-entry-v41.js?v=44','smart-portion-output-v41.js?v=44');
before('piece-sheet-contract-v41.js?v=44','piece-sheet-v41.js?v=44');
before('template-engine-v41.js?v=44','features-v1.js?v=44');
before('features-v1.js?v=44','template-runtime-v41.js?v=44');
before('piece-sheet-v41.js?v=44','quick-add-piece-v41.js?v=44');
before('smart-meal-fit-v41.js?v=44','smart-v3.js?v=44');
before('smart-meal-guard-v42.js?v=44','smart-v3.js?v=44');
before('smart-v3.js?v=44','smart-meal-runtime-v41.js?v=44');
before('smart-meal-runtime-v41.js?v=44','beta-feedback-v43.js?v=44');
before('beta-feedback-v43.js?v=44','first-run-v44.js?v=44');
before('interaction-v1.js?v=44','first-run-v44.js?v=44');
assert.equal(scripts[scripts.length-1],'first-run-v44.js?v=44','v44 UX layer must load last');

for(const file of ['smart-meal-fit-v41.js','smart-meal-guard-v42.js','smart-meal-runtime-v41.js','beta-feedback-v43.js','first-run-v44.js']){
  assert.ok(fs.existsSync(path.join(__dirname,file)),`${file} is missing from repository`);
}

console.log('bundle-v44: PASS');
