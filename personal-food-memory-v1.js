(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const SAT_STORE='okello_satiety_v1';
  const FAV_STORE='okello_food_favourites_v1';
  const upstream=window.OkelloFoodCatalog;
  if(!upstream) return;

  const $=id=>document.getElementById(id);
  const clone=v=>v&&typeof v==='object'?{...v}:v;
  const round1=n=>Math.round((Number(n)||0)*10)/10;
  const now=()=>Date.now();

  function readJson(key,fallback){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v??fallback;}catch(_){return fallback;}}
  function state(){const s=readJson(STORE,{})||{};s.logs=s.logs||{};s.customFoods=Array.isArray(s.customFoods)?s.customFoods:[];return s;}
  function satiety(){return readJson(SAT_STORE,{})||{};}
  function favourites(){const x=readJson(FAV_STORE,[]);return new Set(Array.isArray(x)?x.map(String):[]);}
  function median(values){const a=values.map(Number).filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;}
  function mode(values){const c={};for(const v of values.filter(Boolean))c[v]=(c[v]||0)+1;return Object.entries(c).sort((a,b)=>b[1]-a[1])[0]?.[0]||null;}

  function entriesFor(id){
    const out=[];
    const s=state();
    for(const [day,entries] of Object.entries(s.logs||{})){
      for(const e of entries||[]){
        if(String(e?.foodId||'')!==String(id)||!(Number(e.grams)>0)) continue;
        out.push({...e,day});
      }
    }
    return out.sort((a,b)=>(Number(a.ts)||0)-(Number(b.ts)||0));
  }

  function splitAmountQuality(rows){
    return {
      weighed:rows.filter(x=>x.amountQuality==='weighed'),
      estimated:rows.filter(x=>x.amountQuality==='estimated'),
      unknown:rows.filter(x=>x.amountQuality!=='weighed'&&x.amountQuality!=='estimated')
    };
  }

  function profile(id){
    const rows=entriesFor(id);
    if(!rows.length)return {id:String(id),count:0,learningCount:0,confidence:'new',portionConfidence:'new',usualGrams:null,mealUsual:{},preferredMeal:null,lastSeen:null,recentCount:0,weighedCount:0,estimatedCount:0,unknownCount:0,satiety:{hungry:0,comfortable:0,full:0},comfortableRate:null};
    const sat=satiety();
    const cutoff=now()-45*24*60*60*1000;
    const recent=rows.filter(x=>(Number(x.ts)||new Date(x.day+'T12:00:00').getTime())>=cutoff);
    const quality=splitAmountQuality(rows);

    // Explicit estimates never train portion memory. During migration, older
    // unclassified logs can keep the existing memory alive until there are at
    // least three genuinely weighed observations, after which weighed data wins.
    const nonEstimated=rows.filter(x=>x.amountQuality!=='estimated');
    const portionRows=quality.weighed.length>=3?quality.weighed:nonEstimated;
    const recentPortion=portionRows.filter(x=>(Number(x.ts)||new Date(x.day+'T12:00:00').getTime())>=cutoff);
    const basisRows=recentPortion.length>=3?recentPortion:portionRows;

    const mealUsual={};
    for(const meal of ['Lunch','Dinner','Snack','Other']){
      const vals=portionRows.filter(x=>x.meal===meal).map(x=>x.grams);
      if(vals.length)mealUsual[meal]=round1(median(vals));
    }
    const sats={hungry:0,comfortable:0,full:0};
    let satTotal=0;
    for(const e of rows){const v=sat[e.id];if(v&&v in sats){sats[v]++;satTotal++;}}
    const last=rows[rows.length-1];
    const count=rows.length;
    const learningCount=portionRows.length;
    const portionConfidence=quality.weighed.length>=3?'weighed':quality.unknown.length?'legacy':'insufficient';
    return {
      id:String(id),
      count,
      learningCount,
      recentCount:recent.length,
      weighedCount:quality.weighed.length,
      estimatedCount:quality.estimated.length,
      unknownCount:quality.unknown.length,
      confidence:count>=8?'strong':count>=3?'learned':'emerging',
      portionConfidence,
      usualGrams:basisRows.length?round1(median(basisRows.map(x=>x.grams))):null,
      mealUsual,
      preferredMeal:mode(rows.map(x=>x.meal)),
      lastSeen:Number(last.ts)||new Date(last.day+'T12:00:00').getTime(),
      satiety:sats,
      comfortableRate:satTotal?round1(sats.comfortable/satTotal*100):null
    };
  }

  function usualPortion(id,meal){const p=profile(id);if(p.learningCount<3)return null;return p.mealUsual[meal]||p.usualGrams||null;}
  function memoryBonus(id){
    const p=profile(id);if(!p.count)return 0;
    const ageDays=p.lastSeen?Math.max(0,(now()-p.lastSeen)/(24*60*60*1000)):999;
    const recency=ageDays<=7?5:ageDays<=30?3:ageDays<=90?1:0;
    const frequency=Math.min(8,Math.log2(p.count+1)*2.2);
    const fav=favourites().has(String(id))?4:0;
    return Math.min(17,frequency+recency+fav);
  }

  function personalisedSearch(query,opts={}){
    if(typeof upstream.search!=='function') return [];
    const wanted=Number(opts.limit)||10;
    const rows=upstream.search(query,{...opts,limit:Math.max(24,wanted)}).map(r=>{
      const p=profile(r.id);const bonus=memoryBonus(r.id);
      return {...r,memory:p,memoryBonus:bonus,personalScore:(Number(r.score)||0)+bonus};
    });
    rows.sort((a,b)=>b.personalScore-a.personalScore||b.score-a.score||b.trust-a.trust);
    return rows.slice(0,wanted);
  }

  function findByName(term){const row=personalisedSearch(term,{limit:1,includeRestaurant:false})[0];return row?clone(row.food):upstream.findByName?.(term)||null;}
  const facade=Object.freeze({
    version:'4',
    getById:id=>upstream.getById(id),
    findByName,
    all:()=>upstream.all(),
    calc:(foodOrId,grams)=>upstream.calc(foodOrId,grams),
    search:personalisedSearch,
    best:(query,opts={})=>personalisedSearch(query,{...opts,limit:1})[0]||null,
    classify:food=>upstream.classify?upstream.classify(food):null,
    explain:food=>upstream.explain?upstream.explain(food):'',
    sourceSummary:()=>upstream.sourceSummary?upstream.sourceSummary():{},
    profile,
    usualPortion
  });
  window.OkelloFoodCatalog=facade;
  window.OkelloFoodIntelligence=facade;
  window.OkelloFoodMemory=Object.freeze({profile,usualPortion,memoryBonus,search:personalisedSearch});

  const css=document.createElement('style');
  css.textContent=`
    .memory-strip{margin:10px 0 0;padding:10px 12px;border:1px dashed var(--rule);border-radius:13px;background:var(--tint);display:flex;align-items:center;justify-content:space-between;gap:10px}.memory-strip[hidden]{display:none}.memory-strip strong{display:block;color:var(--forest);font-size:.82rem}.memory-strip small{display:block;color:var(--muted);margin-top:2px}.memory-use{flex:0 0 auto;min-height:38px;border:1px solid var(--forest);border-radius:10px;background:#fff;color:var(--forest);font-weight:850;padding:7px 10px}.memory-list{display:grid;gap:7px;margin-top:10px}.memory-row{display:flex;justify-content:space-between;gap:12px;padding:9px 10px;border-radius:11px;background:var(--tint)}.memory-row small{display:block;color:var(--muted);margin-top:2px}.memory-row b{color:var(--forest);white-space:nowrap}
  `;
  document.head.appendChild(css);

  const foodSelect=$('foodSelect'),mealSelect=$('mealSelect'),gramsInput=$('gramsInput');
  const quick=document.querySelector('.quick-add-card');
  if(foodSelect&&mealSelect&&gramsInput&&quick&&!$('personalMemoryStrip')){
    const strip=document.createElement('div');strip.id='personalMemoryStrip';strip.className='memory-strip';strip.hidden=true;
    const calc=document.getElementById('quickCalc');if(calc)calc.insertAdjacentElement('beforebegin',strip);else quick.appendChild(strip);
    function renderStrip(){
      const id=foodSelect.value,meal=mealSelect.value,p=profile(id),usual=usualPortion(id,meal);
      if(!usual){strip.hidden=true;strip.innerHTML='';return;}
      const mealText=p.mealUsual[meal]?`for ${meal.toLowerCase()}`:'across your logs';
      const basis=p.portionConfidence==='weighed'?`${p.weighedCount} weighed logs`:`${p.learningCount} older/unclassified logs · explicit estimates excluded`;
      strip.innerHTML=`<div><strong>Your usual logged amount: ${Math.round(usual)} g</strong><small>${basis} · ${mealText}${p.comfortableRate!=null?` · comfortable ${Math.round(p.comfortableRate)}% of rated meals`:''}</small></div><button id="memoryUseUsual" class="memory-use" type="button">Use my usual</button>`;
      strip.hidden=false;
      $('memoryUseUsual')?.addEventListener('click',()=>{gramsInput.value=Math.round(usual);gramsInput.dispatchEvent(new Event('input',{bubbles:true}));});
    }
    foodSelect.addEventListener('change',renderStrip);mealSelect.addEventListener('change',renderStrip);window.addEventListener('okello:amount-quality-changed',renderStrip);renderStrip();
  }

  const settings=$('tab-settings');
  if(settings&&!$('personalFoodMemoryCard')){
    const s=state();
    const ids=new Set(Object.values(s.logs||{}).flat().map(x=>String(x?.foodId||'')).filter(Boolean));
    const learned=[...ids].map(id=>({id,p:profile(id),f:upstream.getById(id)})).filter(x=>x.f&&x.p.count>=2).sort((a,b)=>b.p.count-a.p.count||b.p.lastSeen-a.p.lastSeen).slice(0,6);
    const card=document.createElement('section');card.id='personalFoodMemoryCard';card.className='card';
    const rows=learned.map(x=>{const basis=x.p.weighedCount?`${x.p.weighedCount} weighed`:(x.p.unknownCount?`${x.p.unknownCount} older/unclassified`:'estimates only');const amount=x.p.learningCount>=3&&x.p.usualGrams?Math.round(x.p.usualGrams)+' g':'—';return `<div class="memory-row"><div><strong>${String(x.f.emoji||'🍽️')} ${String(x.f.name||'')}</strong><small>${x.p.preferredMeal?`Usually ${x.p.preferredMeal.toLowerCase()} · `:''}${x.p.count} logs · ${basis}</small></div><b>${amount}</b></div>`;}).join('');
    card.innerHTML=`<p class="eyebrow">PERSONAL FOOD MEMORY</p><h3>Learning how you actually eat</h3><p class="muted">Okello learns common foods, preferred meal times and satiety from your history. Portion memory is stricter: amounts you explicitly mark as estimated do not train your “usual portion”. Older unclassified logs can bridge the transition until enough weighed entries exist.</p><div class="memory-list">${rows||'<div class="tiny-note">Log the same foods a few times and learned portions will appear here.</div>'}</div><p class="tiny-note">Personal memory stays in local browser storage. It is not uploaded to GitHub.</p>`;
    const sourceCard=$('foodSourcePriorityCard');if(sourceCard)sourceCard.insertAdjacentElement('afterend',card);else settings.appendChild(card);
  }

  window.dispatchEvent(new CustomEvent('okello:personal-food-memory-ready'));
})();