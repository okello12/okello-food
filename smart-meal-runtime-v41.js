(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const TRACE_KEY='okello_smart_meal_last_trace_v42';
  const fit=window.OkelloSmartMealFit;
  const catalog=window.OkelloFoodCatalog;
  const piece=window.OkelloPieceEntry;
  const sheet=window.OkelloPieceSheet;
  const smartOutput=window.OkelloSmartPortionOutput;
  if(!fit||!catalog||!piece||!sheet||!smartOutput)return;

  const VERSION=1;
  const $=id=>document.getElementById(id);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const round1=n=>Math.round((Number(n)||0)*10)/10;
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const uid=prefix=>(globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')
    ?`${prefix}_${globalThis.crypto.randomUUID()}`
    :`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const esc=value=>String(value??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));

  const mealSets={
    ghana:[
      ['ghana_waakye','egg','tilapia'],
      ['banku','tilapia','ghana_okro_stew'],
      ['ghana_fufu','goat','light_soup'],
      ['plantain','beans','egg'],
      ['yam','ghana_kontomire_stew','egg']
    ],
    world:[
      ['world_biryani_chicken','world_greek_salad'],
      ['world_chicken_curry','world_couscous','world_greek_salad'],
      ['world_tandoori_chicken','world_bulgur','world_greek_salad'],
      ['world_tofu_firm','world_jasmine_rice','world_kimchi'],
      ['world_sashimi_salmon','world_soba','world_edamame'],
      ['world_pho_beef','world_spring_roll_fresh']
    ],
    highprotein:[
      ['chicken','rice','veg'],
      ['tilapia','potato','veg'],
      ['salmon','potato','veg'],
      ['beef','rice','veg'],
      ['sardines','egg','cottage']
    ],
    light:[
      ['tilapia','veg','potato'],
      ['chicken','veg','plantain'],
      ['lentils','veg','egg'],
      ['salmon','veg','potato']
    ]
  };

  let currentCandidates=[];
  let lastTrace=null;
  let committing=false;

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }

  function writeState(state){
    localStorage.setItem(STORE,JSON.stringify(state));
  }

  function toast(message){
    const node=$('toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),2200);
  }

  function resolve(id){
    return catalog.getById?.(id)||catalog.findByName?.(String(id||'').replace(/^(?:ghana|world)_/,'').replace(/_/g,' '))||null;
  }

  function calc(food,grams){
    return catalog.calc?.(food,grams)||{kcal:0,protein:0,fibre:0};
  }

  function totals(entries){
    return (entries||[]).reduce((acc,row)=>{
      acc.kcal+=Number(row?.kcal)||0;
      acc.protein+=Number(row?.protein)||0;
      acc.fibre+=Number(row?.fibre)||0;
      return acc;
    },{kcal:0,protein:0,fibre:0});
  }

  function remaining(){
    const state=readState();
    const targetCalories=Number(state.targets?.calories)||2300;
    const targetProtein=Number(state.targets?.protein)||150;
    const used=totals(state.logs?.[todayKey()]||[]);
    return {
      kcal:Math.max(0,targetCalories-used.kcal),
      protein:Math.max(0,targetProtein-used.protein),
      used,
      targetCalories,
      targetProtein
    };
  }

  function recordTrace(value){
    lastTrace=value;
    try{sessionStorage.setItem(TRACE_KEY,JSON.stringify(value));}catch(_){}
  }

  function candidatePriority(candidate){
    if(candidate.kind==='full')return 3;
    if(candidate.kind==='reduced')return 2;
    if(candidate.kind==='minimum-over-budget')return 1;
    return 0;
  }

  function buildCandidates(){
    const type=$('smartMealType')?.value||'Dinner';
    const style=$('smartMealStyle')?.value||'ghana';
    const rem=remaining();
    const share=type==='Lunch'?.30:type==='Dinner'?.45:.15;
    const mealBudget=Math.min(rem.kcal,rem.targetCalories*share);
    const sets=mealSets[style]||mealSets.ghana;
    const candidates=sets.map(ids=>fit.chooseSuggestion(ids,mealBudget,{resolve,calc}))
      .filter(result=>Array.isArray(result.items)&&result.items.length>=2)
      .sort((a,b)=>candidatePriority(b)-candidatePriority(a)||(Number(b.protein)||0)-(Number(a.protein)||0))
      .slice(0,3);
    recordTrace({
      at:new Date().toISOString(),
      stage:'render',
      meal:type,
      style,
      share,
      caloriesUsed:rem.used.kcal,
      caloriesRemaining:rem.kcal,
      mealBudget,
      candidates:candidates.map(candidate=>({
        kind:candidate.kind,
        kcal:candidate.kcal,
        overByKcal:candidate.overByKcal||0,
        items:candidate.items.map(item=>({id:item.id,grams:item.grams,min:item.min,max:item.max})),
        droppedIds:candidate.droppedIds||[],
        trace:candidate.trace||candidate.fullTrace||null
      }))
    });
    return {candidates,rem,mealBudget,type,style,share};
  }

  function candidateNote(candidate,mealBudget){
    if(candidate.kind==='reduced'){
      const dropped=(candidate.droppedIds||[]).map(id=>resolve(id)?.name||id).join(', ');
      return `Smaller plate to keep every portion sensible${dropped?` · leaves out ${dropped}`:''}.`;
    }
    if(candidate.kind==='minimum-over-budget'){
      const over=Math.max(0,Number(candidate.overByKcal)||0);
      return `Smallest sensible version is about ${Math.round(candidate.kcal)} kcal · ${Math.round(over)} kcal over this ${Math.round(mealBudget)} kcal meal budget.`;
    }
    return 'Full plate fits the current meal budget.';
  }

  function renderComposer(){
    const list=$('smartMealList');
    const stats=$('smartMealStats');
    if(!list||!stats)return;
    const built=buildCandidates();
    currentCandidates=built.candidates;
    stats.innerHTML=`<div class="smart-stat"><span>Calories left</span><strong>${Math.round(built.rem.kcal).toLocaleString()}</strong></div><div class="smart-stat"><span>Protein left</span><strong>${Math.round(built.rem.protein)} g</strong></div>`;
    if(!currentCandidates.length){
      list.innerHTML=`No sensible multi-component meal fits a ${Math.round(built.mealBudget)} kcal ${esc(built.type.toLowerCase())} budget right now.`;
      return;
    }
    list.innerHTML=currentCandidates.map((meal,index)=>{
      const button=meal.kind==='minimum-over-budget'?'Review smallest':'Review meal';
      return `<div class="meal-suggestion"><div><strong>${meal.items.map(item=>esc((item.food?.emoji||'🍽️')+' '+(item.food?.name||item.id))).join(' + ')}</strong><small>${meal.items.map(item=>`${Math.round(item.grams)} g ${esc(item.food?.name||item.id)}`).join(' · ')}</small><small>${Math.round(meal.kcal)} kcal · ${Math.round(meal.protein||0)} g protein</small><small>${esc(candidateNote(meal,built.mealBudget))}</small></div><button type="button" class="smart-primary" data-smartmeal-v42="${index}">${button}</button></div>`;
    }).join('');
  }

  function roleFor(food){
    if(food?.cat==='Protein')return 'protein';
    if(food?.cat==='Soup')return 'soup';
    if(['Starch','Complete meal','Beans'].includes(food?.cat))return 'main';
    return 'extra';
  }

  function isPieceNative(foodId,state){
    return piece.optionsFor?.(piece.resolveFoodId?.(foodId)||foodId,state).length>0;
  }

  function reviewPiece(state,food,meal,targetGrams){
    const smartResult=smartOutput.resultShape({
      state,
      food,
      targetGrams,
      base:{reason:'Smart Meal amount'}
    });
    return new Promise(resolveReview=>{
      let settled=false;
      const finish=value=>{if(settled)return;settled=true;resolveReview(value);};
      const opened=sheet.open({
        state,
        food,
        meal,
        smartResult,
        onConfirm:amount=>finish(amount),
        onClose:()=>finish(null)
      });
      if(!opened)finish(null);
    });
  }

  async function resolveAmounts(items,meal,state){
    const resolved=[];
    for(const item of items){
      const food=resolve(item.id)||item.food;
      if(!food)continue;
      let amount;
      if(isPieceNative(food.id,state)){
        amount=await reviewPiece(state,food,meal,item.grams);
        if(!amount)return null;
      }else{
        amount=piece.estimatedGramAmount(food.id,item.grams);
      }
      if(!amount)return null;
      resolved.push({item,food,amount});
    }
    return resolved.length?resolved:null;
  }

  function formatDate(key){
    return new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date(key+'T12:00:00'));
  }

  function refreshSatiety(entries){
    const prompt=$('satPrompt');
    const buttons=qsa('[data-sat]');
    if(!entries.length){buttons.forEach(button=>button.disabled=true);return;}
    const last=entries[entries.length-1];
    if(prompt)prompt.textContent=`After ${last.name} (${Math.round(Number(last.kcal)||0)} kcal), how did you feel?`;
    buttons.forEach(button=>button.disabled=false);
  }

  function refreshVisibleToday(){
    const state=readState();
    const key=todayKey();
    const entries=state.logs?.[key]||[];
    const used=totals(entries);
    const calories=Number(state.targets?.calories)||2300;
    const protein=Number(state.targets?.protein)||150;
    const calDiff=Math.round(calories-used.kcal);
    const proteinDiff=Math.round(protein-used.protein);
    if($('todayTitle'))$('todayTitle').textContent=formatDate(key);
    if($('todayCalories'))$('todayCalories').textContent=Math.round(used.kcal).toLocaleString();
    if($('todayProtein'))$('todayProtein').textContent=Math.round(used.protein)+' g';
    if($('todayFibre'))$('todayFibre').textContent=Math.round(used.fibre)+' g';
    if($('calRemainText'))$('calRemainText').textContent=calDiff>=0?`${calDiff.toLocaleString()} kcal left`:`${Math.abs(calDiff).toLocaleString()} kcal over`;
    if($('proteinRemainText'))$('proteinRemainText').textContent=proteinDiff>=0?`${proteinDiff} g left`:`${Math.abs(proteinDiff)} g over target`;
    if($('calorieBar')){
      $('calorieBar').style.width=Math.min(100,Math.max(0,used.kcal/calories*100))+'%';
      $('calorieBar').classList.toggle('over',used.kcal>calories);
    }
    const log=$('todayLog');
    if(log){
      if(!entries.length){
        log.className='log-list empty-state';
        log.textContent='Nothing logged yet.';
      }else{
        log.className='log-list';
        log.innerHTML=entries.map((row,index)=>`<div class="log-row"><div><strong>${esc(row.emoji||'🍽️')} ${esc(row.name)}</strong><div class="meta">${esc(row.meal||'Other')} · ${round1(row.grams)} g · ${round1(row.protein)} g protein</div></div><div class="numbers"><strong>${Math.round(Number(row.kcal)||0)} kcal</strong><button class="remove-btn" type="button" data-remove="${index}">remove</button></div></div>`).join('');
      }
    }
    refreshSatiety(entries);

    // The app's existing meal-change listener owns Quick Add Smart Portion and
    // Food Library recalculation. Reuse that contract rather than duplicating it.
    const mealSelect=$('mealSelect');
    if(mealSelect)mealSelect.dispatchEvent(new Event('change',{bubbles:true}));
    renderComposer();
    window.dispatchEvent(new CustomEvent('okello:food-log-changed',{detail:{day:key,entries:entries.length}}));
  }

  async function commitItems(items,meal,{source='smart-meal-v42',plateName='Smart Meal',candidate=null}={}){
    if(committing||!Array.isArray(items)||!items.length)return false;
    committing=true;
    try{
      const reviewState=readState();
      const resolved=await resolveAmounts(items,meal,reviewState);
      if(!resolved){toast('Meal not added. Review was cancelled.');return false;}
      const fresh=readState();
      const key=todayKey();
      fresh.logs=fresh.logs&&typeof fresh.logs==='object'?fresh.logs:{};
      fresh.logs[key]=Array.isArray(fresh.logs[key])?fresh.logs[key]:[];
      const plateId=uid('plate');
      const ts=Date.now();
      const logs=resolved.map(({food,amount},index)=>{
        const log=piece.createLogDraft({food,amount,meal,plateId,source,ts:ts+index});
        if(!log)return null;
        log.plateName=plateName;
        log.plateRole=roleFor(food);
        if(candidate?.kind)log.smartMealKind=candidate.kind;
        return log;
      }).filter(Boolean);
      if(logs.length!==resolved.length)return false;
      fresh.logs[key].push(...logs);
      writeState(fresh);
      recordTrace({
        ...(lastTrace||{}),
        at:new Date().toISOString(),
        stage:'commit',
        source,
        meal,
        plateId,
        candidateKind:candidate?.kind||null,
        committed:logs.map(log=>({foodId:log.foodId,grams:log.grams,enteredUnit:log.enteredUnit||'g',pieceCount:log.pieceCount||null,pieceKey:log.pieceKey||null,kcal:log.kcal}))
      });
      refreshVisibleToday();
      toast(`${plateName} added`);
      return true;
    }finally{
      committing=false;
    }
  }

  function plateItemsFromDom(){
    const ids=['plateBase','plateProtein','plateSauce','plateExtra'].map(id=>$(id)?.value).filter(Boolean);
    const inputs=qsa('#plateAmounts [data-plateg]');
    return ids.map((id,index)=>{
      const food=resolve(id);
      if(!food)return null;
      const grams=Math.max(1,Number(inputs[index]?.value)||Number(food.portion)||100);
      return {id:food.id,food,grams};
    }).filter(Boolean);
  }

  function naturalItemsFromDom(){
    const rows=qsa('#nlResult .parsed-row');
    if(!rows.length)return [];
    const all=catalog.all?.()||[];
    const items=rows.map(row=>{
      const label=row.querySelector('strong')?.textContent?.trim()||'';
      const food=all.filter(candidate=>label.endsWith(String(candidate.name||''))).sort((a,b)=>String(b.name||'').length-String(a.name||'').length)[0]||null;
      const grams=Math.max(1,Number(row.querySelector('[data-nlgrams]')?.value)||0);
      return food&&grams>0?{id:food.id,food,grams}:null;
    }).filter(Boolean);
    return items.length===rows.length?items:[];
  }

  function removeTodayIndex(index){
    const state=readState();
    const key=todayKey();
    const list=Array.isArray(state.logs?.[key])?state.logs[key]:[];
    if(!(index>=0&&index<list.length))return false;
    list.splice(index,1);
    state.logs[key]=list;
    writeState(state);
    refreshVisibleToday();
    return true;
  }

  document.addEventListener('change',event=>{
    if(!event.target?.matches?.('#smartMealType,#smartMealStyle'))return;
    event.stopImmediatePropagation();
    queueMicrotask(renderComposer);
  },true);

  document.addEventListener('click',event=>{
    const remove=event.target?.closest?.('[data-remove]');
    if(remove){
      event.preventDefault();
      event.stopImmediatePropagation();
      removeTodayIndex(Number(remove.getAttribute('data-remove')));
      return;
    }

    const smartButton=event.target?.closest?.('[data-smartmeal-v42],[data-smartmeal]');
    if(smartButton){
      event.preventDefault();
      event.stopImmediatePropagation();
      const index=Number(smartButton.getAttribute('data-smartmeal-v42')??smartButton.getAttribute('data-smartmeal'));
      const candidate=currentCandidates[index];
      if(!candidate)return;
      const meal=$('smartMealType')?.value||'Dinner';
      recordTrace({...lastTrace,stage:'selected',selectedIndex:index,selectedKind:candidate.kind,selectedKcal:candidate.kcal,selectedOverByKcal:candidate.overByKcal||0});
      commitItems(candidate.items,meal,{source:'smart-meal-v42',plateName:'Smart Meal',candidate});
      return;
    }

    const plateAdd=event.target?.closest?.('#plateAdd');
    if(plateAdd){
      const items=plateItemsFromDom();
      if(!items.length)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      commitItems(items,'Dinner',{source:'ghana-plate-v42',plateName:'Ghanaian Plate'});
      return;
    }

    const nlAdd=event.target?.closest?.('#nlAdd');
    if(nlAdd){
      const items=naturalItemsFromDom();
      if(!items.length)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      commitItems(items,$('nlMeal')?.value||'Dinner',{source:'natural-log-v42',plateName:'Quick Log'});
    }
  },true);

  renderComposer();

  window.OkelloSmartMealRuntime=Object.freeze({
    version:VERSION,
    traceKey:TRACE_KEY,
    mealSets,
    remaining,
    buildCandidates,
    renderComposer,
    commitItems,
    plateItemsFromDom,
    naturalItemsFromDom,
    refreshVisibleToday,
    removeTodayIndex,
    lastTrace:()=>lastTrace
  });
})();
