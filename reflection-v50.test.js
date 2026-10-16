'use strict';

// v50: the reflection layer. The app has always answered "what did I eat";
// this module answers "so what" from the log alone. The contract under test:
//  - silence below three logged days;
//  - every observation is derived from entries, not targets or defaults;
//  - the language describes food and patterns, never the person;
//  - provenance is reported honestly (weighed vs estimated vs rough);
//  - unknown salt is reported as unknown, never as zero.

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');
const shim=require('./test-shim/browser-shim');

const STORE='okello_food_tracker_v3';
const src=fs.readFileSync('reflection-v50.js','utf8');

function dayKey(offset){const d=new Date();d.setDate(d.getDate()-offset);return d.toISOString().slice(0,10);}
function isWeekend(key){const n=new Date(key+'T12:00:00').getDay();return n===0||n===6;}

function boot(logs){
  const {document}=shim.install();
  document.body.innerHTML='<section id="tab-history" class="panel"><div class="section-heading"><h2>Daily totals</h2></div><div id="historyList"></div></section>';
  localStorage.setItem(STORE,JSON.stringify({version:3,logs}));
  const ctx=vm.createContext(global);
  vm.runInContext(src,ctx,{filename:'reflection-v50.js'});
  return {document,api:global.window.OkelloReflection};
}

// Load order and cache parity: after memory and forecast, before trust.
{
  const bootSrc=fs.readFileSync('bootstrap-v14.js','utf8');
  const sw=fs.readFileSync('service-worker.js','utf8');
  const v=(bootSrc.match(/VERSION\s*=\s*'(\d+)'/)||[])[1];
  const pos=n=>bootSrc.indexOf(`'${n}?v=${v}'`);
  assert.ok(pos('reflection-v50.js')>pos('personal-food-memory-v1.js'),'reflection must load after personal memory');
  assert.ok(pos('reflection-v50.js')>pos('day-forecast-v1.js'),'reflection must load after day forecast');
  assert.ok(pos('reflection-v50.js')<pos('trust-v46.js'),'trust must stay last');
  assert.ok(sw.includes(`reflection-v50.js?v=${v}`),'service worker must cache the reflection module');
}

// Language contract: nothing in the module addresses or judges the person.
for(const banned of ['you should','you need to','try to','well done','good job','bad','unhealthy','too much','too little','cut down','aim for']){
  assert.equal(src.toLowerCase().includes(banned),false,`reflection must not contain "${banned}"`);
}
assert.equal(/\.targets\b|targetCalories|targetProtein|targetMode/.test(src),false,'reflection must not read nutrition targets');
assert.equal(src.includes('2300')||src.includes('150'),false,'reflection must not carry any default figure');

// 1. Silence below three logged days.
{
  const {document,api}=boot({[dayKey(0)]:[{foodId:'a',name:'Banku',grams:200,meal:'Dinner',kcal:300,protein:5,fibre:2,ts:1}]});
  const r=api.build();
  assert.equal(r.ready,false);
  assert.ok(/1 day logged/.test(r.text),'must state how many days are logged');
  const card=document.getElementById('reflectionCard');
  assert.ok(card,'card must render even when silent');
  assert.equal(card.innerHTML.includes('<li'),false,'no observations below threshold');
}

