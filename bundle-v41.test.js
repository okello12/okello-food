'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const index=read('index.html');
const bootstrap=read('bootstrap-v14.js');
const sw=read('service-worker.js');
const update=read('update-v1.js');

assert.ok(index.includes('styles.css?v=41'),'index stylesheet query is not v41');
assert.ok(index.includes('bootstrap-v14.js?v=41'),'index bootstrap query is not v41');
assert.ok(bootstrap.includes("const VERSION = '41'"),'bootstrap version is not 41');
assert.ok(bootstrap.includes("service-worker.js?v=41"),'bootstrap service-worker registration is not v41');
assert.ok(sw.includes("const VERSION='41'"),'service-worker version is not 41');
assert.ok(sw.includes("const CACHE='okello-food-v41'"),'service-worker cache name is not v41');
assert.ok(update.includes("const APP_VERSION = 'v41'"),'update indicator is not v41');

for(const [name,text] of [['index',index],['bootstrap',bootstrap],['service-worker',sw],['update',update]]){
  assert.equal(text.includes('?v=40'),false,`${name} still contains a v40 asset query`);
}

// Only the explicit boot manifest belongs in the cache parity comparison.
// `bootstrap-v14.js` also contains the service-worker registration URL, which
// is intentionally not one of the scripts loaded by `loadScript()`.
const manifestMatch=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert.ok(manifestMatch,'bootstrap script manifest was not found');
const scripts=[...manifestMatch[1].matchAll(/'([^']+\.js\?v=41)'/g)].map(m=>m[1]);
assert.ok(scripts.length>20,'bootstrap script manifest was not parsed');
for(const script of scripts){
  assert.ok(sw.includes(`'./${script}'`),`service worker does not cache bootstrap script ${script}`);
}

const required=[
  'meal-data-contract-v1.js?v=41',
  'meal-catalog-facade-v1.js?v=41',
  'piece-entry-v41.js?v=41',
  'piece-usual-v41.js?v=41',
  'smart-portion-output-v41.js?v=41',
  'piece-sheet-contract-v41.js?v=41',
  'piece-sheet-v41.js?v=41',
  'template-engine-v41.js?v=41',
  'template-runtime-v41.js?v=41',
  'quick-add-piece-v41.js?v=41',
  'catalog-ui-v41.js?v=41'
];
for(const script of required)assert.ok(scripts.includes(script),`v41 runtime module missing from bootstrap: ${script}`);

function before(a,b){
  const ai=scripts.indexOf(a),bi=scripts.indexOf(b);
  assert.ok(ai>=0&&bi>=0&&ai<bi,`${a} must load before ${b}`);
}
before('storage-migration-v1.js?v=41','smart-support.js?v=41');
before('smart-support.js?v=41','meal-data-contract-v1.js?v=41');
before('meal-data-contract-v1.js?v=41','app.js?v=41');
before('app.js?v=41','meal-catalog-facade-v1.js?v=41');
before('meal-catalog-facade-v1.js?v=41','food-intelligence-v1.js?v=41');
before('piece-entry-v41.js?v=41','smart-portion-output-v41.js?v=41');
before('piece-sheet-contract-v41.js?v=41','piece-sheet-v41.js?v=41');
before('template-engine-v41.js?v=41','features-v1.js?v=41');
before('features-v1.js?v=41','template-runtime-v41.js?v=41');
before('piece-sheet-v41.js?v=41','quick-add-piece-v41.js?v=41');

console.log('bundle-v41: PASS');
