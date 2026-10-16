(() => {
  'use strict';

  // Reflection: the "so what" layer. Reads the last 14 days of logs and says
  // things only this app can know, because only this app records them:
  // which foods repeat, what usually sits on the plate with what, which
  // meal slot carries the day, how much of the week was weighed versus
  // estimated, and how portions move across the week.
  //
  // Rules, in order of importance:
  //  1. Every sentence is derived from logged entries. Nothing is inferred
  //     from targets, defaults, or what the app would recommend.
  //  2. Every sentence carries its evidence count ("5 of 9 dinners"), so the
  //     reader can judge it. Below the threshold, the sentence is not shown.
  //  3. Observations describe the food and the pattern, never the person.
  //     No instructions, no praise, no verdicts. Principle 8.
  //  4. Silence is a valid output. Fewer than three logged days shows one
  //     line saying so, and nothing else.

  const $=id=>document.getElementById(id);
  const MAIN_STORE='okello_food_tracker_v3';
  const DAYS=14;
  const MIN_DAYS=3;
  const MIN_REPEAT=3;

  function readState(){
    try{return window.OkelloStateRepository?.read?.()||JSON.parse(localStorage.getItem(MAIN_STORE)||'{}')||{};}
    catch(_){return {};}
  }
  function dayKey(d){return d.toISOString().slice(0,10);}
  function recentDays(n){const out=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);out.push(dayKey(d));}return out;}
  function esc(s){return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}
  function pct(n,d){return d>0?Math.round(n/d*100):0;}
  function median(xs){const a=xs.slice().sort((p,q)=>p-q);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  function shortName(name){return String(name||'').split(',')[0].split(' / ')[0].trim();}

  // ---- gather --------------------------------------------------------------
  function gather(){
    const s=readState();
    const logs=s.logs||{};
    const days=recentDays(DAYS).map(k=>({key:k,entries:(logs[k]||[]).filter(e=>e&&Number(e.kcal)>=0)})).filter(d=>d.entries.length);
    const entries=days.flatMap(d=>d.entries.map(e=>({...e,day:d.key})));
    return {days,entries};
  }

  // ---- observations ----------------------------------------------------------
  // Each returns {text, evidence} or null.

  function repeatFoods({entries,days}){
    const byFood={};
    for(const e of entries){const k=String(e.foodId||e.name);(byFood[k]=byFood[k]||{name:e.name,days:new Set(),grams:[]});byFood[k].days.add(e.day);if(Number(e.grams)>0)byFood[k].grams.push(Number(e.grams));}
    const rows=Object.values(byFood).map(f=>({name:shortName(f.name),count:f.days.size,median:median(f.grams)})).filter(f=>f.count>=MIN_REPEAT).sort((a,b)=>b.count-a.count).slice(0,3);
    if(!rows.length)return null;
    const parts=rows.map(f=>`${f.name} on ${f.count} of ${days.length} days`);
    return {text:`Most often logged: ${parts.join(', ')}.`,evidence:`${days.length} logged days`};
  }

  function plateCompanions({entries}){
    const plates={};
    for(const e of entries){if(!e.plateId)continue;(plates[e.plateId]=plates[e.plateId]||[]).push(e);}
    const pairs={};
    for(const items of Object.values(plates)){
      if(items.length<2)continue;
      // base = the highest-kcal starch/soup on the plate, if any; else the largest entry
      const base=items.slice().sort((a,b)=>Number(b.kcal)-Number(a.kcal))[0];
      for(const other of items){if(other===base)continue;const k=`${shortName(base.name)}|${shortName(other.name)}`;pairs[k]=(pairs[k]||0)+1;}
    }
    const top=Object.entries(pairs).filter(([,n])=>n>=MIN_REPEAT).sort((a,b)=>b[1]-a[1]);
    if(!top.length)return null;
    const grouped={};
    for(const [k,n] of top){const [base,other]=k.split('|');(grouped[base]=grouped[base]||[]).push(`${other} (${n})`);}
    const [base,others]=Object.entries(grouped)[0];
    return {text:`${base} usually comes with ${others.slice(0,3).join(', ')}.`,evidence:`from plates logged together`};
  }

  function mealSlots({entries,days}){
    const byMeal={};
    for(const e of entries){const m=e.meal||'Other';(byMeal[m]=byMeal[m]||{kcal:0,days:new Set()});byMeal[m].kcal+=Number(e.kcal)||0;byMeal[m].days.add(e.day);}
    const total=Object.values(byMeal).reduce((a,m)=>a+m.kcal,0);
    if(total<=0||days.length<MIN_DAYS)return null;
    const rows=Object.entries(byMeal).map(([m,v])=>({meal:m,share:pct(v.kcal,total),days:v.days.size})).sort((a,b)=>b.share-a.share);
    const lead=rows[0];
    if(lead.share<40)return null;
    const sparse=['Lunch','Dinner'].filter(m=>m!==lead.meal&&(!byMeal[m]||byMeal[m].days.size<days.length/2));
    let text=`${lead.meal} carries about ${lead.share}% of logged calories.`;
    // Stated as a count, not as "skipped": the log cannot tell an unlogged meal from an uneaten one.
    for(const m of sparse)text+=` ${m} appears on ${byMeal[m]?byMeal[m].days.size:0} of ${days.length} days.`;
    return {text,evidence:`${days.length} days`};
  }

  function measurementMix({entries}){
    let weighedKcal=0,calibratedKcal=0,referenceKcal=0,roughKcal=0,total=0;
    for(const e of entries){
      const k=Number(e.kcal)||0;total+=k;
      if(e.amountQuality==='weighed')weighedKcal+=k;
      else if(e.estimateSource==='personal-piece-weight')calibratedKcal+=k;
      else if(e.estimateSource==='reference-piece-weight'||e.pieceKey)referenceKcal+=k;
      else roughKcal+=k;
    }
    if(total<=0)return null;
    const w=pct(weighedKcal,total),c=pct(calibratedKcal,total),r=pct(referenceKcal,total),g=pct(roughKcal,total);
    const parts=[];
    if(w)parts.push(`${w}% weighed`);
    if(c)parts.push(`${c}% from your own piece weights`);
    if(r)parts.push(`${r}% from standard piece sizes`);
    if(g)parts.push(`${g}% rough estimates`);
    let text=`Of this fortnight's calories, ${parts.join(', ')}.`;
    if(r>=30&&c===0)text+=' Weighing one piece of your usual meat a few times would let the app use your own sizes instead.';
    return {text,evidence:`${entries.length} entries`};
  }

  function portionDrift({entries}){
    // For the single most-repeated food, compare weekday vs weekend median grams.
    const byFood={};
    for(const e of entries){if(!(Number(e.grams)>0))continue;const k=String(e.foodId||e.name);(byFood[k]=byFood[k]||{name:e.name,wk:[],we:[]});const dow=new Date(e.day+'T12:00:00').getDay();(dow===0||dow===6?byFood[k].we:byFood[k].wk).push(Number(e.grams));}
    const cand=Object.values(byFood).filter(f=>f.wk.length>=2&&f.we.length>=2).sort((a,b)=>(b.wk.length+b.we.length)-(a.wk.length+a.we.length))[0];
    if(!cand)return null;
    const mw=median(cand.wk),me=median(cand.we);
    if(!mw||!me)return null;
    const diff=pct(me-mw,mw);
    if(Math.abs(diff)<15)return null;
    return {text:`${shortName(cand.name)} portions run about ${Math.abs(diff)}% ${diff>0?'larger':'smaller'} at the weekend (median ${Math.round(me)} g vs ${Math.round(mw)} g).`,evidence:`${cand.wk.length} weekday, ${cand.we.length} weekend logs`};
  }

  function saltCoverage({entries}){
    let known=0,total=0;
    for(const e of entries){const k=Number(e.kcal)||0;total+=k;if(e.salt!==null&&e.salt!==undefined&&Number.isFinite(Number(e.salt)))known+=k;}
    if(total<=0)return null;
    const p=pct(known,total);
    if(p>=90)return null;
    return {text:p===0?'None of this fortnight\'s foods carried a salt value yet, so salt cannot be summed.':`Salt is known for only ${p}% of logged calories. Packaged foods and your own recipes carry it; most catalogue dishes do not yet.`,evidence:'data coverage'};
  }

  // ---- render ---------------------------------------------------------------
  function build(){
    const g=gather();
    if(g.days.length<MIN_DAYS){
      return {ready:false,text:g.days.length===0?'Nothing logged in the last two weeks.':`${g.days.length} day${g.days.length===1?'':'s'} logged in the last two weeks. Reflections start at ${MIN_DAYS}.`};
    }
    const obs=[repeatFoods,plateCompanions,mealSlots,portionDrift,measurementMix,saltCoverage].map(f=>{try{return f(g);}catch(_){return null;}}).filter(Boolean);
    return {ready:true,days:g.days.length,entries:g.entries.length,observations:obs};
  }

  function render(){
    const host=$('tab-history');if(!host)return;
    let card=$('reflectionCard');
    if(!card){card=document.createElement('section');card.id='reflectionCard';card.className='card';const first=host.querySelector('.section-heading');if(first)first.insertAdjacentElement('afterend',card);else host.prepend(card);}
    const r=build();
    if(!r.ready){card.innerHTML=`<p class="eyebrow">LAST TWO WEEKS</p><h3>What your log says</h3><p class="muted">${esc(r.text)}</p>`;return;}
    const items=r.observations.map(o=>`<li><span>${esc(o.text)}</span><small class="tiny-note">${esc(o.evidence)}</small></li>`).join('');
    card.innerHTML=`<p class="eyebrow">LAST TWO WEEKS</p><h3>What your log says</h3><p class="muted">${r.days} days, ${r.entries} entries. Patterns from what you logged, not advice.</p>${items?`<ul class="reflection-list">${items}</ul>`:'<p class="muted">No repeating patterns yet. A few more days usually surfaces some.</p>'}`;
  }

  const css=document.createElement('style');
  css.textContent=`.reflection-list{list-style:none;margin:12px 0 0;padding:0}.reflection-list li{padding:10px 0;border-top:1px solid var(--rule,#e4decf);line-height:1.5}.reflection-list li:first-child{border-top:0;padding-top:0}.reflection-list li small{display:block;margin-top:3px}`;
  document.head.appendChild(css);

  render();
  document.addEventListener('click',e=>{if(e.target.closest?.('.tab[data-tab="history"]'))setTimeout(render,0);});
  window.addEventListener('okello:state-written',()=>setTimeout(render,0));

  window.OkelloReflection=Object.freeze({version:1,build,render});
})();
