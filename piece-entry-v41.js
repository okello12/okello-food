(() => {
  'use strict';

  const contract=window.OkelloMealDataContract;
  if(!contract)return;

  const VERSION=1;
  const LABELS=Object.freeze({
    small:'Small piece',
    medium:'Medium piece',
    large:'Large piece',
    piece:'Piece',
    whole:'Whole',
    half:'Half',
    claw:'Claw'
  });

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

  function estimatePieces(state,foodId,pieceKey,count){
    const id=resolveFoodId(foodId);
    const n=Number(count);
    if(!(n>0))return null;
    const estimate=contract.pieceEstimate?.(state||{},id,String(pieceKey||''),n);
    if(!estimate)return null;
    return {
      foodId:id,
      enteredAmount:n,
      enteredUnit:'pieces',
      pieceCount:n,
      pieceKey:String(pieceKey||''),
      grams:estimate.grams,
      estimatedGrams:estimate.estimatedGrams,
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
      amountQuality:'weighed',
      estimateSource:null
    };
  }

  function nutritionSnapshot(food,amount){
    if(!food||!amount||!(Number(amount.grams)>0))return null;
    const grams=Number(amount.grams);
    return {
      kcal:round((Number(food.kcal)||0)*grams/100),
      protein:round((Number(food.protein)||0)*grams/100),
      fibre:round((Number(food.fibre)||0)*grams/100)
    };
  }

  function createLogDraft({food,amount,meal='Other',plateId=null,source='piece-entry',ts=Date.now(),id=null}={}){
    if(!food||!amount)return null;
    const canonicalId=resolveFoodId(amount.foodId||food.id);
    if(!canonicalId||!(Number(amount.grams)>0))return null;
    const nutrition=nutritionSnapshot(food,amount);
    if(!nutrition)return null;
    const logId=id||((globalThis.crypto&&typeof globalThis.crypto.randomUUID==='function')?globalThis.crypto.randomUUID():`log_${ts}_${Math.random().toString(36).slice(2)}`);
    const out={
      id:logId,
      foodId:canonicalId,
      name:food.name||canonicalId,
      emoji:food.emoji||'🍽️',
      grams:Number(amount.grams),
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
    if(amount.estimatedGrams!=null)out.estimatedGrams=Number(amount.estimatedGrams);
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
    resolveFoodId,
    optionsFor,
    estimatePieces,
    weighedGrams,
    nutritionSnapshot,
    createLogDraft,
    calibrationObservation,
    applyCalibrationObservation,
    calibrationStatus
  });
})();
