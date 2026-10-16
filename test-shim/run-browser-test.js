'use strict';

// Runs a browser-harness test under node. Each harness is described by the
// scripts its *.test.html loads; we load the same scripts in the same order,
// then read the result the test wrote into the page.
//
//   node test-shim/run-browser-test.js snapshot-invariants-v1
//   node test-shim/run-browser-test.js category-rules-v1
//   node test-shim/run-browser-test.js product-data-v1

const fs=require('fs');
const vm=require('vm');
const path=require('path');
const shim=require('./browser-shim');

const name=process.argv[2];
if(!name){console.error('usage: run-browser-test.js <test-name>');process.exit(2);}

const html=fs.readFileSync(path.resolve(`${name}.test.html`),'utf8');
const scripts=[...html.matchAll(/<script[^>]+src="([^"?]+)(?:\?[^"]*)?"/g)].map(m=>m[1]);
if(!scripts.length){console.error(`no <script src> found in ${name}.test.html`);process.exit(2);}

const {document,text}=shim.install();
const context=vm.createContext(global);
for(const src of scripts){
  const code=fs.readFileSync(path.resolve(src),'utf8');
  vm.runInContext(code,context,{filename:src});
}

// The tests are async; give pending promises a few ticks to settle.
(async()=>{
  for(let i=0;i<50;i++)await new Promise(r=>setImmediate(r));
  const status=document.documentElement.dataset.testStatus;
  const results=global.window.OkelloCategoryRuleContractTests||global.window.OkelloProductDataContractTests||null;
  const out=Object.values(text).join('\n').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
  const resultPass=results&&typeof results.failed==='number'&&results.failed===0&&results.passed>0;
  if(status==='pass'||resultPass||/:\s*PASS/.test(out)){
    console.log(`${name}: PASS`);
    process.exit(0);
  }
  console.error(`${name}: FAIL`);
  if(results&&Array.isArray(results.rows)){
    for(const r of results.rows)if(!r.ok)console.error(`  ✕ ${r.name}${r.detail?' — '+r.detail:''}`);
  }else console.error(out.slice(0,800));
  process.exit(1);
})();
