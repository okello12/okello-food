(() => {
  'use strict';

  const API_BASE='https://world.openfoodfacts.org/api/v2/product/';
  const FIELDS=[
    'product_name','brands','nutriments','image_front_small_url',
    'serving_quantity','serving_size','categories','categories_tags'
  ].join(',');
  const inflight=new Map();

  function cleanBarcode(value){
    return String(value??'').replace(/\D/g,'');
  }

  function hasNumber(obj,key){
    if(!obj || !Object.prototype.hasOwnProperty.call(obj,key)) return false;
    const value=obj[key];
    return value!==null && value!=='' && Number.isFinite(Number(value));
  }

  function numberOrNull(obj,key){
    return hasNumber(obj,key) ? Number(obj[key]) : null;
  }

  function firstNumber(obj,keys){
    for(const key of keys){
      if(hasNumber(obj,key)) return Number(obj[key]);
    }
    return null;
  }

  function ratioPer100Kcal(value,kcal){
    return value!==null && kcal!==null && kcal>0 ? (value/kcal)*100 : null;
  }

  function error(code,message){
    const err=new Error(message||code);
    err.code=code;
    return err;
  }

  function normalise(code,rawProduct){
    const key=cleanBarcode(code);
    const p=rawProduct && typeof rawProduct==='object' ? rawProduct : {};
    const n=p.nutriments && typeof p.nutriments==='object' ? p.nutriments : {};

    let kcal100=numberOrNull(n,'energy-kcal_100g');
    if(kcal100===null){
      const energyKj=numberOrNull(n,'energy_100g');
      kcal100=energyKj===null ? null : energyKj/4.184;
    }

    const protein100=numberOrNull(n,'proteins_100g');
    const fibre100=firstNumber(n,['fiber_100g','fibre_100g']);
    const sugar100=numberOrNull(n,'sugars_100g');
    const saturatedFat100=firstNumber(n,['saturated-fat_100g','saturated_fat_100g']);
    const fat100=numberOrNull(n,'fat_100g');
    const salt100=numberOrNull(n,'salt_100g');
    const servingRaw=numberOrNull(p,'serving_quantity');
    const servingG=servingRaw!==null && servingRaw>0 ? servingRaw : null;

    const product={
      code:key,
      name:String(p.product_name||'Scanned product'),
      brands:String(p.brands||''),
      image:String(p.image_front_small_url||''),
      servingG,
      kcal100,
      protein100,
      fibre100,
      sugar100,
      saturatedFat100,
      fat100,
      salt100,
      proteinPer100Kcal:ratioPer100Kcal(protein100,kcal100),
      fibrePer100Kcal:ratioPer100Kcal(fibre100,kcal100),
      source:'openfoodfacts',
      sourceCheckedAt:new Date().toISOString(),
      completeness:Object.freeze({
        kcal:kcal100!==null,
        protein:protein100!==null,
        fibre:fibre100!==null,
        sugar:sugar100!==null,
        saturatedFat:saturatedFat100!==null,
        fat:fat100!==null,
        salt:salt100!==null,
        serving:servingG!==null
      }),
      sourceCategories:Object.freeze({
        text:String(p.categories||''),
        tags:Array.isArray(p.categories_tags)?p.categories_tags.map(String):[]
      })
    };

    return Object.freeze(product);
  }

  function requestProduct(code){
    const key=cleanBarcode(code);
    if(key.length<8) return Promise.reject(error('invalid-barcode','Enter a valid barcode first.'));
    if(inflight.has(key)) return inflight.get(key);

    let promise;
    promise=fetch(`${API_BASE}${encodeURIComponent(key)}.json?fields=${encodeURIComponent(FIELDS)}`,{
      headers:{Accept:'application/json'}
    }).then(response=>{
      if(!response.ok) throw error('product-request-failed','Product lookup failed.');
      return response.json();
    }).then(data=>{
      if(!data || data.status!==1 || !data.product) throw error('product-not-found','Product not found.');
      return normalise(key,data.product);
    }).finally(()=>{
      if(inflight.get(key)===promise) inflight.delete(key);
    });

    inflight.set(key,promise);
    return promise;
  }

  window.OkelloProductData=Object.freeze({
    version:1,
    get:requestProduct,
    normalise,
    cleanBarcode,
    hasNumber,
    ratioPer100Kcal,
    get inFlightCount(){return inflight.size;}
  });
})();
