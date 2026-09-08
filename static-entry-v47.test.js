'use strict';

const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const entry=fs.readFileSync('app-v47.html','utf8');
const recovery=fs.readFileSync('recovery.html','utf8');

assert.strictEqual(entry,index,'app-v47.html must remain byte-identical to the current static index shell');
for(const marker of ['What did you eat?','Clear log','BROWSE FOODS','Target not set yet','Foods from around the world']){
  assert.ok(entry.includes(marker),`static v47 entry missing ${marker}`);
}
for(const retired of ['Clear today','WORLD FOOD LIBRARY']){
  assert.ok(!entry.includes(retired),`static v47 entry must not contain retired copy: ${retired}`);
}
assert.ok(recovery.includes('./app-v47.html?recovery='),'recovery must redirect to the immutable v47 entry');
assert.ok(recovery.includes('./app-v47.html?manual-recovery=1'),'manual recovery must use the immutable v47 entry');

console.log('static-entry-v47: PASS');
