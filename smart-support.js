(() => {
  'use strict';
  const KEY='okello_food_tracker_v3';
  try{
    const s=JSON.parse(localStorage.getItem(KEY)||'{}')||{};
    s.customFoods=Array.isArray(s.customFoods)?s.customFoods:[];
    const byId=id=>s.customFoods.find(f=>f&&f.id===id);
    const add=f=>{if(!byId(f.id))s.customFoods.push(f);};
    const okro=byId('ghana_okro_stew');
    add(okro?{...okro,id:'ghana_okro_soup',name:'Okro soup / stew, estimate'}:{id:'ghana_okro_soup',name:'Okro soup / stew, estimate',emoji:'🥘',cat:'Soup',kcal:95,protein:5,fibre:2.8,portion:300,min:220,max:400,note:'Estimate; oil and assorted meat/fish vary'});
    add({id:'ghana_light_soup',name:'Ghana light soup, estimate',emoji:'🍲',cat:'Soup',kcal:55,protein:4,fibre:1,portion:350,min:250,max:450,note:'Estimate; meat/fish and recipe vary'});
    localStorage.setItem(KEY,JSON.stringify(s));
  }catch(_){}
})();