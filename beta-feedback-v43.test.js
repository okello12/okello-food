'use strict';

const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync(require('path').join(__dirname,'beta-feedback-v43.js'),'utf8');
new Function(src);

assert.ok(src.includes("const STORE='okello_beta_feedback_v1'"),'feedback store key changed unexpectedly');
assert.ok(src.includes("const MAX_RECORDS=500"),'feedback retention cap is missing');
assert.ok(src.includes("format:FORMAT"),'export bundle must be versioned');
assert.ok(src.includes("csvText"),'CSV export contract is missing');
assert.ok(src.includes("exportJson"),'JSON export contract is missing');
assert.ok(src.includes("Nothing is submitted to a server"),'local-only user copy is missing');
assert.equal(/\bfetch\s*\(/.test(src),false,'beta feedback must not call fetch');
assert.equal(/XMLHttpRequest/.test(src),false,'beta feedback must not create network requests');
assert.equal(/sendBeacon/.test(src),false,'beta feedback must not use sendBeacon');

for(const surface of ['smart-meal','quick-log','barcode','food-search']){
  assert.ok(src.includes(`id:'${surface}'`),`missing contextual feedback surface: ${surface}`);
}
for(const issue of ['wrong-food','wrong-amount','missing-component','misleading-guidance','barcode-mismatch','other']){
  assert.ok(src.includes(`value=\"${issue}\"`),`missing beta issue classification: ${issue}`);
}

assert.ok(src.includes('OkelloSmartMealRuntime?.lastTrace?.()'),'Smart Meal feedback must preserve governed trace context when available');
assert.ok(src.includes("context.input=cleanText($('nlInput')?.value"),'Quick Log feedback must preserve the typed meal context');
assert.ok(src.includes("context.barcode=cleanText($('barcodeInput')?.value"),'barcode feedback must preserve the scanned/typed code');
assert.ok(src.includes("context.query=cleanText($('foodSearch')?.value"),'food-search feedback must preserve the query');
assert.ok(src.includes("slice(-MAX_RECORDS)"),'feedback retention must be bounded rather than grow without limit');
assert.ok(src.includes("delete ctx.capturedAt"),'result signatures must ignore capture timestamps so unchanged results stay answered');
assert.ok(src.includes("delete ctx.trace.at"),'Smart Meal signatures must ignore trace timestamps while preserving trace evidence');
assert.ok(src.includes("window.confirm('Clear all saved beta feedback"),'feedback deletion must require explicit confirmation');

console.log('beta-feedback-v43: PASS');
