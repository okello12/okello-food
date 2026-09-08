(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const VERSION=1;
  const catalog=window.OkelloFoodCatalog;
  const piece=window.OkelloPieceEntry;
  if(!catalog||!piece)return;

  const UNITS=Object.freeze({
    egg:Object.freeze({pieceKey:'egg',singular:'egg',plural:'eggs',grams:50,defaultCount:3,foodIds:Object.freeze(['egg'])}),
    slice:Object.freeze({pieceKey:'slice',singular:'slice',plural:'slices',grams:40,defaultCount:3,foodIds:Object.freeze(['bread'])}),
    tin:Object.freeze({pieceKey:'tin',singular:'tin',plural:'tins',gramsByFood:Object.freeze({sardines:100,tuna:120}),defaultCount:1,foodIds:Object.freeze(['sardines','tuna'])})
  });

  let current=null;

  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const todayKey=()=>new Date().toISOString().slice(0,10);

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }

  function writeState(state){
    try{localStorage.setItem(STORE,JSON.stringify(state));return true;}
    catch(_){return false;}
  }

  function definitionFor(foodId){
    const id=String(foodId||'');
    for(const def of Object.values(UNITS)){
      if(def.foodIds.includes(id)){
        const grams=Number(def.gramsByFood?.[id] ?? def.grams);
        return grams>0?{...def,foodId:id,grams}:null;
      }
    }
    return null;
  }

  function plural(def,count){return Number(count)===1?def.singular:def.plural;}
  function estimatedGrams(def,count){return Math.max(1,Number(count)||1)*def.grams;}

  function toast(message){
    const node=$('toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),1900);
  }

  function ensureStyles(){
    if($('v45CountableStyles'))return;
    const style=document.createElement('style');
    style.id='v45CountableStyles';
    style.textContent=`
      .v45-countable{margin:10px 0 0;padding:12px;border:1px solid var(--rule);border-radius:14px;background:var(--tint)}
      .v45-countable[hidden]{display:none!important}.v45-countable-head strong{display:block;color:var(--forest);font-size:.84rem}.v45-countable-head small{display:block;margin-top:2px;color:var(--muted);font-size:.72rem;line-height:1.35}
      .v45-count-stepper{display:grid;grid-template-columns:56px 1fr 56px;gap:8px;align-items:stretch;margin-top:9px}.v45-count-stepper button{min-height:52px;border:0;border-radius:13px;background:var(--forest);color:#fff;font-size:1.7rem;font-weight:900}.v45-count-readout{min-height:52px;border:1px solid var(--rule);border-radius:13px;background:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:900;color:var(--ink)}.v45-count-readout strong{font-size:1.3rem}.v45-count-readout small{color:var(--muted);font-size:.76rem;font-weight:750}
    `;
    document.head.appendChild(style);
  }

  function ensureControl(){
    ensureStyles();
    let node=$('v45Countable');
    if(node)return node;
    const quickCalc=$('quickCalc');
    if(!quickCalc)return null;
    node=document.createElement('div');
    node.id='v45Countable';
    node.className='v45-countable';
    node.hidden=true;
    node.innerHTML=`<div class="v45-countable-head"><strong id="v45CountTitle">How many?</strong><small id="v45CountHelp"></small></div><div class="v45-count-stepper" role="group" aria-label="Count"><button type="button" data-v45-step="-1" aria-label="Remove one">−</button><div class="v45-count-readout" aria-live="polite"><strong id="v45CountValue">1</strong><small id="v45CountUnit"></small></div><button type="button" data-v45-step="1" aria-label="Add one">+</button></div>`;
    quickCalc.insertAdjacentElement('beforebegin',node);
    qsa('[data-v45-step]',node).forEach(button=>button.addEventListener('click',()=>{
      if(!current)return;
      current.count=Math.max(1,current.count+Number(button.dataset.v45Step||0));
      applyCurrent();
    }));
    return node;
  }

  function defaultCount(food,def){
    const usual=Number(food?.portion)||def.grams*def.defaultCount;
    return Math.max(1,Math.round(usual/def.grams)||def.defaultCount||1);
  }

  function applyCurrent(){
    const node=ensureControl();
    if(!node||!current)return;
    const {def,count}=current;
    const grams=estimatedGrams(def,count);
    $('v45CountValue').textContent=String(count);
    $('v45CountUnit').textContent=plural(def,count);
    $('v45CountTitle').textContent=`How many ${def.plural}?`;
    $('v45CountHelp').textContent=`${count} ${plural(def,count)} ≈ ${grams} g. The gram conversion is an estimate; your count is the direct observation.`;
    const input=$('gramsInput');
    if(input){
      input.value=String(grams);
      input.readOnly=true;
      input.setAttribute('data-v45-countable','1');
      input.setAttribute('aria-label',`${count} ${plural(def,count)}. Estimated ${grams} grams.`);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    const unit=input?.closest('.input-with-unit')?.querySelector('span');
    if(unit)unit.textContent='est. g';
    const rough=$('v44Rough');
    if(rough)rough.hidden=true;
  }

  function clearCurrent(){
    current=null;
    const node=$('v45Countable');
    if(node)node.hidden=true;
    const input=$('gramsInput');
    if(input?.hasAttribute('data-v45-countable')){
      input.readOnly=false;
      input.removeAttribute('data-v45-countable');
      input.setAttribute('aria-label','Amount in grams');
      const unit=input.closest('.input-with-unit')?.querySelector('span');
      if(unit)unit.textContent='g';
    }
  }

  function syncForSelectedFood(){
    const food=catalog.getById?.($('foodSelect')?.value);
    const def=definitionFor(food?.id);
    const node=ensureControl();
    if(!food||!def){
      clearCurrent();
      window.OkelloFirstRunV44?.renderStarterShelf?.();
      return false;
    }
    const previous=current&&current.def?.foodId===food.id?current.count:null;
    current={food,def,count:previous||defaultCount(food,def)};
    if(node)node.hidden=false;
    applyCurrent();
    return true;
  }

  function displayedSmartTarget(){
    const text=$('smartPortion')?.textContent||'';
    const match=String(text).replace(/,/g,'').match(/([0-9]+(?:\.[0-9]+)?)/);
    const grams=match?Number(match[1]):0;
    return grams>0?grams:0;
  }

  function useSmartCount(){
    if(!current)return false;
    const target=displayedSmartTarget();
    if(!(target>0))return false;
    const count=Math.max(1,Math.floor((target+1e-9)/current.def.grams));
    current.count=count;
    applyCurrent();
    toast(`Using ${count} ${plural(current.def,count)} as the closest whole count`);
    return true;
  }

  function amountFor(def,count){
    const grams=estimatedGrams(def,count);
    return {
      foodId:def.foodId,
      enteredAmount:count,
      enteredUnit:'pieces',
      pieceCount:count,
      pieceKey:def.pieceKey,
      grams,
      estimatedGrams:grams,
      estimateBasisGrams:def.grams,
      amountQuality:'estimated',
      estimateSource:'reference-count-unit-v45',
      observationCount:0
    };
  }

  function commitCurrent(){
    if(!current)return false;
    const state=readState();
    const key=todayKey();
    state.logs=state.logs&&typeof state.logs==='object'?state.logs:{};
    state.logs[key]=Array.isArray(state.logs[key])?state.logs[key]:[];
    const amount=amountFor(current.def,current.count);
    const draft=piece.createLogDraft({
      food:current.food,
      amount,
      meal:$('mealSelect')?.value||'Other',
      source:'countable-serving-v45',
      ts:Date.now()
    });
    if(!draft)return false;
    draft.countUnit=current.def.pieceKey;
    draft.countLabel=plural(current.def,current.count);
    draft.estimateSource='reference-count-unit-v45';
    state.logs[key].push(draft);
    if(!writeState(state))return false;
    window.OkelloAppState?.syncFromStorage?.();
    window.dispatchEvent(new CustomEvent('okello:food-log-changed',{detail:{day:key,entries:state.logs[key].length,source:'countable-serving-v45'}}));
    toast(`${current.count} ${plural(current.def,current.count)} added`);
    return true;
  }

  function refreshBadges(){
    const entries=readState().logs?.[todayKey()]||[];
    qsa('#todayLog .log-row').forEach((row,index)=>{
      const entry=entries[index];
      if(entry?.estimateSource!=='reference-count-unit-v45')return;
      const badge=qs('.v44-estimate-badge',row);
      const unit=entry.countUnit;
      const text=unit==='egg'?'Counted eggs':unit==='slice'?'Counted slices':unit==='tin'?'Counted tins':'Counted amount';
      if(badge)badge.textContent=text;
    });
  }

  document.addEventListener('click',event=>{
    const add=event.target?.closest?.('#addFoodBtn');
    if(add&&current){
      event.preventDefault();
      event.stopImmediatePropagation();
      commitCurrent();
      return;
    }
    const smart=event.target?.closest?.('#useSmartPortionBtn');
    if(smart&&current){
      event.preventDefault();
      event.stopImmediatePropagation();
      useSmartCount();
    }
  },true);

  document.addEventListener('change',event=>{
    if(event.target?.matches?.('#foodSelect'))setTimeout(syncForSelectedFood,0);
  });
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('.hub-result,[data-hub-food],.quick-food,#foodSuggestions *'))setTimeout(syncForSelectedFood,0);
  },true);
  window.addEventListener('okello:food-log-changed',()=>setTimeout(refreshBadges,0));

  const todayLog=$('todayLog');
  if(todayLog)new MutationObserver(()=>refreshBadges()).observe(todayLog,{childList:true,subtree:true});

  ensureControl();
  syncForSelectedFood();
  refreshBadges();

  window.OkelloCountableServingsV45=Object.freeze({
    version:VERSION,
    units:UNITS,
    definitionFor,
    estimatedGrams,
    amountFor,
    readState,
    syncForSelectedFood,
    useSmartCount,
    commitCurrent
  });
})();