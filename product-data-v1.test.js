(() => {
  'use strict';

  const output=document.getElementById('testOutput');
  const rows=[];
  let passed=0,failed=0;

  function write(name,ok,detail=''){
    rows.push({name,ok,detail});
    ok?passed++:failed++;
  }
  function assert(name,condition,detail=''){
    if(!condition) throw new Error(detail||name);
    write(name,true,detail);
  }
  function equal(name,actual,expected){
    const ok=Object.is(actual,expected);
    if(!ok) throw new Error(`${name}: expected ${String(expected)}, got ${String(actual)}`);
    write(name,true);
  }

  async function run(){
    const api=window.OkelloProductData;
    if(!api) throw new Error('OkelloProductData is not loaded');

    const base={product_name:'Test food',nutriments:{'energy-kcal_100g':'100'}};

    let p=api.normalise('12345678',{...base,nutriments:{'energy-kcal_100g':'100'}});
    equal('missing protein stays null',p.protein100,null);
    equal('missing protein completeness is false',p.completeness.protein,false);

    p=api.normalise('12345678',{...base,nutriments:{'energy-kcal_100g':'100',proteins_100g:''}});
    equal('empty-string protein stays null',p.protein100,null);

    p=api.normalise('12345678',{...base,nutriments:{'energy-kcal_100g':'100',proteins_100g:'0'}});
    equal('string zero protein is real zero',p.protein100,0);
    equal('zero protein completeness is true',p.completeness.protein,true);
    equal('zero protein ratio is zero when calories positive',p.proteinPer100Kcal,0);

    p=api.normalise('12345678',{...base,nutriments:{'energy-kcal_100g':'0',proteins_100g:'10'}});
    equal('zero calories are preserved',p.kcal100,0);
    equal('ratio is null when calories are zero',p.proteinPer100Kcal,null);
    equal('zero calories completeness is true',p.completeness.kcal,true);

    p=api.normalise('12345678',{...base,serving_quantity:'0'});
    equal('zero serving quantity is not a valid pack serving',p.servingG,null);
    equal('zero serving completeness is false',p.completeness.serving,false);

    p=api.normalise('12345678',{...base,serving_quantity:'42'});
    equal('positive serving quantity is preserved',p.servingG,42);

    p=api.normalise('12345678',{product_name:'Zero sugar',nutriments:{'energy-kcal_100g':'50',sugars_100g:'0','saturated-fat_100g':'0',salt_100g:'0'}});
    equal('zero sugar is preserved',p.sugar100,0);
    equal('zero saturated fat is preserved',p.saturatedFat100,0);
    equal('zero salt is preserved',p.salt100,0);

    const realFetch=window.fetch;
    let calls=0;
    try{
      window.fetch=()=>{
        calls++;
        return Promise.resolve({
          ok:true,
          json:()=>Promise.resolve({status:1,product:{product_name:'Shared result',nutriments:{'energy-kcal_100g':'80',proteins_100g:'8'}}})
        });
      };
      const a=api.get('87654321');
      const b=api.get('87654321');
      assert('same barcode returns the exact same in-flight promise',a===b);
      const [pa,pb]=await Promise.all([a,b]);
      assert('both consumers receive the identical product object',pa===pb);
      equal('concurrent consumers make one network request',calls,1);
      assert('normalised result is frozen',Object.isFrozen(pa));
    }finally{
      window.fetch=realFetch;
    }
  }

  Promise.resolve().then(run).catch(err=>{
    failed++;
    rows.push({name:'contract test run',ok:false,detail:err&&err.message?err.message:String(err)});
    console.error('Okello product-data contract tests failed',err);
  }).finally(()=>{
    const result={passed,failed,rows};
    window.OkelloProductDataContractTests=result;
    if(output){
      output.innerHTML=`<h1>${failed?'FAIL':'PASS'} · ${passed} passed · ${failed} failed</h1>`+
        rows.map(r=>`<p class="${r.ok?'pass':'fail'}"><strong>${r.ok?'✓':'✕'} ${r.name}</strong>${r.detail?' — '+r.detail:''}</p>`).join('');
    }
    if(failed===0) console.info('Okello product-data contract tests passed',result);
  });
})();
