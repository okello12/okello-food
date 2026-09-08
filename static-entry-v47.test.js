'use strict';

const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const entry=fs.readFileSync('app-v47.html','utf8');
const safe=fs.readFileSync('app-v47-safe.html','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const recovery=fs.readFileSync('recovery.html','utf8');

assert.strictEqual(entry,index,'app-v47.html must remain byte-identical to the current static index shell');
assert.strictEqual(safe,index,'app-v47-safe.html must remain byte-identical to the current static index shell');
for(const marker of ['What did you eat?','Clear log','BROWSE FOODS','Target not set yet','Foods from around the world','bootstrap-v14.js?v=47-safe2','okello-build-id\" content=\"v47-static-20260908-target-safety-2']){
  assert.ok(safe.includes(marker),`static target-safe v47 entry missing ${marker}`);
}
for(const retired of ['Clear today','WORLD FOOD LIBRARY','value="2300"','value="150"']){
  assert.ok(!safe.includes(retired),`static target-safe v47 entry must not contain retired/unsafe copy: ${retired}`);
}
assert.ok(safe.includes('class="targets-unconfirmed"'),'safe shell must fail closed until target mode resolves');
assert.equal(manifest.start_url,'./app-v47-safe.html','installed app must launch through the target-safe versioned entry');
assert.ok(recovery.includes('./app-v47-safe.html?recovery='),'recovery must redirect to the target-safe immutable v47 entry');
assert.ok(recovery.includes('./app-v47-safe.html?manual-recovery=1'),'manual recovery must use the target-safe immutable v47 entry');

console.log('static-entry-v47: PASS');
