(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const WINDOW_DAYS=45;
  const $=id=>document.getElementById(id);
  const qs=(s,r=document)=>r.querySelector(s);
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const round=n=>Math.round(Number(n)||0);

  const todayPanel=$('tab-today');
  if(!todayPanel) return;

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }
  function totalCalories(entries){
    return (entries||[]).reduce((n,x)=>n+(Number(x?.kcal)||0),0);
  }
  function median(values){
    const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
    if(!a.length)return null;
    const m=Math.floor(a.length/2);
    return a.length%2?a[m]:(a[m-1]+a[m])/2;
  }
  function quantile(values,q){
    const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);
    if(!a.length)return null;
    const pos=(a.length-1)*q,lo=Math.floor(pos),hi=Math.ceil(pos);
    if(lo===hi)return a[lo];
    return a[lo]+(a[hi]-a[lo])*(pos-lo);
  }
  function minuteNow(){
    const d=new Date();
    return d.getHours()*60+d.getMinutes();
  }
  const mealMinute={Lunch:13*60,Dinner:19*60,Snack:21*60,Other:16*60};
  const coreMeals=['Lunch','Dinner','Snack'];
  function entryMinute(entry,dayKey){
    const ts=Number(entry?.ts)||0;
    if(ts>0){
      const d=new Date(ts);
      if(!Number.isNaN(d.getTime()) && d.toISOString().slice(0,10)===dayKey){
        return d.getHours()*60+d.getMinutes();
      }
    }
    return mealMinute[entry?.meal] ?? 18*60;
  }
  function pastDays(state,target){
    const cutoff=Date.now()-WINDOW_DAYS*24*60*60*1000;
    const today=todayKey();
    return Object.entries(state.logs||{}).map(([day,entries])=>{
      const d=new Date(day+'T12:00:00');
      const safeEntries=Array.isArray(entries)?entries:[];
      const total=totalCalories(safeEntries);
      return {day,entries:safeEntries,time:d.getTime(),total};
    }).filter(x=>x.day!==today && Number.isFinite(x.time) && x.time>=cutoff && x.entries.length && x.total>=Math.min(800,target*.35));
  }
  function mealState(entries,day,minute){
    const set=new Set();
    for(const e of entries||[]){
      if(coreMeals.includes(e?.meal) && entryMinute(e,day)<=minute) set.add(e.meal);
    }
    return set;
  }
  function sameMealProgress(a,b){
    return coreMeals.every(meal=>a.has(meal)===b.has(meal));
  }
  function historicalRemainingSamples(state,target,minute){
    const today=todayKey();
    const todays=state.logs?.[today]||[];
    // Everything in today's log has, by definition, been logged already.
    const currentProgress=new Set(todays.map(x=>x?.meal).filter(x=>coreMeals.includes(x)));
    return pastDays(state,target).filter(d=>sameMealProgress(mealState(d.entries,d.day,minute),currentProgress)).map(d=>({
      day:d.day,
      remaining:d.entries.reduce((n,e)=>n+(entryMinute(e,d.day)>minute?(Number(e?.kcal)||0):0),0),
      total:d.total
    }));
  }
  function mealFrequency(state,target){
    const days=pastDays(state,target);
    const out={Lunch:0,Dinner:0,Snack:0,Other:0};
    if(!days.length)return {days:0,frequency:out};
    for(const d of days){
      const seen=new Set(d.entries.map(x=>x?.meal).filter(Boolean));
      for(const meal of Object.keys(out)) if(seen.has(meal)) out[meal]++;
    }
    for(const meal of Object.keys(out)) out[meal]/=days.length;
    return {days:days.length,frequency:out};
  }
  function fallbackRemaining(state,target,minute){
    const todays=state.logs?.[todayKey()]||[];
    const loggedMeals=new Set(todays.map(x=>x?.meal).filter(Boolean));
    const {days,frequency}=mealFrequency(state,target);
    const shares={Lunch:.30,Dinner:.45,Snack:.15};
    // Keep an unlogged meal in the fallback until its normal window is plausibly over.
    const ends={Lunch:16*60,Dinner:22*60+30,Snack:23*60+59};
    let remaining=0;
    for(const meal of Object.keys(shares)){
      if(loggedMeals.has(meal)||minute>=ends[meal])continue;
      const commonEnough=days?frequency[meal]>=.30:meal==='Dinner';
      if(commonEnough)remaining+=target*shares[meal];
    }
    return remaining;
  }
  function confidenceLabel(n,learned){
    if(!learned)return 'Fallback';
    if(n>=10)return 'Strong habit signal';
    if(n>=5)return 'Learned habit';
    return 'Emerging habit';
  }
  function direction(projected,target){
    const diff=projected-target;
    if(Math.abs(diff)<=75)return 'roughly around your target';
    return diff>0?`about ${round(diff)} kcal above your target`:`about ${round(Math.abs(diff))} kcal below your target`;
  }
  function compute(){
    const state=readState();
    const target=Number(state.targets?.calories)||2300;
    const todayEntries=state.logs?.[todayKey()]||[];
    const logged=totalCalories(todayEntries);
    const minute=minuteNow();
    const samples=historicalRemainingSamples(state,target,minute);
    const learned=samples.length>=3;
    const remaining=learned?median(samples.map(x=>x.remaining)):fallbackRemaining(state,target,minute);
    const projected=logged+(Number(remaining)||0);
    const q25=learned&&samples.length>=5?quantile(samples.map(x=>x.remaining),.25):null;
    const q75=learned&&samples.length>=5?quantile(samples.map(x=>x.remaining),.75):null;
    return {
      logged,
      target,
      minute,
      sampleCount:samples.length,
      learned,
      usualRemaining:Number(remaining)||0,
      projected,
      projectedLow:q25==null?null:logged+q25,
      projectedHigh:q75==null?null:logged+q75,
      confidence:confidenceLabel(samples.length,learned),
      direction:direction(projected,target)
    };
  }

  const style=document.createElement('style');
  style.textContent=`
    .forecast-card{border:1px solid var(--rule);border-left:4px solid var(--gold);border-radius:18px;background:var(--white);padding:16px;margin:14px 0;box-shadow:var(--shadow)}
    .forecast-card h3{margin:0}.forecast-lede{margin:5px 0 0;color:var(--muted);font-size:.86rem}.forecast-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}.forecast-stat{background:var(--tint);border-radius:12px;padding:10px}.forecast-stat span{display:block;color:var(--muted);font-size:.68rem}.forecast-stat strong{display:block;margin-top:2px;color:var(--forest)}.forecast-main{margin-top:11px;padding:11px 12px;border-radius:12px;background:var(--tint);font-size:.88rem;line-height:1.45}.forecast-main strong{color:var(--forest)}.forecast-note{display:block;margin-top:7px;color:var(--muted);font-size:.74rem}.forecast-card[data-empty="1"] .forecast-grid{display:none}
    @media(max-width:700px){.forecast-grid{grid-template-columns:1fr 1fr}.forecast-grid .forecast-stat:last-child{grid-column:1/-1}}
  `;
  document.head.appendChild(style);

  const card=document.createElement('section');
  card.id='dayForecastCard';
  card.className='forecast-card';
  const progress=qs('.progress-wrap',todayPanel);
  if(progress)progress.insertAdjacentElement('afterend',card);else todayPanel.insertAdjacentElement('afterbegin',card);

  function render(){
    const f=compute();
    const hasToday=f.logged>0;
    card.dataset.empty=hasToday?'0':'1';
    if(!hasToday){
      card.innerHTML=`<p class="eyebrow">WHERE TODAY IS HEADING</p><h3>End-of-day forecast</h3><p class="forecast-lede">Start logging today and the app will project where the day is likely to finish from your recent eating pattern.</p><span class="forecast-note">Projection is habit, not advice. It never adds food to your allowance or tells you to eat up to the number.</span>`;
      return;
    }
    const time=new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit'}).format(new Date());
    const range=f.projectedLow!=null&&f.projectedHigh!=null?`${round(f.projectedLow).toLocaleString()}–${round(f.projectedHigh).toLocaleString()} kcal`:null;
    const source=f.learned?`${f.sampleCount} comparable logged days in the last ${WINDOW_DAYS} days`:'your current meal pattern fallback';
    card.innerHTML=`
      <p class="eyebrow">WHERE TODAY IS HEADING</p><h3>End-of-day forecast</h3><p class="forecast-lede">At ${time}, this projects habit rather than prescribing what you should eat.</p>
      <div class="forecast-grid">
        <div class="forecast-stat"><span>Logged so far</span><strong>${round(f.logged).toLocaleString()} kcal</strong></div>
        <div class="forecast-stat"><span>Usual remaining</span><strong>~${round(f.usualRemaining).toLocaleString()} kcal</strong></div>
        <div class="forecast-stat"><span>Projected finish</span><strong>~${round(f.projected).toLocaleString()} kcal</strong></div>
      </div>
      <div class="forecast-main"><strong>If today follows your recent pattern, you are heading to about ${round(f.projected).toLocaleString()} kcal</strong>, ${f.direction}.${range?` Recent middle range at this time: ${range}.`:''}</div>
      <span class="forecast-note">${f.confidence} · based on ${source}. Projection only. Your calorie target remains ${round(f.target).toLocaleString()} kcal.</span>`;
  }

  const log=$('todayLog');
  if(log)new MutationObserver(render).observe(log,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')render();});
  setInterval(render,5*60*1000);
  render();

  window.OkelloDayForecast=Object.freeze({version:1,compute});
})();