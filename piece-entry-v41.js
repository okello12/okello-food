(() => {
  'use strict';

  const contract=window.OkelloMealDataContract;
  if(!contract)return;

  const VERSION=3;
  const LABELS=Object.freeze({
    small:'Small piece',
    medium:'Medium piece',
    large:'Large piece',
    piece:'Piece',
    whole:'Whole',
    half:'Half',
    claw:'Claw'
  });
  const PIECE_KEY_PRIORITY=Object.freeze(['medium','piece','half','whole','small','large','claw']);

  const resolveFoodId=id=>contract.resolveFoodId?.(id)||String(id??'');
  const cloneState=state=>JSON.parse(JSON.stringify(state&&typeof state==='object'?state:{}));
  const round=n=>Math.round((Number(n)||0)*1000000)/1000000;

  function optionsFor(foodId,state={}){
    const id=resolveFoodId(foodId);
    const table=contract.pieceWeights?.[id];
    if(!table)return [];
    return Object.entries(table).map(([pieceKey,referenceGrams])=>{
      const personal=contract.personalPieceWeight?.(state,id,pieceKey);
      const observations=contract.calibrationObservations?.(state,id,pieceKey)||[];
      return {
        foodId:id,
        pieceKey,
        label:LABELS[pieceKey]||pieceKey,
        grams:personal??Number(referenceGrams),
        referenceGrams:Number(referenceGrams),
        estimateSource:personal!=null?'personal-piece-weight':'reference-piece-weight',
        observationCount:observations.length,
        calibrated:personal!=null
      };
    });
  }

  function preferredPieceKey(foodId,state={}){
    const options=optionsFor(foodId,state);
    if(!options.length)return null;
    for(const key of PIECE_KEY_PRIORITY){
      if(options.some(x=>x.pieceKey===key))return key;
    }
    return options[0].pieceKey;
  }

  function preferredEntry(foodId,state={}){
    const id=resolveFoodId(foodId);
    const pieceKey=preferredPieceKey(id,state);
    if(!pieceKey)return {foodId:id,enteredUnit:'g',pieceKey:null};
    const option=optionsFor(id,state).find(x=>x.pieceKey===pieceKey);
    return {
      foodId:id,
      enteredUnit:'pieces',
      pieceKey,
      label:option?.label||LABELS[pieceKey]||pieceKey,
      estimateBasisGrams:Number(option?.grams)||null,
      estimateSource:option?.estimateSource||null
    };
  }

  function estimatePieces(state,foodId,pieceKey,count){
    const id=resolveFoodId(foodId);
    const n=Number(count);
    if(!(n>0))return null;
    const estimate=contract.pieceEstimate?.(state||{},id,String(pieceKey||''),n);
    if(!estimate)return null;
    const estimatedGrams=Number(estimate.estimatedGrams);
    if(!(estimatedGrams>0))return null;
    return {
      foodId:id,
      enteredAmount:n,
      enteredUnit:'pieces',
      pieceCount:n,
      pieceKey:String(pieceKey||''),
      // Piece entries snapshot the converted gram estimate. `estimatedGrams`
      // is authoritative; `grams` is kept equal for compatibility with the
      // existing log/totals surfaces.
      grams:estimatedGrams,
      estimatedGrams,
      estimateBasisGrams:estimate.estimateBasisGrams,
      amountQuality:'estimated',
      estimateSource:estimate.estimateSource,
      observationCount:estimate.observationCount||0
    };
  }

  function weighedGrams(foodId,grams){
    const id=resolveFoodId(foodId);
    const g=Number(grams);
    if(!(g>0))return null;
    return {
      foodId:id,
      enteredAmount:g,
      enteredUnit:'g',
      grams:g,
      amountQuality:'weighed'
    };
  }

  function estimatedGramAmount(foodId,grams){
    const id=resolveFoodId(foodId);
    const g=Number(grams);
    if(!(g>0))return null;
    return {
      foodId:id,
      enteredAmount:g,
      enteredUnit:'g',
      grams:g,
      amountQuality:'estimated'
    };
  }

  function effectiveGrams(amount){
    if(!amount||typeof amount!=='object')return 0;
    if(amount.enteredUnit==='pieces'){
      const estimated=Number(amount.estimatedGrams);
      return estimated>0?estimated:0;
    }
    const grams=Number(amount.grams);
    return grams>0?grams:0;
  }

  function pieceSuggestionForGrams(state,foodId,targetGrams,pieceKey=null){
    const id=resolveFoodId(foodId);
    const target=Number(targetGrams);
    if(!(target>0))return null;
    const key=pieceKey||preferredPieceKey(id,state);
    if(!key)return null;
    const option=optionsFor(id,state).find(x=>x.pieceKey===key);
    const basis=Number(option?.grams);
    if(!(basis>0))return null;

    // Smart Portion must never round a discrete piece suggestion above the
    // continuous calorie budget. If even one piece does not fit, callers keep
    // the continuous gram suggestion and pieceSuggestion remains null.
    const pieceCount=Math.floor((target+1e-9)/basis);
    if(pieceCount<1)return null;
    const amount=estimatePieces(state,id,key,pieceCount);
    if(!amount)return null;
    return {
      foodId:id,
      pieceCount,
      pieceKey:key,
      label:option?.label||LABELS[key]||key,
      enteredAmount:pieceCount,
      enteredUnit:'pieces',
      grams:amount.estimatedGrams,
      estimatedGrams:amount.estimatedGrams,
      estimateBasisGrams:amount.estimateBasisGrams,
      estimateSource:amount.estimateSource,
      calibrated:amount.estimateSource==='personal-piece-weight',
      targetGrams:target,
      deltaGrams:round(amount.estimatedGrams-target)
    };
  }

  function nutritionSnapshot(food,amount){
    const grams=effectiveGrams(amount);
    if(!food||!(grams>0))return null;
    return {
      kcal:round((Number(food.kcal)||0)*grams/100),
      protein:round((Number(food.protein)||0)*grams/100),
      fibre:round((Number(food.fibre)||0)*grams/100)
    };
  }

  function createLogDraft({food,amount,meal='Other',plateId=null,source='piece-entry',ts=Date.now(),id=null}={}){
    if(!food||!amount)return null;
    const canonicalId=resolveFoodId(amount.foodId||food.id);
    const grams=effectiveGrams(amount);
    if(!canonicalId||!(grams>0))return null;
    const nutrition=nutritionSnapshot(food,amount);
    if(!nutrition)return null;
    const logId=id||((globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')?globalThis.crypto.randomUUID():`log_${ts}_${Math.random().toString(36).slice(2)}`);
    const out={
      id:logId,
      foodId:canonicalId,
      name:food.name||canonicalId,
      emoji:food.emoji||'🍽️',
      grams,
      meal,
      kcal:nutrition.kcal,
      protein:nutrition.protein,
      fibre:nutrition.fibre,
      ts:Number(ts)||Date.now(),
      source,
      amountQuality:amount.amountQuality||'estimated'
    };
    if(plateId)out.plateId=String(plateId);
    if(amount.enteredAmount!=null)out.enteredAmount=Number(amount.enteredAmount);
    if(amount.enteredUnit)out.enteredUnit=String(amount.enteredUnit);
    if(amount.pieceCount!=null)out.pieceCount=Number(amount.pieceCount);
    if(amount.pieceKey)out.pieceKey=String(amount.pieceKey);
    if(amount.enteredUnit==='pieces')out.estimatedGrams=grams;
    if(amount.estimateBasisGrams!=null)out.estimateBasisGrams=Number(amount.estimateBasisGrams);
    if(amount.estimateSource)out.estimateSource=String(amount.estimateSource);
    if(amount.observationCount!=null)out.pieceCalibrationObservationCount=Number(amount.observationCount)||0;
    return out;
  }

  function calibrationObservation({foodId,pieceKey,grams,observedAt=Date.now(),id=null}={}){
    const canonicalId=resolveFoodId(foodId);
    const g=Number(grams);
    const key=String(pieceKey||'');
    if(!canonicalId||!key||!(g>0))return null;
    const ref=contract.pieceWeights?.[canonicalId]?.[key];
    if(!(Number(ref)>0))return null;
    return {
      id:id||`piece_obs_${Number(observedAt)||Date.now()}_${Math.random().toString(36).slice(2)}`,
      foodId:canonicalId,
      pieceKey:key,
      grams:g,
      observedAt:Number(observedAt)||Date.now(),
      source:'weighed-piece-calibration'
    };
  }

  function applyCalibrationObservation(state,observation){
    if(!observation)return null;
    const next=cloneState(state);
    next.pieceCalibration=next.pieceCalibration&&typeof next.pieceCalibration==='object'?next.pieceCalibration:{};
    next.pieceCalibration.observations=Array.isArray(next.pieceCalibration.observations)?next.pieceCalibration.observations:[];
    if(!next.pieceCalibration.observations.some(x=>String(x?.id||'')===String(observation.id||''))){
      next.pieceCalibration.observations.push({...observation});
    }
    const rows=contract.calibrationObservations?.(next,observation.foodId,observation.pieceKey)||[];
    const personal=contract.personalPieceWeight?.(next,observation.foodId,observation.pieceKey);
    return {
      state:next,
      observation:{...observation},
      observationCount:rows.length,
      promoted:personal!=null,
      personalPieceWeight:personal
    };
  }

  function calibrationStatus(state,foodId,pieceKey){
    const id=resolveFoodId(foodId);
    const rows=contract.calibrationObservations?.(state||{},id,pieceKey)||[];
    const personal=contract.personalPieceWeight?.(state||{},id,pieceKey);
    return {
      foodId:id,
      pieceKey:String(pieceKey||''),
      observationCount:rows.length,
      observationsNeeded:Math.max(0,3-rows.length),
      calibrated:personal!=null,
      personalPieceWeight:personal
    };
  }

  window.OkelloPieceEntry=Object.freeze({
    version:VERSION,
    labels:LABELS,
    pieceKeyPriority:PIECE_KEY_PRIORITY,
    resolveFoodId,
    optionsFor,
    preferredPieceKey,
    preferredEntry,
    estimatePieces,
    weighedGrams,
    estimatedGramAmount,
    effectiveGrams,
    pieceSuggestionForGrams,
    nutritionSnapshot,
    createLogDraft,
    calibrationObservation,
    applyCalibrationObservation,
    calibrationStatus
  });
})();
