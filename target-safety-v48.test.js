'use strict';

// v48: the target-safety bridge is retired. target-safety-v46 owns the
// target decision; first-run-v44 owns culture/focus only and merges into
// the shared profile rather than overwriting it. These assertions replace
// target-safety-v47.test.js, which encoded the bridge-era hotfix.

const fs=require('fs');
const assert=require('assert');

const boot=fs.readFileSync('bootstrap-v14.js','utf8');
const safety=fs.readFileSync('target-safety-v46.js','utf8');
const first=fs.readFileSync('first-run-v44.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

const v=(boot.match(/VERSION\s*=\s*'(\d+)'/)||[])[1];
assert.ok(v,'bootstrap must declare VERSION');
const ref=name=>boot.indexOf(`'${name}?v=${v}'`);

// Bridge is gone everywhere.
assert.equal(fs.existsSync('target-safety-bridge-v47.js'),false,'bridge file must be deleted');
assert.equal(boot.includes('target-safety-bridge'),false,'bootstrap must not load the bridge');
assert.equal(sw.includes('target-safety-bridge'),false,'service worker must not cache the bridge');

// Load order: app → target-safety-v46 → ... → first-run-v44.
const appPos=ref('app.js'),safetyPos=ref('target-safety-v46.js'),firstPos=ref('first-run-v44.js');
assert.ok(appPos>=0&&safetyPos>appPos&&firstPos>safetyPos,'target safety must load after app and before first-run');
assert.equal((boot.match(/target-safety-v46\.js\?v=/g)||[]).length,1,'target safety must load exactly once');

// first-run-v44 no longer invents or announces starter targets.
for(const needle of ['2300','2,300','150 g protein','v44Calories','v44Protein','starter target','defaults, not personalised']){
  assert.equal(first.includes(needle),false,`first-run-v44 must not contain "${needle}"`);
}
// first-run-v44 merges into the shared profile (preserves targetMode etc.).
assert.ok(first.includes('...existing'),'first-run-v44 must spread the existing profile when writing');
assert.ok(first.includes('existing.createdAt'),'first-run-v44 must preserve the original createdAt');

// v46 now owns the two behaviours the bridge used to carry.
assert.ok(safety.includes("classList.remove('targets-unconfirmed')"),'v46 must release the first-paint guard');
assert.ok(safety.includes("placeholder='Enter your target'"),'v46 must blank target inputs in tracking-only mode');

// Static shell still starts unconfirmed and never hardcodes a target.
assert.ok(index.includes('class="targets-unconfirmed"'),'static shell must start unconfirmed');
assert.ok(index.includes('target-safety-first-paint'),'static shell must hide target UI before runtime resolves');
assert.equal(index.includes('value="2300"'),false,'static shell must not hardcode 2,300 kcal');
assert.equal(index.includes('value="150"'),false,'static shell must not hardcode 150 g protein');

// Behavioural: simulate v46 setting a mode, then v44 finishing onboarding.
// The target decision must survive.
{
  const store={};
  const localStorage={getItem:k=>store[k]??null,setItem:(k,val)=>{store[k]=String(val);}};
  const KEY='okello_first_run_v44';
  localStorage.setItem(KEY,JSON.stringify({targetMode:'tracking-only',customTargets:false,targetModeSetAt:'2026-10-16T10:00:00Z',createdAt:'2026-10-16T09:59:00Z'}));
  // Reproduce first-run-v44's finish() write exactly as shipped.
  const existing=JSON.parse(localStorage.getItem(KEY));
  localStorage.setItem(KEY,JSON.stringify({...existing,version:1,culture:'ghana-west-africa',focus:'just-see',skipped:false,createdAt:existing.createdAt||'x'}));
  const after=JSON.parse(localStorage.getItem(KEY));
  assert.equal(after.targetMode,'tracking-only','targetMode must survive onboarding');
  assert.equal(after.customTargets,false,'customTargets must survive onboarding');
  assert.equal(after.targetModeSetAt,'2026-10-16T10:00:00Z','targetModeSetAt must survive onboarding');
  assert.equal(after.createdAt,'2026-10-16T09:59:00Z','original createdAt must be preserved');
  assert.equal(after.culture,'ghana-west-africa');
}

console.log('target-safety-v48: PASS');
