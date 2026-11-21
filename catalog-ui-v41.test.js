'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'catalog-ui-v41.js'),'utf8');

assert.ok(SOURCE.includes("document.getElementById('foodSelect')"),'Quick Add select must be canonicalised');
assert.ok(SOURCE.includes("document.getElementById('recipeFoodSelect')"),'recipe select must be canonicalised');
assert.ok(SOURCE.includes("'data-log-food'"),'food-library buttons must be canonicalised');
assert.ok(SOURCE.includes("'data-food'"),'search suggestions must be canonicalised');
assert.ok(SOURCE.includes('exact.has(canonical)'),'alias row should be removed when the canonical UI row already exists');
for(const event of ['okello:food-selects-rendered','okello:food-library-rendered','okello:food-suggestions-rendered'])assert.ok(SOURCE.includes("'"+event+"'"),'legacy surfaces must be repaired when owner emits '+event);
assert.ok(!SOURCE.includes('new MutationObserver(schedule).observe(document.body'),'catalogue adapter must not watch the entire page');

console.log('catalog-ui-v41: PASS');
