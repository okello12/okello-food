const assert=require('assert');
const fs=require('fs');

const runtime=fs.readFileSync('smart-meal-runtime-v41.js','utf8');
const guard=fs.readFileSync('smart-meal-guard-v42.js','utf8');
const legacy=fs.readFileSync('smart-v3.js','utf8');
const app=fs.readFileSync('app.js','utf8');

assert(runtime.includes('OkelloSmartMealFit'),'runtime must depend on governed Smart Meal fit contract');
assert(runtime.includes('chooseSuggestion'),'runtime must choose full/reduced/minimum-over-budget meals through the fit contract');
assert(runtime.includes('OkelloPieceSheet'),'runtime must review piece-native components before commit');
assert(runtime.includes('createLogDraft'),'runtime must create snapshot logs through the piece-entry contract');
assert(runtime.includes("uid('plate')"),'multi-component commits must share a plateId');
assert(runtime.includes("source:'smart-meal-v42'"),'Smart Meal commits need an explicit source');
assert(runtime.includes("source:'ghana-plate-v42'"),'legacy Ghanaian Plate must route through the governed commit owner');
assert(runtime.includes("source:'natural-log-v42'"),'natural-language multi-item logging must route through the governed commit owner');
assert(runtime.includes("'[data-smartmeal-v42],[data-smartmeal]'"),'runtime must capture both governed and any legacy Smart Meal buttons');
assert(runtime.includes("closest?.('#plateAdd')"),'runtime must capture the old Ghanaian Plate Add action');
assert(runtime.includes("closest?.('#nlAdd')"),'runtime must capture the natural-language Add action');
assert(runtime.includes('stopImmediatePropagation'),'legacy target handlers must be stopped before they can write');
assert(runtime.includes('refreshVisibleToday'),'successful writes must explicitly refresh Today');
assert(runtime.includes("new Event('change',{bubbles:true})"),'Quick Add and library dependants must be explicitly refreshed');
assert(runtime.includes("okello:food-log-changed"),'runtime must emit a state-change event for observers');
assert(runtime.includes('okello_smart_meal_last_trace_v42'),'selected meal maths must remain inspectable after the write');
assert.equal(runtime.includes('location.reload()'),false,'governed runtime must not hide writes behind a page reload');

// app.js owns a long-lived in-memory `state`. Any external writer must refresh
// that closure immediately after persisting or a later app.js save could erase
// the externally added logs. The hook also keeps the built-in export path honest.
assert(app.includes('function syncFromStorage(){'),'app.js must expose a storage-to-closure synchronization function');
assert(app.includes('state=loadState();\n    initAll();'),'state sync must reload durable state and rerender app-owned surfaces');
assert(app.includes('window.OkelloAppState=Object.freeze({'),'app state synchronization API is not exposed');
assert(app.includes('syncFromStorage,'),'app state API must expose syncFromStorage');
assert(app.includes('getState:()=>state'),'app state API must expose the current closure for verification');

const writeAt=runtime.indexOf('writeState(fresh);');
const syncAt=runtime.indexOf('OkelloAppState?.syncFromStorage?.()');
const refreshAt=runtime.indexOf('refreshVisibleToday();',writeAt);
assert(writeAt>=0&&syncAt>writeAt,'governed runtime must synchronize app state after the durable write');
assert(refreshAt>syncAt,'visible refresh must occur after the app closure has been synchronized');
assert(runtime.includes('appStateSynchronized:appSynced'),'commit trace must record whether app closure synchronization succeeded');

// The old shared writer still reloads. Do not remove that side effect until all
// legacy callers are migrated. Runtime ownership makes those three UI callers
// unreachable without changing the writer out from under any unseen consumer.
const callCount=(legacy.match(/logItems\(/g)||[]).length;
assert.equal(callCount,4,'expected one logItems definition plus exactly three legacy callers');
assert(legacy.includes('location.reload()'),'legacy writer reload should remain until its boundary is retired deliberately');

assert(guard.includes('[data-smartmeal],#plateAdd,#nlAdd'),'boot guard must cover all three legacy UI callers');
assert(guard.includes('stopImmediatePropagation'),'boot guard must stop legacy handlers during the script-loading gap');
assert(guard.includes('OkelloSmartMealRuntime'),'guard must release once governed runtime is ready');

console.log('smart-meal-runtime-v41: ownership and app-state synchronization checks passed');
