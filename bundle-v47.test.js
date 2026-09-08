'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');

const index=read('index.html');
const bootstrap=read('bootstrap-v14.js');
const sw=read('service-worker.js');
const update=read('update-v1.js');

assert.ok(index.includes('styles.css?v=47'),'index stylesheet query is not v47');
assert.ok(index.includes('bootstrap-v14.js?v=47-safe2'),'index bootstrap query is not the target-safe v47 bootstrap');
assert.ok(bootstrap.includes("const VERSION = '47'"),'bootstrap version is not 47');
assert.ok(bootstrap.includes("service-worker.js?v=47-safe2"),'bootstrap service-worker registration is not the target-safe v47 worker');
assert.ok(sw.includes("const VERSION='47'"),'service-worker version is not 47');
assert.ok(sw.includes("const CACHE='okello-food-v47-safe2'"),'service-worker cache name is not the target-safe v47 cache');
assert.ok(update.includes("const APP_VERSION = 'v47'"),'update indicator is not v47');

const manifestMatch=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert.ok(manifestMatch,'bootstrap script manifest was not found');
const scripts=[...manifestMatch[1].matchAll(/'([^']+\.js\?v=47)'/g)].map(m=>m[1]);
assert.equal(scripts.length,59,'target-safe v47 should boot exactly 59 runtime scripts');
for(const script of scripts)assert.ok(sw.includes(`'./${script}'`),`service worker does not cache bootstrap script ${script}`);

const cachedScripts=[...sw.matchAll(/'\.\/([^']+\.js\?v=47)'/g)].map(m=>m[1]);
assert.deepEqual([...new Set(cachedScripts)].sort(),[...new Set(scripts)].sort(),'service-worker runtime JS cache set and bootstrap manifest differ');

function before(a,b){
  const ai=scripts.indexOf(a),bi=scripts.indexOf(b);
  assert.ok(ai>=0&&bi>=0&&ai<bi,`${a} must load before ${b}`);
}
before('storage-migration-v1.js?v=47','state-repository-v46.js?v=47');
before('state-repository-v46.js?v=47','count-unit-migration-v46.js?v=47');
before('food-data-layer-v2.js?v=47','amount-quality-v3.js?v=47');
before('target-safety-v46.js?v=47','target-safety-bridge-v47.js?v=47');
before('target-safety-bridge-v47.js?v=47','first-run-v44.js?v=47');
before('target-safety-v46.js?v=47','first-run-v44.js?v=47');
before('piece-entry-v41.js?v=47','countable-servings-v46.js?v=47');
before('backup-v3.js?v=47','trust-v46.js?v=47');
before('first-run-v44.js?v=47','global-first-v47.js?v=47');
before('global-first-v47.js?v=47','trust-v46.js?v=47');
assert.equal(scripts[scripts.length-1],'trust-v46.js?v=47','trust-v46 must remain the final runtime trust layer');

for(const file of ['global-first-v47.js','backup-v3.js','target-safety-bridge-v47.js'])assert.ok(fs.existsSync(path.join(__dirname,file)),`${file} is missing from repository`);
for(const old of ['?v=46']){
  assert.equal(index.includes(old),false,`index still contains ${old}`);
  assert.equal(bootstrap.includes(old),false,`bootstrap still contains ${old}`);
  assert.equal(sw.includes(old),false,`service worker still contains ${old}`);
}

console.log('bundle-v47: PASS');
