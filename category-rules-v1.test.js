(() => {
  'use strict';

  const output=document.getElementById('testOutput');
  const rows=[];
  let passed=0,failed=0;

  function ok(name,condition,detail=''){
    if(!condition)throw new Error(detail||name);
    rows.push({name,ok:true,detail});passed++;
  }
  function equal(name,actual,expected){
    if(!Object.is(actual,expected))throw new Error(`${name}: expected ${String(expected)}, got ${String(actual)}`);
    rows.push({name,ok:true,detail:''});passed++;
  }

  async function run(){
    const api=window.OkelloCategoryRules;
    const productApi=window.OkelloProductData;
    if(!api)throw new Error('OkelloCategoryRules is not loaded');
    if(!productApi)throw new Error('OkelloProductData is not loaded');

    let result=api.assess({
      sourceCategories:{tags:['en:dairy-products','en:yogurts']},
      proteinPer100Kcal:6,
      sugar100:5
    });
    equal('exact supported yoghurt tag matches',result.state,'supported');
    equal('yoghurt rule selected',result.ruleId,'yoghurt');
    equal('evidence tag retained',result.evidenceTag,'en:yogurts');
    ok('supported observations exist',result.observations.length===2);

    // Cross-module contract: feed the category engine the exact object shape
    // produced by OkelloProductData.normalise, not a hand-shaped approximation.
    const normalisedYoghurt=productApi.normalise('4016241051066',{
      product_name:'Integration yoghurt fixture',
      brands:'Arla',
      categories:'Yogurts',
      categories_tags:['en:dairy-products','en:yogurts'],
      serving_quantity:'200',
      nutriments:{
        'energy-kcal_100g':'65',
        proteins_100g:'11',
        sugars_100g:'4',
        fat_100g:'0.2',
        'saturated-fat_100g':'0.1',
        salt_100g:'0.12'
      }
    });
    equal('product-data canonical field is sugar100',normalisedYoghurt.sugar100,4);
    equal('product-data canonical category tag survives normalise',normalisedYoghurt.sourceCategories.tags.includes('en:yogurts'),true);
    result=api.assess(normalisedYoghurt);
    equal('normalise to assess integration reaches supported state',result.state,'supported');
    equal('normalise to assess integration selects yoghurt rule',result.ruleId,'yoghurt');
    ok('integration result contains category observations',result.observations.length===2);

    result=api.assess({
      sourceCategories:{tags:['en:yogurt-drinks']},
      proteinPer100Kcal:8,
      sugar100:3
    });
    equal('similar but unsupported tag does not fuzzy-match',result.state,'unsupported');
    equal('unsupported result has no rule',result.ruleId,null);
    equal('unsupported result has no category observations',result.observations.length,0);

    result=api.assess({
      sourceCategories:{tags:['en:dairy-desserts']},
      proteinPer100Kcal:20,
      fibrePer100Kcal:9,
      sugar100:0,
      salt100:0,
      kcal100:50
    });
    equal('unsupported high-density product stays generic',result.state,'unsupported');
    equal('unsupported product cannot borrow yoghurt or bread thresholds',result.ruleId,null);

    result=api.assess({
      sourceCategories:{tags:['en:yogurts']},
      proteinPer100Kcal:6,
      sugar100:null
    });
    equal('recognised category with missing required field is incomplete',result.state,'incomplete');
    ok('missing field is named',result.missing.includes('sugar100'));
    equal('incomplete category emits no category observations',result.observations.length,0);

    result=api.assess({
      sourceCategories:{tags:['en:yogurts']},
      proteinPer100Kcal:0,
      sugar100:0
    });
    equal('real zeroes count as present category data',result.state,'supported');
    equal('zero protein density remains zero',result.observations[0].value,0);
    equal('zero sugar remains zero',result.observations[1].value,0);

    result=api.assess({
      sourceCategories:{tags:['en:breads']},
      fibrePer100Kcal:3.2,
      salt100:0.8,
      kcal100:240
    });
    equal('bread exact tag matches',result.state,'supported');
    equal('bread rule selected',result.ruleId,'bread');
    equal('high fibre reference band is data-driven',result.observations[0].band,'high');

    result=api.assess({
      sourceCategories:{tags:['en:olive-oils']},
      fat100:100,
      saturatedFat100:14
    });
    equal('olive oil exact tag matches',result.state,'supported');
    equal('oil uses its own rule',result.ruleId,'olive-oil');
    equal('saturated fat share is derived transparently',Math.round(result.observations[0].value),14);

    result=api.assess({
      sourceCategories:{tags:['en:olive-oils']},
      fat100:0,
      saturatedFat100:0
    });
    equal('zero fat denominator cannot manufacture a ratio',result.state,'incomplete');

    ok('rule table is frozen',Object.isFrozen(api.rules));
    ok('individual rules are frozen',api.rules.every(Object.isFrozen));
  }

  Promise.resolve().then(run).catch(err=>{
    failed++;
    rows.push({name:'contract test run',ok:false,detail:err?.message||String(err)});
    console.error('Okello category-rule contract tests failed',err);
  }).finally(()=>{
    const result={passed,failed,rows};
    window.OkelloCategoryRuleContractTests=result;
    if(output){
      output.innerHTML=`<h1>${failed?'FAIL':'PASS'} · ${passed} passed · ${failed} failed</h1>`+
        rows.map(r=>`<p class="${r.ok?'pass':'fail'}"><strong>${r.ok?'✓':'✕'} ${r.name}</strong>${r.detail?' — '+r.detail:''}</p>`).join('');
    }
    if(failed===0)console.info('Okello category-rule contract tests passed',result);
  });
})();
