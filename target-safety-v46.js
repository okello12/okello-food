(() => {
  'use strict';

  const VERSION=1;
  const PROFILE_KEY='okello_first_run_v44';
  const MAIN_STORE='okello_food_tracker_v3';
  const repo=window.OkelloStateRepository;
  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  let observer=null;

  function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw==null?fallback:JSON.parse(raw);}catch(_){return fallback;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
  function profile(){const value=readJson(PROFILE_KEY,{});return value&&typeof value==='object'?value:{};}
  function saveProfile(p){return writeJson(PROFILE_KEY,p);}
  function state(){return repo?.read?.()||readJson(MAIN_STORE,{})||{};}
  function logCount(s=state()){return Object.values(s.logs||{}).reduce((n,rows)=>n+(Array.isArray(rows)?rows.length:0),0);}
  function existingUser(s=state()){
    return logCount(s)>0||(Array.isArray(s.recipes)&&s.recipes.length>0)||(Array.isArray(s.weightLogs)&&s.weightLogs.length>0)||(Array.isArray(s.mealTemplates)&&s.mealTemplates.length>0);
  }
  function mode(){return profile().targetMode||null;}
  function toast(message){const node=$('toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2000);}

  function setMode(targetMode,extra={}){
    const p={...profile(),targetMode,targetModeSetAt:new Date().toISOString(),targetModeVersion:VERSION,...extra};
    saveProfile(p);applyMode();
  }
  function setOwnTargets(calories,protein){
    const kcal=Number(calories),prot=Number(protein);
    if(!(kcal>=1200&&kcal<=6000&&prot>=20&&prot<=400))return false;
    const result=repo?.mutate?.(s=>{s.targets={...(s.targets||{}),calories:Math.round(kcal),protein:Math.round(prot)};return s;},{source:'target-confirmation-v46'});
    if(repo&&!result?.ok)return false;
    if(!repo){const s=state();s.targets={...(s.targets||{}),calories:Math.round(kcal),protein:Math.round(prot)};localStorage.setItem(MAIN_STORE,JSON.stringify(s));}
    setMode('own-targets',{customTargets:true});
    return true;
  }

  function ensureGate(){
    if(mode())return;
    const s=state();
    if(existingUser(s)){
      // Preserve existing users' already-established targets, but record the
      // migration decision explicitly rather than treating defaults as new-user advice.
      setMode('existing-confirmed',{customTargets:true,migratedExistingUser:true});
      return;
    }
    if($('v46TargetGate'))return;
    const gate=document.createElement('div');gate.id='v46TargetGate';
    gate.style.cssText='position:fixed;inset:0;z-index:4900;background:rgba(250,248,243,.98);display:grid;place-items:center;padding:22px';
    gate.innerHTML=`<section role="dialog" aria-modal="true" aria-labelledby="v46TargetTitle" style="width:min(540px,100%);background:#fff;border:1px solid #ddd6c7;border-radius:22px;padding:22px;box-shadow:0 22px 70px rgba(20,35,28,.18)"><p style="margin:0;color:#b8862b;font-weight:900;letter-spacing:.12em;font-size:.72rem">YOUR TARGETS</p><h2 id="v46TargetTitle" style="color:#1e4235;margin:.3rem 0 .5rem">How do you want to use the diary?</h2><p style="color:#5f6b62;line-height:1.5">Okello Food will not invent a calorie or protein target for a new user. You can simply track what you eat, or enter targets you already use.</p><button id="v46TrackOnly" type="button" style="width:100%;min-height:54px;border:0;border-radius:14px;background:#1e4235;color:#fff;font-weight:900">Track without targets</button><button id="v46OwnTargets" type="button" style="width:100%;min-height:50px;margin-top:8px;border:1px solid #1e4235;border-radius:14px;background:#fff;color:#1e4235;font-weight:900">I already know my targets</button><div id="v46TargetForm" hidden style="margin-top:14px;padding-top:14px;border-top:1px solid #ddd6c7"><label style="display:block;font-weight:800">Daily calories<input id="v46TargetCalories" type="number" min="1200" max="6000" inputmode="numeric" placeholder="e.g. 2200" style="box-sizing:border-box;width:100%;min-height:48px;margin-top:5px;border:1px solid #ddd6c7;border-radius:12px;padding:10px;font-size:16px"></label><label style="display:block;font-weight:800;margin-top:10px">Daily protein (g)<input id="v46TargetProtein" type="number" min="20" max="400" inputmode="numeric" placeholder="e.g. 100" style="box-sizing:border-box;width:100%;min-height:48px;margin-top:5px;border:1px solid #ddd6c7;border-radius:12px;padding:10px;font-size:16px"></label><p id="v46TargetError" style="color:#a63a20;font-size:.8rem"></p><button id="v46SaveOwnTargets" type="button" style="width:100%;min-height:50px;border:0;border-radius:14px;background:#1e4235;color:#fff;font-weight:900">Use these targets</button></div><p style="font-size:.78rem;color:#5f6b62;margin:12px 0 0">You can change this later in Settings. Target-based Smart Portion stays off unless you choose a target.</p></section>`;
    document.body.appendChild(gate);
    $('v46TrackOnly').addEventListener('click',()=>{setMode('tracking-only',{customTargets:false});gate.remove();});
    $('v46OwnTargets').addEventListener('click',()=>{$('v46TargetForm').hidden=false;$('v46OwnTargets').hidden=true;$('v46TargetCalories').focus();});
    $('v46SaveOwnTargets').addEventListener('click',()=>{if(setOwnTargets($('v46TargetCalories').value,$('v46TargetProtein').value)){gate.remove();location.reload();}else $('v46TargetError').textContent='Enter a calorie target from 1,200–6,000 and a protein target from 20–400 g.';});
  }

  function applyTrackingOnly(){
    document.documentElement.classList.add('v46-tracking-only');
    const cal=$('calRemainText');if(cal)cal.textContent='No calorie target set';
    const protein=$('proteinRemainText');if(protein)protein.textContent='No protein target set';
    const bar=qs('.progress-wrap');if(bar)bar.style.display='none';
    const smart=$('smartPortion');if(smart)smart.textContent='—';
    const note=$('smartPortionNote');if(note)note.textContent='Set your own targets to use Smart Portion.';
    if($('useSmartPortionBtn'))$('useSmartPortionBtn').disabled=true;
    const customSmart=$('customSmartPortion');if(customSmart)customSmart.textContent='—';
    const customNote=$('customSmartNote');if(customNote)customNote.textContent='Set your own targets to use Smart Portion.';
    const composer=$('smartMealType')?.closest('.smart-card');if(composer)composer.hidden=true;
    const ask=$('askBtn')?.closest('.smart-card');if(ask)ask.hidden=true;
    const forecast=$('dayForecastCard');if(forecast)forecast.hidden=true;
    document.querySelectorAll('.smart-line').forEach(el=>{el.textContent='Choose the amount that matches what you ate.';});
    document.querySelectorAll('[data-log-food]').forEach(btn=>{if(/^Use\s/i.test(btn.textContent||''))btn.textContent='Choose on Today';});
    qs('.v44-default-note')?.remove();
  }
  function applyTargeted(){
    document.documentElement.classList.remove('v46-tracking-only');
    const bar=qs('.progress-wrap');if(bar)bar.style.display='';
    const composer=$('smartMealType')?.closest('.smart-card');if(composer)composer.hidden=false;
    const ask=$('askBtn')?.closest('.smart-card');if(ask)ask.hidden=false;
    const forecast=$('dayForecastCard');if(forecast)forecast.hidden=false;
  }
  function applyMode(){
    if(mode()==='tracking-only')applyTrackingOnly();else if(mode())applyTargeted();
  }

  document.addEventListener('click',event=>{
    const save=event.target?.closest?.('#saveTargetsBtn');if(!save)return;
    const kcal=Number($('targetCalories')?.value),prot=Number($('targetProtein')?.value);
    if(kcal>=1200&&kcal<=6000&&prot>=20&&prot<=400){setTimeout(()=>{setMode('own-targets',{customTargets:true});toast('Your own targets are now confirmed');},0);}
  },true);

  const style=document.createElement('style');style.textContent='.v46-tracking-only .smart-box{opacity:.72}.v46-tracking-only #calorieBar{width:0!important}';document.head.appendChild(style);
  ensureGate();applyMode();
  observer=new MutationObserver(()=>applyMode());observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{applyMode();},800);

  window.OkelloTargetSafetyV46=Object.freeze({version:VERSION,mode,setMode,setOwnTargets,apply:applyMode});
})();