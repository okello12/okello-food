'use strict';

// v49: app.js writes through OkelloStateRepository explicitly (DD-F11).
// Before v49 the only reason app.js writes were revisioned was that
// state-repository-v46 monkey-patched Storage.prototype.setItem. This test
// proves the explicit path: saveState() calls repo.mutate with a named
// source, a stale in-memory state cannot overwrite a newer committed
// revision, and a rejected save does not leave the in-memory state
// pretending it was persisted.

const fs=require('fs');
const assert=require('assert');

const src=fs.readFileSync('app.js','utf8');

// ---- static: no raw writes, every caller checks the result -------------
const saveFn=src.slice(src.indexOf('function saveState('),src.indexOf('function allFoods('));
assert.ok(saveFn.includes('repo.mutate('),'saveState must commit via OkelloStateRepository.mutate');
assert.ok(saveFn.includes("source:`app.${source}`"),'saveState must name its source for the audit trail');
assert.ok(saveFn.includes('state=loadState()'),'saveState must refresh in-memory state from the committed copy');
assert.ok(/for\(const k of \['targets','logs','customFoods','recipes','weightLogs','mealTemplates'\]\)/.test(saveFn),'saveState must copy only the fields app.js owns onto the live draft');

const rawWrites=(src.match(/localStorage\.setItem\(STORAGE_KEY/g)||[]).length;
assert.equal(rawWrites,1,`app.js must have exactly one raw write (the no-repository fallback), found ${rawWrites}`);

const bareCalls=(src.match(/(?<!function )saveState\(\)/g)||[]).length;
assert.equal(bareCalls,0,`found ${bareCalls} saveState() calls that ignore the result`);
for(const site of ['addToToday','removeEntry','saveCustomFood','saveRecipe','deleteRecipe','saveTargets','importBackup','clearToday']){
  assert.ok(src.includes(`saveState('${site}')`),`writer ${site} must call saveState with its source name`);
}

// ---- behavioural: stale state cannot clobber a newer revision -----------
// Build the smallest harness that lets saveState run: a repository with
// mutate/revision semantics, a localStorage, and the handful of globals
// app.js's saveState touches.
const store={};
const localStorage={
  getItem:k=>Object.prototype.hasOwnProperty.call(store,k)?store[k]:null,
  setItem:(k,v)=>{store[k]=String(v);},
  removeItem:k=>{delete store[k];}
};
const KEY='okello_food_tracker_v3';
const REV='stateRevision';
let toasts=[];
function current(){try{return JSON.parse(localStorage.getItem(KEY)||'{}');}catch(_){return {};}}
const repo={
  mutate(mutator,{source}={}){
    const live=current();
    const expected=Number(live[REV])||0;
    const draft=JSON.parse(JSON.stringify(live));
    const next=mutator(draft)||draft;
    // simulate stale detection: if the mutator's draft carries an older revision than live, reject
    const liveNow=current();
    if((Number(liveNow[REV])||0)!==expected)return {ok:false,reason:'revision-conflict',source};
    next[REV]=expected+1;
    localStorage.setItem(KEY,JSON.stringify(next));
    return {ok:true,revision:next[REV],source};
  }
};

// Extract saveState and loadState from app.js and evaluate them in a scope
// with the globals they need.
const loadFn=src.slice(src.indexOf('function loadState('),src.indexOf('function saveState('));
const defaultStateLine=src.match(/const defaultState = \{[^\n]*\};/)[0];
const harness=`
  const STORAGE_KEY='${KEY}';
  ${defaultStateLine}
  const structuredClone=v=>JSON.parse(JSON.stringify(v));
  let state;
  const showToast=m=>toasts.push(m);
  ${loadFn}
  ${saveFn}
  return {get state(){return state;},set state(v){state=v;},saveState,loadState};
`;
const api=new Function('window','localStorage','toasts',harness)({OkelloStateRepository:repo},localStorage,toasts);

// Seed revision 0 with one log.
localStorage.setItem(KEY,JSON.stringify({targets:{calories:2000,protein:120},logs:{'2026-10-16':[{id:'a',kcal:100,protein:5,fibre:1}]},customFoods:[],recipes:[],[REV]:0}));
api.state=api.loadState();

// Normal save: adds a log, commits, state refreshed with new revision.
api.state.logs['2026-10-16'].push({id:'b',kcal:200,protein:10,fibre:2});
let r=api.saveState('addToToday');
assert.equal(r.ok,true,'normal save must succeed');
assert.equal(current()[REV],1,'revision must advance');
assert.equal(api.state[REV],1,'in-memory state must be refreshed with the committed revision');
assert.equal(current().logs['2026-10-16'].length,2,'log written');

// Another module writes revision 2 while app.js holds a stale copy.
const stale=JSON.parse(JSON.stringify(api.state));           // app's view at rev 1
const other=current(); other.pieceCalibration=[{foodId:'goat',g:56}]; other[REV]=2;
localStorage.setItem(KEY,JSON.stringify(other));

// app.js tries to save from its stale copy. mutate() reads live (rev 2),
// applies only app-owned fields, so pieceCalibration must survive.
api.state=stale;
api.state.targets={calories:2100,protein:130};
r=api.saveState('saveTargets');
assert.equal(r.ok,true,'save from stale copy still commits because mutate applies onto live');
const after=current();
assert.equal(after[REV],3,'revision advances from the live revision, not the stale one');
assert.deepEqual(after.pieceCalibration,[{foodId:'goat',g:56}],'a field app.js does not own must survive an app.js save');
assert.equal(after.targets.calories,2100,'app-owned change is applied');
assert.equal(api.state[REV],3,'in-memory state refreshed to the committed revision');

// Rejection path: the repository refuses; state must be reloaded, toast shown.
const rejecting={mutate:()=>({ok:false,reason:'stale-state'})};
const api2=new Function('window','localStorage','toasts',harness)({OkelloStateRepository:rejecting},localStorage,toasts);
api2.state=api2.loadState();
api2.state.logs['2026-10-16'].push({id:'ghost',kcal:999,protein:0,fibre:0});
r=api2.saveState('addToToday');
assert.equal(r.ok,false,'rejected save reports failure');
assert.equal(api2.state.logs['2026-10-16'].some(e=>e.id==='ghost'),false,'in-memory state must be reloaded from durable copy after rejection, dropping the unsaved entry');
assert.ok(toasts.some(t=>/changed elsewhere|not saved/.test(t)),'user must be told');
assert.equal(current().logs['2026-10-16'].some(e=>e.id==='ghost'),false,'durable copy untouched by the rejected save');

console.log('app-repository-writes-v49: PASS');
