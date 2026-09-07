const assert=require('assert');
const fs=require('fs');

const source=fs.readFileSync('smart-v3.js','utf8');

assert(
  source.includes('OkelloSmartMealFit'),
  'smart-v3.js is not wired to the governed Smart Meal fit contract yet'
);

assert(
  !source.includes('Math.max(5,Math.round(it.grams*scale/5)*5)'),
  'legacy 5 g post-scale floor is still live in smart-v3.js'
);

console.log('smart-meal-fit-wiring-v41: runtime wiring present');
