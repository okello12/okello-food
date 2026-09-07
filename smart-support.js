(() => {
  'use strict';

  const KEY='okello_food_tracker_v3';
  try{
    const raw=localStorage.getItem(KEY);
    const s=JSON.parse(raw||'{}')||{};
    const before=JSON.stringify(s);
    s.customFoods=Array.isArray(s.customFoods)?s.customFoods:[];

    // Canonical identity belongs to storage-migration-v1. In particular, never
    // recreate the retired ghana_okro_soup alias after migration has removed it.
    // This compatibility module now only supplies the legacy light-soup row on
    // installs that do not already have it.
    const light=s.customFoods.find(f=>f&&f.id==='ghana_light_soup');
    if(!light){
      s.customFoods.push({
        id:'ghana_light_soup',
        name:'Ghana light soup, estimate',
        emoji:'🍲',
        cat:'Soup',
        basis:'includes-protein',
        baseFoodId:'light_soup_base',
        kcal:55,
        protein:4,
        fibre:1,
        portion:350,
        min:250,
        max:450,
        note:'Estimate; meat/fish and recipe vary',
        region:'Ghana',
        source:'ghana',
        quality:'Estimated',
        dataSchemaVersion:1
      });
    }

    if(JSON.stringify(s)!==before)localStorage.setItem(KEY,JSON.stringify(s));
  }catch(_){}
})();