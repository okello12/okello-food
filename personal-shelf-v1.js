(() => {
  'use strict';

  const shopping=window.OkelloShopping;
  const foodsTab=document.getElementById('tab-foods');
  const anchor=foodsTab?.querySelector('.custom-food-card');
  if(!shopping||!foodsTab||!anchor)return;

  const style=document.createElement('style');
  style.textContent=`
    .personal-shelf-card{margin-top:18px}.personal-shelf-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.personal-shelf-head h3{margin:2px 0 0}.personal-shelf-search{width:100%;margin:12px 0 10px}.personal-shelf-list{display:grid;gap:9px}.personal-shelf-empty{padding:14px;border:1px dashed var(--rule);border-radius:13px;color:var(--muted);background:var(--paper);font-size:.86rem}
    .shelf-product{display:grid;grid-template-columns:52px minmax(0,1fr) auto;gap:10px;align-items:center;border:1px solid var(--rule);border-radius:14px;background:#fff;padding:10px}.shelf-product img,.shelf-product-placeholder{width:52px;height:52px;border-radius:11px;object-fit:cover;background:var(--paper);display:grid;place-items:center;font-size:1.35rem}.shelf-product-main{min-width:0}.shelf-product-main strong{display:block;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.shelf-product-main small{display:block;color:var(--muted);margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.shelf-facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}.shelf-fact{font-size:.68rem;border:1px solid var(--rule);border-radius:999px;padding:4px 7px;background:var(--paper);color:var(--ink)}.shelf-fact.missing{color:var(--muted)}.shelf-state{margin-top:6px;font-size:.7rem;color:var(--muted)}.shelf-state.incomplete{color:#8b5a1c}.shelf-actions{display:grid;gap:6px}.shelf-compare{min-height:38px;padding:8px 10px;border-radius:10px;border:1px solid var(--forest);background:#fff;color:var(--forest);font-weight:800;touch-action:manipulation}.shelf-more{margin-top:10px;width:100%}
    @media(max-width:560px){.shelf-product{grid-template-columns:46px minmax(0,1fr)}.shelf-product img,.shelf-product-placeholder{width:46px;height:46px}.shelf-actions{grid-column:1/-1}.shelf-compare{width:100%}}
  `;
  document.head.appendChild(style);

  const card=document.createElement('section');
  card.id='personalShelfCard';
  card.className='card personal-shelf-card';
  card.innerHTML=`
    <div class="personal-shelf-head">
      <div><p class="eyebrow">PERSONAL SHELF</p><h3>Products you have scanned</h3></div>
      <span id="personalShelfCount" class="pill">0 products</span>
    </div>
    <p class="muted">Your scanned products stay on this device so you can compare something in your hand with products you already know. Missing packet data stays missing.</p>
    <input id="personalShelfSearch" class="full-search personal-shelf-search" type="search" placeholder="Search your scanned products…" aria-label="Search Personal Shelf">
    <div id="personalShelfList" class="personal-shelf-list"></div>
    <button id="personalShelfMore" class="secondary-btn shelf-more" type="button" hidden>Show all</button>`;
  anchor.insertAdjacentElement('afterend',card);

  const countEl=document.getElementById('personalShelfCount');
  const searchEl=document.getElementById('personalShelfSearch');
  const listEl=document.getElementById('personalShelfList');
  const moreBtn=document.getElementById('personalShelfMore');
  let showAll=false;

  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
  function safeImage(url){return /^https:\/\//i.test(String(url||''))?String(url):'';}
  function fmt(n,d=1){return n===null||n===undefined?'—':Number(n).toFixed(d).replace(/\.0$/,'');}
  function when(value){
    if(!value)return '';
    const d=new Date(value); if(Number.isNaN(d.getTime()))return '';
    return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short'}).format(d);
  }

  function filterProducts(recent){
    const q=searchEl.value.trim().toLowerCase();
    if(!q)return recent;
    return recent.filter(p=>(`${p.name||''} ${p.brands||''} ${p.code||''}`).toLowerCase().includes(q));
  }

  function coreMissing(p){
    const out=[];
    if(p.kcal100===null)out.push('calories');
    if(p.protein100===null)out.push('protein');
    if(p.fibre100===null)out.push('fibre');
    return out;
  }

  function row(p){
    const image=safeImage(p.image);
    const missing=coreMissing(p);
    const serving=p.servingG===null?'No pack serving supplied':`Pack serving ${fmt(p.servingG,0)} g`;
    const scanned=when(p.lastScannedAt);
    return `<article class="shelf-product" data-shelf-code="${esc(p.code)}">
      ${image?`<img src="${esc(image)}" alt="">`:'<div class="shelf-product-placeholder" aria-hidden="true">🏷️</div>'}
      <div class="shelf-product-main">
        <strong>${esc(p.name||'Scanned product')}</strong>
        <small>${esc(p.brands||p.code||'')}</small>
        <div class="shelf-facts">
          <span class="shelf-fact${p.kcal100===null?' missing':''}">${p.kcal100===null?'Calories missing':esc(fmt(p.kcal100,0))+' kcal / 100 g'}</span>
          <span class="shelf-fact${p.proteinPer100Kcal===null?' missing':''}">${p.proteinPer100Kcal===null?'Protein density missing':esc(fmt(p.proteinPer100Kcal))+' g protein / 100 kcal'}</span>
          <span class="shelf-fact${p.fibrePer100Kcal===null?' missing':''}">${p.fibrePer100Kcal===null?'Fibre density missing':esc(fmt(p.fibrePer100Kcal))+' g fibre / 100 kcal'}</span>
        </div>
        <div class="shelf-state${missing.length?' incomplete':''}">${esc(serving)}${missing.length?` · Incomplete: ${esc(missing.join(', '))}`:''}${scanned?` · scanned ${esc(scanned)}`:''}</div>
      </div>
      <div class="shelf-actions"><button class="shelf-compare" type="button" data-shelf-compare="${esc(p.code)}">Compare</button></div>
    </article>`;
  }

  function render(){
    const recent=shopping.recent();
    const all=filterProducts(recent);
    countEl.textContent=`${recent.length} ${recent.length===1?'product':'products'}`;
    if(!all.length){
      listEl.innerHTML=searchEl.value.trim()
        ? '<div class="personal-shelf-empty">No saved scans match that search.</div>'
        : '<div class="personal-shelf-empty">Scan a packaged product and it will appear here automatically.</div>';
      moreBtn.hidden=true;
      return;
    }
    const visible=showAll||searchEl.value.trim()?all:all.slice(0,10);
    listEl.innerHTML=visible.map(row).join('');
    moreBtn.hidden=!!searchEl.value.trim()||all.length<=10;
    moreBtn.textContent=showAll?'Show recent 10':`Show all ${all.length}`;
    listEl.querySelectorAll('[data-shelf-compare]').forEach(btn=>btn.addEventListener('click',()=>{
      if(!shopping.compareSaved(btn.dataset.shelfCompare))return;
      const target=document.getElementById('shoppingCompareCard');
      if(target)target.scrollIntoView({behavior:'smooth',block:'center'});
    }));
  }

  searchEl.addEventListener('input',render);
  moreBtn.addEventListener('click',()=>{showAll=!showAll;render();});
  document.addEventListener('okello:shopping-product-saved',render);
  window.addEventListener('storage',e=>{if(e.key===shopping.storeKey)render();});

  render();

  window.OkelloPersonalShelf=Object.freeze({
    version:1,
    refresh:render,
    products:()=>shopping.recent()
  });
})();
