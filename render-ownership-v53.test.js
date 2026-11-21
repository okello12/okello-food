'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const read=f=>fs.readFileSync(f,'utf8');
const app=read('app.js');
for(const s of ['today-rendered','food-library-rendered','food-selects-rendered','food-suggestions-rendered'])assert.ok(app.includes("signal('"+s+"'"),s+' signal missing');
const bindings={
 'first-run-v44.js':'today-rendered',
 'amount-quality-v3.js':'today-rendered',
 'nutrition-integrity-v46.js':'today-rendered',
 'countable-servings-v46.js':'today-rendered',
 'features-v1.js':'today-rendered',
 'world-library-v1.js':'food-library-rendered',
 'ux-v2.js':'today-rendered'
};
for(const [path,event] of Object.entries(bindings))assert.ok(read(path).includes("'okello:"+event+"'"),path+' missing event');
for(const path of ['target-safety-v46.js','global-first-v47.js','catalog-ui-v41.js','scanner-launch-v1.js'])assert.ok(!/\.observe\(document\.body,\{childList:true,subtree:true\}/.test(read(path)),path+' still observes whole page');
assert.ok(!read('amount-quality-v3.js').includes('new MutationObserver(enhanceTodayRows)'));
assert.ok(!read('features-v1.js').includes('new MutationObserver(enhanceTodayLog)'));
console.log('render-ownership-v53: PASS');
