(() => {
  'use strict';

  const VERSION=2;
  const API_BASE='https://world.openfoodfacts.org/api/v3/product/';
  const FIELDS=[
    'code','product_name','brands','nutriments','image_front_small_url',
    'serving_quantity','serving_quantity_unit','serving_size',
    'product_quantity','product_quantity_unit','quantity','packagings',
    'categories','categories_tags'
  ].join(',');
  const inflight=new Map();

  function cleanBarcode(value){return String(value??'').replace(/\D/g,'');}
  function hasNumber(obj,key){
    if(!obj||!Object.prototype.hasOwnProperty.call(obj,key))return false;
    const value=obj[key];
    return value!==null&&value!==''&&Number.isFinite(Number(value));
  }
  function numberOrNull(obj,key){return hasNumber(obj,key)?Number(obj[key]):null;}
  function firstNumber(obj,keys){for(const key of keys){if(hasNumber(obj,key))return Number(obj[key]);}return null;}
  function ratioPer100Kcal(value,kcal){return value!==null&&kcal!==null&&kcal>0?(value/kcal)*100:null;}
  function error(code,message){const err=new Error(message||code);err.code=code;return err;}
  function cleanText(value){return value==null?'':String(value).trim();}

  function normalise(code,rawProduct){
    const key=cleanBarcode(code);
    const p=rawProduct&&typeof rawProduct==='object'?rawProduct:{};
    const n=p.nutriments&&typeof p.nutriments==='object'?p.nutriments:{};
    let kcal100=numberOrNull(n,'energy-kcal_100g');
    if(kcal100===null){const kj=numberOrNull(n,'energy_100g');kcal100=kj===null?null:kj/4.184;}
    const protein100=numberOrNull(n,'proteins_100g');
    const fibre100=firstNumber(n,['fiber_100g','fibre_100g']);
    const carbs100=numberOrNull(n,'carbohydrates_100g');
    const sugar100=numberOrNull(n,'sugars_100g');
    const saturatedFat100=firstNumber(n,['saturated-fat_100g','saturated_fat_100g']);
    const fat100=numberOrNull(n,'fat_100g');
    const salt100=numberOrNull(n,'salt_100g');
    const sodium100=numberOrNull(n,'sodium_100g');
    const servingRaw=numberOrNull(p,'serving_quantity');
    const servingUnit=cleanText(p.serving_quantity_unit)||'g';
    const servingG=servingRaw!==null&&servingRaw>0&&/^g$/i.test(servingUnit)?servingRaw:null;
    const productQuantity=numberOrNull(p,'product_quantity');
    const productQuantityUnit=cleanText(p.product_quantity_unit)||null;

    const product={
      code:key,
      name:cleanText(p.product_name)||'Scanned product',
      brands:cleanText(p.brands),
      image:cleanText(p.image_front_small_url),
      servingG,
      servingQuantity:servingRaw,
      servingQuantityUnit:servingUnit||null,
      servingSizeText:cleanText(p.serving_size)||null,
      productQuantity,
      productQuantityUnit,
      quantityText:cleanText(p.quantity)||null,
      packagings:Array.isArray(p.packagings)?p.packagings.map(x=>({...x})):[],
      kcal100,protein100,fibre100,carbs100,sugar100,saturatedFat100,fat100,salt100,sodium100,
      proteinPer100Kcal:ratioPer100Kcal(protein100,kcal100),
      fibrePer100Kcal:ratioPer100Kcal(fibre100,kcal100),
      source:'openfoodfacts',
      sourceName:'Open Food Facts',
      sourceType:'packaged-product-database',
      sourceLicense:'ODbL 1.0 database; product images CC BY-SA',
      sourceUrl:`https://world.openfoodfacts.org/product/${key}`,
      sourceCheckedAt:new Date().toISOString(),
      completeness:Object.freeze({
        kcal:kcal100!==null,protein:protein100!==null,fibre:fibre100!==null,carbs:carbs100!==null,
        sugar:sugar100!==null,saturatedFat:saturatedFat100!==null,fat:fat100!==null,
        salt:salt100!==null,sodium:sodium100!==null,serving:servingG!==null,servingSemantics:!!cleanText(p.serving_size)
      }),
      sourceCategories:Object.freeze({text:cleanText(p.categories),tags:Array.isArray(p.categories_tags)?p.categories_tags.map(String):[]})
    };
    return Object.freeze(product);
  }

  function requestProduct(code){
    const key=cleanBarcode(code);
    if(key.length<8)return Promise.reject(error('invalid-barcode','Enter a valid barcode first.'));
    if(inflight.has(key))return inflight.get(key);
    let promise;
    promise=fetch(`${API_BASE}${encodeURIComponent(key)}?product_type=food&cc=gb&lc=en&fields=${encodeURIComponent(FIELDS)}`,{
      headers:{Accept:'application/json'}
    }).then(response=>{
      if(response.status===404)throw error('product-not-found','Product not found.');
      if(!response.ok)throw error('product-request-failed','Product lookup failed.');
      return response.json();
    }).then(data=>{
      const raw=data?.product;
      if(!raw||typeof raw!=='object')throw error('product-not-found','Product not found.');
      const product=normalise(key,raw);
      try{window.dispatchEvent(new CustomEvent('okello:product-looked-up',{detail:{product}}));}catch(_){}
      return product;
    }).finally(()=>{if(inflight.get(key)===promise)inflight.delete(key);});
    inflight.set(key,promise);
    return promise;
  }

  window.OkelloProductData=Object.freeze({
    version:VERSION,
    apiVersion:3,
    get:requestProduct,
    normalise,
    cleanBarcode,
    hasNumber,
    ratioPer100Kcal,
    get inFlightCount(){return inflight.size;}
  });
})();