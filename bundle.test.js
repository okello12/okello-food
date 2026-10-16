'use strict';

// Version-agnostic bundle contract. Replaces bundle-v41..v47.test.js, which
// each hardcoded a version number and so went red on every release bump.
//
// The single source of truth for the release version is bootstrap-v14.js's
// VERSION constant. Everything else must agree with it.

const fs=require('fs');
const assert=require('assert');

const read=f=>fs.readFileSync(f,'utf8');
const index=read('index.html');
const bootstrap=read('bootstrap-v14.js');
const sw=read('service-worker.js');
const update=read('update-v1.js');
const manifest=JSON.parse(read('manifest.webmanifest'));

// ---- version alignment --------------------------------------------------
const v=(bootstrap.match(/const VERSION\s*=\s*'(\d+)'/)||[])[1];
assert.ok(v,'bootstrap must declare a numeric VERSION');
const swVersion=(sw.match(/const VERSION\s*=\s*'(\d+)'/)||[])[1];
assert.equal(swVersion,v,`service-worker VERSION (${swVersion}) must equal bootstrap VERSION (${v})`);
assert.ok(sw.includes(`const CACHE='okello-food-v${v}`),`service-worker cache name must be okello-food-v${v}…`);
assert.ok(update.includes(`const APP_VERSION = 'v${v}'`),`update indicator must report v${v}`);
assert.ok(index.includes(`styles.css?v=${v}`),`index stylesheet must be ?v=${v}`);
assert.ok(index.includes(`bootstrap-v14.js?v=${v}`),`index bootstrap must be ?v=${v}`);

// No stale version query strings left behind from the previous release.
const prev=String(Number(v)-1);
for(const [name,src] of [['index',index],['bootstrap',bootstrap],['service-worker',sw]]){
  assert.equal(src.includes(`?v=${prev}'`)||src.includes(`?v=${prev}"`),false,`${name} still references ?v=${prev}`);
}

// ---- manifest ↔ cache parity --------------------------------------------
const m=bootstrap.match(/const scripts = \[([\s\S]*?)\];/);
assert.ok(m,'bootstrap script manifest not found');
const scripts=[...m[1].matchAll(/'([^']+\.js\?v=\d+)'/g)].map(x=>x[1]);
assert.ok(scripts.length>0,'bootstrap manifest is empty');
for(const s of scripts){
  assert.ok(s.endsWith(`?v=${v}`),`${s} is not pinned to ?v=${v}`);
  const file=s.split('?')[0];
  assert.ok(fs.existsSync(file),`${file} is in the bootstrap manifest but missing from the repo`);
  assert.ok(sw.includes(`'./${s}'`),`service worker does not cache ${s}`);
}
const cached=[...sw.matchAll(/'\.\/([^']+\.js\?v=\d+)'/g)].map(x=>x[1]);
assert.deepEqual([...new Set(cached)].sort(),[...new Set(scripts)].sort(),'service-worker JS cache set and bootstrap manifest differ');

// Every shipped .js at the repo root is either loaded, a test, a fixture, or
// the service worker / bootstrap itself. Anything else is dead weight.
const loaded=new Set(scripts.map(s=>s.split('?')[0]));
const allowed=f=>loaded.has(f)||/\.test\.js$/.test(f)||['service-worker.js','bootstrap-v14.js','verify-real-backup-v41.js'].includes(f);
const orphans=fs.readdirSync('.').filter(f=>f.endsWith('.js')&&!allowed(f));
assert.deepEqual(orphans,[],`unreferenced .js files at repo root: ${orphans.join(', ')}`);

// ---- load-order invariants ----------------------------------------------
const pos=name=>scripts.indexOf(`${name}?v=${v}`);
function before(a,b){const ai=pos(a),bi=pos(b);assert.ok(ai>=0&&bi>=0&&ai<bi,`${a} must load before ${b}`);}
before('storage-migration-v1.js','state-repository-v46.js');
before('state-repository-v46.js','count-unit-migration-v46.js');
before('food-data-layer-v2.js','amount-quality-v3.js');
before('app.js','target-safety-v46.js');
before('target-safety-v46.js','first-run-v44.js');
before('piece-entry-v41.js','countable-servings-v46.js');
before('backup-v3.js','trust-v46.js');
before('first-run-v44.js','global-first-v47.js');
before('global-first-v47.js','trust-v46.js');
assert.equal(scripts[scripts.length-1],`trust-v46.js?v=${v}`,'trust-v46 must remain the final runtime layer');
assert.equal((bootstrap.match(/target-safety-v46\.js\?v=/g)||[]).length,1,'target-safety-v46 must load exactly once');

// ---- PWA entry ----------------------------------------------------------
assert.ok(/^\.\/app-v\d+(-[a-z0-9]+)?\.html$/.test(manifest.start_url),`manifest start_url must be a versioned entry, got ${manifest.start_url}`);
assert.ok(fs.existsSync(manifest.start_url.replace(/^\.\//,'')),`manifest start_url ${manifest.start_url} does not exist`);

console.log(`bundle: PASS (v${v}, ${scripts.length} runtime modules)`);
