(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const STORE='okello_shopping_products_v1';
  const MAX_PRODUCTS=60;
  const input=$('barcodeInput');
  const lookupBtn=$('lookupBarcodeBtn');
  const preview=$('barcodePreview');
  if(!input||!lookupBtn||!preview)return;

  const style=document.createElement('style');
  style.textContent=`
    .shopping-card{margin-top:12px;border:1px solid var(--rule);border-radius:16px;background:#fff;padding:14px}
    .shopping-card[hidden]{display:none!important}.shopping-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.shopping-head h4{margin:2px 0 0;color:var(--forest);font-size:1.05rem}.shopping-head small{color:var(--muted)}
    .shopping-source{font-size:.72rem;color:var(--muted);white-space:nowrap}.shopping-status{margin:9px 0 0;color:var(--muted);font-size:.82rem}.shopping-status.bad{color:#A63A20;font-weight:700}
    .shopping-current{margin-top:11px;border-top:1px solid var(--rule);padding-top:11px}.shopping-product-name{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.shopping-product-name strong{display:block;color:var(--ink)}.shopping-product-name small{display:block;color:var(--muted);margin-top:2px}.shopping-cache{font-size:.68rem;color:var(--muted);white-space:nowrap}
    .shopping-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:10px}.shopping-metric{border:1px solid var(--rule);border-radius:12px;padding:9px;background:var(--paper)}.shopping-metric span{display:block;color:var(--muted);font-size:.67rem;line-height:1.15}.shopping-metric strong{display:block;margin-top:3px;color:var(--forest);font-size:.96rem}.shopping-metric.missing strong{color:var(--muted);font-size:.78rem}
    .shopping-serving{margin:9px 0 0;font-size:.77rem;color:var(--muted)}.shopping-serving strong{color:var(--ink)}
    .shopping-compare{margin-top:12px;border-top:1px solid var(--rule);padding-top:12px}.shopping-compare-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.shopping-compare-item{border:1px solid var(--rule);border-radius:13px;padding:10px;background:var(--paper)}.shopping-compare-item strong{display:block;font-size:.85rem}.shopping-compare-item small{display:block;color:var(--muted);margin-top:2px}.shopping-compare-item dl{margin:8px 0 0;display:grid;gap:4px}.shopping-compare-item dl div{display:flex;justify-content:space-between;gap:8px;font-size:.74rem}.shopping-compare-item dt{color:var(--muted)}.shopping-compare-item dd{margin:0;font-weight:800;color:var(--ink)}
    .shopping-verdict{margin:10px 0 0;border-radius:12px;background:var(--tint);padding:10px 11px;color:var(--ink);font-size:.82rem;line-height:1.35}.shopping-note{margin:8px 0 0;color:var(--muted);font-size:.72rem}
    @media(max-width:520px){.shopping-metrics{grid-template-columns:1fr 1fr}.shopping-compare-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const card=document.createElement('section');
  card.id='shoppingCompareCard';
  card.className='shopping-card';
  card.hidden=true;
  card.innerHTML=`
    <div class="shopping-head"><div><small>SHOPPING CHECK</small><h4>Compare what you are holding</h4></div><span class="shopping-source">Open Food Facts</span></div>
    <div id="shoppingStatus" class="shopping-status"></div>
    <div id="shoppingCurrent" class="shopping-current"></div>
    <div id="shoppingCompare" class="shopping-compare"></div>`;
  preview.insertAdjacentElement('afterend',card);

  const status=$('shoppingStatus'),current=$('shoppingCurrent'),compare=$('shoppingCompare');
  const inflight=new Map();
  let compareCodes=[];

  function readStore(){
    try{
      const value=JSON.parse(localStorage.getItem(STORE)||'null');
      if(value&&value.version===1&&value.products&&typeof value.products==='object'&&Array.isArray(value.order))return value;
    }catch(_){}
    return {version:1,products:{},order:[]};
  }
  function writeStore(store){try{localStorage.setItem(STORE,JSON.stringify(store));}catch(_){}}
  function cached(code){return readStore().products[String(code)]||null;}
  function saveProduct(product){
    const store=readStore();
    const code=String(product.code);
    store.products[code]=product;
    store.order=[code,...store.order.filter(x=>x!==code)].slice(0,MAX_PRODUCTS);
    for(const key of Object.keys(store.products))if(!store.order.includes(key))delete store.products[key];
    writeStore(store);
  }

  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
  function present(obj,key){return Object.prototype.hasOwnProperty.call(obj||{},key)&&obj[key]!==null&&obj[key]!==''&&Number.isFinite(Number(obj[key]));}
  function nutrient(n,key){return present(n,key)?Number(n[key]):null;}
  function kcalValue(n){
    if(present(n,'energy-kcal_100g'))return Number(n['energy-kcal_100g']);
    if(present(n,'energy_100g'))return Number(n.energy_100g)/4.184;
    return null;
  }
  function ratio(value,kcal){return value!==null&&kcal!==null&&kcal>0?(value/kcal)*100:null;}
  function fmt(n,d=1){return n===null?'—':Number(n).toFixed(d).replace(/\.0$/,'');}

  function productFromApi(code,p){
    const n=p?.nutriments||{};
    const kcal=kcalValue(n);
    const protein=nutrient(n,'proteins_100g');
    const fibre=present(n,'fiber_100g')?Number(n.fiber_100g):(present(n,'fibre_100g')?Number(n.fibre_100g):null);
    const serving=present(p,'serving_quantity')&&Number(p.serving_quantity)>0?Number(p.serving_quantity):null;
    return {
      code:String(code),
      name:String(p?.product_name||'Scanned product'),
      brands:String(p?.brands||''),
      kcal100:kcal,
      protein100:protein,
      fibre100:fibre,
      proteinPer100Kcal:ratio(protein,kcal),
      fibrePer100Kcal:ratio(fibre,kcal),
      servingG:serving,
      image:String(p?.image_front_small_url||''),
      source:'openfoodfacts',
      sourceCheckedAt:new Date().toISOString(),
      lastScannedAt:new Date().toISOString(),
      completeness:{kcal:kcal!==null,protein:protein!==null,fibre:fibre!==null}
    };
  }

  function metric(label,value,unit){
    const missing=value===null;
    return `<div class="shopping-metric${missing?' missing':''}"><span>${esc(label)}</span><strong>${missing?'Data missing':esc(fmt(value))+' '+esc(unit)}</strong></div>`;
  }

  function renderCurrent(product,fromCache=false){
    if(!product){current.innerHTML='';return;}
    const missing=[];
    if(product.kcal100===null)missing.push('calories');
    if(product.protein100===null)missing.push('protein');
    if(product.fibre100===null)missing.push('fibre');
    current.innerHTML=`
      <div class="shopping-product-name"><span><strong>${esc(product.name)}</strong><small>${esc(product.brands||'')}</small></span><span class="shopping-cache">${fromCache?'saved scan':'just checked'}</span></div>
      <div class="shopping-metrics">
        ${metric('Calories / 100 g',product.kcal100,'kcal')}
        ${metric('Protein / 100 kcal',product.proteinPer100Kcal,'g')}
        ${metric('Fibre / 100 kcal',product.fibrePer100Kcal,'g')}
      </div>
      <p class="shopping-serving"><strong>${product.servingG!==null?'Pack serving: '+esc(fmt(product.servingG,0))+' g':'Pack serving: not supplied'}</strong>${missing.length?' · Cannot fully assess: '+esc(missing.join(', '))+' missing from product data.':''}</p>`;
  }

  function compact(product){
    return `<div class="shopping-compare-item"><strong>${esc(product.name)}</strong><small>${esc(product.brands||product.code)}</small><dl>
      <div><dt>kcal / 100 g</dt><dd>${product.kcal100===null?'missing':esc(fmt(product.kcal100,0))}</dd></div>
      <div><dt>protein / 100 kcal</dt><dd>${product.proteinPer100Kcal===null?'missing':esc(fmt(product.proteinPer100Kcal))+' g'}</dd></div>
      <div><dt>fibre / 100 kcal</dt><dd>${product.fibrePer100Kcal===null?'missing':esc(fmt(product.fibrePer100Kcal))+' g'}</dd></div>
    </dl></div>`;
  }

  function comparisonSentence(a,b){
    const parts=[];
    if(a.proteinPer100Kcal!==null&&b.proteinPer100Kcal!==null){
      const d=a.proteinPer100Kcal-b.proteinPer100Kcal;
      if(Math.abs(d)<0.5)parts.push('Protein density is very similar.');
      else parts.push(`${d>0?a.name:b.name} gives more protein per 100 kcal.`);
    }else parts.push('Protein comparison is incomplete because packet data is missing.');

    if(a.fibrePer100Kcal!==null&&b.fibrePer100Kcal!==null){
      const d=a.fibrePer100Kcal-b.fibrePer100Kcal;
      if(Math.abs(d)<0.3)parts.push('Fibre density is very similar.');
      else parts.push(`${d>0?a.name:b.name} gives more fibre per 100 kcal.`);
    }else parts.push('Fibre comparison is incomplete because packet data is missing.');
    return parts.join(' ');
  }

  function renderComparison(){
    const products=compareCodes.map(c=>cached(c)).filter(Boolean).slice(-2);
    if(products.length<2){
      compare.innerHTML='<p class="shopping-note">Scan a second product to compare them side by side. No category guess is used.</p>';
      return;
    }
    const [a,b]=products;
    compare.innerHTML=`<div class="shopping-compare-grid">${compact(a)}${compact(b)}</div><p class="shopping-verdict">${esc(comparisonSentence(a,b))}</p><p class="shopping-note">This compares nutrient density, not whether a food is “healthy”. Missing packet data is never treated as zero.</p>`;
  }

  function addToComparison(code){
    const c=String(code);
    compareCodes=[...compareCodes.filter(x=>x!==c),c].slice(-2);
    renderComparison();
  }

  async function fetchProduct(code){
    const key=String(code);
    if(inflight.has(key))return inflight.get(key);
    const promise=(async()=>{
      const fields='product_name,brands,nutriments,image_front_small_url,serving_quantity,serving_size';
      const res=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(key)}.json?fields=${fields}`,{headers:{Accept:'application/json'}});
      if(!res.ok)throw new Error('shopping-lookup-failed');
      const data=await res.json();
      if(!data||data.status!==1||!data.product)throw new Error('shopping-product-not-found');
      const product=productFromApi(key,data.product);
      saveProduct(product);
      return product;
    })().finally(()=>inflight.delete(key));
    inflight.set(key,promise);
    return promise;
  }

  async function assess(code){
    const key=String(code||'').replace(/\D/g,'');
    if(key.length<8)return;
    card.hidden=false;
    const saved=cached(key);
    if(saved){
      renderCurrent(saved,true);
      addToComparison(key);
      status.textContent='Saved scan shown instantly. Refreshing product data…';
    }else{
      status.textContent='Checking product data for shopping comparison…';
      current.innerHTML='';
    }

    if(!navigator.onLine){
      if(saved)status.textContent='Offline. Showing the saved product data.';
      else{status.textContent='Offline and this product has not been saved before.';status.className='shopping-status bad';}
      return;
    }

    status.className='shopping-status';
    try{
      const product=await fetchProduct(key);
      renderCurrent(product,false);
      addToComparison(key);
      status.textContent='Product data checked. Scan another product to compare.';
    }catch(err){
      if(saved){status.textContent='Could not refresh product data. Keeping the saved scan.';status.className='shopping-status bad';}
      else{status.textContent='Cannot assess this product from the database. Check the packet label or enter the missing values manually.';status.className='shopping-status bad';}
    }
  }

  // app.js remains the owner of the normal barcode form lookup. This listener
  // adds a shopping assessment without intercepting or stopping that flow.
  lookupBtn.addEventListener('click',()=>assess(input.value));

  window.OkelloShopping=Object.freeze({
    version:1,
    storeKey:STORE,
    assess,
    getProduct:code=>cached(String(code||'')),
    recent(){const s=readStore();return s.order.map(c=>s.products[c]).filter(Boolean);}
  });
})();
