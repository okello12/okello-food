'use strict';

// Version-agnostic static entry contract. Replaces static-entry-v47.test.js.
// The manifest's start_url is the one versioned shell that must be
// byte-identical to index.html and carry the current bootstrap/build-id.
// Older app-vNN*.html shells may remain so already-installed home-screen
// icons keep resolving; they are not required to match index.html.

const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');
const boot=fs.readFileSync('bootstrap-v14.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
const recovery=fs.readFileSync('recovery.html','utf8');

const v=(boot.match(/const VERSION\s*=\s*'(\d+)'/)||[])[1];
assert.ok(v,'bootstrap VERSION not found');

const entryPath=manifest.start_url.replace(/^\.\//,'');
assert.ok(/^app-v\d+(-[a-z0-9]+)?\.html$/.test(entryPath),`start_url must be a versioned shell, got ${manifest.start_url}`);
assert.ok(entryPath.includes(`-v${v}`)||entryPath.includes(`v${v}.`),`start_url ${entryPath} must carry the current version v${v}`);
const entry=fs.readFileSync(entryPath,'utf8');
assert.strictEqual(entry,index,`${entryPath} must be byte-identical to index.html`);

assert.ok(index.includes(`bootstrap-v14.js?v=${v}`),`index must load bootstrap at ?v=${v}`);
const build=(index.match(/okello-build-id"\s+content="([^"]+)"/)||[])[1];
assert.ok(build&&build.startsWith(`v${v}-static-`),`build-id must start with v${v}-static-, got ${build}`);

for(const marker of ['What did you eat?','Clear log','BROWSE FOODS','Target not set yet','Foods from around the world','class="targets-unconfirmed"','target-safety-first-paint']){
  assert.ok(index.includes(marker),`static shell missing: ${marker}`);
}
for(const retired of ['Clear today','WORLD FOOD LIBRARY','value="2300"','value="150"','starter target']){
  assert.ok(!index.includes(retired),`static shell must not contain retired copy: ${retired}`);
}

// Recovery must send people to the current entry, never a stale one.
assert.ok(recovery.includes(`${manifest.start_url}?recovery=`),'recovery redirect must target the current manifest entry');
assert.ok(recovery.includes(`${manifest.start_url}?manual-recovery=1`),'manual recovery link must target the current manifest entry');
assert.ok(!/app-v\d+(-[a-z0-9]+)?\.html/.test(recovery.replace(new RegExp(entryPath.replace('.','\\.'),'g'),'')),'recovery must not reference any other versioned entry');

console.log(`static-entry: PASS (${entryPath}, build ${build})`);
