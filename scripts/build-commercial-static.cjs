'use strict';
// Publish app files only; never publish tests, evidence workpapers or repository configuration.
const fs=require('node:fs'), path=require('node:path'), assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const sw=fs.readFileSync(path.join(root,'service-worker.js'),'utf8');
const block=sw.match(/const ASSETS=\[([\s\S]*?)\];/);
assert.ok(block,'service worker manifest absent');
const files=new Set([...block[1].matchAll(/'\.\/([^']+)'/g)].map(m=>m[1].split('?')[0]));
for(const f of ['service-worker.js','recovery.html'])files.add(f);
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
assert.ok(files.has(manifest.start_url.replace(/^\.\//,'')),'manifest entry missing');
for(const f of files){assert.match(f,/^(?:assets\/)?[A-Za-z0-9_.-]+$/);assert.ok(!f.includes('..')&&!/\.test\.|\.md$/.test(f));assert.ok(fs.statSync(path.join(root,f)).isFile(),f);}
fs.rmSync(out,{recursive:true,force:true});
fs.mkdirSync(out,{recursive:true});
for(const f of files){const dest=path.join(out,f);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,f),dest);}
fs.writeFileSync(path.join(out,'_headers'),'/service-worker.js\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/manifest.webmanifest\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n');
console.log('Static deployment package: '+files.size+' application files; workpapers and tests excluded.');
