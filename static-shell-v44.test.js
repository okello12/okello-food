'use strict';

const fs=require('fs');
const assert=require('assert');

const index=fs.readFileSync('index.html','utf8');

assert.ok(index.includes('id="v44PrimaryQuestion"'),'static primary question container missing');
assert.ok(index.includes('>What did you eat?</h2>'),'static primary orientation heading missing');
assert.ok(index.includes('Search the food first. You can be approximate about the amount.'),'static orientation copy missing');
assert.ok(index.includes('>Clear log</button>'),'Clear log must exist in static HTML');
assert.equal(index.includes('>Clear today</button>'),false,'old Clear today copy remains in static HTML');
assert.ok(index.includes('<p class="eyebrow">BROWSE FOODS</p>'),'static Browse Foods eyebrow missing');
assert.equal(index.includes('WORLD FOOD LIBRARY'),false,'old WORLD FOOD LIBRARY eyebrow remains in static HTML');

const questionAt=index.indexOf('id="v44PrimaryQuestion"');
const bootstrapMatch=index.match(/bootstrap-v14\.js\?v=\d+/);
const bootstrapAt=bootstrapMatch?index.indexOf(bootstrapMatch[0]):-1;
assert.ok(questionAt>=0 && bootstrapAt>questionAt,'primary orientation must be present before bootstrap executes');
assert.ok(index.includes("document.querySelector('.global-hub')"),'static question relocation must target runtime global hub');
assert.ok(index.includes("hub.querySelectorAll('.v44-question')"),'relocation must suppress duplicate runtime questions');
assert.ok(index.includes('new MutationObserver'),'relocation must wait for the runtime hub without blocking first paint');

console.log('static-shell-v44: PASS');