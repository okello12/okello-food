const assert=require('assert');
const fs=require('fs');

const bootstrap=fs.readFileSync('bootstrap-v14.js','utf8');
const guard=fs.readFileSync('smart-meal-guard-v42.js','utf8');
const runtime=fs.readFileSync('smart-meal-runtime-v41.js','utf8');

const versionMatch=bootstrap.match(/const VERSION = '([^']+)'/);
assert(versionMatch,'bootstrap version missing');
const version=versionMatch[1];
const manifestMatch=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert(manifestMatch,'bootstrap script manifest missing');
const scripts=[...manifestMatch[1].matchAll(new RegExp(`'([^']+\\.js\\?v=${version})'`,'g'))].map(match=>match[1]);

const fit=`smart-meal-fit-v41.js?v=${version}`;
const guardFile=`smart-meal-guard-v42.js?v=${version}`;
const legacy=`smart-v3.js?v=${version}`;
const governed=`smart-meal-runtime-v41.js?v=${version}`;
for(const file of [fit,guardFile,legacy,governed])assert(scripts.includes(file),`${file} is not in the v${version} boot manifest`);

assert(scripts.indexOf(fit)<scripts.indexOf(legacy),'fit contract must load before legacy Smart Meal UI');
assert(scripts.indexOf(guardFile)<scripts.indexOf(legacy),'boot guard must load before legacy Smart Meal handlers');
assert(scripts.indexOf(legacy)<scripts.indexOf(governed),'governed runtime must take ownership immediately after legacy UI exists');

assert(runtime.includes('OkelloSmartMealFit'),'governed runtime is not wired to Smart Meal fit contract');
assert(runtime.includes('chooseSuggestion'),'governed runtime does not use full/reduced/minimum-over-budget selection');
assert(runtime.includes('stopImmediatePropagation'),'governed runtime does not intercept legacy writers');
assert(guard.includes('[data-smartmeal],#plateAdd,#nlAdd'),'boot guard does not cover all legacy multi-item writers');
assert(guard.includes('stopImmediatePropagation'),'boot guard does not block the legacy write window');

console.log(`smart-meal-fit-wiring-v41: governed runtime ownership present in v${version}`);