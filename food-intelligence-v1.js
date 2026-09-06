(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const FAV_STORE='okello_food_favourites_v1';
  const base=window.OkelloFoodCatalog;
  if(!base) return;
  window.OkelloFoodBaseCatalog=base;

  const restaurantFoods=[
    {id:'restaurant_burger_chips',name:'Burger & chips, restaurant estimate',emoji:'🍔',cat:'Complete meal',portion:1,kcal:1000,protein:30,fibre:5,source:'restaurant',quality:'Estimated',restaurantKey:'burger',range:[850,1150]},
    {id:'restaurant_fried_rice_chicken',name:'Fried rice with chicken, restaurant estimate',emoji:'🍚',cat:'Complete meal',portion:1,kcal:800,protein:28,fibre:4,source:'restaurant',quality:'Estimated',restaurantKey:'friedrice',range:[650,950]},
    {id:'restaurant_ghana_plate',name:'Ghanaian takeaway plate, restaurant estimate',emoji:'🍛',cat:'Complete meal',portion:1,kcal:900,protein:30,fibre:5,source:'restaurant',quality:'Estimated',restaurantKey:'ghana',range:[700,1100]},
    {id:'restaurant_pizza',name:'Pizza, 3 slices, restaurant estimate',emoji:'🍕',cat:'Complete meal',portion:1,kcal:775,protein:28,fibre:4,source:'restaurant',quality:'Estimated',restaurantKey:'pizza',range:[650,900]},
    {id:'restaurant_kebab',name:'Kebab / grilled meat meal, restaurant estimate',emoji:'🥙',cat:'Complete meal',portion:1,kcal:750,protein:38,fibre:4,source:'restaurant',quality:'Estimated',restaurantKey:'kebab',range:[600,900]},
    {id:'restaurant_curry_rice',name:'Curry with rice, restaurant estimate',emoji:'🍛',cat:'Complete meal',portion:1,kcal:850,protein:28,fibre:4,source:'restaurant',quality:'Estimated',restaurantKey:'curry',range:[700,1000]}
  ];

  function readState(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){return {};}}
  function readFavs(){try{const x=JSON.parse(localStorage.getItem(FAV_STORE)||'[]');return Array.isArray(x)?x:[];}catch(_){return [];}}
  function norm(v){return String(v||'').toLowerCase().replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();}
  function shortName(v){return norm(String(v||'').replace(/\([^)]*\)/g,' ').split('/')[0]);}
  function clone(v){return v&&typeof v==='object'?{...v}:v;}

  function classify(food){
    const id=String(food?.id||'');
    const quality=String(food?.quality||'').toLowerCase();
    const note=String(food?.note||'').toLowerCase();
    const source=String(food?.source||'').toLowerCase();
    const hasBarcode=/^\d{8,14}$/.test(String(food?.barcode||''));
    if(id.startsWith('recipe_')||quality.includes('your recipe')) return {tier:'recipe',priority:100,label:'Your recipe',detail:'Your measured recipe'};
    if(hasBarcode||quality.includes('package')||source==='branded'||source==='package') return {tier:'package',priority:95,label:'Package / barcode',detail:'Product-specific nutrition'};
    if(id.startsWith('custom_')) return {tier:'custom',priority:88,label:'Your saved food',detail:'Your own saved entry'};
    if(source==='restaurant'||id.startsWith('restaurant_')) return {tier:'restaurant',priority:45,label:'Restaurant estimate',detail:'Wide real-world range'};
    if(quality.includes('reference')) return {tier:'reference',priority:82,label:'Reference',detail:'Curated reference value'};
    if(quality.includes('estimated')||/estimate|recipe dependent|var(?:y|ies)|oil.*matter/.test(note)) return {tier:'estimated',priority:60,label:'Estimated dish',detail:'Recipe-dependent estimate'};
    if(id.startsWith('ghana_')||id.startsWith('world_')) return {tier:'regional',priority:74,label:'Regional catalogue',detail:'Curated regional entry'};
    return {tier:'reference',priority:80,label:'Reference',detail:'Curated reference value'};
  }

  function usageMap(){
    const s=readState(),out=new Map();
    Object.values(s.logs||{}).flat().forEach(x=>{if(x?.foodId)out.set(String(x.foodId),(out.get(String(x.foodId))||0)+1);});
    return out;
  }

  function textMatch(food,query){
    const q=norm(query); if(!q) return 0;
    const barcode=String(food?.barcode||'');
    if(/^\d{8,14}$/.test(q)&&barcode===q) return 200;
    const name=norm(food?.name),short=shortName(food?.name);
    if(name===q||short===q) return 100;
    if(name.startsWith(q)||short.startsWith(q)) return 92;
    if(name.includes(q)||short.includes(q)) return 84;
    if(q.includes(short)&&short.length>=4) return 80;
    const qt=q.split(' ').filter(x=>x.length>1),nt=new Set(name.split(' '));
    if(!qt.length) return 0;
    const hit=qt.filter(t=>nt.has(t)||[...nt].some(n=>n.startsWith(t)||t.startsWith(n))).length;
    const ratio=hit/qt.length;
    if(ratio===1) return 76;
    if(ratio>=.66) return 62;
    if(ratio>=.5&&hit>=1) return 48;
    return 0;
  }

  function confidence(match,meta){
    if(match>=150) return 'Exact barcode';
    if(match>=96&&meta.priority>=90) return 'Exact, high confidence';
    if(match>=90&&meta.priority>=80) return 'Strong match';
    if(meta.tier==='estimated'||meta.tier==='restaurant') return 'Estimated';
    if(match>=76) return 'Good match';
    return 'Possible match';
  }

  function reason(meta){
    if(meta.tier==='recipe') return 'Preferred because it is your own measured recipe.';
    if(meta.tier==='package') return 'Preferred for this exact packaged product because barcode or label data is product-specific.';
    if(meta.tier==='custom') return 'Preferred over generic estimates when this is the food you personally saved.';
    if(meta.tier==='reference') return 'Uses a curated reference value when no more specific personal or package source is available.';
    if(meta.tier==='regional') return 'Uses the curated regional catalogue when no more specific source is available.';
    if(meta.tier==='estimated') return 'Useful as a starting estimate, but your own recipe or label should override it.';
    return 'Restaurant food can vary widely, so this is deliberately treated as the lowest-confidence source.';
  }

  function candidate(food,query,usage,favs){
    const match=textMatch(food,query); if(!match) return null;
    const meta=classify(food);
    const personal=Math.min(8,(usage.get(String(food.id))||0)*1.5)+(favs.has(String(food.id))?5:0);
    const score=match*10+meta.priority+personal;
    return {id:food.id,food:clone(food),score,match,sourceTier:meta.tier,sourceLabel:meta.label,sourceDetail:meta.detail,trust:meta.priority,confidence:confidence(match,meta),reason:reason(meta),selectable:!String(food.id).startsWith('restaurant_'),restaurantKey:food.restaurantKey||null,range:food.range||null};
  }

  function rankedSearch(query,{limit=10,includeRestaurant=true}={}){
    const q=String(query||'').trim(); if(!q) return [];
    const usage=usageMap(),favs=new Set(readFavs());
    const pool=[...base.all(),...(includeRestaurant?restaurantFoods:[])];
    const rows=pool.map(f=>candidate(f,q,usage,favs)).filter(Boolean).sort((a,b)=>b.score-a.score||b.trust-a.trust||String(a.food.name).length-String(b.food.name).length);
    const grouped=new Map();
    for(const row of rows){
      const key=norm(row.food.name);
      if(!grouped.has(key)){row.alternatives=[];grouped.set(key,row);}
      else grouped.get(key).alternatives.push(row);
    }
    return [...grouped.values()].sort((a,b)=>b.score-a.score).slice(0,limit);
  }

  function bestFoodByName(term){const r=rankedSearch(term,{limit:1,includeRestaurant:false})[0];return r?clone(r.food):null;}
  function sourceSummary(){
    const counts={recipe:0,package:0,custom:0,reference:0,regional:0,estimated:0,restaurant:restaurantFoods.length};
    base.all().forEach(f=>{const t=classify(f).tier;counts[t]=(counts[t]||0)+1;});
    return counts;
  }

  const facade=Object.freeze({
    version:'2',
    getById:id=>base.getById(id),
    findByName:bestFoodByName,
    all:()=>base.all(),
    calc:(foodOrId,grams)=>base.calc(foodOrId,grams),
    search:rankedSearch,
    best:(query,opts={})=>rankedSearch(query,{...opts,limit:1})[0]||null,
    classify:food=>({...classify(food)}),
    explain:food=>reason(classify(food)),
    sourceSummary
  });

  window.OkelloFoodCatalog=facade;
  window.OkelloFoodIntelligence=facade;

  const css=document.createElement('style');
  css.textContent=`
    .intel-match{margin:10px 0 14px;border:1px solid var(--rule);border-radius:16px;background:var(--white);padding:12px;display:none}.intel-match.show{display:block}.intel-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}.intel-head strong{color:var(--forest)}.intel-badge{display:inline-flex;align-items:center;border-radius:999px;background:var(--tint);padding:5px 8px;font-size:.72rem;font-weight:850;color:var(--forest)}.intel-meta{font-size:.78rem;color:var(--muted);margin-top:4px}.intel-reason{font-size:.8rem;color:var(--ink);margin:8px 0}.intel-actions{display:flex;gap:8px;flex-wrap:wrap}.intel-use{border:0;border-radius:11px;background:var(--forest);color:#fff;font-weight:850;min-height:40px;padding:8px 12px}.source-ladder{display:grid;gap:7px;margin-top:10px}.source-step{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:start;padding:8px 10px;border-radius:12px;background:var(--tint)}.source-step b{color:var(--forest)}.source-step small{display:block;color:var(--muted);margin-top:1px}
  `;
  document.head.appendChild(css);

  const librarySearch=document.getElementById('librarySearch');
  const foodSelect=document.getElementById('foodSelect');
  if(librarySearch&&foodSelect){
    const card=document.createElement('div');card.id='intelBestMatch';card.className='intel-match';librarySearch.insertAdjacentElement('afterend',card);
    function useResult(r){
      if(r.selectable&&[...foodSelect.options].some(o=>o.value===r.id)){
        foodSelect.value=r.id;foodSelect.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.tab[data-tab="today"]')?.click();setTimeout(()=>document.querySelector('.quick-add-card')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return;
      }
      if(r.restaurantKey){document.querySelector('.tab[data-tab="today"]')?.click();setTimeout(()=>{const sel=document.getElementById('restDish');if(sel){sel.value=r.restaurantKey;sel.dispatchEvent(new Event('change',{bubbles:true}));sel.closest('.smart-card')?.scrollIntoView({behavior:'smooth',block:'start'});}},120);}
    }
    function renderBest(){
      const q=librarySearch.value.trim();if(q.length<2){card.classList.remove('show');card.innerHTML='';return;}
      const r=rankedSearch(q,{limit:1,includeRestaurant:true})[0];if(!r){card.classList.remove('show');card.innerHTML='';return;}
      const nutrition=r.restaurantKey?(r.range?`${r.range[0]}–${r.range[1]} kcal typical range`:'Restaurant estimate'):`${Math.round(r.food.kcal)} kcal · ${Math.round((r.food.protein||0)*10)/10} g protein / 100 g`;
      card.innerHTML=`<div class="intel-head"><div><span class="intel-badge">Best available source · ${r.sourceLabel}</span><strong style="display:block;margin-top:6px">${String(r.food.emoji||'🍽️')} ${String(r.food.name||'')}</strong><div class="intel-meta">${r.confidence} · ${nutrition}</div></div></div><p class="intel-reason">${r.reason}</p><div class="intel-actions"><button id="intelUseBest" class="intel-use" type="button">${r.restaurantKey?'Open restaurant mode':'Use best match'}</button></div>`;card.classList.add('show');document.getElementById('intelUseBest')?.addEventListener('click',()=>useResult(r));
    }
    librarySearch.addEventListener('input',()=>setTimeout(renderBest,0));
  }

  const settings=document.getElementById('tab-settings');
  if(settings&&!document.getElementById('foodSourcePriorityCard')){
    const counts=sourceSummary();
    const card=document.createElement('section');card.id='foodSourcePriorityCard';card.className='card';card.innerHTML=`<p class="eyebrow">FOOD INTELLIGENCE</p><h3>The most trustworthy source wins</h3><p class="muted">When several foods could match, Okello now ranks the source as well as the name. A personal recipe can beat a generic dish estimate, while an exact barcode can beat a generic packaged-food guess.</p><div class="source-ladder"><div class="source-step"><b>1</b><div><strong>Your recipe</strong><small>Best for food you cooked and weighed yourself.</small></div></div><div class="source-step"><b>2</b><div><strong>Package / barcode</strong><small>Best for the exact branded product in your hand.</small></div></div><div class="source-step"><b>3</b><div><strong>Your saved food</strong><small>Useful when you entered a label or repeat food yourself.</small></div></div><div class="source-step"><b>4</b><div><strong>Reference / regional</strong><small>Curated values for simple foods and recognised dishes.</small></div></div><div class="source-step"><b>5</b><div><strong>Estimated dish / restaurant</strong><small>Shown honestly as an estimate when recipes or portions vary.</small></div></div></div><p class="tiny-note">Current catalogue mix: ${counts.recipe||0} recipes · ${counts.package||0} package foods · ${(counts.reference||0)+(counts.regional||0)} reference/regional · ${counts.estimated||0} estimates.</p>`;
    const first=settings.querySelector('.card');if(first)first.insertAdjacentElement('afterend',card);else settings.appendChild(card);
  }

  window.dispatchEvent(new CustomEvent('okello:food-intelligence-ready'));
})();