(() => {
  'use strict';

  const piece=window.OkelloPieceEntry;
  const usual=window.OkelloPieceUsual;
  if(!piece||!usual)return;

  const VERSION=1;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const positive=value=>Number(value)>0?Number(value):null;

  function canonicalSmartSuggestion(foodId,smartResult){
    const suggestion=smartResult?.pieceSuggestion;
    if(!suggestion)return null;
    if(piece.resolveFoodId(suggestion.foodId)!==piece.resolveFoodId(foodId))return null;
    const count=positive(suggestion.pieceCount);
    const key=String(suggestion.pieceKey||'');
    if(!count||!key)return null;
    return clone(suggestion);
  }

  function openDraft({state={},food,meal='Other',smartResult=null}={}){
    if(!food)return null;
    const foodId=piece.resolveFoodId(food.id);
    const preferred=piece.preferredEntry(foodId,state);
    const smartSuggestion=canonicalSmartSuggestion(foodId,smartResult);
    const targetGrams=positive(smartResult?.targetGrams);

    if(preferred.enteredUnit==='pieces'){
      const remembered=usual.usualPiecePortion(state,foodId,meal);
      const available=new Set(piece.optionsFor(foodId,state).map(x=>x.pieceKey));
      const pieceKey=remembered&&available.has(remembered.pieceKey)?remembered.pieceKey:preferred.pieceKey;
      const count=remembered&&pieceKey===remembered.pieceKey?remembered.pieceCount:1;
      const amount=piece.estimatePieces(state,foodId,pieceKey,count);
      return {
        version:VERSION,
        foodId,
        meal,
        mode:'pieces',
        pieceKey,
        count,
        amount,
        usualPiece:remembered?clone(remembered):null,
        smartSuggestion,
        targetGrams,
        selectionSource:remembered?'personal-piece-usual':'default-one-piece',
        resumePiece:null
      };
    }

    const grams=positive(food.portion)||positive(smartResult?.grams)||100;
    return {
      version:VERSION,
      foodId,
      meal,
      mode:'grams',
      pieceKey:null,
      count:null,
      amount:piece.estimatedGramAmount(foodId,grams),
      usualPiece:null,
      smartSuggestion:null,
      targetGrams,
      selectionSource:'default-grams',
      resumePiece:null
    };
  }

  function setCount(draft,state,count){
    if(!draft||draft.mode!=='pieces')return draft;
    const n=Math.max(1,Math.min(99,Math.round(Number(count)||1)));
    const amount=piece.estimatePieces(state||{},draft.foodId,draft.pieceKey,n);
    if(!amount)return draft;
    return {...draft,count:n,amount,selectionSource:'manual-piece-count'};
  }

  function stepCount(draft,state,delta){
    return setCount(draft,state,(Number(draft?.count)||1)+(Number(delta)||0));
  }

  function selectPieceKey(draft,state,pieceKey){
    if(!draft||draft.mode!=='pieces')return draft;
    const key=String(pieceKey||'');
    if(!piece.optionsFor(draft.foodId,state||{}).some(x=>x.pieceKey===key))return draft;
    const amount=piece.estimatePieces(state||{},draft.foodId,key,Number(draft.count)||1);
    if(!amount)return draft;
    return {...draft,pieceKey:key,amount,selectionSource:'manual-piece-size'};
  }

  function applySmartSuggestion(draft,state){
    if(!draft||draft.mode!=='pieces'||!draft.smartSuggestion)return draft;
    const suggestion=draft.smartSuggestion;
    const amount=piece.estimatePieces(state||{},draft.foodId,suggestion.pieceKey,suggestion.pieceCount);
    if(!amount)return draft;
    return {
      ...draft,
      pieceKey:suggestion.pieceKey,
      count:Number(suggestion.pieceCount),
      amount,
      selectionSource:'smart-portion'
    };
  }

  function switchToGrams(draft){
    if(!draft||draft.mode!=='pieces')return draft;
    const grams=piece.effectiveGrams(draft.amount);
    if(!(grams>0))return draft;
    return {
      ...draft,
      mode:'grams',
      pieceKey:null,
      count:null,
      amount:piece.estimatedGramAmount(draft.foodId,grams),
      selectionSource:'converted-to-grams',
      // This is transient UI state only. It lets a user switch back before
      // confirming without putting stale piece provenance into the final log.
      resumePiece:{pieceKey:draft.pieceKey,count:draft.count,selectionSource:draft.selectionSource}
    };
  }

  function setGramValue(draft,grams,quality='estimated'){
    if(!draft||draft.mode!=='grams')return draft;
    const amount=quality==='weighed'
      ? piece.weighedGrams(draft.foodId,grams)
      : piece.estimatedGramAmount(draft.foodId,grams);
    if(!amount)return draft;
    return {...draft,amount,selectionSource:quality==='weighed'?'manual-weighed-grams':'manual-estimated-grams'};
  }

  function switchToPieces(draft,state){
    if(!draft||draft.mode!=='grams')return draft;
    const options=piece.optionsFor(draft.foodId,state||{});
    if(!options.length)return draft;
    const resume=draft.resumePiece;
    const preferred=piece.preferredEntry(draft.foodId,state||{});
    const key=resume&&options.some(x=>x.pieceKey===resume.pieceKey)?resume.pieceKey:preferred.pieceKey;
    const count=resume&&Number(resume.count)>0?Number(resume.count):1;
    const amount=piece.estimatePieces(state||{},draft.foodId,key,count);
    if(!amount)return draft;
    return {
      ...draft,
      mode:'pieces',
      pieceKey:key,
      count,
      amount,
      selectionSource:resume?.selectionSource||'default-one-piece'
    };
  }

  function nutritionFor(food,draft){
    return piece.nutritionSnapshot(food,draft?.amount)||{kcal:0,protein:0,fibre:0};
  }

  function viewModel(food,draft){
    if(!draft)return null;
    const currentGrams=piece.effectiveGrams(draft.amount);
    const target=positive(draft.targetGrams);
    const suggestion=draft.smartSuggestion;
    return {
      mode:draft.mode,
      currentGrams,
      nutrition:nutritionFor(food,draft),
      targetGrams:target,
      currentVsTargetGrams:target==null?null:currentGrams-target,
      smartSuggestion:suggestion?clone(suggestion):null,
      smartUnusedGrams:suggestion&&target!=null?target-Number(suggestion.estimatedGrams||suggestion.grams||0):null
    };
  }

  function finalAmount(draft){
    if(!draft?.amount)return null;
    // Only the active amount is persisted. `resumePiece`, selectionSource,
    // targetGrams and Smart Portion context are sheet state, not log provenance.
    return clone(draft.amount);
  }

  window.OkelloPieceSheetContract=Object.freeze({
    version:VERSION,
    openDraft,
    setCount,
    stepCount,
    selectPieceKey,
    applySmartSuggestion,
    switchToGrams,
    setGramValue,
    switchToPieces,
    nutritionFor,
    viewModel,
    finalAmount
  });
})();
