(() => {
  'use strict';
  const KEY='okello_food_tracker_v3';
  try{
    const state=JSON.parse(localStorage.getItem(KEY)||'{}')||{};
    state.customFoods=Array.isArray(state.customFoods)?state.customFoods:[];

    // Apple is a global everyday food, so keep world_apple and remove the older Ghana-prefixed duplicate.
    state.customFoods=state.customFoods.filter(f=>f && f.id!=='ghana_apple');

    // One canonical generic shito estimate. Homemade/jarred shito should still use the recipe or label value.
    const shito=state.customFoods.find(f=>f && f.id==='ghana_shito');
    if(shito){
      Object.assign(shito,{
        kcal:350,
        protein:5,
        fibre:4,
        portion:15,
        min:5,
        max:25,
        quality:'Estimated',
        note:'Generic estimate; oil varies greatly. For your own shito, use the recipe calculator or jar label.',
        normalizationVersion:1
      });
    }

    localStorage.setItem(KEY,JSON.stringify(state));
  }catch(_){
    // The main tracker can still run if storage is unavailable.
  }
})();