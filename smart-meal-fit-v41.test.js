const assert=require('assert');
const fit=require('./smart-meal-fit-v41.js');

const calc=(food,grams)=>({
  kcal:(Number(food.kcal)||0)*grams/100,
  protein:(Number(food.protein)||0)*grams/100,
  fibre:(Number(food.fibre)||0)*grams/100
});

const fufu={id:'ghana_fufu',name:'Fufu',cat:'Starch',kcal:145,protein:1.4,fibre:2.1,portion:250,min:180,max:300};
const goat={id:'goat',name:'Goat',cat:'Protein',kcal:143,protein:27,fibre:0,portion:175,min:150,max:200,providesAnimalProtein:true};
const light={id:'light_soup',name:'Light soup',cat:'Soup',kcal:55,protein:4,fibre:1,portion:350,min:250,max:450};
const banku={id:'banku',name:'Banku',cat:'Starch',kcal:145,protein:2.2,fibre:1,portion:225,min:180,max:250};
const tilapia={id:'tilapia',name:'Tilapia',cat:'Protein',kcal:128,protein:26,fibre:0,portion:220,min:180,max:250,providesAnimalProtein:true};
const okro={id:'ghana_okro_stew',name:'Okro stew',cat:'Soup',kcal:95,protein:5,fibre:2.8,portion:300,min:220,max:400};
const foods=[fufu,goat,light,banku,tilapia,okro];
const resolve=id=>foods.find(food=>food.id===id)||null;

{
  const result=fit.fitFoods([fufu,goat,light],27,calc);
  assert.equal(result.fit,false,'27 kcal must not produce a token Ghanaian plate');
  assert.equal(result.reason,'minimums-exceed-budget');
  assert.deepEqual(result.items.map(x=>x.grams),[180,150,250]);
  assert.equal(result.kcal,613);
  assert.equal(result.overByKcal,586);
}

{
  const result=fit.chooseSuggestion(['ghana_fufu','goat','light_soup'],27,{resolve,calc});
  assert.equal(result.kind,'minimum-over-budget');
  assert.equal(result.fit,false);
  assert.deepEqual(result.items.map(x=>x.grams),[180,150,250]);
  assert.equal(result.kcal,613);
  assert.equal(result.overByKcal,586);
}

{
  const result=fit.chooseSuggestion(['ghana_fufu','goat','light_soup'],1035,{resolve,calc});
  assert.equal(result.kind,'full');
  assert.equal(result.fit,true);
  assert.deepEqual(result.items.map(x=>x.grams),[195,200,450]);
}

// A 690 kcal lunch plan is only about 10 kcal short of the three-part minimum.
// Do not pretend 160 g portions satisfy 180 g minimums and do not decline the
// whole idea. Prefer the smaller base + protein plate that genuinely fits.
{
  const result=fit.chooseSuggestion(['banku','tilapia','ghana_okro_stew'],690,{resolve,calc});
  assert.equal(result.kind,'reduced');
  assert.equal(result.fit,true);
  assert.deepEqual(result.items.map(x=>x.id),['banku','tilapia']);
  assert.deepEqual(result.droppedIds,['ghana_okro_stew']);
  assert.deepEqual(result.items.map(x=>x.grams),[215,250]);
  assert(result.kcal<=690+1e-9);
}

{
  const full=fit.fitFoods([banku,tilapia,okro],690,calc);
  assert.equal(full.fit,false);
  assert.equal(full.reason,'minimums-exceed-budget');
  assert.deepEqual(full.items.map(x=>x.grams),[180,180,220]);
  assert(Math.abs(full.kcal-700.4)<1e-9);
  assert(Math.abs(full.overByKcal-10.4)<1e-9);
}

{
  const result=fit.chooseSuggestion(['banku','tilapia','ghana_okro_stew'],940,{resolve,calc});
  assert.equal(result.kind,'full');
  assert.equal(result.fit,true);
  assert.deepEqual(result.items.map(x=>x.grams),[180,240,390]);
  assert(result.kcal<=940+1e-9);
}

// Property regression: anything actually suggested uses real serving bounds.
// A full/reduced fit stays inside budget. An honest minimum-over-budget result
// must state its overage exactly instead of shrinking foods below their minima.
for(let budget=1;budget<=2500;budget++){
  for(const ids of [
    ['ghana_fufu','goat','light_soup'],
    ['banku','tilapia','ghana_okro_stew']
  ]){
    const result=fit.chooseSuggestion(ids,budget,{resolve,calc});
    assert(result.items.length>=2);
    result.items.forEach(item=>{
      const bounds=fit.boundsFor(item.food);
      assert(item.grams>=bounds.min-1e-9,`budget ${budget}: ${item.food.id} ${item.grams} g < min ${bounds.min}`);
      assert(item.grams<=bounds.max+1e-9,`budget ${budget}: ${item.food.id} ${item.grams} g > max ${bounds.max}`);
    });
    if(result.kind==='minimum-over-budget'){
      assert(result.kcal>budget,`budget ${budget}: over-budget minimum should actually exceed budget`);
      assert(Math.abs(result.overByKcal-(result.kcal-budget))<1e-9);
    }else{
      assert(result.kcal<=budget+1e-9,`budget ${budget}: fitting suggestion exceeds budget`);
    }
  }
}

assert.equal(fit.roundWithinBounds(2,180,300),180,'there must be no arbitrary 5 g token floor');

console.log('smart-meal-fit-v41: all tests passed');
