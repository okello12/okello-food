'use strict';

const fs=require('fs');
const path=require('path');
const assert=require('assert');

const SOURCE=fs.readFileSync(path.join(__dirname,'template-runtime-v41.js'),'utf8');

assert.ok(/document\.addEventListener\('click',[\s\S]*?,true\);/.test(SOURCE),'template runtime must own dynamic controls through document capture delegation');
assert.ok(SOURCE.includes("closest?.('#saveTemplateBtn')"),'new-template save must be intercepted');
assert.ok(SOURCE.includes("closest?.('[data-use-template]')"),'template use must be intercepted');
assert.ok(SOURCE.includes('engine.createTemplate(name,entries)'),'new templates must persist component instructions through the v41 engine');
assert.ok(SOURCE.includes('engine.instantiateTemplate(template,catalog'),'template use must recalculate from current catalogue definitions');
assert.ok(SOURCE.includes('engine.evaluateTemplate(template,catalog)'),'rendered template totals must be recalculated, not read from cached item kcal');
assert.ok(!SOURCE.includes('templateCalories('),'runtime must not use the legacy cached-total helper');
assert.ok(SOURCE.includes('state.logs[day].push(...result.entries)'),'instantiated atomic entries must be written together');

console.log('template-runtime-v41: PASS');
