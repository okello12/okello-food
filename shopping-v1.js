(() => {
  'use strict';

  const $=id=>document.getElementById(id);
  const STORE='okello_shopping_products_v1';
  const MAX_PRODUCTS=200;
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
    .shopping-fit{margin-top:10px;border:1px solid var(--rule);border-radius:12px;padding:10px 11px;background:var(--paper);font-size:.78rem;line-height:1.35}.shopping-fit strong{display:block;color:var(--ink);margin-bottom:3px}.shopping-fit small{display:block;color:var(--muted);margin-top:5px}.shopping-fit.incomplete{border-style:dashed}.shopping-fit.unsupported{color:var(--muted)}.shopping-fit-observations{display:grid;gap:3px;margin-top:5px}.shopping-fit-caveat{margin-top:6px;color:var(--muted)}
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
  let compareCodes=[];

  function productData(){return window.OkelloProductData||null;}
  function categoryRules(){return window.OkelloCategoryRules||null;}

  function readStore(){
    try{
      const value=JSON.parse(localStorage.getItem(STORE)||'null');
      if(value&&value.version===1&&value.products&&typeof value.products==='object'&&Array.isArray(value.order))return value;
    }catch(_){}
    return {version:1,products:{},order:[]};
  }
  function writeStore(store){try{localStorage.setItem(STORE,JSON.stringify(store));}catch(_){}}

  // Stored shelf records are the normalised product shape plus shelf metadata.
  // No formatted display strings are persisted, and null nutrient values remain null.
  function freezeStoredProduct(value){
    if(!value||typeof value!=='object')return null;
    const completeness=value.completeness&&typeof value.completeness==='object'
      ? Object.freeze({...value.completeness})
      : Object.freeze({});
    const sourceCategories=value.sourceCategories&&typeof value.sourceCategories==='object'
      ? Object.freeze({
          ...value.sourceCategories,
          tags:Object.freeze(Array.isArray(value.sourceCategories.tags)?[...value.sourceCategories.tags]:[])
        })
      : Object.freeze({text:'',tags:Object.freeze([])});
    return Object.freeze({...value,completeness,sourceCategories});
  }

  function cached(code){
    const raw=readStore().products[String(code)]||null;
    return freezeStoredProduct(raw);
  }

  function saveProduct(product){
    if(!product||typeof product!=='object'||!product.code)return;
    const store=readStore();
    const code=String(product.code);
    const sourceCategories=product.sourceCategories&&typeof product.sourceCategories==='object'
      ? {...product.sourceCategories,tags:Array.isArray(product.sourceCategories.tags)?[...product.sourceCategories.tags]:[]}
      : {text:'',tags:[]};
    const completeness=product.completeness&&typeof product.completeness==='object'
      ? {...product.completeness}
      : {};
    store.products[code]={...product,completeness,sourceCategories,lastScannedAt:new Date().toISOString()};
    store.order=[code,...store.order.filter(x=>x!==code)].slice(0,MAX_PRODUCTS);
    for(const key of Object.keys(store.products))if(!store.order.includes(key))delete store.products[key];
    writeStore(store);
    try{document.dispatchEvent(new CustomEvent('okello:shopping-product-saved',{detail:{code}}));}catch(_){}
  }

  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
  function fmt(n,d=1){return n===null?'—':Number(n).toFixed(d).replace(/\.0$/,'');}

  function metric(label,value,unit){
    const missing=value===null;
    return `<div class="shopping-metric${missing?' missing':''}"><span>${esc(label)}</span><strong>${missing?'Data missing':esc(fmt(value))+' '+esc(unit)}</strong></div>`;
  }

  function missingLabel(key){
    return ({
      proteinPer100Kcal:'protein/calorie data',
      fibrePer100Kcal:'fibre/calorie data',
      sugar100:'sugars',
      salt100:'salt',
      kcal100:'calories',
      fat100:'fat',
      saturatedFat100:'saturated fat',
      'derived metric':'a derived metric'
    })[key]||String(key||'data');
  }

  function fitContext(product){
    const api=categoryRules();
    if(!api?.assess){
      return '<div class="shopping-fit unsupported"><strong>Category context unavailable</strong>Generic nutrient density above is still valid.</div>';
    }
    const result=api.assess(product);
    if(result.state==='unsupported'){
      return `<div class="shopping-fit unsupported"><strong>Category unknown or unsupported</strong>${esc(result.message)}<small>No neighbouring category thresholds are borrowed.</small></div>`;
    }
    if(result.state==='incomplete'){
      const missing=result.missing.map(missingLabel).join(', ');
      return `<div class="shopping-fit incomplete"><strong>${esc(result.categoryLabel)} recognised · assessment incomplete</strong>${esc(result.message)}${missing?`<small>Missing: ${esc(missing)}.</small>`:''}<small>Matched source tag: ${esc(result.evidenceTag||'—')}</small></div>`;
    }
    return `<div class="shopping-fit"><strong>Category-aware context · ${esc(result.categoryLabel)}</strong><div class="shopping-fit-observations">${result.observations.map(o=>`<div>${esc(o.text)}</div>`).join('')}</div>${result.caveat?`<div class="shopping-fit-caveat">${esc(result.caveat)}</div>`:''}<small>Exact source tag: ${esc(result.evidenceTag||'—')}. This is not a traffic-light verdict.</small></div>`;
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
      <p class="shopping-serving"><strong>${product.servingG!==null?'Pack serving: '+esc(fmt(product.servingG,0))+' g':'Pack serving: not supplied'}</strong>${missing.length?' · Cannot fully assess: '+esc(missing.join(', '))+' missing from product data.':''}</p>
      ${fitContext(product)}`;
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
      compare.innerHTML='<p class="shopping-note">Scan a second product or choose one from your Personal Shelf to compare side by side. No category guess is used.</p>';
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

  function compareSaved(code){
    const product=cached(code);
    if(!product)return false;
    card.hidden=false;
    renderCurrent(product,true);
    addToComparison(product.code);
    status.className='shopping-status';
    status.textContent='Saved product added to comparison. Choose another shelf product or scan one.';
    return true;
  }

  function fetchProduct(code){
    const api=productData();
    if(!api?.get)return Promise.reject(new Error('product-data-service-unavailable'));
    return api.get(String(code)).then(product=>{
      saveProduct(product);
      return product;
    });
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

  // The shopping layer consumes the shared product-data service and owns only
  // durable shopping history, comparison state and shopping UI.
  lookupBtn.addEventListener('click',()=>assess(input.value));

  window.OkelloShopping=Object.freeze({
    version:4,
    storeKey:STORE,
    maxProducts:MAX_PRODUCTS,
    assess,
    compareSaved,
    getProduct:code=>cached(String(code||'')),
    recent(){
      const s=readStore();
      return s.order.map(c=>freezeStoredProduct(s.products[c])).filter(Boolean);
    }
  });
})();
