(() => {
  'use strict';

  const VERSION=1;
  const MAIN_STORE='okello_food_tracker_v3';
  const repo=window.OkelloStateRepository;
  const catalog=window.OkelloFoodCatalog;
  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const finite=value=>value!==null&&value!==''&&Number.isFinite(Number(value));
  const nullable=value=>finite(value)?Number(value):null;
  const round1=value=>Math.round(Number(value)*10)/10;
  let lastProduct=null;

  function toast(message){
    const node=$('toast');if(!node)return;
    node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),2000);
  }
  function readState(){
    if(repo)return repo.read();
    try{return JSON.parse(localStorage.getItem(MAIN_STORE)||'{}')||{};}catch(_){return {};}
  }
  function foodFromState(state,id){
    return catalog?.getById?.(id)||(state?.customFoods||[]).find(food=>String(food?.id||'')===String(id||''))||null;
  }
  function completeness(food){
    const keys=['kcal','protein','fibre','carbs','fat','salt'];
    const missing=keys.filter(key=>!finite(food?.[key]));
    return {missing,complete:missing.length===0,coreComplete:!missing.includes('kcal')&&!missing.includes('protein')&&!missing.includes('fibre')};
  }
  function snapshotExtra(food,grams){
    const g=Number(grams)||0;
    const calc=key=>finite(food?.[key])?round1(Number(food[key])*g/100):null;
    return {carbs:calc('carbs'),fat:calc('fat'),salt:calc('salt')};
  }

  // Every newly-created log snapshots evidence and missingness at log time.
  // Catalogue corrections can therefore affect future logs without silently
  // rewriting history.
  repo?.registerBeforeWrite(({next,current})=>{
    const previousIds=new Set();
    for(const rows of Object.values(current?.logs||{}))for(const row of rows||[])if(row?.id!=null)previousIds.add(String(row.id));
    for(const rows of Object.values(next?.logs||{})){
      for(const row of rows||[]){
        if(!row||row.id==null||previousIds.has(String(row.id)))continue;
        const food=foodFromState(next,row.foodId);
        if(!food)continue;
        const c=completeness(food);
        row.nutritionCompleteness={coreComplete:c.coreComplete,missing:[...c.missing]};
        row.foodEvidence={
          sourceName:food.sourceName??null,
          sourceFoodCode:food.sourceFoodCode??null,
          sourceYear:food.sourceYear??null,
          sourceType:food.sourceType??null,
          basis:food.basis??'per 100 g edible portion',
          recipeVariant:food.recipeVariant??null,
          confidence:food.confidence??(food.quality==='Estimated'?'low':'unreviewed'),
          reviewedAt:food.reviewedAt??null,
          quality:food.quality??null
        };
        if(!finite(food.protein))row.protein=null;
        if(!finite(food.fibre))row.fibre=null;
        const extra=snapshotExtra(food,row.grams);
        row.carbs=extra.carbs;row.fat=extra.fat;row.salt=extra.salt;
      }
    }
    return next;
  });

  function ensureCustomFields(){
    const grid=qs('.custom-food-card .custom-grid');
    if(!grid||$('customSalt'))return;
    const portion=$('customPortion')?.closest('label');
    const html=`<label>Carbohydrate / 100 g <span class="muted">optional</span><input id="customCarbs" type="number" min="0" step="0.1" inputmode="decimal"></label><label>Fat / 100 g <span class="muted">optional</span><input id="customFat" type="number" min="0" step="0.1" inputmode="decimal"></label><label>Salt / 100 g <span class="muted">optional</span><input id="customSalt" type="number" min="0" step="0.01" inputmode="decimal"></label>`;
    if(portion)portion.insertAdjacentHTML('beforebegin',html);else grid.insertAdjacentHTML('beforeend',html);
    const note=document.createElement('p');note.className='tiny-note';note.id='nutritionMissingNote';note.textContent='Leave an unavailable nutrient blank. Okello Food stores missing as missing, not as zero.';
    grid.insertAdjacentElement('afterend',note);
  }

  window.addEventListener('okello:product-looked-up',event=>{
    const product=event.detail?.product;if(!product)return;
    lastProduct=product;
    ensureCustomFields();
    if($('customCarbs'))$('customCarbs').value=product.carbs100===null?'':round1(product.carbs100);
    if($('customFat'))$('customFat').value=product.fat100===null?'':round1(product.fat100);
    if($('customSalt'))$('customSalt').value=product.salt100===null?'':round1(product.salt100);
  });

  function saveCustomWithMissingness(event){
    const button=event.target?.closest?.('#saveCustomFoodBtn');if(!button)return;
    ensureCustomFields();
    const name=$('customName')?.value.trim()||'';
    const kcal=nullable($('customKcal')?.value);
    if(!name||kcal===null||kcal<=0)return; // Let legacy validation explain invalid rows.
    event.preventDefault();event.stopImmediatePropagation();
    const barcode=String($('barcodeInput')?.value||'').replace(/\D/g,'');
    const matched=lastProduct&&barcode&&String(lastProduct.code)===barcode;
    const image=matched?lastProduct.image:(qs('#barcodePreview img')?.src||'');
    const now=new Date().toISOString();
    const food={
      id:`custom_${Date.now()}`,
      name,emoji:'🏷️',cat:$('customCategory')?.value||'Custom',
      kcal,protein:nullable($('customProtein')?.value),fibre:nullable($('customFibre')?.value),
      carbs:nullable($('customCarbs')?.value),fat:nullable($('customFat')?.value),salt:nullable($('customSalt')?.value),
      portion:Math.max(1,Number($('customPortion')?.value)||100),
      note:matched?'Saved from Open Food Facts; check the packet label if anything looks wrong.':'User-saved food; blank nutrients remain unavailable.',
      image,barcode,
      sourceName:matched?'Open Food Facts':'User-entered nutrition label',
      sourceFoodCode:matched?barcode:null,
      sourceYear:matched?new Date().getFullYear():null,
      sourceType:matched?'packaged-product-database':'user-entered-label',
      basis:'per 100 g',
      recipeVariant:null,
      confidence:matched?'packet-review-required':'user-entered',
      reviewedAt:now,
      servingG:matched?lastProduct.servingG:null,
      servingSizeText:matched?lastProduct.servingSizeText:null,
      productQuantity:matched?lastProduct.productQuantity:null,
      productQuantityUnit:matched?lastProduct.productQuantityUnit:null,
      quantityText:matched?lastProduct.quantityText:null,
      sourceLicense:matched?lastProduct.sourceLicense:null,
      sourceUrl:matched?lastProduct.sourceUrl:null
    };
    food.nutritionCompleteness=completeness(food);
    const result=repo?.mutate(state=>{state.customFoods=Array.isArray(state.customFoods)?state.customFoods:[];state.customFoods.push(food);return state;},{source:'custom-food-v46'});
    if(!result?.ok){toast('Could not save that food. Your existing data was kept.');return;}
    toast('Custom food saved with nutrition evidence');
    setTimeout(()=>location.reload(),350);
  }
  document.addEventListener('click',saveCustomWithMissingness,true);

  function totalWithCoverage(entries,key){
    let value=0,known=0,missing=0;
    for(const row of entries){
      if(finite(row?.[key])){value+=Number(row[key]);known++;}else missing++;
    }
    return {value:round1(value),known,missing,total:entries.length};
  }
  function ensureMoreNutrition(){
    const today=$('tab-today');const score=qs('.score-grid',today);if(!today||!score)return null;
    let card=$('v46MoreNutrition');
    if(!card){
      card=document.createElement('section');card.id='v46MoreNutrition';card.className='card';
      card.innerHTML='<div class="section-heading"><div><p class="eyebrow">MORE NUTRITION</p><h3>Only what the source actually knows</h3></div></div><div class="score-grid"><article class="score-card"><span>Carbohydrate</span><strong data-v46-n="carbs">—</strong><small data-v46-c="carbs">Unavailable</small></article><article class="score-card"><span>Fat</span><strong data-v46-n="fat">—</strong><small data-v46-c="fat">Unavailable</small></article><article class="score-card"><span>Salt</span><strong data-v46-n="salt">—</strong><small data-v46-c="salt">Unavailable</small></article></div><p class="tiny-note">Partial means at least one logged food did not have that nutrient in its source. Missing is never treated as zero.</p>';
      score.insertAdjacentElement('afterend',card);
    }
    return card;
  }
  function evidenceUncertain(entry){
    return entry?.amountQuality==='estimated'||entry?.foodEvidence?.quality==='Estimated'||entry?.foodEvidence?.confidence==='low'||entry?.foodEvidence?.sourceType==='recipe-estimate';
  }
  function renderIntegrity(){
    const state=readState();const entries=state.logs?.[todayKey()]||[];const card=ensureMoreNutrition();
    if(card){
      for(const key of ['carbs','fat','salt']){
        const t=totalWithCoverage(entries,key);const strong=qs(`[data-v46-n="${key}"]`,card);const small=qs(`[data-v46-c="${key}"]`,card);
        if(!t.known){strong.textContent='—';small.textContent=entries.length?'Source data unavailable':'Nothing logged';}
        else{strong.textContent=`${key==='salt'?round1(t.value):Math.round(t.value)} g`;small.textContent=t.missing?`Partial · ${t.missing} item${t.missing===1?'':'s'} unavailable`:'From all logged foods';}
      }
    }
    const protein=totalWithCoverage(entries,'protein'),fibre=totalWithCoverage(entries,'fibre');
    const proteinSmall=$('todayProtein')?.closest('.score-card')?.querySelector('small');
    const fibreSmall=$('todayFibre')?.closest('.score-card')?.querySelector('small');
    if(proteinSmall&&protein.missing)proteinSmall.textContent=`Partial · ${protein.missing} item${protein.missing===1?'':'s'} unavailable`;
    if(fibreSmall&&fibre.missing)fibreSmall.textContent=`Partial · ${fibre.missing} item${fibre.missing===1?'':'s'} unavailable`;

    const uncertain=entries.some(evidenceUncertain);
    const calText=$('calRemainText');
    if(calText&&uncertain&&!calText.textContent.startsWith('~')&&!/No target/i.test(calText.textContent))calText.textContent='~'+calText.textContent+' based on logged estimates';

    qsa('#todayLog .log-row').forEach((row,index)=>{
      const entry=entries[index];if(!entry)return;
      let badge=qs('.v46-food-evidence',row);
      if(!badge){badge=document.createElement('span');badge.className='v44-estimate-badge v46-food-evidence';const meta=qs('.meta',row);if(meta)meta.insertAdjacentElement('afterend',badge);}
      const missing=entry.nutritionCompleteness?.missing||[];
      if(missing.length){badge.textContent='Nutrition partly unavailable';badge.hidden=false;}
      else if(entry.foodEvidence?.quality==='Estimated'||entry.foodEvidence?.confidence==='low'){badge.textContent='Food data estimated';badge.hidden=false;}
      else if(entry.foodEvidence?.sourceName){badge.textContent=String(entry.foodEvidence.sourceName);badge.hidden=false;}
      else badge.hidden=true;
    });
  }

  ensureCustomFields();
  const todayLog=$('todayLog');if(todayLog)new MutationObserver(renderIntegrity).observe(todayLog,{childList:true,subtree:true});
  window.addEventListener('okello:food-log-changed',renderIntegrity);
  setTimeout(renderIntegrity,0);setTimeout(renderIntegrity,700);

  window.OkelloNutritionIntegrityV46=Object.freeze({version:VERSION,completeness,totalWithCoverage,render:renderIntegrity,get lastProduct(){return lastProduct;}});
})();