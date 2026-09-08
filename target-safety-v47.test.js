'use strict';

const fs=require('fs');
const assert=require('assert');

const boot=fs.readFileSync('bootstrap-v14.js','utf8');
const bridge=fs.readFileSync('target-safety-bridge-v47.js','utf8');
const safety=fs.readFileSync('target-safety-v46.js','utf8');
const first=fs.readFileSync('first-run-v44.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));

const appPos=boot.indexOf("'app.js?v=47'");
const safetyPos=boot.indexOf("'target-safety-v46.js?v=47'");
const bridgePos=boot.indexOf("'target-safety-bridge-v47.js?v=47'");
const firstPos=boot.indexOf("'first-run-v44.js?v=47'");
assert.ok(appPos>=0&&safetyPos>appPos&&bridgePos>safetyPos&&firstPos>bridgePos,'target safety and bridge must load immediately after app state and before first-run');
assert.equal((boot.match(/target-safety-v46\.js\?v=47/g)||[]).length,1,'target safety must load exactly once');
assert.ok(boot.includes("service-worker.js?v=47-safe2"),'service-worker registration must use a new URL');

assert.ok(index.includes('class="targets-unconfirmed"'),'static shell must start in target-unconfirmed mode');
assert.ok(index.includes('target-safety-first-paint'),'static shell must hide target-dependent UI before runtime resolves');
assert.equal(index.includes('value="2300"'),false,'static shell must not hardcode 2,300 kcal');
assert.equal(index.includes('value="150"'),false,'static shell must not hardcode 150 g protein');

assert.ok(safety.includes('will not invent a calorie or protein target'),'governed target-choice copy must remain explicit');
assert.ok(bridge.includes('event.stopImmediatePropagation()'),'bridge must block the destructive legacy onboarding submit');
assert.ok(bridge.includes('...previous'),'bridge must preserve existing target profile fields');
assert.ok(bridge.includes("targetMode"),'bridge must read the governed target mode');
assert.ok(bridge.includes('removeStarterTargetAdvice'),'bridge must suppress legacy starter-target advice');
assert.ok(first.includes('defaults, not personalised'),'legacy source remains detectable until it is retired, so bridge coverage is intentional rather than accidental');

assert.equal(manifest.start_url,'./app-v47-safe.html','installed app must launch from a versioned pathname');
assert.ok(sw.includes("const CACHE='okello-food-v47-safe2'"),'service worker must use a fresh cache identity');
assert.equal(sw.includes("  './',\n"),false,'service worker must not precache the poisoned bare directory key');
assert.ok(sw.includes("'./app-v47-safe.html'"),'service worker must precache the safe entry');
assert.ok(sw.includes("'./bootstrap-v14.js?v=47-safe2'"),'service worker must precache the cache-busted bootstrap');
assert.ok(sw.includes("networkFirst(e.request,'./app-v47-safe.html')"),'offline navigation fallback must use the safe entry');

console.log('target-safety-v47: PASS');
