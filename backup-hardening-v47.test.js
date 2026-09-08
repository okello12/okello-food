'use strict';

const fs=require('fs');
const vm=require('vm');
const assert=require('assert');

const source=fs.readFileSync(require('path').join(__dirname,'backup-v3.js'),'utf8');
const MAIN='okello_food_tracker_v3';
const FAV='okello_food_favourites_v1';
const ACT='okello_activity_v1';

function boot({initial={},onSet=null}={}){
  const map=new Map(Object.entries(initial));
  const storage={
    getItem:key=>map.has(String(key))?map.get(String(key)):null,
    setItem(key,value){
      key=String(key);value=String(value);
      if(onSet)onSet({key,value,map});
      map.set(key,value);
    },
    removeItem:key=>map.delete(String(key)),
    key(index){return Array.from(map.keys())[index]??null;},
    get length(){return map.size;}
  };
  const repo={
    nativeGet:key=>storage.getItem(key),
    replace(value){storage.setItem(MAIN,JSON.stringify(value));return {ok:true,state:value};}
  };
  const document={getElementById:()=>null,addEventListener:()=>{},body:{appendChild:()=>{}}};
  const window={OkelloStateRepository:repo,confirm:()=>true,alert:()=>{},addEventListener:()=>{}};
  const context={window,document,localStorage:storage,sessionStorage:{setItem:()=>{}},console,crypto:{subtle:{}},Blob:function(){},URL:{createObjectURL:()=>'',revokeObjectURL:()=>{}},TextEncoder,TextDecoder,Intl,setTimeout:()=>{},clearTimeout:()=>{}};
  vm.createContext(context);vm.runInContext(source,context,{filename:'backup-v3.js'});
  return {backup:context.window.OkelloBackup,storage,map};
}

{
  const oldMain=JSON.stringify({logs:{old:[{id:'old'}]}});
  const {backup,storage}=boot({
    initial:{[MAIN]:oldMain},
    onSet({key}){
      if(key.startsWith('okello_restore_stage_v3__')){
        const err=new Error('quota exceeded');err.name='QuotaExceededError';throw err;
      }
    }
  });
  let caught=null;
  try{backup.restore({format:'okello-backup-v3',version:3,state:{logs:{next:[]}}});}catch(err){caught=err;}
  assert.ok(caught,'quota failure should reject restore');
  assert.equal(caught.code,'restore-quota','quota failure should have explicit restore-quota code');
  assert.equal(storage.getItem(MAIN),oldMain,'quota failure during staging must not replace current main state');
  assert.match(backup.failureMessage(caught),/enough free storage/i,'quota failure message should explain storage exhaustion');
}

{
  const oldMain=JSON.stringify({logs:{old:[{id:'old'}]}});
  const oldFav=JSON.stringify(['old']);
  const oldAct=JSON.stringify({minutes:10});
  let activityFailed=false;
  const {backup,storage}=boot({
    initial:{[MAIN]:oldMain,[FAV]:oldFav,[ACT]:oldAct},
    onSet({key,value}){
      if(key===ACT&&value===JSON.stringify({minutes:99})){
        activityFailed=true;
        throw new Error('simulated activity commit failure');
      }
      if(activityFailed&&key===FAV&&value===oldFav){
        throw new Error('simulated favourites rollback failure');
      }
    }
  });
  let caught=null;
  try{
    backup.restore({
      format:'okello-backup-v3',version:3,
      state:{logs:{new:[{id:'new'}]}},
      favourites:['new'],
      activity:{minutes:99}
    });
  }catch(err){caught=err;}
  assert.ok(caught,'partial rollback should reject restore');
  assert.equal(caught.code,'restore-rollback-partial','partial rollback should be surfaced explicitly');
  assert.ok(Array.isArray(caught.rollbackFailures)&&caught.rollbackFailures.some(x=>x.key===FAV),'rollback failure should name the store that could not be restored');
  assert.match(backup.failureMessage(caught),/mixed state/i,'user-facing failure should warn about mixed state');
  assert.equal(storage.getItem(MAIN),oldMain,'main store should still roll back through repository');
  assert.equal(storage.getItem(FAV),JSON.stringify(['new']),'test should leave the failed rollback store in the new state to prove mixed-state detection');
}

console.log('backup-hardening-v47: PASS');
