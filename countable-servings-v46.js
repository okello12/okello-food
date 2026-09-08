(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const VERSION=2;
  const catalog=window.OkelloFoodCatalog;
  const piece=window.OkelloPieceEntry;
  const repo=window.OkelloStateRepository;
  if(!catalog||!piece)return;

  const GENERIC=Object.freeze({
    egg:Object.freeze({pieceKey:'egg',singular:'egg',plural:'eggs',grams:50,defaultCount:3,foodIds:Object.freeze(['egg'])}),
    slice:Object.freeze({pieceKey:'slice',singular:'slice',plural:'slices',grams:40,defaultCount:3,foodIds:Object.freeze(['bread'])}),
    tin:Object.freeze({pieceKey:'tin',singular:'tin',plural:'tins',gramsByFood:Object.freeze({sardines:100,tuna:120}),defaultCount:1,foodIds:Object.freeze(['sardines','tuna'])})
  });
  const LABELS=Object.freeze({egg:['egg','eggs'],slice:['slice','slices'],tin:['tin','tins'],can:['can','cans'],pot:['pot','pots'],tub:['tub','tubs'],'half-pot':['half pot','half pots']});
  let current=null;

  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const todayKey=()=>new Date().toISOString().slice(0,10);
  function readState(){if(repo)return repo.read();try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){return {};}}
  function writeState(state){if(repo)return repo.replace(state,{source:'countable-serving-v46'}).ok;try{localStorage.setItem(STORE,JSON.stringify(state));return true;}catch(_){return false;}}
  function toast(message){const node=$('toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),1900);}
  function unitWords(pieceKey){return LABELS[pieceKey]||[pieceKey,pieceKey+'s'];}
  function plural(def,count){const words=unitWords(def.pieceKey);return Number(count)===1?words[0]:words[1];}

  function packetDefinition(food){
    const grams=Number(food?.servingG);
    const text=String(food?.servingSizeText||'').trim();
    if(!(grams>0)||!text)return null;
    const patterns=[
      {re:/(\d+(?:\.\d+)?)\s*slices?\b/i,key:'slice'},
      {re:/(\d+(?:\.\d+)?)\s*tins?\b/i,key:'tin'},
      {re:/(\d+(?:\.\d+)?)\s*cans?\b/i,key:'can'},
      {re:/(\d+(?:\.\d+)?)\s*half[ -]?pots?\b/i,key:'half-pot'},
      {re:/(\d+(?:\.\d+)?)\s*pots?\b/i,key:'pot'},
      {re:/(\d+(?:\.\d+)?)\s*tubs?\b/i,key:'tub'}
    ];
    for(const pattern of patterns){
      const match=text.match(pattern.re);if(!match)continue;
      const count=Number(match[1]);if(!(count>0))continue;
      const per=grams/count;if(!(per>0))continue;
      return {foodId:food.id,pieceKey:pattern.key,grams:per,defaultCount:Math.max(1,Math.round(count)),estimateSource:'packet-unit-weight',packetServingG:grams,packetServingText:text,sourceName:food.sourceName||'Packet data'};
    }
    return null;
  }
  function genericDefinition(foodId){
    const id=String(foodId||'');
    for(const def of Object.values(GENERIC)){
      if(def.foodIds.includes(id)){
        const grams=Number(def.gramsByFood?.[id]??def.grams);
        if(grams>0)return {...def,foodId:id,grams,estimateSource:'reference-count-unit-v46'};
      }
    }
    return null;
  }
  function personalDefinition(food,state,base){
    if(!base)return null;
    try{
      const option=piece.optionsFor?.(food.id,state)?.find(x=>x.pieceKey===base.pieceKey&&x.calibrated);
      if(option&&Number(option.grams)>0)return {...base,grams:Number(option.grams),estimateSource:'personal-piece-weight',observationCount:Number(option.observationCount)||0};
    }catch(_){}
    return null;
  }
  function definitionFor(foodOrId,state=readState()){
    const food=typeof foodOrId==='object'?foodOrId:catalog.getById?.(String(foodOrId||''));
    if(!food)return null;
    const packet=packetDefinition(food);
    const generic=genericDefinition(food.id);
    const base=packet||generic;
    if(!base)return null;
    return personalDefinition(food,state,base)||base;
  }
  function estimatedGrams(def,count){return Math.max(1,Number(count)||1)*Number(def.grams);}

  function ensureStyles(){
    if($('v46CountableStyles'))return;
    const style=document.createElement('style');style.id='v46CountableStyles';style.textContent=`.v45-countable{margin:10px 0 0;padding:12px;border:1px solid var(--rule);border-radius:14px;background:var(--tint)}.v45-countable[hidden]{display:none!important}.v45-countable-head strong{display:block;color:var(--forest);font-size:.84rem}.v45-countable-head small{display:block;margin-top:2px;color:var(--muted);font-size:.72rem;line-height:1.35}.v45-count-stepper{display:grid;grid-template-columns:56px 1fr 56px;gap:8px;align-items:stretch;margin-top:9px}.v45-count-stepper button{min-height:52px;border:0;border-radius:13px;background:var(--forest);color:#fff;font-size:1.7rem;font-weight:900}.v45-count-readout{min-height:52px;border:1px solid var(--rule);border-radius:13px;background:#fff;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:900;color:var(--ink)}.v45-count-readout strong{font-size:1.3rem}.v45-count-readout small{color:var(--muted);font-size:.76rem;font-weight:750}.v46-count-source{display:inline-flex;margin-top:6px;padding:3px 7px;border-radius:999px;background:#fff;color:var(--muted);font-size:.68rem;font-weight:800}`;document.head.appendChild(style);
  }
  function ensureControl(){
    ensureStyles();let node=$('v45Countable');if(node)return node;const quickCalc=$('quickCalc');if(!quickCalc)return null;
    node=document.createElement('div');node.id='v45Countable';node.className='v45-countable';node.hidden=true;node.innerHTML='<div class="v45-countable-head"><strong id="v45CountTitle">How many?</strong><small id="v45CountHelp"></small><span id="v46CountSource" class="v46-count-source"></span></div><div class="v45-count-stepper" role="group" aria-label="Count"><button type="button" data-v45-step="-1" aria-label="Remove one">−</button><div class="v45-count-readout" aria-live="polite"><strong id="v45CountValue">1</strong><small id="v45CountUnit"></small></div><button type="button" data-v45-step="1" aria-label="Add one">+</button></div>';
    quickCalc.insertAdjacentElement('beforebegin',node);qsa('[data-v45-step]',node).forEach(button=>button.addEventListener('click',()=>{if(!current)return;current.count=Math.max(1,current.count+Number(button.dataset.v45Step||0));applyCurrent();}));return node;
  }
  function defaultCount(food,def){const usual=Number(food?.portion)||def.grams*Number(def.defaultCount||1);return Math.max(1,Math.round(usual/def.grams)||def.defaultCount||1);}
  function sourceText(def){if(def.estimateSource==='personal-piece-weight')return 'Personal calibrated unit weight';if(def.estimateSource==='packet-unit-weight')return `Packet unit weight${def.packetServingText?` · ${def.packetServingText}`:''}`;return 'Generic reference unit weight';}
  function applyCurrent(){
    const node=ensureControl();if(!node||!current)return;const {def,count}=current;const grams=estimatedGrams(def,count);
    $('v45CountValue').textContent=String(count);$('v45CountUnit').textContent=plural(def,count);$('v45CountTitle').textContent=`How many ${unitWords(def.pieceKey)[1]}?`;
    $('v45CountHelp').textContent=`${count} ${plural(def,count)} ≈ ${Math.round(grams*10)/10} g. Your count is the direct observation; grams are derived.`;$('v46CountSource').textContent=sourceText(def);
    const input=$('gramsInput');if(input){input.value=String(Math.round(grams*10)/10);input.readOnly=true;input.setAttribute('data-v45-countable','1');input.setAttribute('aria-label',`${count} ${plural(def,count)}. Estimated ${Math.round(grams*10)/10} grams.`);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));}
    const unit=input?.closest('.input-with-unit')?.querySelector('span');if(unit)unit.textContent='est. g';const rough=$('v44Rough');if(rough)rough.hidden=true;
  }
  function clearCurrent(){current=null;const node=$('v45Countable');if(node)node.hidden=true;const input=$('gramsInput');if(input?.hasAttribute('data-v45-countable')){input.readOnly=false;input.removeAttribute('data-v45-countable');input.setAttribute('aria-label','Amount in grams');const unit=input.closest('.input-with-unit')?.querySelector('span');if(unit)unit.textContent='g';}}
  function syncForSelectedFood(){
    const food=catalog.getById?.($('foodSelect')?.value);const def=definitionFor(food);const node=ensureControl();if(!food||!def){clearCurrent();return false;}
    const previous=current&&current.food?.id===food.id&&current.def?.pieceKey===def.pieceKey?current.count:null;current={food,def,count:previous||defaultCount(food,def)};if(node)node.hidden=false;applyCurrent();return true;
  }
  function displayedSmartTarget(){const match=String($('smartPortion')?.textContent||'').replace(/,/g,'').match(/([0-9]+(?:\.[0-9]+)?)/);const grams=match?Number(match[1]):0;return grams>0?grams:0;}
  function useSmartCount(){if(!current)return false;const target=displayedSmartTarget();if(!(target>0))return false;current.count=Math.max(1,Math.floor((target+1e-9)/current.def.grams));applyCurrent();toast(`Using ${current.count} ${plural(current.def,current.count)} as the closest whole count`);return true;}
  function amountFor(def,count){
    const grams=estimatedGrams(def,count);return {foodId:def.foodId,enteredAmount:count,enteredUnit:'pieces',pieceCount:count,pieceKey:def.pieceKey,grams,estimatedGrams:grams,estimateBasisGrams:def.grams,amountQuality:'estimated',estimateSource:def.estimateSource,observationCount:def.observationCount||0,packetServingG:def.packetServingG??null,packetServingText:def.packetServingText??null};
  }
  function commitCurrent(){
    if(!current)return false;const key=todayKey();const amount=amountFor(current.def,current.count);const draft=piece.createLogDraft({food:current.food,amount,meal:$('mealSelect')?.value||'Other',source:'countable-serving-v46',ts:Date.now()});if(!draft)return false;
    draft.countLabel=plural(current.def,current.count); // presentation only; pieceKey is canonical.
    draft.estimateSource=current.def.estimateSource;if(amount.packetServingG!=null)draft.packetServingG=amount.packetServingG;if(amount.packetServingText)draft.packetServingText=amount.packetServingText;
    let ok=false;
    if(repo){const result=repo.mutate(state=>{state.logs=state.logs&&typeof state.logs==='object'?state.logs:{};state.logs[key]=Array.isArray(state.logs[key])?state.logs[key]:[];state.logs[key].push(draft);return state;},{source:'countable-serving-v46'});ok=!!result?.ok;}
    else{const state=readState();state.logs=state.logs&&typeof state.logs==='object'?state.logs:{};state.logs[key]=Array.isArray(state.logs[key])?state.logs[key]:[];state.logs[key].push(draft);ok=writeState(state);}
    if(!ok)return false;window.OkelloAppState?.syncFromStorage?.();window.dispatchEvent(new CustomEvent('okello:food-log-changed',{detail:{day:key,source:'countable-serving-v46'}}));toast(`${current.count} ${plural(current.def,current.count)} added`);return true;
  }
  function refreshBadges(){
    const entries=readState().logs?.[todayKey()]||[];qsa('#todayLog .log-row').forEach((row,index)=>{const entry=entries[index];if(entry?.source!=='countable-serving-v46')return;const badge=qs('.v44-estimate-badge',row);if(!badge)return;const label=unitWords(entry.pieceKey||'piece')[1];badge.textContent=`Counted ${label} · ${entry.estimateSource==='packet-unit-weight'?'packet weight':entry.estimateSource==='personal-piece-weight'?'personal calibration':'reference weight'}`;});
  }

  document.addEventListener('click',event=>{const add=event.target?.closest?.('#addFoodBtn');if(add&&current){event.preventDefault();event.stopImmediatePropagation();commitCurrent();return;}const smart=event.target?.closest?.('#useSmartPortionBtn');if(smart&&current){event.preventDefault();event.stopImmediatePropagation();useSmartCount();}},true);
  document.addEventListener('change',event=>{if(event.target?.matches?.('#foodSelect'))setTimeout(syncForSelectedFood,0);});
  document.addEventListener('click',event=>{if(event.target?.closest?.('.hub-result,[data-hub-food],.quick-food,#foodSuggestions *'))setTimeout(syncForSelectedFood,0);},true);
  window.addEventListener('okello:food-log-changed',()=>setTimeout(refreshBadges,0));const todayLog=$('todayLog');if(todayLog)new MutationObserver(refreshBadges).observe(todayLog,{childList:true,subtree:true});
  ensureControl();syncForSelectedFood();refreshBadges();

  window.OkelloCountableServingsV46=Object.freeze({version:VERSION,generic:GENERIC,definitionFor,packetDefinition,estimatedGrams,amountFor,readState,syncForSelectedFood,useSmartCount,commitCurrent});
})();