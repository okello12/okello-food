(() => {
  'use strict';

  const piece=window.OkelloPieceEntry;
  if(!piece)return;

  const VERSION=1;

  // Smart Portion's calorie engine works in continuous grams. This adapter turns
  // that target into an actionable amount without asking the UI to infer units.
  // For piece-native foods the returned `grams` is the discrete amount that can
  // actually be logged, while `targetGrams` preserves the continuous engine target.
  function actionableAmount({state={},food,targetGrams,pieceKey=null}={}){
    const target=Number(targetGrams);
    if(!food||!(target>0))return {grams:0,targetGrams:Math.max(0,target||0),pieceSuggestion:null};

    const suggestion=piece.pieceSuggestionForGrams(state,food.id,target,pieceKey);
    if(!suggestion){
      return {
        grams:target,
        targetGrams:target,
        pieceSuggestion:null
      };
    }

    return {
      grams:Number(suggestion.estimatedGrams),
      targetGrams:target,
      pieceSuggestion:{...suggestion}
    };
  }

  // This is the return-shape contract smartPortionFor will use when the v41
  // modules are wired into app boot. Nutrition/reason text should be calculated
  // after this conversion, from `grams`, so the displayed calories correspond to
  // the actionable piece amount rather than the unattainable continuous target.
  function resultShape({state={},food,targetGrams,base={},pieceKey=null}={}){
    const amount=actionableAmount({state,food,targetGrams,pieceKey});
    return {
      ...base,
      grams:amount.grams,
      targetGrams:amount.targetGrams,
      pieceSuggestion:amount.pieceSuggestion
    };
  }

  window.OkelloSmartPortionOutput=Object.freeze({
    version:VERSION,
    actionableAmount,
    resultShape
  });
})();
