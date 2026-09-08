'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const index=read('index.html');
const bootstrap=read('bootstrap-v14.js');
const sw=read('service-worker.js');
const update=read('update-v1.js');

assert.ok(index.includes('styles.css?v=45'),'index stylesheet query is not v45');
assert.ok(index.includes('bootstrap-v14.js?v=45'),'index bootstrap query is not v45');
assert.ok(bootstrap.includes("const VERSION = '45'"),'bootstrap version is not 45');
assert.ok(bootstrap.includes("service-worker.js?v=45"),'bootstrap service-worker registration is not v45');
assert.ok(sw.includes("const VERSION='45'"),'service-worker version is not 45');
assert.ok(sw.includes("const CACHE='okello-food-v45'"),'service-worker cache name is not v45');
assert.ok(update.includes("const APP_VERSION = 'v45'"),'update indicator is not v45');

for(const [name,text] of [['index',index],['bootstrap',bootstrap],['service-worker',sw]]){
  assert.equal(text.includes('?v=44'),false,`${name} still contains a v44 asset query`);
}

const manifestMatch=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert.ok(manifestMatch,'bootstrap script manifest was not found');
const scripts=[...manifestMatch[1].matchAll(/'([^']+\.js\?v=45)'/g)].map(m=>m[1]);
assert.equal(scripts.length,45,'v45 should boot exactly 45 runtime scripts');
for(const script of scripts){
  assert.ok(sw.includes(`'./${script}'`),`service worker does not cache bootstrap script ${script}`);
}

const cachedScripts=[...sw.matchAll(/'\.\/([^']+\.js\?v=45)'/g)].map(m=>m[1]).filter(name=>name!=='bootstrap-v14.js?v=45');
assert.deepEqual([...new Set(cachedScripts)].sort(),[...new Set(scripts)].sort(),'service-worker runtime JS cache set and bootstrap manifest differ');

const required=[
  'meal-data-contract-v1.js?v=45',
  'meal-catalog-facade-v1.js?v=45',
  'piece-entry-v41.js?v=45',
  'piece-usual-v41.js?v=45',
  'smart-portion-output-v41.js?v=45',
  'piece-sheet-contract-v41.js?v=45',
  'piece-sheet-v41.js?v=45',
  'template-engine-v41.js?v=45',
  'template-runtime-v41.js?v=45',
  'quick-add-piece-v41.js?v=45',
  'catalog-ui-v41.js?v=45',
  'smart-meal-fit-v41.js?v=45',
  'smart-meal-guard-v42.js?v=45',
  'smart-meal-runtime-v41.js?v=45',
  'beta-feedback-v43.js?v=45',
  'first-run-v44.js?v=45',
  'countable-servings-v45.js?v=45'
];
for(const script of required)assert.ok(scripts.includes(script),`v45 runtime module missing from bootstrap: ${script}`);

function before(a,b){
  const ai=scripts.indexOf(a),bi=scripts.indexOf(b);
  assert.ok(ai>=0&&bi>=0&&ai<bi,`${a} must load before ${b}`);
}
before('storage-migration-v1.js?v=45','smart-support.js?v=45');
before('smart-support.js?v=45','meal-data-contract-v1.js?v=45');
before('meal-data-contract-v1.js?v=45','app.js?v=45');
before('app.js?v=45','meal-catalog-facade-v1.js?v=45');
before('meal-catalog-facade-v1.js?v=45','food-intelligence-v1.js?v=45');
before('piece-entry-v41.js?v=45','smart-portion-output-v41.js?v=45');
before('piece-sheet-contract-v41.js?v=45','piece-sheet-v41.js?v=45');
before('template-engine-v41.js?v=45','features-v1.js?v=45');
before('features-v1.js?v=45','template-runtime-v41.js?v=45');
before('piece-sheet-v41.js?v=45','quick-add-piece-v41.js?v=45');
before('smart-meal-fit-v41.js?v=45','smart-v3.js?v=45');
before('smart-meal-guard-v42.js?v=45','smart-v3.js?v=45');
before('smart-v3.js?v=45','smart-meal-runtime-v41.js?v=45');
before('smart-meal-runtime-v41.js?v=45','beta-feedback-v43.js?v=45');
before('beta-feedback-v43.js?v=45','first-run-v44.js?v=45');
before('first-run-v44.js?v=45','countable-servings-v45.js?v=45');
assert.equal(scripts[scripts.length-1],'countable-servings-v45.js?v=45','v45 countable serving layer must load last');

for(const file of ['smart-meal-fit-v41.js','smart-meal-guard-v42.js','smart-meal-runtime-v41.js','beta-feedback-v43.js','first-run-v44.js','countable-servings-v45.js']){
  assert.ok(fs.existsSync(path.join(__dirname,file)),`${file} is missing from repository`);
}

console.log('bundle-v45: PASS');