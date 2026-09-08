(() => {
  'use strict';

  const VERSION=1;
  const MAIN_STORE='okello_food_tracker_v3';
  const REVISION_FIELD='_stateRevision';
  const UPDATED_FIELD='_stateUpdatedAt';
  const SOURCE_FIELD='_stateWriteSource';
  const nativeGet=Storage.prototype.getItem;
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  const beforeWrite=[];
  let bypass=false;

  function clone(value){
    return value&&typeof value==='object'?JSON.parse(JSON.stringify(value)):value;
  }
  function parse(raw){
    if(raw==null)return null;
    try{
      const value=JSON.parse(String(raw));
      return value&&typeof value==='object'&&!Array.isArray(value)?value:null;
    }catch(_){return null;}
  }
  function revisionOf(state){
    const n=Number(state?.[REVISION_FIELD]);
    return Number.isInteger(n)&&n>=0?n:0;
  }
  function currentRaw(){return nativeGet.call(localStorage,MAIN_STORE);}
  function current(){return parse(currentRaw())||{};}
  function event(name,detail){
    try{window.dispatchEvent(new CustomEvent(name,{detail}));}catch(_){}
  }
  function applyMiddleware(next,context){
    let value=next;
    for(const fn of beforeWrite){
      try{
        const out=fn({next:clone(value),current:clone(context.current),source:context.source,revision:context.revision});
        if(out&&typeof out==='object'&&!Array.isArray(out))value=out;
      }catch(err){
        console.error('Okello state write middleware failed',err);
        throw err;
      }
    }
    return value;
  }
  function nativeWrite(state){
    bypass=true;
    try{nativeSet.call(localStorage,MAIN_STORE,JSON.stringify(state));}
    finally{bypass=false;}
  }
  function commitObject(input,{source='unknown',expectedRevision=null,force=false}={}){
    if(!input||typeof input!=='object'||Array.isArray(input))return {ok:false,reason:'invalid-state',source};
    const live=current();
    const liveRevision=revisionOf(live);
    const incomingRevision=revisionOf(input);

    if(!force){
      if(expectedRevision!=null&&Number(expectedRevision)!==liveRevision){
        const result={ok:false,reason:'revision-conflict',expectedRevision:Number(expectedRevision),actualRevision:liveRevision,source};
        event('okello:state-write-conflict',result);
        console.warn('Okello rejected stale state write',result);
        return result;
      }
      // Once revisioning is established, a state object read before another
      // successful write carries the older revision and must not overwrite it.
      if(liveRevision>0&&incomingRevision>0&&incomingRevision<liveRevision){
        const result={ok:false,reason:'stale-state',incomingRevision,actualRevision:liveRevision,source};
        event('okello:state-write-conflict',result);
        console.warn('Okello rejected stale state write',result);
        return result;
      }
    }

    const next=clone(input);
    const revision=liveRevision+1;
    next[REVISION_FIELD]=revision;
    next[UPDATED_FIELD]=new Date().toISOString();
    next[SOURCE_FIELD]=String(source||'unknown');
    let prepared;
    try{prepared=applyMiddleware(next,{current:live,source,revision});}
    catch(_){
      const result={ok:false,reason:'middleware-failed',source};
      event('okello:state-write-failed',result);
      return result;
    }
    prepared[REVISION_FIELD]=revision;
    prepared[UPDATED_FIELD]=next[UPDATED_FIELD];
    prepared[SOURCE_FIELD]=next[SOURCE_FIELD];

    try{
      nativeWrite(prepared);
      const check=parse(currentRaw());
      if(!check||revisionOf(check)!==revision)throw new Error('verify-failed');
    }catch(err){
      const result={ok:false,reason:err?.name==='QuotaExceededError'?'quota':'write-failed',source,error:String(err?.message||err)};
      event('okello:state-write-failed',result);
      return result;
    }

    const result={ok:true,revision,state:clone(prepared),source};
    event('okello:state-written',{revision,source});
    return result;
  }
  function writeSerialized(raw,source='legacy-direct'){
    const incoming=parse(raw);
    if(!incoming){
      const result={ok:false,reason:'invalid-json',source};
      event('okello:state-write-failed',result);
      return result;
    }
    return commitObject(incoming,{source});
  }
  function mutate(mutator,{source='repository-mutate'}={}){
    if(typeof mutator!=='function')return {ok:false,reason:'invalid-mutator',source};
    const live=current();
    const expected=revisionOf(live);
    const draft=clone(live);
    const returned=mutator(draft);
    const next=returned&&typeof returned==='object'&&!Array.isArray(returned)?returned:draft;
    return commitObject(next,{source,expectedRevision:expected});
  }
  function replace(next,{source='repository-replace'}={}){
    return commitObject(next,{source,force:true});
  }
  function registerBeforeWrite(fn){
    if(typeof fn!=='function')return ()=>{};
    beforeWrite.push(fn);
    return ()=>{const i=beforeWrite.indexOf(fn);if(i>=0)beforeWrite.splice(i,1);};
  }
  function remove(){
    bypass=true;
    try{nativeRemove.call(localStorage,MAIN_STORE);}
    finally{bypass=false;}
    event('okello:state-removed',{});
  }
  function rejectionError(result){
    const err=new Error(`Okello state write rejected: ${result?.reason||'unknown'}`);
    err.name=result?.reason==='quota'?'QuotaExceededError':'InvalidStateError';
    err.okelloWriteResult=result||{ok:false,reason:'unknown'};
    return err;
  }

  // Establish a revision before later runtime modules take their first state
  // snapshot. This makes stale snapshots detectable without changing the
  // existing storage key or the shape of user-owned records.
  const initial=parse(currentRaw());
  if(initial&&revisionOf(initial)===0){
    initial[REVISION_FIELD]=1;
    initial[UPDATED_FIELD]=new Date().toISOString();
    initial[SOURCE_FIELD]='v46-revision-bootstrap';
    try{nativeWrite(initial);}catch(err){console.warn('Could not initialise state revision',err);}
  }

  // Compatibility gateway for older modules. Their direct writes now pass
  // through revision checks instead of replacing the durable state blindly.
  // A rejected write deliberately throws, matching native storage failure
  // semantics, so legacy callers cannot continue into a false-success UI.
  Storage.prototype.setItem=function(key,value){
    if(!bypass&&this===window.localStorage&&String(key)===MAIN_STORE){
      const result=writeSerialized(value,'legacy-direct');
      if(!result?.ok)throw rejectionError(result);
      return;
    }
    return nativeSet.call(this,key,value);
  };

  window.OkelloStateRepository=Object.freeze({
    version:VERSION,
    storeKey:MAIN_STORE,
    revisionField:REVISION_FIELD,
    read:()=>clone(current()),
    revision:()=>revisionOf(current()),
    mutate,
    replace,
    remove,
    registerBeforeWrite,
    nativeGet:(key)=>nativeGet.call(localStorage,key),
    nativeSet:(key,value)=>nativeSet.call(localStorage,key,value),
    diagnostics:()=>({revision:revisionOf(current()),middlewareCount:beforeWrite.length})
  });
})();