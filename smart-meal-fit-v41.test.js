const assert=require('assert');
const fit=require('./smart-meal-fit-v41.js');

const calc=(food,grams)=>({
  kcal:(Number(food.kcal)||0)*grams/100,
  protein:(Number(food.protein)||0)*grams/100,
  fibre:(Number(food.fibre)||0)*grams/100
});

const fufu={id:'ghana_fufu',name:'Fufu',cat:'Starch',kcal:145,protein:1.4,fibre:2.1,portion:250,min:180,max:300};
const goat={id:'goat',name:'Goat',cat:'Protein',kcal:143,protein:27,fibre:0,portion:175,min:150,max:200};
const light={id:'light_soup',name:'Light soup',cat:'Soup',kcal:55,protein:4,fibre:1,portion:350,min:250,max:450};
const banku={id:'banku',name:'Banku',cat:'Starch',kcal:145,protein:2.2,fibre:1,portion:225,min:180,max:250};
const tilapia={id:'tilapia',name:'Tilapia',cat:'Protein',kcal:128,protein:26,fibre:0,portion:220,min:180,max:250};
const okro={id:'ghana_okro_stew',name:'Okro stew',cat:'Soup',kcal:95,protein:5,fibre:2.8,portion:300,min:220,max:400};

{
  const result=fit.fitFoods([fufu,goat,light],27,calc);
  assert.equal(result.fit,false,'27 kcal must not produce a token Ghanaian plate');
  assert.equal(result.reason,'minimums-exceed-budget');
  assert.deepEqual(result.trace.initialGrams,[180,150,250]);
  assert.deepEqual(result.trace.finalGrams,[180,150,250],'minimums must be reapplied after scaling');
  assert(result.trace.finalKcal>27);
}

{
  const result=fit.fitFoods([fufu,goat,light],1035,calc);
  assert.equal(result.fit,true);
  assert.deepEqual(result.items.map(x=>x.grams),[195,200,450]);
}

// The second real-device batch is also below the governed minimums. The old
// composer emitted 160 g banku + 160 g tilapia + 260 g okro at a 690 kcal
// lunch budget. Under the new rule that combination must be declined rather
// than preserving the legacy under-minimum amounts.
{
  const result=fit.fitFoods([banku,tilapia,okro],690,calc);
  assert.equal(result.fit,false);
  assert.equal(result.reason,'minimums-exceed-budget');
  assert.deepEqual(result.trace.finalGrams,[180,180,260]);
  assert(result.trace.finalKcal>690);
}

{
  const result=fit.fitFoods([banku,tilapia,okro],940,calc);
  assert.equal(result.fit,true);
  assert.deepEqual(result.items.map(x=>x.grams),[180,240,390]);
  assert(result.kcal<=940+1e-9);
}

// Property regression: whenever a suggestion exists, every component is inside
// that food's declared sensible range. This is the invariant the old 5 g floor broke.
for(let budget=1;budget<=2500;budget++){
  for(const foods of [[fufu,goat,light],[banku,tilapia,okro]]){
    const result=fit.fitFoods(foods,budget,calc);
    if(!result.fit)continue;
    result.items.forEach(item=>{
      const bounds=fit.boundsFor(item.food);
      assert(item.grams>=bounds.min-1e-9,`budget ${budget}: ${item.food.id} ${item.grams} g < min ${bounds.min}`);
      assert(item.grams<=bounds.max+1e-9,`budget ${budget}: ${item.food.id} ${item.grams} g > max ${bounds.max}`);
    });
    assert(result.kcal<=budget+1e-9,`budget ${budget}: suggestion exceeds budget`);
  }
}

// There must be no arbitrary 5 g token-portion fallback anywhere in the fit contract.
assert.equal(fit.roundWithinBounds(2,180,300),180);

console.log('smart-meal-fit-v41: all tests passed');
