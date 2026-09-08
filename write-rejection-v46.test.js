'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const repoSrc=fs.readFileSync('state-repository-v46.js','utf8');
const trustSrc=fs.readFileSync('trust-v46.js','utf8');
const bmmSrc=fs.readFileSync('build-my-meal-v46.js','utf8');
const countSrc=fs.readFileSync('countable-servings-v46.js','utf8');
new Function(repoSrc);new Function(trustSrc);new Function(bmmSrc);new Function(countSrc);

class FakeStorage{
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(String(key))?this.map.get(String(key)):null;}
  setItem(key,value){this.map.set(String(key),String(value));}
  removeItem(key){this.map.delete(String(key));}
  key(index){return Array.from(this.map.keys())[index]??null;}
  get length(){return this.map.size;}
}
class FakeCustomEvent{
  constructor(type,{detail}={}){this.type=type;this.detail=detail;}
}

const localStorage=new FakeStorage();
localStorage.setItem('okello_food_tracker_v3',JSON.stringify({_stateRevision:1,logs:{},customFoods:[],recipes:[]}));
const events=[];
const window={localStorage,dispatchEvent:event=>{events.push(event);},addEventListener:()=>{}};
const context={
  window,
  localStorage,
  Storage:FakeStorage,
  CustomEvent:FakeCustomEvent,
  console:{warn:()=>{},error:()=>{}},
  Date,
  JSON,
  Object,
  Array,
  Number,
  String,
  Math
};
vm.createContext(context);
vm.runInContext(repoSrc,context);

const repo=context.window.OkelloStateRepository;
assert.ok(repo,'state repository did not initialise');
const stale=repo.read();
const committed=repo.mutate(state=>{state.logs['2026-09-08']=[{id:'durable'}];return state;},{source:'test-fresh-write'});
assert.equal(committed.ok,true,'fresh repository write should succeed');
assert.equal(committed.revision,2);

let thrown=null;
try{
  localStorage.setItem('okello_food_tracker_v3',JSON.stringify(stale));
}catch(err){thrown=err;}
assert.ok(thrown,'a rejected legacy direct write must throw instead of pretending setItem succeeded');
assert.equal(thrown.name,'InvalidStateError');
assert.equal(thrown.okelloWriteResult?.reason,'stale-state');
assert.equal(thrown.okelloWriteResult?.source,'legacy-direct');
assert.ok(events.some(event=>event.type==='okello:state-write-conflict'&&event.detail?.source==='legacy-direct'),'conflict event must be emitted for user-facing handling');
const durable=repo.read();
assert.equal(durable._stateRevision,2,'rejected write must not advance durable revision');
assert.deepEqual(JSON.parse(JSON.stringify(durable.logs['2026-09-08'])),[{id:'durable'}],'rejected write must leave durable diary unchanged');

for(const required of [
  "window.addEventListener('okello:state-write-conflict',handleWriteFailure)",
  "window.addEventListener('okello:state-write-failed',handleWriteFailure)",
  "That change was not saved because browser storage is full.",
  "That change was not saved because your diary changed at the same time.",
  "if(detail.source==='legacy-direct')",
  "setTimeout(()=>location.reload(),1200)"
]) assert.ok(trustSrc.includes(required),`trust layer missing visible write-failure behaviour: ${required}`);

assert.ok(bmmSrc.includes("if(!result?.ok){toast('Meal was not saved. Your existing diary was kept.');return;}"),'Build My Meal must present its governed write rejection');
assert.ok(countSrc.includes("{source:'countable-serving-v46'}"),'countable Quick Add must identify its repository write source so the trust layer can surface rejection');
assert.ok(repoSrc.includes("if(!result?.ok)throw rejectionError(result)"),'legacy storage gateway must stop false-success continuation');

console.log('write-rejection-v46: PASS');