// 2. Observations come from the log. Build a realistic fortnight.
{
  const logs={};
  for(let i=13;i>=0;i--){
    const k=dayKey(i);const rows=[];
    const plate='p'+i;
    // Banku + okro most days, weighed on weekdays, reference-piece fish on weekends.
    if(i%2===0){
      rows.push({foodId:'banku',name:'Banku',grams:isWeekend(k)?300:220,meal:'Dinner',kcal:isWeekend(k)?330:240,protein:4,fibre:2,ts:1,plateId:plate,amountQuality:'weighed',salt:null});
      rows.push({foodId:'ghana_okro_stew',name:'Okro stew, with fish',grams:150,meal:'Dinner',kcal:180,protein:12,fibre:3,ts:2,plateId:plate,amountQuality:'weighed',salt:0.8});
      rows.push({foodId:'tilapia',name:'Grilled tilapia',grams:120,meal:'Dinner',kcal:150,protein:25,fibre:0,ts:3,plateId:plate,amountQuality:'estimated',estimateSource:'reference-piece-weight',pieceKey:'tilapia',pieceCount:1,salt:null});
    }else{
      rows.push({foodId:'rice',name:'Jollof rice',grams:250,meal:'Dinner',kcal:400,protein:8,fibre:2,ts:1,plateId:plate,amountQuality:'estimated',salt:null});
    }
    if(i%4===0)rows.push({foodId:'bread',name:'Tea bread',grams:80,meal:'Lunch',kcal:210,protein:6,fibre:2,ts:4,amountQuality:'estimated',salt:1.1});
    logs[k]=rows;
  }
  const {document,api}=boot(logs);
  const r=api.build();
  assert.equal(r.ready,true);
  assert.equal(r.days,14);
  const texts=r.observations.map(o=>o.text);
  const all=texts.join('\n');

  // Repeat foods: by days logged, with counts, not calories.
  const repeat=texts.find(t=>t.startsWith('Most often logged:'));
  assert.ok(repeat,'must name the most-logged foods');
  assert.ok(/Banku on 7 of 14 days/.test(repeat),'counts are days, out of logged days: '+repeat);
  assert.equal(repeat.includes('kcal'),false,'repeat foods are counted, not priced');

  // Plate companions from plateId.
  const comp=texts.find(t=>/usually comes with/.test(t));
  assert.ok(comp,'must report plate companions');
  assert.ok(/Jollof rice|Banku/.test(comp),comp);

  // Meal slots: Dinner dominates; Lunch logged on fewer than half the days.
  const slots=texts.find(t=>/carries about/.test(t));
  assert.ok(slots,'must report the leading meal slot');
  assert.ok(/^Dinner carries about \d+% of logged calories\./.test(slots),slots);
  assert.ok(/Lunch appears on 4 of 14 days\./.test(slots),slots);
  assert.equal(/skip/i.test(slots),false,'an unlogged meal must not be called skipped');

  // Measurement mix: weighed and reference-piece shares both present, with the
  // calibration nudge because reference share is non-trivial and no personal weights exist.
  const mix=texts.find(t=>t.startsWith("Of this fortnight's calories"));
  assert.ok(mix,'must report provenance mix');
  assert.ok(/\d+% weighed/.test(mix),mix);
  assert.ok(/\d+% from standard piece sizes/.test(mix),mix);
  assert.ok(/\d+% rough estimates/.test(mix),mix);

  // Salt coverage: partial, and never phrased as zero.
  const salt=texts.find(t=>/^Salt is known for only \d+%/.test(t));
  assert.ok(salt,'must report partial salt coverage: '+all);
  assert.equal(all.includes('0 g'),false,'unknown salt must never read as 0 g');

  // Every observation carries evidence.
  for(const o of r.observations)assert.ok(o.evidence&&o.evidence.length>3,'every observation needs an evidence line');

  // Rendered card: above the history list, with the honesty line.
  const card=document.getElementById('reflectionCard');
  assert.ok(card,'card must render');
  assert.ok(card.innerHTML.includes('not advice'),'card must say these are patterns, not advice');
  assert.ok(card.innerHTML.includes('14 days'),'card must state the evidence window');
}

// 3. Portion drift is reported only with enough logs on both sides and a real gap.
{
  const logs={};
  for(let i=13;i>=0;i--){const k=dayKey(i);logs[k]=[{foodId:'banku',name:'Banku',grams:isWeekend(k)?320:200,meal:'Dinner',kcal:isWeekend(k)?350:220,protein:4,fibre:2,ts:1}];}
  const {api}=boot(logs);
  const r=api.build();
  const drift=r.observations.find(o=>/portions run about/.test(o.text));
  assert.ok(drift,'must report weekend vs weekday portion drift when both sides have ≥2 logs');
  assert.ok(/larger at the weekend/.test(drift.text),drift.text);
  assert.ok(/median 320 g vs 200 g/.test(drift.text),drift.text);
}
{
  // Same grams every day: no drift sentence.
  const logs={};
  for(let i=13;i>=0;i--){logs[dayKey(i)]=[{foodId:'banku',name:'Banku',grams:220,meal:'Dinner',kcal:240,protein:4,fibre:2,ts:1}];}
  const {api}=boot(logs);
  assert.equal(api.build().observations.some(o=>/portions run about/.test(o.text)),false,'no drift sentence without a real gap');
}

// 4. No salt anywhere: reported as absent, not as zero.
{
  const logs={};
  for(let i=4;i>=0;i--){logs[dayKey(i)]=[{foodId:'banku',name:'Banku',grams:220,meal:'Dinner',kcal:240,protein:4,fibre:2,ts:1}];}
  const {api}=boot(logs);
  const salt=api.build().observations.find(o=>/salt/i.test(o.text));
  assert.ok(salt&&/carried a salt value/.test(salt.text),'absent salt must be named as absent');
}

console.log('reflection-v50: PASS');
