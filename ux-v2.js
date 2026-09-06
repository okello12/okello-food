(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const STORE = 'okello_food_tracker_v3';
  const FAV_STORE = 'okello_food_favourites_v1';
  const mast = document.querySelector('.masthead');
  const tabs = document.querySelector('.tabs');
  const todayPanel = $('tab-today');
  const quickAdd = document.querySelector('.quick-add-card');
  const foodSelect = $('foodSelect');
  if (!mast || !tabs || !todayPanel || !quickAdd || !foodSelect) return;

  const css = document.createElement('style');
  css.textContent = `
    .global-hub{position:sticky;top:0;z-index:70;margin:0 -4px 10px;padding:10px 4px 8px;background:rgba(250,248,243,.97);backdrop-filter:blur(14px);border-bottom:1px solid var(--rule)}
    .hub-search-row{display:grid;grid-template-columns:1fr auto;gap:9px;align-items:center}
    .hub-search-box{position:relative;min-width:0}
    .hub-search-box input{margin:0;padding-left:43px;padding-right:40px;border:1.5px solid var(--forest);box-shadow:0 4px 14px rgba(20,35,28,.05)}
    .hub-search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:1.05rem;pointer-events:none}
    .hub-clear{position:absolute;right:7px;top:50%;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:1.15rem;display:none}
    .hub-clear.show{display:block}
    .hub-scan{min-height:48px;border:0;border-radius:13px;background:var(--forest);color:#fff;font-weight:850;padding:10px 15px;white-space:nowrap}
    .hub-tools{display:flex;align-items:center;gap:8px;margin-top:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:1px}.hub-tools::-webkit-scrollbar{display:none}
    .hub-tool{flex:0 0 auto;min-height:38px;border:1px solid var(--rule);border-radius:999px;background:#fff;color:var(--forest);font-weight:750;padding:7px 11px;font-size:.8rem}
    .hub-balance{margin-left:auto;flex:0 0 auto;font-size:.78rem;color:var(--muted);font-weight:800;white-space:nowrap}
    .hub-results{position:absolute;left:4px;right:4px;top:64px;background:#fff;border:1px solid var(--rule);border-radius:16px;box-shadow:0 18px 50px rgba(20,35,28,.16);overflow:hidden;max-height:380px;overflow-y:auto;z-index:90}
    .hub-results[hidden]{display:none}
    .hub-result,.hub-online{width:100%;border:0;border-bottom:1px solid var(--rule);background:#fff;text-align:left;padding:12px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:52px}
    .hub-result:last-child,.hub-online:last-child{border-bottom:0}.hub-result strong{display:block;color:var(--ink)}.hub-result small,.hub-online small{display:block;color:var(--muted);margin-top:2px}.hub-result .go{color:var(--forest);font-weight:900}.hub-online{background:var(--tint);color:var(--forest);font-weight:800}
    .quick-shelf{margin:4px 0 14px}.quick-shelf-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:8px}.quick-shelf-head h3{font-size:1.05rem}.quick-shelf-head span{font-size:.77rem;color:var(--muted)}
    .quick-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.quick-chips::-webkit-scrollbar{display:none}
    .quick-food{flex:0 0 auto;min-height:42px;border:1px solid var(--rule);background:#fff;border-radius:13px;color:var(--ink);padding:8px 11px;text-align:left;max-width:185px}.quick-food strong{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:.82rem}.quick-food small{display:block;color:var(--muted);font-size:.72rem;margin-top:1px}
    .fav-toggle{min-width:44px;min-height:44px;border:1px solid var(--rule);border-radius:50%;background:#fff;color:var(--gold);font-size:1.2rem;font-weight:900;padding:0}
    .quick-add-card .section-heading{flex-direction:row;align-items:center}.quick-add-card .section-heading>span.pill{margin-left:auto}.quick-add-card .section-heading .fav-toggle{margin-left:2px}
    .online-sheet[hidden]{display:none!important}.online-sheet{position:fixed;inset:0;z-index:1100;background:rgba(10,18,14,.62);display:flex;align-items:flex-end;justify-content:center;padding:14px}.online-panel{width:min(640px,100%);max-height:86%;overflow:auto;background:var(--paper);border-radius:22px;padding:16px}.online-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.online-head h3{margin:0}.online-close{width:44px;height:44px;border:1px solid var(--rule);border-radius:50%;background:#fff;font-size:1.2rem}.online-list{display:grid;gap:8px}.online-product{width:100%;display:grid;grid-template-columns:52px 1fr auto;gap:10px;align-items:center;border:1px solid var(--rule);background:#fff;border-radius:14px;padding:9px;text-align:left}.online-product img{width:52px;height:52px;object-fit:contain;border-radius:9px;background:#f3f1ec}.online-product strong{display:block}.online-product small{display:block;color:var(--muted);margin-top:2px}.online-product .arrow{color:var(--forest);font-weight:900}.online-empty{color:var(--muted);padding:18px 4px}
    @media(min-width:701px){.tabs{position:relative;top:auto}.global-hub{top:0}.hub-results{left:4px;right:105px}.quick-shelf{margin-top:8px}}
    @media(max-width:700px){
      .app-shell{padding-bottom:calc(104px + env(safe-area-inset-bottom))}
      .masthead{padding-bottom:13px}.masthead .standfirst{font-size:.88rem}.masthead h1{font-size:2.15rem}
      .global-hub{margin-left:-2px;margin-right:-2px}.hub-scan{padding-left:13px;padding-right:13px}
      .tabs{position:fixed!important;left:10px;right:10px;bottom:calc(8px + env(safe-area-inset-bottom));top:auto!important;z-index:800;display:grid!important;grid-template-columns:repeat(5,1fr);gap:4px;padding:6px;background:rgba(250,248,243,.96);border:1px solid var(--rule);border-radius:18px;box-shadow:0 12px 38px rgba(20,35,28,.18);overflow:visible}
      .tab{min-width:0!important;min-height:48px;padding:7px 3px!important;border:0!important;background:transparent!important;border-radius:12px!important;font-size:.7rem!important;color:var(--muted)!important}
      .tab.active{background:var(--forest)!important;color:#fff!important}
      .hub-balance{display:none}.hub-tools{padding-right:2px}
      .date-row{padding-top:14px}.score-grid{gap:8px}.score-card{padding:13px}.hero-score strong{font-size:2rem}
      .online-product{grid-template-columns:46px 1fr auto}.online-product img{width:46px;height:46px}
    }
  `;
  document.head.appendChild(css);

  function readState(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){return {};}}
  function readFavs(){try{const v=JSON.parse(localStorage.getItem(FAV_STORE)||'[]');return Array.isArray(v)?v:[];}catch(_){return [];}}
  function writeFavs(v){try{localStorage.setItem(FAV_STORE,JSON.stringify(v));}catch(_){}}
  function esc(s){return String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
  function optionList(){return Array.from(foodSelect.options).map(o=>({id:o.value,name:o.textContent.replace(/^\S+\s+/,'').trim()||o.textContent.trim(),label:o.textContent.trim()}));}
  function clickTab(name){const b=document.querySelector(`.tab[data-tab="${name}"]`);if(b)b.click();}
  function selectFood(id){
    if(!Array.from(foodSelect.options).some(o=>o.value===id))return false;
    foodSelect.value=id;foodSelect.dispatchEvent(new Event('change',{bubbles:true}));clickTab('today');
    setTimeout(()=>{quickAdd.scrollIntoView({behavior:'smooth',block:'start'});$('gramsInput')?.focus({preventScroll:true});},90);return true;
  }

  const hub=document.createElement('section');hub.className='global-hub';
  hub.innerHTML=`<div class="hub-search-row"><div class="hub-search-box"><span class="hub-search-icon" aria-hidden="true">⌕</span><input id="globalFoodSearch" type="search" autocomplete="off" placeholder="Search food or packaged product…" aria-label="Search all foods"><button id="hubClearBtn" class="hub-clear" type="button" aria-label="Clear search">×</button></div><button id="hubScanBtn" class="hub-scan" type="button">▣ Scan</button></div><div class="hub-tools"><button id="hubAddBtn" class="hub-tool" type="button">＋ Add food</button><button id="hubRecipeBtn" class="hub-tool" type="button">🍲 Recipe</button><button id="hubFoodsBtn" class="hub-tool" type="button">Browse library</button><span id="hubBalance" class="hub-balance">2,300 kcal left</span></div><div id="hubResults" class="hub-results" hidden></div>`;
  mast.insertAdjacentElement('afterend',hub);

  const globalSearch=$('globalFoodSearch'),hubResults=$('hubResults'),clearBtn=$('hubClearBtn');let searchTimer=null;
  function localResults(term){const q=term.trim().toLowerCase();if(!q)return [];return optionList().filter(x=>x.label.toLowerCase().includes(q)).slice(0,9);}
  function showLocalResults(){
    const q=globalSearch.value.trim();clearBtn.classList.toggle('show',!!q);if(!q){hubResults.hidden=true;hubResults.innerHTML='';return;}
    const matches=localResults(q);const rows=matches.map(x=>`<button type="button" class="hub-result" data-hub-food="${esc(x.id)}"><span><strong>${esc(x.label)}</strong><small>Use smart portion and log it</small></span><span class="go">›</span></button>`).join('');
    const online=q.length>=2?`<button type="button" class="hub-online" id="hubOnlineBtn"><span>Search packaged products online<small>Useful for supermarket foods and brands</small></span><span>⌕</span></button>`:'';
    hubResults.innerHTML=rows+online;hubResults.hidden=false;
    hubResults.querySelectorAll('[data-hub-food]').forEach(b=>b.addEventListener('click',()=>{selectFood(b.dataset.hubFood);globalSearch.value='';showLocalResults();}));$('hubOnlineBtn')?.addEventListener('click',()=>searchOnline(q));
  }
  globalSearch.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(showLocalResults,70);});
  globalSearch.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();const m=localResults(globalSearch.value);if(m[0])selectFood(m[0].id);else if(globalSearch.value.trim().length>=2)searchOnline(globalSearch.value.trim());}});
  clearBtn.addEventListener('click',()=>{globalSearch.value='';showLocalResults();globalSearch.focus();});document.addEventListener('click',e=>{if(!hub.contains(e.target))hubResults.hidden=true;});

  $('hubScanBtn').addEventListener('click',()=>{const scan=$('scanBarcodeBtn');if(scan)scan.click();else{clickTab('foods');setTimeout(()=>$('scanBarcodeBtn')?.click(),80);}});
  $('hubAddBtn').addEventListener('click',()=>{clickTab('foods');setTimeout(()=>{document.querySelector('.custom-food-card')?.scrollIntoView({behavior:'smooth',block:'start'});$('customName')?.focus({preventScroll:true});},80);});
  $('hubRecipeBtn').addEventListener('click',()=>{clickTab('recipes');setTimeout(()=>$('recipeName')?.focus({preventScroll:true}),80);});
  $('hubFoodsBtn').addEventListener('click',()=>{clickTab('foods');setTimeout(()=>$('librarySearch')?.focus({preventScroll:true}),80);});

  const onlineSheet=document.createElement('div');onlineSheet.className='online-sheet';onlineSheet.hidden=true;onlineSheet.innerHTML=`<div class="online-panel" role="dialog" aria-modal="true" aria-labelledby="onlineTitle"><div class="online-head"><div><p class="eyebrow">ONLINE PRODUCT SEARCH</p><h3 id="onlineTitle">Packaged foods</h3></div><button class="online-close" id="onlineClose" type="button" aria-label="Close">×</button></div><div id="onlineList" class="online-list"></div></div>`;document.body.appendChild(onlineSheet);
  $('onlineClose').addEventListener('click',()=>onlineSheet.hidden=true);onlineSheet.addEventListener('click',e=>{if(e.target===onlineSheet)onlineSheet.hidden=true;});
  async function searchOnline(term){
    hubResults.hidden=true;onlineSheet.hidden=false;$('onlineList').innerHTML='<div class="online-empty">Searching products…</div>';
    try{
      const url='https://world.openfoodfacts.org/cgi/search.pl?search_terms='+encodeURIComponent(term)+'&search_simple=1&action=process&json=1&page_size=10&fields=code,product_name,brands,nutriments,image_front_small_url';
      const r=await fetch(url,{headers:{'Accept':'application/json'}});if(!r.ok)throw new Error('lookup failed');const data=await r.json();const products=(data.products||[]).filter(p=>p.product_name&&p.code).slice(0,10);
      if(!products.length){$('onlineList').innerHTML='<div class="online-empty">No packaged products found. You can still add the food manually.</div>';return;}
      $('onlineList').innerHTML=products.map((p,i)=>{const n=p.nutriments||{};const kcal=Math.round(Number(n['energy-kcal_100g']||0));return `<button class="online-product" type="button" data-online="${i}">${p.image_front_small_url?`<img src="${esc(p.image_front_small_url)}" alt="">`:'<div style="width:46px;height:46px;border-radius:9px;background:var(--tint);display:grid;place-items:center">▦</div>'}<span><strong>${esc(p.product_name)}</strong><small>${esc(p.brands||'')}${kcal?' · '+kcal+' kcal/100 g':''}</small></span><span class="arrow">›</span></button>`;}).join('');
      $('onlineList').querySelectorAll('[data-online]').forEach(b=>b.addEventListener('click',()=>{const p=products[Number(b.dataset.online)];onlineSheet.hidden=true;clickTab('foods');setTimeout(()=>{const code=$('barcodeInput');if(code){code.value=String(p.code);$('lookupBarcodeBtn')?.click();document.querySelector('.custom-food-card')?.scrollIntoView({behavior:'smooth',block:'start'});}},100);}));
    }catch(_){$('onlineList').innerHTML='<div class="online-empty">Online search is unavailable just now. Try Scan barcode or add the nutrition label manually.</div>';}
  }

  const shelf=document.createElement('section');shelf.className='quick-shelf';quickAdd.insertAdjacentElement('beforebegin',shelf);
  const favBtn=document.createElement('button');favBtn.type='button';favBtn.className='fav-toggle';favBtn.id='favoriteCurrentBtn';favBtn.setAttribute('aria-label','Add current food to favourites');favBtn.textContent='☆';quickAdd.querySelector('.section-heading')?.appendChild(favBtn);
  function toggleFavorite(){const id=foodSelect.value;if(!id)return;const favs=readFavs();const i=favs.indexOf(id);if(i>=0)favs.splice(i,1);else favs.unshift(id);writeFavs(favs);syncFavorite();renderShelf();}
  function syncFavorite(){const yes=readFavs().includes(foodSelect.value);favBtn.textContent=yes?'★':'☆';favBtn.setAttribute('aria-label',yes?'Remove current food from favourites':'Add current food to favourites');}
  favBtn.addEventListener('click',toggleFavorite);foodSelect.addEventListener('change',syncFavorite);

  function recentIds(state){const rows=[];Object.keys(state.logs||{}).sort().reverse().forEach(day=>{(state.logs[day]||[]).slice().reverse().forEach(x=>rows.push(x));});const seen=new Set(),out=[];for(const x of rows){const id=x.foodId;if(id&&!seen.has(id)){seen.add(id);out.push(id);}if(out.length>=8)break;}return out;}
  function labelFor(id){const o=Array.from(foodSelect.options).find(x=>x.value===id);return o?o.textContent.trim():id;}
  function chip(id,kind){return `<button type="button" class="quick-food" data-quick-food="${esc(id)}"><strong>${esc(labelFor(id))}</strong><small>${kind}</small></button>`;}
  function renderShelf(){const state=readState();const favs=readFavs().filter(id=>Array.from(foodSelect.options).some(o=>o.value===id)).slice(0,6);const recent=recentIds(state).filter(id=>!favs.includes(id)).slice(0,6);const content=[...favs.map(id=>chip(id,'Favourite')),...recent.map(id=>chip(id,'Recent'))].join('');shelf.innerHTML=`<div class="quick-shelf-head"><h3>Quick picks</h3><span>${favs.length?'Favourites + recent':'Recent foods appear here'}</span></div><div class="quick-chips">${content||'<span style="color:var(--muted);font-size:.82rem">Log a few foods and your quickest choices will appear here.</span>'}</div>`;shelf.querySelectorAll('[data-quick-food]').forEach(b=>b.addEventListener('click',()=>selectFood(b.dataset.quickFood)));}
  function updateBalance(){const c=$('calRemainText')?.textContent||'';const p=$('proteinRemainText')?.textContent||'';$('hubBalance').textContent=[c,p].filter(Boolean).join(' · ');renderShelf();}
  const obs=new MutationObserver(updateBalance);[$('calRemainText'),$('proteinRemainText'),$('todayLog')].filter(Boolean).forEach(el=>obs.observe(el,{childList:true,subtree:true,characterData:true}));
  $('librarySearch')?.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.value.trim()){const q=e.target.value.trim();const found=optionList().some(x=>x.label.toLowerCase().includes(q.toLowerCase()));if(!found){e.preventDefault();globalSearch.value=q;showLocalResults();hub.scrollIntoView({behavior:'smooth',block:'start'});}}});

  syncFavorite();renderShelf();updateBalance();
})();