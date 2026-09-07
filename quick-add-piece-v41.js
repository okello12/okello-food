(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const piece=window.OkelloPieceEntry;
  const sheet=window.OkelloPieceSheet;
  const sheetContract=window.OkelloPieceSheetContract;
  const smartOutput=window.OkelloSmartPortionOutput;
  const catalog=window.OkelloFoodCatalog;
  if(!piece||!sheet||!sheetContract||!smartOutput||!catalog)return;

  const VERSION=1;
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const round1=n=>Math.round((Number(n)||0)*10)/10;

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }

  function appendLogToState(state,log,day=todayKey()){
    const s=state&&typeof state==='object'?state:{};
    s.logs=s.logs&&typeof s.logs==='object'?s.logs:{};
    s.logs[day]=Array.isArray(s.logs[day])?s.logs[day]:[];
    s.logs[day].push(log);
    return s;
  }

  function selectedContext(){
    const foodId=document.getElementById('foodSelect')?.value;
    const meal=document.getElementById('mealSelect')?.value||'Other';
    const food=foodId?catalog.getById?.(foodId):null;
    return food?{food,foodId:piece.resolveFoodId(food.id),meal}:null;
  }

  function isPieceNative(foodId,state={}){
    return piece.optionsFor(piece.resolveFoodId(foodId),state).length>0;
  }

  function displayedSmartTarget(){
    const text=document.getElementById('smartPortion')?.textContent||'';
    const match=String(text).replace(/,/g,'').match(/([0-9]+(?:\.[0-9]+)?)/);
    const grams=match?Number(match[1]):0;
    return grams>0?grams:0;
  }

  function smartResultFor(state,food){
    const targetGrams=displayedSmartTarget();
    if(!(targetGrams>0))return null;
    const reason=document.getElementById('smartPortionNote')?.textContent||'';
    return smartOutput.resultShape({state,food,targetGrams,base:{reason}});
  }

  function openingDraft(state,ctx){
    const smartResult=smartResultFor(state,ctx.food);
    return sheetContract.openDraft({state,food:ctx.food,meal:ctx.meal,smartResult});
  }

  function syncLegacyControls(){
    const input=document.getElementById('gramsInput');
    const smartBtn=document.getElementById('useSmartPortionBtn');
    const ctx=selectedContext();
    if(!input||!ctx)return;
    const state=readState();
    const routed=isPieceNative(ctx.foodId,state);
    const unit=input.closest('.input-with-unit')?.querySelector('span');

    if(!routed){
      input.readOnly=false;
      input.removeAttribute('data-piece-routed');
      input.setAttribute('aria-label','Amount in grams');
      if(unit)unit.textContent='g';
      if(smartBtn)smartBtn.textContent='Use suggestion';
      return;
    }

    const draft=openingDraft(state,ctx);
    const grams=piece.effectiveGrams(draft?.amount);
    input.readOnly=true;
    input.setAttribute('data-piece-routed','1');
    input.setAttribute('aria-label','Piece amount preview. Tap to choose pieces or grams.');
    if(grams>0&&Number(input.value)!==round1(grams)){
      input.value=round1(grams);
      input.dispatchEvent(new Event('input',{bubbles:true}));
    }
    if(unit)unit.textContent='est. g';
    if(smartBtn)smartBtn.textContent='Review suggestion';
  }

  function commitAmount(food,meal,amount){
    const state=readState();
    const log=piece.createLogDraft({
      food,
      amount,
      meal,
      source:'quick-add-piece',
      ts:Date.now()
    });
    if(!log)return null;
    appendLogToState(state,log);
    localStorage.setItem(STORE,JSON.stringify(state));
    try{sessionStorage.setItem('okello_flash',`${food.name||'Food'} added`);}catch(_){}
    if(typeof location!=='undefined'&&typeof location.reload==='function')location.reload();
    return log;
  }

  function openForCurrentFood(){
    const ctx=selectedContext();
    if(!ctx)return false;
    const state=readState();
    if(!isPieceNative(ctx.foodId,state))return false;
    const smartResult=smartResultFor(state,ctx.food);
    return sheet.open({
      state,
      food:ctx.food,
      meal:ctx.meal,
      smartResult,
      onConfirm:amount=>commitAmount(ctx.food,ctx.meal,amount)
    });
  }

  // Quick Add can be re-rendered by later modules. Own the interaction at the
  // document level so replacement controls inherit the behaviour automatically.
  document.addEventListener('click',event=>{
    const trigger=event.target?.closest?.('#addFoodBtn,#useSmartPortionBtn,#gramsInput');
    if(!trigger)return;
    const ctx=selectedContext();
    if(!ctx||!isPieceNative(ctx.foodId,readState()))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openForCurrentFood();
  },true);

  document.addEventListener('change',event=>{
    if(event.target?.matches?.('#foodSelect,#mealSelect'))queueMicrotask(syncLegacyControls);
  });

  document.addEventListener('focusin',event=>{
    if(!event.target?.matches?.('#gramsInput'))return;
    const ctx=selectedContext();
    if(ctx&&isPieceNative(ctx.foodId,readState()))event.target.readOnly=true;
  },true);

  window.addEventListener?.('okello:personal-food-memory-ready',()=>queueMicrotask(syncLegacyControls));
  queueMicrotask(syncLegacyControls);

  window.OkelloQuickAddPiece=Object.freeze({
    version:VERSION,
    readState,
    appendLogToState,
    selectedContext,
    isPieceNative,
    displayedSmartTarget,
    smartResultFor,
    openingDraft,
    syncLegacyControls,
    commitAmount,
    openForCurrentFood
  });
})();