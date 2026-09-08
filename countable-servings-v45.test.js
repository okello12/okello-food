'use strict';

const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('countable-servings-v45.js','utf8');
new Function(src);

for(const text of [
  "egg:Object.freeze({pieceKey:'egg',singular:'egg',plural:'eggs',grams:50",
  "slice:Object.freeze({pieceKey:'slice',singular:'slice',plural:'slices',grams:40",
  "sardines:100,tuna:120",
  "estimateSource:'reference-count-unit-v45'",
  "enteredUnit:'pieces'",
  "pieceCount:count",
  "pieceKey:def.pieceKey",
  "The gram conversion is an estimate; your count is the direct observation.",
  "Counted eggs",
  "Counted slices",
  "Counted tins"
]) assert.ok(src.includes(text),`missing countable-serving contract text: ${text}`);

assert.equal(/\bfetch\s*\(/.test(src),false,'countable serving UI must not introduce a network dependency');
assert.equal(/location\.reload\s*\(/.test(src),false,'countable serving writes must not force reloads');
assert.ok(src.includes('window.OkelloAppState?.syncFromStorage?.()'),'durable write must synchronize app closure state');
assert.ok(src.includes("window.dispatchEvent(new CustomEvent('okello:food-log-changed'"),'countable write must notify dependent UI');
assert.ok(src.includes("Math.floor((target+1e-9)/current.def.grams)"),'Smart Portion count conversion must not round above the gram target');

console.log('countable-servings-v45: PASS');