'use strict';

const fs=require('fs');
const assert=require('assert');
const src=fs.readFileSync('first-run-v44.js','utf8');
new Function(src);

assert.ok(src.includes("const PROFILE_KEY = 'okello_first_run_v44'"),'first-run profile key missing');
assert.ok(src.includes("const MAIN_STORE = 'okello_food_tracker_v3'"),'main storage contract must remain the existing v3 key');
for(const forbidden of ['v44Condition','healthCondition','diagnosis','medicalHistory']) assert.equal(src.includes(forbidden),false,`v44 onboarding must not collect ${forbidden}`);
assert.ok(src.includes('What foods feel like home?'),'culture question missing');
assert.ok(src.includes('What are you focusing on?'),'focus question missing');
assert.ok(src.includes('defaults, not personalised'),'starter target disclosure missing');
assert.ok(src.includes("['waakye','Waakye']"),'waakye starter missing');
assert.ok(src.includes("['banku','Banku']"),'banku starter missing');
assert.ok(src.includes("['kenkey','Kenkey']"),'kenkey starter missing');
assert.ok(src.includes("['jollof rice','Jollof']"),'jollof starter missing');
assert.ok(src.includes("['light soup','Light soup']"),'light soup starter missing');
assert.ok(src.includes('What did you eat?'),'single primary home question missing');
assert.ok(src.includes('.tabs .tab[data-tab="recipes"]'),'mobile progressive disclosure for recipes missing');
assert.ok(src.includes('v44-more-tab'),'mobile More navigation missing');
assert.ok(src.includes("textContent = 'Clear log'"),'Clear today de-emphasis copy missing');
assert.ok(src.includes("textContent = 'Calculate the whole pot once'"),'recipe promise correction missing');
assert.ok(src.includes('<strong>Android:</strong>'),'Android PWA install copy missing');
assert.ok(src.includes("estimateSource:'rough-serving-v44'"),'rough serving provenance missing');
assert.ok(src.includes('piece.estimatedGramAmount'),'rough servings must use estimated-amount contract');
assert.ok(src.includes('piece.createLogDraft'),'rough servings must use governed log draft contract');
assert.ok(src.includes("source:'rough-serving-v44'"),'rough serving source missing');
assert.ok(src.includes('Estimated serving'),'estimated log badge missing');
assert.ok(src.includes('Estimated from pieces'),'piece estimate badge missing');
assert.ok(src.includes("const existing = qs('.v44-estimate-badge', row)"),'estimate badges must update in place rather than mutation-loop');
assert.ok(src.includes("if(existing.textContent !== label) existing.textContent = label"),'stable estimate badge update guard missing');
assert.ok(src.includes("if(!event.isTrusted || !roughSelection) return"),'manual gram edits must cancel rough-serving provenance');
assert.ok(src.includes("$('useSmartPortionBtn')?.addEventListener('click'"),'Smart Portion must cancel any prior rough-serving selection');
assert.ok(src.includes('v44-hidden-empty-activity'),'empty activity suppression missing');
assert.equal(/\bfetch\s*\(/.test(src),false,'v44 UX layer must not introduce a network dependency');
assert.equal(/location\.reload\s*\(/.test(src),false,'v44 UX layer must not force reloads');

console.log('first-run-v44: PASS');
