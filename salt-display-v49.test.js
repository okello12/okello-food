'use strict';

// v49: salt reaches the Today screen (DD-F08). nutrition-integrity-v46 has
// snapshotted a nullable `salt` onto every log entry since v46; nothing
// summed or displayed it. The rule for display is the missing-data rule:
// sum only known values, state what share of the day they cover, and never
// render an unknown as "0 g".

const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('app.js','utf8');
const index=fs.readFileSync('index.html','utf8');

// Static: card exists, starts as unknown, not zero.
assert.ok(index.includes('id="todaySalt">—<'),'salt card must start as an em dash, not 0 g');
assert.ok(index.includes('id="saltNote"'),'salt card must carry a coverage note');
assert.ok(!index.includes('id="customSalt"'),'customSalt is injected by nutrition-integrity-v46 at runtime; the static shell must not duplicate it');

// Extract saltFor and run it.
const start=src.indexOf('function saltFor(entries)');
const end=src.indexOf('\n  }',start)+4;
const saltFor=new Function(src.slice(start,end)+'\nreturn saltFor;')();

// No entries.
let r=saltFor([]);
assert.equal(r.entriesKnown,0);assert.equal(r.grams,0);assert.equal(r.coverage,0);

// Entries with no salt data at all: must report zero KNOWN, not zero salt.
r=saltFor([{kcal:300,salt:null},{kcal:200,salt:undefined},{kcal:100}]);
assert.equal(r.entriesKnown,0,'unknown salt must not count as known');
assert.equal(r.coverage,0,'coverage must be 0 when nothing is known');

// Mixed: 300 kcal with 1.2 g, 200 kcal unknown, 500 kcal with 0 g (a real zero).
r=saltFor([{kcal:300,salt:1.2},{kcal:200,salt:null},{kcal:500,salt:0}]);
assert.equal(r.entriesKnown,2,'a real zero counts as known');
assert.equal(Math.round(r.grams*10)/10,1.2);
assert.equal(Math.round(r.coverage*100),80,'coverage is the kcal share of entries with known salt (800 of 1000)');

// Display logic in renderToday: unknown → dash; partial → percentage note; full → plain.
const render=src.slice(src.indexOf("if($('todaySalt')){"),src.indexOf("if($('todaySalt')){")+700);
assert.ok(render.includes("textContent='—'"),'render must show a dash when nothing is known');
assert.ok(render.includes('Known for ${Math.round(salt.coverage*100)}%'),'render must state partial coverage');
assert.ok(!/todaySalt'\)\.textContent='0 g'/.test(render),'render must never hardcode 0 g');

console.log('salt-display-v49: PASS');
