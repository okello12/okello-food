(() => {
  'use strict';
  const STORE='okello_food_tracker_v3';
  const $=id=>document.getElementById(id);
  const library=$('foodLibrary');
  const search=$('librarySearch');
  const foodsPanel=$('tab-foods');
  if(!library||!foodsPanel)return;

  const globalSearch=$('globalFoodSearch');
  if(globalSearch) globalSearch.placeholder='Search food, cuisine or packaged product…';

  const style=document.createElement('style');
  style.textContent=`
    .region-filter{margin:12px 0 14px;padding:12px;border:1px solid var(--rule);border-radius:16px;background:var(--white)}
    .region-filter-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}.region-filter-head strong{color:var(--forest)}.region-filter-head span{font-size:.75rem;color:var(--muted)}
    .region-chips{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding-bottom:2px}.region-chips::-webkit-scrollbar{display:none}
    .region-chip{flex:0 0 auto;min-height:36px;border:1px solid var(--rule);border-radius:999px;background:#fff;color:var(--forest);font-weight:800;padding:7px 11px;font-size:.76rem}
    .region-chip.active{background:var(--forest);color:#fff;border-color:var(--forest)}
    .world-count{margin:8px 0 0;font-size:.76rem;color:var(--muted)}
  `;
  document.head.appendChild(style);

  const regions=['All','Ghana','West Africa','East Africa','Southern Africa','North Africa & Middle East','South Asia','East Asia','Southeast Asia','Europe','Latin America & Caribbean','North America','Global'];
  let active='All';

  const wrap=document.createElement('section');
  wrap.className='region-filter';
  wrap.innerHTML=`<div class="region-filter-head"><strong>Explore by region</strong><span id="regionVisibleCount"></span></div><div class="region-chips">${regions.map(r=>`<button type="button" class="region-chip ${r==='All'?'active':''}" data-region="${r}">${r}</button>`).join('')}</div><p class="world-count">Ghana stays fully represented, with a much broader international catalogue around it.</p>`;
  const chips=$('categoryChips');
  if(chips)chips.insertAdjacentElement('beforebegin',wrap); else foodsPanel.prepend(wrap);

  function regionMap(){
    try{
      const s=JSON.parse(localStorage.getItem(STORE)||'{}')||{};
      return new Map((s.customFoods||[]).filter(Boolean).map(f=>[String(f.id),f.region||'']));
    }catch(_){return new Map();}
  }
  function regionFor(id,map){
    if(String(id).startsWith('ghana_'))return 'Ghana';
    if(String(id).startsWith('world_'))return map.get(String(id))||'Global';
    return 'Global';
  }
  function matches(activeRegion,actual){
    if(activeRegion==='All')return true;
    if(actual==='East & Southeast Asia') return activeRegion==='East Asia'||activeRegion==='Southeast Asia';
    return actual===activeRegion;
  }
  function apply(){
    const cards=[...library.querySelectorAll('.food-card')];
    const map=regionMap();
    let visible=0;
    cards.forEach(card=>{
      const id=card.querySelector('[data-log-food]')?.dataset.logFood||'';
      const ok=matches(active,regionFor(id,map));
      card.style.display=ok?'':'none';
      if(ok)visible++;
    });
    const c=$('regionVisibleCount'); if(c)c.textContent=cards.length?`${visible} shown`:'';
  }
  wrap.querySelectorAll('[data-region]').forEach(btn=>btn.addEventListener('click',()=>{
    active=btn.dataset.region;
    wrap.querySelectorAll('[data-region]').forEach(b=>b.classList.toggle('active',b===btn));
    apply();
  }));

  new MutationObserver(apply).observe(library,{childList:true,subtree:true});
  search?.addEventListener('input',()=>setTimeout(apply,0));
  $('categoryChips')?.addEventListener('click',()=>setTimeout(apply,0));
  apply();
})();