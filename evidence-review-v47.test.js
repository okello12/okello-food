'use strict';

const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('evidence-review-v46.js','utf8');
new Function(src);

for(const id of [
  'ghana_waakye','world_jerk_chicken','world_biryani_chicken','world_fried_rice',
  'world_couscous','world_baked_beans','world_tortilla_corn','rice'
]) assert.ok(src.includes(`'${id}'`),`global evidence fallback is missing ${id}`);

assert.ok(src.includes('Logged foods rank first'),'evidence queue must remain usage-led');
assert.ok(src.includes('rather than treating one country as the whole product'),'fresh fallback must explicitly avoid country-only framing');
assert.ok(src.includes('WAFCT remains comparison-only unless commercial permission is cleared'),'WAFCT licence gate must remain visible in evidence review');
assert.ok(src.includes('for(const rows of Object.values(state().logs||{}))'),'logged usage must be loaded before fallback candidates');

console.log('evidence-review-v47: PASS');
