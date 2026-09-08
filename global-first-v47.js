(() => {
  'use strict';

  const VERSION=1;
  const PROFILE_KEY='okello_first_run_v44';
  const MAIN_STORE='okello_food_tracker_v3';
  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const catalog=window.OkelloFoodCatalog;
  if(!catalog)return;

  const REGIONS=Object.freeze([
    ['mixed','Mixed / from anywhere'],
    ['ghana-west-africa','West Africa'],
    ['caribbean','Caribbean'],
    ['south-asia','South Asia'],
    ['east-southeast-asia','East & Southeast Asia'],
    ['north-africa-middle-east','North Africa & Middle East'],
    ['uk-europe','UK & Europe'],
    ['latin-america','Latin America']
  ]);

  const STARTERS=Object.freeze({
    mixed:[['egg','Egg'],['bread','Bread'],['rice','Rice'],['chicken','Chicken'],['lentils','Lentils'],['yoghurt','Yoghurt'],['banana','Banana']],
    'ghana-west-africa':[['waakye','Waakye'],['banku','Banku'],['jollof rice','Jollof'],['fried ripe plantain','Plantain'],['boiled egg','Egg'],['light soup','Light soup'],['kenkey','Kenkey']],
    caribbean:[['jerk chicken','Jerk chicken'],['rice and peas','Rice & peas'],['plantain','Plantain'],['curry goat','Curry goat'],['roti','Roti'],['beans','Beans'],['oats','Oats']],
    'south-asia':[['chicken biryani','Biryani'],['chapati','Chapati'],['dal','Dal'],['chicken curry','Chicken curry'],['chana masala','Chana masala'],['samosa','Samosa'],['yoghurt','Yoghurt']],
    'east-southeast-asia':[['fried rice','Fried rice'],['tofu','Tofu'],['ramen','Ramen'],['pad thai','Pad Thai'],['pho','Pho'],['kimchi','Kimchi'],['udon','Udon']],
    'north-africa-middle-east':[['couscous','Couscous'],['pita','Pita'],['bulgur','Bulgur'],['lentils','Lentils'],['chicken','Chicken'],['rice','Rice'],['yoghurt','Yoghurt']],
    'uk-europe':[['bread','Bread'],['baked beans','Baked beans'],['scrambled eggs','Scrambled eggs'],['potato','Potatoes'],['lasagne','Lasagne'],['salmon','Salmon'],['yoghurt','Yoghurt']],
    'latin-america':[['corn tortilla','Tortilla'],['black beans','Black beans'],['avocado','Avocado'],['rice','Rice'],['chicken','Chicken'],['plantain','Plantain'],['beans','Beans']]
  });

  function readJson(key,fallback){try{const raw=localStorage.getItem(key);return raw==null?fallback:JSON.parse(raw);}catch(_){return fallback;}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true;}catch(_){return false;}}
  function profile(){const p=readJson(PROFILE_KEY,{});return p&&typeof p==='object'?p:{};}
  function state(){return window.OkelloStateRepository?.read?.()||readJson(MAIN_STORE,{})||{};}
  function totalLogCount(){return Object.values(state().logs||{}).reduce((n,rows)=>n+(Array.isArray(rows)?rows.length:0),0);}
  function esc(value){return String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));}
  function validRegion(value){return REGIONS.some(([key])=>key===value)?value:'mixed';}
  function regionLabel(value){return REGIONS.find(([key])=>key===validRegion(value))?.[1]||'Mixed / from anywhere';}
  function currentRegion(){return validRegion(profile().culture||'mixed');}
  function resolve(term){
    const direct=catalog.findByName?.(term);if(direct)return direct;
    const q=String(term||'').toLowerCase();
    return (catalog.all?.()||[]).find(food=>!food?.raw&&String(food?.name||'').toLowerCase().includes(q))||null;
  }
  function setSelectedFood(food){
    const select=$('foodSelect');if(!food||!select)return false;
    if(!Array.from(select.options).some(option=>option.value===food.id))return false;
    select.value=food.id;select.dispatchEvent(new Event('change',{bubbles:true}));
    document.body.classList.remove('v44-unconfirmed');
    const badge=$('selectedFoodBadge');if(badge)badge.textContent=food.name;
    setTimeout(()=>qs('.quick-add-card')?.scrollIntoView({behavior:'smooth',block:'start'}),40);
    return true;
  }

  function patchPositioning(){
    const masthead=qs('.masthead .standfirst');
    if(masthead)masthead.textContent='Food from around the world, understood in portions that make sense. West African depth, global usefulness, and your own foods when the library does not know them yet.';
    const foodsTitle=$('foodsTitle');if(foodsTitle)foodsTitle.textContent='Foods from around the world';
    const foodsPanel=$('tab-foods');const lede=qs('.lede',foodsPanel);
    if(lede)lede.textContent='Search everyday staples and dishes across regions. West African foods have deeper coverage today; every region remains searchable, and packet labels or your own recipes are preferred when they are better evidence.';
  }

  function patchOnboarding(){
    const select=$('v44Culture');if(!select||select.dataset.v47Global==='1')return false;
    select.dataset.v47Global='1';
    const existing=profile().culture;
    select.innerHTML=REGIONS.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('');
    select.value=existing?validRegion(existing):'mixed';
    const label=select.closest('label');
    if(label){
      for(const node of Array.from(label.childNodes)){
        if(node.nodeType===Node.TEXT_NODE&&/What foods feel like home/i.test(node.textContent||''))node.textContent='What foods feel familiar to you?';
      }
      if(!qs('.v47-onboarding-note',label)){
        const note=document.createElement('small');note.className='v47-onboarding-note';note.style.cssText='display:block;margin-top:6px;color:var(--muted);font-weight:500;line-height:1.4';
        note.textContent='This only changes your starter shortcuts. Search always covers the full food library, and you can add your own food from any country.';
        label.appendChild(note);
      }
    }
    const title=$('v44OnboardingTitle');if(title)title.textContent='Make the first log feel familiar, wherever you eat';
    return true;
  }

  function renderStarterShelf(){
    if(totalLogCount()>0)return;
    const quick=qs('.quick-add-card');if(!quick)return;
    let shelf=qs('.v44-starter-shelf');
    if(!shelf){shelf=document.createElement('section');shelf.className='v44-starter-shelf';quick.insertAdjacentElement('beforebegin',shelf);}
    const region=currentRegion();
    const items=(STARTERS[region]||STARTERS.mixed).map(([term,label])=>({food:resolve(term),label})).filter(x=>x.food).slice(0,7);
    shelf.dataset.v47Global='1';
    shelf.innerHTML=`<div class="v44-starter-head"><strong>${esc(regionLabel(region))} starters</strong><span>shortcuts only · search everything</span></div><div class="v44-starter-chips">${items.map(({food,label})=>`<button class="v44-starter-chip" type="button" data-v47-food="${esc(food.id)}">${esc(food.emoji||'🍽️')} ${esc(label)}<small>${esc(food.name)}</small></button>`).join('')}</div>`;
    qsa('[data-v47-food]',shelf).forEach(button=>button.addEventListener('click',()=>setSelectedFood(catalog.getById?.(button.dataset.v47Food))));
  }

  function saveRegion(region){
    const next=validRegion(region);const p={...profile(),culture:next,cultures:[next],cultureVersion:VERSION,cultureUpdatedAt:new Date().toISOString()};
    const ok=writeJson(PROFILE_KEY,p);
    if(ok){
      window.OkelloBetaMetricsV46?.record?.('familiar-food-region',{region:next});
      renderStarterShelf();
    }
    return ok;
  }

  function ensureSettingsCard(){
    const settings=$('tab-settings');if(!settings||$('v47FoodCultureCard'))return;
    const card=document.createElement('section');card.id='v47FoodCultureCard';card.className='card';
    card.innerHTML=`<p class="eyebrow">FAMILIAR FOODS</p><h3>Choose what you want to see first</h3><p class="muted">This does not limit the library. It only changes starter shortcuts so Okello Food can feel useful whether you eat West African, Caribbean, South Asian, East Asian, European, Latin American or mixed food.</p><label style="display:block;font-weight:800">Starter region<select id="v47RegionSelect" style="margin-top:5px">${REGIONS.map(([key,label])=>`<option value="${esc(key)}">${esc(label)}</option>`).join('')}</select></label><button id="v47SaveRegion" class="secondary-btn" type="button" style="margin-top:10px">Save familiar-food preference</button><p class="tiny-note">Observed eating history still outranks this preference. The setting is for discovery, not recommendation.</p>`;
    const trust=$('v46TrustCard');if(trust)trust.insertAdjacentElement('beforebegin',card);else settings.appendChild(card);
    $('v47RegionSelect').value=currentRegion();
    $('v47SaveRegion').addEventListener('click',()=>{
      if(saveRegion($('v47RegionSelect').value)){
        const toast=$('toast');if(toast){toast.textContent='Starter foods updated';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800);}
      }
    });
  }

  function reconcile(){patchPositioning();patchOnboarding();renderStarterShelf();ensureSettingsCard();}
  reconcile();
  const observer=new MutationObserver(()=>reconcile());observer.observe(document.body,{childList:true,subtree:true});
  setTimeout(()=>{reconcile();observer.disconnect();},12000);

  window.OkelloGlobalFirstV47=Object.freeze({version:VERSION,regions:REGIONS.map(([key,label])=>({key,label})),currentRegion,saveRegion,renderStarterShelf});
})();