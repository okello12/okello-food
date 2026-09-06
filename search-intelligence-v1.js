(() => {
  'use strict';
  const intel=window.OkelloFoodIntelligence;
  if(!intel) return;
  const $=id=>document.getElementById(id);
  const oldSearch=$('globalFoodSearch'),oldClear=$('hubClearBtn'),results=$('hubResults'),foodSelect=$('foodSelect');
  if(!oldSearch||!oldClear||!results||!foodSelect) return;

  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
  const clickTab=name=>document.querySelector(`.tab[data-tab="${name}"]`)?.click();
  const selectFood=id=>{
    if(![...foodSelect.options].some(o=>o.value===id)) return false;
    foodSelect.value=id;foodSelect.dispatchEvent(new Event('change',{bubbles:true}));clickTab('today');
    setTimeout(()=>document.querySelector('.quick-add-card')?.scrollIntoView({behavior:'smooth',block:'start'}),80);return true;
  };

  const search=oldSearch.cloneNode(true),clear=oldClear.cloneNode(true);
  search.placeholder='Search any food, recipe, brand or cuisine…';
  oldSearch.replaceWith(search);oldClear.replaceWith(clear);

  const style=document.createElement('style');style.textContent=`
    .hub-source{display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:3px 6px;border-radius:999px;background:var(--tint);color:var(--forest);font-size:.66rem;font-weight:850}.hub-confidence{color:var(--muted);font-size:.68rem;margin-left:5px}.hub-result.best{background:linear-gradient(90deg,var(--tint),#fff)}
  `;document.head.appendChild(style);

  let timer=null;
  function localResults(term){return intel.search(term,{limit:9,includeRestaurant:true});}
  function openRestaurant(key){clickTab('today');setTimeout(()=>{const sel=$('restDish');if(!sel)return;sel.value=key;sel.dispatchEvent(new Event('change',{bubbles:true}));sel.closest('.smart-card')?.scrollIntoView({behavior:'smooth',block:'start'});},120);}

  async function searchOnline(term){
    results.hidden=true;const sheet=document.querySelector('.online-sheet'),list=$('onlineList');if(!sheet||!list)return;sheet.hidden=false;list.innerHTML='<div class="online-empty">Searching packaged products…</div>';
    try{
      const url='https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(term)+'&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,brands,nutriments,image_front_small_url';
      const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error();const data=await r.json();const products=(data.products||[]).filter(p=>p.product_name&&p.code).slice(0,10);
      if(!products.length){list.innerHTML='<div class="online-empty">No packaged products found. You can still add the food manually.</div>';return;}
      list.innerHTML=products.map((p,i)=>{const n=p.nutriments||{},kcal=Math.round(Number(n['energy-kcal_100g']||0));return `<button class="online-product" type="button" data-intel-online="${i}">${p.image_front_small_url?`<img src="${esc(p.image_front_small_url)}" alt="">`:'<div style="width:46px;height:46px;border-radius:9px;background:var(--tint);display:grid;place-items:center">▦</div>'}<span><strong>${esc(p.product_name)}</strong><small>${esc(p.brands||'')}${kcal?' · '+kcal+' kcal/100 g':''}</small><span class="hub-source">Package source</span></span><span class="arrow">›</span></button>`;}).join('');
      list.querySelectorAll('[data-intel-online]').forEach(b=>b.addEventListener('click',()=>{const p=products[+b.dataset.intelOnline];sheet.hidden=true;clickTab('foods');setTimeout(()=>{const code=$('barcodeInput');if(code){code.value=String(p.code);$('lookupBarcodeBtn')?.click();document.querySelector('.custom-food-card')?.scrollIntoView({behavior:'smooth',block:'start'});}},100);}));
    }catch(_){list.innerHTML='<div class="online-empty">Online product search is unavailable just now. Try Scan barcode or add the nutrition label manually.</div>';}
  }

  function show(){
    const q=search.value.trim();clear.classList.toggle('show',!!q);if(!q){results.hidden=true;results.innerHTML='';return;}
    const matches=localResults(q);
    const rows=matches.map((r,i)=>`<button type="button" class="hub-result ${i===0?'best':''}" ${r.restaurantKey?`data-intel-restaurant="${esc(r.restaurantKey)}"`:`data-intel-food="${esc(r.id)}"`}><span><strong>${esc((r.food.emoji||'🍽️')+' '+r.food.name)}</strong><small>${r.restaurantKey?(r.range?`${r.range[0]}–${r.range[1]} kcal typical range`:'Restaurant estimate'):`${Math.round(r.food.kcal)} kcal/100 g`}</small><span class="hub-source">${esc(r.sourceLabel)}</span><span class="hub-confidence">${esc(r.confidence)}</span></span><span class="go">›</span></button>`).join('');
    const online=q.length>=2?`<button type="button" class="hub-online" id="intelHubOnline"><span>Search packaged products online<small>Exact brands and supermarket foods</small></span><span>⌕</span></button>`:'';
    results.innerHTML=rows+online;results.hidden=false;
    results.querySelectorAll('[data-intel-food]').forEach(b=>b.addEventListener('click',()=>{selectFood(b.dataset.intelFood);search.value='';show();}));
    results.querySelectorAll('[data-intel-restaurant]').forEach(b=>b.addEventListener('click',()=>{openRestaurant(b.dataset.intelRestaurant);search.value='';show();}));
    $('intelHubOnline')?.addEventListener('click',()=>searchOnline(q));
  }

  search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(show,70);});
  search.addEventListener('keydown',e=>{if(e.key!=='Enter')return;e.preventDefault();const first=localResults(search.value)[0];if(first){if(first.restaurantKey)openRestaurant(first.restaurantKey);else selectFood(first.id);}else if(search.value.trim().length>=2)searchOnline(search.value.trim());});
  clear.addEventListener('click',()=>{search.value='';show();search.focus();});
})();