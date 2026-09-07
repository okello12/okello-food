'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const index=read('index.html');
const bootstrap=read('bootstrap-v14.js');
const sw=read('service-worker.js');
const update=read('update-v1.js');

assert.ok(index.includes('styles.css?v=42'),'index stylesheet query is not v42');
assert.ok(index.includes('bootstrap-v14.js?v=42'),'index bootstrap query is not v42');
assert.ok(bootstrap.includes("const VERSION = '42'"),'bootstrap version is not 42');
assert.ok(bootstrap.includes("service-worker.js?v=42"),'bootstrap service-worker registration is not v42');
assert.ok(sw.includes("const VERSION='42'"),'service-worker version is not 42');
assert.ok(sw.includes("const CACHE='okello-food-v42'"),'service-worker cache name is not v42');
assert.ok(update.includes("const APP_VERSION = 'v42'"),'update indicator is not v42');

for(const [name,text] of [['index',index],['bootstrap',bootstrap],['service-worker',sw]]){
  assert.equal(text.includes('?v=41'),false,`${name} still contains a v41 asset query`);
}

const manifestMatch=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert.ok(manifestMatch,'bootstrap script manifest was not found');
const scripts=[...manifestMatch[1].matchAll(/'([^']+\.js\?v=42)'/g)].map(m=>m[1]);
assert.equal(scripts.length,42,'v42 should boot exactly 42 runtime scripts');
for(const script of scripts){
  assert.ok(sw.includes(`'./${script}'`),`service worker does not cache bootstrap script ${script}`);
}

// The service worker also caches the bootstrap shell itself. Compare only the
// scripts that bootstrap subsequently loads through loadScript().
const cachedScripts=[...sw.matchAll(/'\.\/([^']+\.js\?v=42)'/g)].map(m=>m[1]).filter(name=>name!=='bootstrap-v14.js?v=42');
assert.deepEqual([...new Set(cachedScripts)].sort(),[...new Set(scripts)].sort(),'service-worker runtime JS cache set and bootstrap manifest differ');

const required=[
  'meal-data-contract-v1.js?v=42',
  'meal-catalog-facade-v1.js?v=42',
  'piece-entry-v41.js?v=42',
  'piece-usual-v41.js?v=42',
  'smart-portion-output-v41.js?v=42',
  'piece-sheet-contract-v41.js?v=42',
  'piece-sheet-v41.js?v=42',
  'template-engine-v41.js?v=42',
  'template-runtime-v41.js?v=42',
  'quick-add-piece-v41.js?v=42',
  'catalog-ui-v41.js?v=42',
  'smart-meal-fit-v41.js?v=42',
  'smart-meal-guard-v42.js?v=42',
  'smart-meal-runtime-v41.js?v=42'
];
for(const script of required)assert.ok(scripts.includes(script),`v42 runtime module missing from bootstrap: ${script}`);

function before(a,b){
  const ai=scripts.indexOf(a),bi=scripts.indexOf(b);
  assert.ok(ai>=0&&bi>=0&&ai<bi,`${a} must load before ${b}`);
}
before('storage-migration-v1.js?v=42','smart-support.js?v=42');
before('smart-support.js?v=42','meal-data-contract-v1.js?v=42');
before('meal-data-contract-v1.js?v=42','app.js?v=42');
before('app.js?v=42','meal-catalog-facade-v1.js?v=42');
before('meal-catalog-facade-v1.js?v=42','food-intelligence-v1.js?v=42');
before('piece-entry-v41.js?v=42','smart-portion-output-v41.js?v=42');
before('piece-sheet-contract-v41.js?v=42','piece-sheet-v41.js?v=42');
before('template-engine-v41.js?v=42','features-v1.js?v=42');
before('features-v1.js?v=42','template-runtime-v41.js?v=42');
before('piece-sheet-v41.js?v=42','quick-add-piece-v41.js?v=42');
before('smart-meal-fit-v41.js?v=42','smart-v3.js?v=42');
before('smart-meal-guard-v42.js?v=42','smart-v3.js?v=42');
before('smart-v3.js?v=42','smart-meal-runtime-v41.js?v=42');

for(const file of ['smart-meal-fit-v41.js','smart-meal-guard-v42.js','smart-meal-runtime-v41.js']){
  assert.ok(fs.existsSync(path.join(__dirname,file)),`${file} is missing from repository`);
}

console.log('bundle-v42: PASS');
