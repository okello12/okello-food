(() => {
  'use strict';

  const VERSION=1;
  const ACTIVITY_STORE='okello_activity_v1';
  const MAIN_STORE='okello_food_tracker_v3';
  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));

  function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw==null?fallback:JSON.parse(raw);}catch(_){return fallback;}}
  function userWeight(){
    const main=readJson(MAIN_STORE,{})||{};
    const rows=Array.isArray(main.weightLogs)?main.weightLogs:[];
    if(!rows.length)return null;
    const sorted=[...rows].sort((a,b)=>String(a?.date||'').localeCompare(String(b?.date||'')));
    const last=sorted[sorted.length-1]||{};
    const value=Number(last.kg??last.weight??last.value??last.weightKg);
    return value>30&&value<400?value:null;
  }

  // Preserve the existing activity module but sanitise every future persisted
  // activity write. Active-calorie estimates are only retained when a real
  // user weight exists in the main weight log. This prevents the legacy
  // internal 158 kg default from becoming user evidence.
  const previousSet=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(this===window.localStorage&&String(key)===ACTIVITY_STORE){
      try{
        const data=JSON.parse(String(value));
        if(data&&typeof data==='object'){
          const weight=userWeight();
          if(data.preferences&&typeof data.preferences==='object'){
            data.preferences.fallbackWeightKg=null;
            data.preferences.useLatestWeight=true;
          }
          if(Array.isArray(data.entries)){
            for(const entry of data.entries){
              if(!entry||typeof entry!=='object')continue;
              if(weight){
                if(entry.activeCalories!=null&&Number.isFinite(Number(entry.activeCalories))){
                  entry.weightKgUsed=weight;
                  entry.activeCaloriesQuality='estimated-from-user-weight';
                }
              }else if(!entry.weightKgUsed){
                entry.activeCalories=null;
                entry.activeCaloriesQuality='unavailable-no-user-weight';
              }
            }
          }
          value=JSON.stringify(data);
        }
      }catch(_){}
    }
    return previousSet.call(this,key,value);
  };

  function render(){
    const weight=userWeight();
    const kcal=$('actCalories');
    const preview=$('activityEstimate');
    const weightInput=$('activityWeightInput');
    const weightLabel=weightInput?.closest('label');
    const useLatest=$('useLatestWeightInput');
    if(useLatest)useLatest.checked=true;
    if(weightLabel)weightLabel.style.display='none';
    const activityTip=qs('.activity-tip');
    if(!weight){
      if(kcal)kcal.textContent='—';
      if(preview)preview.textContent='Active calories are not estimated until you have added your own weight. Time, distance and steps can still be logged.';
      if(activityTip&&!activityTip.dataset.v46){activityTip.dataset.v46='1';activityTip.textContent='Active-calorie estimates require a weight you entered yourself. The old 158 kg fallback is no longer used.';}
      qsa('.activity-entry small').forEach(node=>{node.textContent=node.textContent.replace(/\s·\s~?0\sactive kcal/i,' · active kcal unavailable').replace(/\s·\s~?[\d,.]+\sactive kcal/i,' · active kcal unavailable');});
      const strip=$('todayMoveSub');if(strip&&/active kcal/i.test(strip.textContent||''))strip.textContent='Movement is tracked separately from your food target. Active kcal needs your own weight.';
    }else{
      if(activityTip&&!activityTip.dataset.v46){activityTip.dataset.v46='1';activityTip.textContent=`Active calories are estimates using your latest recorded weight (${Math.round(weight*10)/10} kg) and do not increase your food allowance.`;}
    }
  }

  const root=$('tab-activity')||document.body;
  new MutationObserver(render).observe(root,{childList:true,subtree:true,characterData:true});
  window.addEventListener('okello:food-log-changed',render);
  setTimeout(render,0);setTimeout(render,700);

  window.OkelloActivitySafetyV46=Object.freeze({version:VERSION,userWeight,render});
})();