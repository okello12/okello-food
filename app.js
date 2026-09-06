(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'okello_food_tracker_v3';
  const OLD_STORAGE_KEY = 'okello_food_tracker_v2';
  const todayKey = () => new Date().toISOString().slice(0,10);
  const formatDate = iso => new Intl.DateTimeFormat('en-GB',{weekday:'long',day:'numeric',month:'long'}).format(new Date(iso+'T12:00:00'));
  const round1 = n => Math.round(n*10)/10;
  const clamp = (n,min,max) => Math.min(max,Math.max(min,n));

  const baseFoods = [
    {id:'rice',name:'White rice, cooked',emoji:'🍚',cat:'Starch',kcal:130,protein:2.7,fibre:0.4,portion:200,min:150,max:250,note:'180–250 g'},
    {id:'basmati',name:'Basmati rice, cooked',emoji:'🍚',cat:'Starch',kcal:121,protein:3.5,fibre:0.4,portion:200,min:150,max:250,note:'180–250 g'},
    {id:'brown_rice',name:'Brown rice, cooked',emoji:'🍚',cat:'Starch',kcal:123,protein:2.7,fibre:1.6,portion:200,min:150,max:250,note:'180–250 g'},
    {id:'jollof',name:'Jollof rice',emoji:'🍛',cat:'Starch',kcal:170,protein:3.5,fibre:1.2,portion:200,min:160,max:230,note:'180–220 g; recipe dependent'},
    {id:'kenkey',name:'Ga kenkey',emoji:'🌽',cat:'Starch',kcal:114,protein:1.7,fibre:1.3,portion:220,min:180,max:250,note:'180–250 g'},
    {id:'banku',name:'Corn banku',emoji:'🥣',cat:'Starch',kcal:145,protein:2.2,fibre:1.0,portion:225,min:180,max:250,note:'200–250 g'},
    {id:'plantain',name:'Green plantain, boiled',emoji:'🍌',cat:'Starch',kcal:116,protein:1.3,fibre:2.3,portion:250,min:200,max:300,note:'200–300 g'},
    {id:'yam',name:'Yam, boiled',emoji:'🍠',cat:'Starch',kcal:116,protein:1.5,fibre:3.9,portion:225,min:180,max:300,note:'200–300 g'},
    {id:'sweet_potato',name:'Sweet potato, cooked',emoji:'🍠',cat:'Starch',kcal:90,protein:2,fibre:3.3,portion:275,min:200,max:350,note:'200–350 g'},
    {id:'potato',name:'Potatoes, boiled/baked',emoji:'🥔',cat:'Starch',kcal:87,protein:1.9,fibre:1.8,portion:300,min:250,max:350,note:'250–350 g'},
    {id:'oats',name:'Steel-cut oats, dry',emoji:'🌾',cat:'Starch',kcal:375,protein:13,fibre:10,portion:50,min:40,max:60,note:'40–60 g dry'},
    {id:'bread',name:'Bread',emoji:'🍞',cat:'Starch',kcal:250,protein:9,fibre:5,portion:120,min:80,max:160,note:'about 2–4 slices; check label'},
    {id:'egg',name:'Boiled egg',emoji:'🥚',cat:'Protein',kcal:143,protein:12.6,fibre:0,portion:150,min:100,max:180,note:'about 2–3 large eggs'},
    {id:'sardines',name:'Sardines in spring water',emoji:'🐟',cat:'Protein',kcal:185,protein:25,fibre:0,portion:100,min:90,max:125,note:'1 tin, drained'},
    {id:'tuna',name:'Tuna in spring water',emoji:'🐟',cat:'Protein',kcal:116,protein:26,fibre:0,portion:120,min:100,max:160,note:'1 tin, drained'},
    {id:'cottage',name:'Cottage cheese',emoji:'🥛',cat:'Protein',kcal:82,protein:12,fibre:0,portion:125,min:100,max:150,note:'100–150 g'},
    {id:'chicken',name:'Chicken breast, cooked',emoji:'🍗',cat:'Protein',kcal:165,protein:31,fibre:0,portion:220,min:180,max:250,note:'180–250 g'},
    {id:'turkey',name:'Turkey breast, cooked',emoji:'🍗',cat:'Protein',kcal:135,protein:29,fibre:0,portion:220,min:180,max:250,note:'180–250 g'},
    {id:'tilapia',name:'Tilapia, cooked',emoji:'🐟',cat:'Protein',kcal:128,protein:26,fibre:0,portion:220,min:180,max:250,note:'200–250 g'},
    {id:'salmon',name:'Salmon, cooked',emoji:'🐟',cat:'Protein',kcal:206,protein:22,fibre:0,portion:175,min:150,max:200,note:'150–200 g'},
    {id:'mackerel',name:'Mackerel, cooked',emoji:'🐟',cat:'Protein',kcal:205,protein:19,fibre:0,portion:150,min:120,max:180,note:'120–180 g'},
    {id:'prawns',name:'Prawns, cooked',emoji:'🦐',cat:'Protein',kcal:99,protein:24,fibre:0,portion:200,min:150,max:250,note:'150–250 g'},
    {id:'beef',name:'Lean beef / 5% mince, cooked',emoji:'🥩',cat:'Protein',kcal:180,protein:26,fibre:0,portion:200,min:170,max:220,note:'180–220 g'},
    {id:'goat',name:'Goat meat, edible cooked',emoji:'🍖',cat:'Protein',kcal:143,protein:27,fibre:0,portion:175,min:150,max:200,note:'150–200 g edible meat'},
    {id:'crab',name:'Crab meat',emoji:'🦀',cat:'Protein',kcal:97,protein:20,fibre:0,portion:125,min:100,max:150,note:'100–150 g edible meat'},
    {id:'beans',name:'Black beans, drained',emoji:'🫘',cat:'Beans',kcal:132,protein:8.9,fibre:8.7,portion:200,min:150,max:250,note:'180–250 g'},
    {id:'lentils',name:'Lentils, cooked',emoji:'🫘',cat:'Beans',kcal:116,protein:9,fibre:7.9,portion:200,min:150,max:250,note:'180–250 g'},
    {id:'yoghurt',name:'Greek/high-protein yoghurt',emoji:'🥣',cat:'Dairy',kcal:73,protein:9.5,fibre:0,portion:175,min:150,max:200,note:'150–200 g; check label'},
    {id:'soya',name:'Unsweetened soya milk',emoji:'🥛',cat:'Dairy',kcal:32,protein:3.3,fibre:0.6,portion:125,min:100,max:200,note:'100–150 ml'},
    {id:'semi_milk',name:'Semi-skimmed milk',emoji:'🥛',cat:'Dairy',kcal:47,protein:3.6,fibre:0,portion:150,min:100,max:250,note:'100–250 ml'},
    {id:'blueberries',name:'Blueberries',emoji:'🫐',cat:'Extras',kcal:57,protein:0.7,fibre:2.4,portion:90,min:80,max:120,note:'80–100 g'},
    {id:'banana',name:'Banana, edible',emoji:'🍌',cat:'Extras',kcal:89,protein:1.1,fibre:2.6,portion:110,min:90,max:140,note:'1 small/medium'},
    {id:'avocado',name:'Avocado',emoji:'🥑',cat:'Extras',kcal:160,protein:2,fibre:6.7,portion:75,min:50,max:100,note:'50–100 g'},
    {id:'chia',name:'Chia seeds',emoji:'🌱',cat:'Extras',kcal:486,protein:16.5,fibre:34.4,portion:12,min:10,max:15,note:'10–15 g'},
    {id:'olive',name:'Olive oil',emoji:'🫒',cat:'Extras',kcal:884,protein:0,fibre:0,portion:10,min:5,max:12,note:'measure it'},
    {id:'pb',name:'Peanut butter',emoji:'🥜',cat:'Extras',kcal:588,protein:25,fibre:6,portion:15,min:10,max:20,note:'15–20 g'},
    {id:'almond',name:'Almond powder/flour',emoji:'🌰',cat:'Extras',kcal:590,protein:21,fibre:11,portion:15,min:10,max:20,note:'10–20 g'},
    {id:'veg',name:'Mixed vegetables',emoji:'🥦',cat:'Vegetables',kcal:40,protein:2.5,fibre:3,portion:300,min:200,max:400,note:'250–400 g'},
    {id:'okro',name:'Okro soup, estimate',emoji:'🥘',cat:'Soup',kcal:90,protein:7,fibre:2.5,portion:350,min:250,max:450,note:'Recipe dependent; build your own recipe'},
    {id:'light_soup',name:'Light soup, estimate',emoji:'🍲',cat:'Soup',kcal:55,protein:4,fibre:1,portion:350,min:250,max:450,note:'Recipe dependent'},
    {id:'beef_stew',name:'Beef stew, estimate',emoji:'🥘',cat:'Soup',kcal:145,protein:10,fibre:1,portion:200,min:150,max:250,note:'Oil and cut of beef matter'}
  ];

  const defaultState = {targets:{calories:2300,protein:150},logs:{},customFoods:[],recipes:[]};
  let state = loadState();
  let recipeIngredients = [];
  let selectedFoodId = 'rice';
  let installPrompt = null;
  let pendingCustomImage = '';
  let pendingCustomBarcode = '';
  let activeCategory = 'All';

  function loadState(){
    try{
      const current = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem(OLD_STORAGE_KEY);
      const parsed = JSON.parse(current || legacy || 'null');
      if(!parsed) return structuredClone(defaultState);
      const merged = {...defaultState,...parsed,targets:{...defaultState.targets,...(parsed.targets||{})},logs:parsed.logs||{},customFoods:parsed.customFoods||[],recipes:parsed.recipes||[]};
      if(!current) localStorage.setItem(STORAGE_KEY,JSON.stringify(merged));
      return merged;
    }catch(e){ return structuredClone(defaultState); }
  }
  function saveState(){ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); }
  function allFoods(){
    const custom = state.customFoods.map(f=>({...f,emoji:f.emoji||'🏷️',cat:f.cat||'Custom'}));
    const recipes = state.recipes.map(r=>({id:'recipe_'+r.id,name:r.name,emoji:'🍲',cat:'Recipes',kcal:r.kcalPer100,protein:r.proteinPer100,fibre:r.fibrePer100||0,portion:r.defaultPortion||300,min:r.min||200,max:r.max||450,note:'Your saved recipe'}));
    return [...baseFoods,...custom,...recipes];
  }
  function foodById(id){ return allFoods().find(f=>f.id===id); }
  function calcFood(food,grams){ return {kcal:food.kcal*grams/100,protein:food.protein*grams/100,fibre:(food.fibre||0)*grams/100}; }
  function escapeHtml(s){ return String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
  function safeImage(url){ return /^https:\/\//i.test(String(url||'')) ? String(url) : ''; }
  function showToast(msg){ const t=$('toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>t.classList.remove('show'),1800); }

  function todayEntries(){ return state.logs[todayKey()] || []; }
  function ensureToday(){ const k=todayKey(); if(!state.logs[k]) state.logs[k]=[]; return state.logs[k]; }
  function totalsFor(entries){ return entries.reduce((a,x)=>({kcal:a.kcal+(Number(x.kcal)||0),protein:a.protein+(Number(x.protein)||0),fibre:a.fibre+(Number(x.fibre)||0)}),{kcal:0,protein:0,fibre:0}); }
  function mealCalories(meal){ return todayEntries().filter(x=>x.meal===meal).reduce((s,x)=>s+(Number(x.kcal)||0),0); }

  const mealShares = {Lunch:.30,Dinner:.45,Snack:.15,Other:.10};
  const roleShares = {Starch:.35,Protein:.42,Beans:.36,Vegetables:.15,Dairy:.22,Extras:.14,Soup:.58,Recipes:.62,'Complete meal':.78,Custom:.28};
  function inferredBounds(food){
    if(Number(food.min)>0 && Number(food.max)>0) return {min:Number(food.min),max:Number(food.max)};
    const p=Number(food.portion)||100;
    const cat=food.cat||'Custom';
    if(cat==='Extras') return {min:Math.max(5,p*.65),max:Math.max(15,p*1.35)};
    if(cat==='Complete meal'||cat==='Soup'||cat==='Recipes') return {min:p*.7,max:p*1.35};
    return {min:p*.75,max:p*1.25};
  }
  function smartPortionFor(food,meal){
    if(!food || !(food.kcal>0)) return {grams:0,kcal:0,reason:'Calories per 100 g are needed first.'};
    const dailyTotal=totalsFor(todayEntries()).kcal;
    const dailyRemaining=Math.max(0,state.targets.calories-dailyTotal);
    if(dailyRemaining<=0) return {grams:0,kcal:0,reason:'You have used today’s calorie target.'};
    const mealTarget=state.targets.calories*(mealShares[meal]||.10);
    const mealUsed=mealCalories(meal);
    const mealRemaining=Math.max(0,mealTarget-mealUsed);
    if(mealRemaining<=0) return {grams:0,kcal:0,reason:`Your ${meal.toLowerCase()} allowance is already used. You can still override it.`};
    const share=roleShares[food.cat] ?? roleShares.Custom;
    const itemBudget=Math.min(dailyRemaining,mealRemaining,mealTarget*share);
    const bounds=inferredBounds(food);
    const raw=itemBudget/(food.kcal/100);
    const maxByDaily=dailyRemaining/(food.kcal/100);
    const maxByMeal=mealRemaining/(food.kcal/100);
    let grams=Math.min(Math.max(raw,bounds.min),bounds.max,maxByDaily,maxByMeal);
    grams=Math.max(0,Math.round(grams/5)*5);
    if(grams===0) return {grams:0,kcal:0,reason:'There is not enough room left in this meal target.'};
    const c=calcFood(food,grams);
    return {grams,kcal:c.kcal,protein:c.protein,dailyRemaining,mealTarget,mealRemaining,reason:`About ${Math.round(c.kcal)} kcal. ${Math.round(dailyRemaining)} kcal remain for the day before adding it.`};
  }

  function initTabs(){
    document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('.tab').forEach(b=>b.classList.toggle('active',b===btn));
      document.querySelectorAll('.panel').forEach(p=>p.classList.remove('active'));
      $('tab-'+btn.dataset.tab).classList.add('active');
      if(btn.dataset.tab==='history') renderHistory();
      if(btn.dataset.tab==='foods'){ renderFoodLibrary(); updateCustomSuggestion(); }
      if(btn.dataset.tab==='recipes') renderSavedRecipes();
    }));
  }

  function populateFoodSelects(){
    const foods=allFoods();
    const opts=foods.map(f=>`<option value="${escapeHtml(f.id)}">${escapeHtml(f.emoji+' '+f.name)}</option>`).join('');
    $('foodSelect').innerHTML=opts; $('recipeFoodSelect').innerHTML=opts;
    if(foodById(selectedFoodId)) $('foodSelect').value=selectedFoodId; else selectedFoodId='rice';
  }
  function setSelectedFood(id,resetGrams=true){
    const food=foodById(id); if(!food) return;
    selectedFoodId=id; $('foodSelect').value=id; $('selectedFoodBadge').textContent=food.name;
    if(resetGrams) $('gramsInput').value=food.portion;
    updateQuickCalc(); updateSmartPortion();
  }
  function updateQuickCalc(){
    const food=foodById($('foodSelect').value); if(!food) return;
    const g=clamp(Number($('gramsInput').value)||food.portion,1,5000); const c=calcFood(food,g);
    $('quickCalc').innerHTML=`<strong>${Math.round(c.kcal)} kcal</strong> · ${round1(c.protein)} g protein · ${round1(c.fibre)} g fibre for ${g} g.`;
  }
  function updateSmartPortion(){
    const food=foodById($('foodSelect').value); if(!food) return;
    const s=smartPortionFor(food,$('mealSelect').value);
    $('smartPortion').textContent=s.grams ? `${s.grams} g` : '—';
    $('smartPortionNote').textContent=s.reason;
    $('useSmartPortionBtn').disabled=!s.grams;
  }
  function useSmartPortion(){
    const food=foodById($('foodSelect').value); const s=smartPortionFor(food,$('mealSelect').value);
    if(!s.grams){showToast(s.reason);return;}
    $('gramsInput').value=s.grams; updateQuickCalc(); showToast('Smart portion applied');
  }
  function renderSuggestions(term){
    const box=$('foodSuggestions'); term=term.trim().toLowerCase();
    if(!term){box.hidden=true;box.innerHTML='';return;}
    const matches=allFoods().filter(f=>(f.name+' '+f.cat).toLowerCase().includes(term)).slice(0,10);
    if(!matches.length){box.hidden=true;box.innerHTML='';return;}
    box.innerHTML=matches.map(f=>{const s=smartPortionFor(f,$('mealSelect').value);return `<button class="suggestion" type="button" data-food="${escapeHtml(f.id)}"><span>${escapeHtml(f.emoji+' '+f.name)}</span><small>${s.grams?s.grams+' g smart':'saved'}</small></button>`}).join('');
    box.hidden=false;
    box.querySelectorAll('[data-food]').forEach(b=>b.addEventListener('click',()=>{setSelectedFood(b.dataset.food,true);$('foodSearch').value='';box.hidden=true;}));
  }

  function addToToday(){
    const food=foodById($('foodSelect').value); if(!food) return;
    const g=clamp(Number($('gramsInput').value)||food.portion,1,5000); const c=calcFood(food,g);
    ensureToday().push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),foodId:food.id,name:food.name,emoji:food.emoji,grams:g,meal:$('mealSelect').value,kcal:c.kcal,protein:c.protein,fibre:c.fibre,ts:Date.now()});
    saveState(); renderToday(); updateSmartPortion(); renderFoodLibrary(); showToast('Added to today');
  }
  function renderToday(){
    $('todayTitle').textContent=formatDate(todayKey());
    const entries=ensureToday(); const totals=totalsFor(entries);
    $('todayCalories').textContent=Math.round(totals.kcal).toLocaleString(); $('todayProtein').textContent=Math.round(totals.protein)+' g'; $('todayFibre').textContent=Math.round(totals.fibre)+' g';
    const calDiff=Math.round(state.targets.calories-totals.kcal); const proteinDiff=Math.round(state.targets.protein-totals.protein);
    $('calRemainText').textContent=calDiff>=0 ? `${calDiff.toLocaleString()} kcal left` : `${Math.abs(calDiff).toLocaleString()} kcal over`;
    $('proteinRemainText').textContent=proteinDiff>=0 ? `${proteinDiff} g left` : `${Math.abs(proteinDiff)} g over target`;
    $('calorieBar').style.width=clamp(totals.kcal/state.targets.calories*100,0,100)+'%'; $('calorieBar').classList.toggle('over',totals.kcal>state.targets.calories);
    const log=$('todayLog');
    if(!entries.length){log.className='log-list empty-state';log.textContent='Nothing logged yet.';return;}
    log.className='log-list';
    log.innerHTML=entries.map((x,i)=>`<div class="log-row"><div><strong>${escapeHtml(x.emoji||'🍽️')} ${escapeHtml(x.name)}</strong><div class="meta">${escapeHtml(x.meal)} · ${round1(x.grams)} g · ${round1(x.protein)} g protein</div></div><div class="numbers"><strong>${Math.round(x.kcal)} kcal</strong><button class="remove-btn" type="button" data-remove="${i}">remove</button></div></div>`).join('');
    log.querySelectorAll('[data-remove]').forEach(b=>b.addEventListener('click',()=>{entries.splice(Number(b.dataset.remove),1);saveState();renderToday();updateSmartPortion();renderFoodLibrary();}));
  }

  function renderCategoryChips(){
    const cats=['All',...new Set(allFoods().map(f=>f.cat))];
    $('categoryChips').innerHTML=cats.map(c=>`<button class="chip ${c===activeCategory?'active':''}" type="button" data-cat="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
    $('categoryChips').querySelectorAll('[data-cat]').forEach(b=>b.addEventListener('click',()=>{activeCategory=b.dataset.cat;renderCategoryChips();renderFoodLibrary();}));
  }
  function foodVisual(f){ const img=safeImage(f.image); return img?`<img class="food-thumb" src="${escapeHtml(img)}" alt="">`:`<div class="food-emoji">${escapeHtml(f.emoji||'🍽️')}</div>`; }
  function renderFoodLibrary(){
    renderCategoryChips();
    const term=$('librarySearch').value.trim().toLowerCase(); const meal=$('mealSelect').value;
    const foods=allFoods().filter(f=>(activeCategory==='All'||f.cat===activeCategory)&&(!term||(f.name+' '+f.cat).toLowerCase().includes(term)));
    $('foodLibrary').innerHTML=foods.length?foods.map(f=>{const s=smartPortionFor(f,meal);return `<article class="food-card">${foodVisual(f)}<div><h4>${escapeHtml(f.name)}</h4><p>${Math.round(f.kcal)} kcal · ${round1(f.protein)} g protein per 100 g</p><div class="portion">${escapeHtml(f.note||f.portion+' g')}</div><div class="smart-line">${s.grams?`Smart now: ${s.grams} g · ${Math.round(s.kcal)} kcal`:'Smart now: —'}</div></div><button type="button" data-log-food="${escapeHtml(f.id)}">Use ${s.grams||f.portion} g on Today</button></article>`}).join(''):'<div class="empty-state">No foods match that search.</div>';
    $('foodLibrary').querySelectorAll('[data-log-food]').forEach(b=>b.addEventListener('click',()=>{const f=foodById(b.dataset.logFood);setSelectedFood(f.id,false);const s=smartPortionFor(f,$('mealSelect').value);$('gramsInput').value=s.grams||f.portion;updateQuickCalc();document.querySelector('[data-tab="today"]').click();window.scrollTo({top:0,behavior:'smooth'});}));
  }

  function updateCustomSuggestion(){
    const kcal=Number($('customKcal').value); const protein=Number($('customProtein').value)||0; const fibre=Number($('customFibre').value)||0; const p=Math.max(1,Number($('customPortion').value)||100); const cat=$('customCategory').value;
    if(!(kcal>0)){$('customSmartPortion').textContent='—';$('customSmartNote').textContent='Add calories per 100 g to calculate.';return;}
    const temp={kcal,protein,fibre,portion:p,cat}; const s=smartPortionFor(temp,$('mealSelect').value);
    $('customSmartPortion').textContent=s.grams?`${s.grams} g · ${Math.round(s.kcal)} kcal`:'—'; $('customSmartNote').textContent=s.reason;
  }
  function saveCustomFood(){
    const name=$('customName').value.trim(); const kcal=Number($('customKcal').value); const protein=Number($('customProtein').value)||0; const fibre=Number($('customFibre').value)||0; const portion=Math.max(1,Number($('customPortion').value)||100); const cat=$('customCategory').value||'Custom';
    if(!name||!(kcal>0)){showToast('Add a name and calories per 100 g');return;}
    state.customFoods.push({id:'custom_'+Date.now(),name,emoji:'🏷️',cat,kcal,protein,fibre,portion,note:'Your saved food',image:pendingCustomImage||'',barcode:pendingCustomBarcode||''});
    saveState(); populateFoodSelects(); renderFoodLibrary();
    ['customName','customKcal','customProtein','customFibre','barcodeInput'].forEach(id=>$(id).value=''); $('customPortion').value=100; $('customCategory').value='Custom'; pendingCustomImage=''; pendingCustomBarcode=''; $('barcodePreview').hidden=true; $('barcodePreview').innerHTML=''; $('barcodeStatus').textContent=''; updateCustomSuggestion(); showToast('Custom food saved');
  }

  async function lookupBarcode(){
    const code=$('barcodeInput').value.replace(/\D/g,'');
    if(code.length<8){$('barcodeStatus').textContent='Enter a valid barcode first.';return;}
    $('lookupBarcodeBtn').disabled=true; $('barcodeStatus').textContent='Looking up product…'; $('barcodePreview').hidden=true;
    try{
      const fields='product_name,brands,nutriments,image_front_small_url,serving_quantity,serving_size';
      const res=await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`);
      if(!res.ok) throw new Error('lookup failed');
      const data=await res.json();
      if(!data || data.status!==1 || !data.product){$('barcodeStatus').textContent='Product not found. You can still enter the label values manually.';return;}
      const p=data.product, n=p.nutriments||{};
      const kcal=Number(n['energy-kcal_100g']) || (Number(n.energy_100g)>0?Number(n.energy_100g)/4.184:0);
      const protein=Number(n.proteins_100g)||0; const fibre=Number(n.fiber_100g ?? n.fibre_100g)||0;
      $('customName').value=[p.product_name,p.brands].filter(Boolean).join(' · ') || 'Scanned product';
      if(kcal>0) $('customKcal').value=round1(kcal); $('customProtein').value=round1(protein); $('customFibre').value=round1(fibre);
      if(Number(p.serving_quantity)>0) $('customPortion').value=Math.round(Number(p.serving_quantity));
      pendingCustomImage=safeImage(p.image_front_small_url); pendingCustomBarcode=code;
      $('barcodeStatus').textContent=kcal>0?'Nutrition found. Check the label if anything looks wrong.':'Product found, but calorie data is incomplete. Please copy the label values.';
      $('barcodePreview').innerHTML=`${pendingCustomImage?`<img src="${escapeHtml(pendingCustomImage)}" alt="">`:''}<div><strong>${escapeHtml($('customName').value)}</strong><small>${kcal>0?Math.round(kcal)+' kcal per 100 g':'No calorie value'}${protein?` · ${round1(protein)} g protein`:''}</small></div>`;
      $('barcodePreview').hidden=false; updateCustomSuggestion();
    }catch(e){ $('barcodeStatus').textContent='Could not reach the food database. You can enter the nutrition label manually.'; }
    finally{ $('lookupBarcodeBtn').disabled=false; }
  }

  function renderIngredients(){
    const el=$('ingredientList'); if(!recipeIngredients.length){el.className='ingredient-list empty-state';el.textContent='No ingredients yet.';return;}
    el.className='ingredient-list'; el.innerHTML=recipeIngredients.map((x,i)=>`<div class="ingredient-row"><div><strong>${escapeHtml(x.name)}</strong><br><small>${x.grams} g · ${Math.round(x.kcal)} kcal</small></div><button class="remove-btn" type="button" data-ri="${i}">remove</button></div>`).join('');
    el.querySelectorAll('[data-ri]').forEach(b=>b.addEventListener('click',()=>{recipeIngredients.splice(Number(b.dataset.ri),1);renderIngredients();calculateRecipe();}));
  }
  function addIngredient(){
    const f=foodById($('recipeFoodSelect').value); if(!f)return; const g=clamp(Number($('recipeIngredientGrams').value)||100,1,20000); const c=calcFood(f,g);
    recipeIngredients.push({foodId:f.id,name:f.name,grams:g,kcal:c.kcal,protein:c.protein,fibre:c.fibre}); renderIngredients(); calculateRecipe();
  }
  function calculateRecipe(){
    const weight=Number($('recipeFinalWeight').value); const total=totalsFor(recipeIngredients);
    if(!(weight>0)||!recipeIngredients.length){$('recipeResult').hidden=true;return null;}
    const out={weight,totalKcal:total.kcal,kcalPer100:total.kcal/weight*100,proteinPer100:total.protein/weight*100,fibrePer100:total.fibre/weight*100};
    $('recipeTotalCalories').textContent=Math.round(out.totalKcal).toLocaleString()+' kcal'; $('recipePer100').textContent=Math.round(out.kcalPer100)+' kcal'; $('recipeProtein100').textContent=round1(out.proteinPer100)+' g'; $('recipeResult').hidden=false; return out;
  }
  function saveRecipe(){
    const name=$('recipeName').value.trim(); const calc=calculateRecipe(); if(!name||!calc){showToast('Add recipe name, ingredients and finished weight');return;}
    state.recipes.push({id:Date.now(),name,kcalPer100:round1(calc.kcalPer100),proteinPer100:round1(calc.proteinPer100),fibrePer100:round1(calc.fibrePer100),defaultPortion:300,min:200,max:450,finalWeight:calc.weight,ingredients:recipeIngredients});
    saveState(); recipeIngredients=[]; $('recipeName').value=''; $('recipeFinalWeight').value=''; renderIngredients(); $('recipeResult').hidden=true; populateFoodSelects(); renderSavedRecipes(); renderFoodLibrary(); showToast('Recipe saved');
  }
  function renderSavedRecipes(){
    const el=$('savedRecipes'); if(!state.recipes.length){el.className='log-list empty-state';el.textContent='No saved recipes yet.';return;}
    el.className='log-list'; el.innerHTML=state.recipes.map((r,i)=>{const f=foodById('recipe_'+r.id),s=smartPortionFor(f,$('mealSelect').value);return `<div class="log-row"><div><strong>🍲 ${escapeHtml(r.name)}</strong><div class="meta">${r.kcalPer100} kcal · ${r.proteinPer100} g protein per 100 g${s.grams?` · smart ${s.grams} g`:''}</div></div><div class="numbers"><button class="secondary-btn mini" type="button" data-log-recipe="${r.id}">Log</button><button class="remove-btn" type="button" data-del-recipe="${i}">delete</button></div></div>`}).join('');
    el.querySelectorAll('[data-log-recipe]').forEach(b=>b.addEventListener('click',()=>{setSelectedFood('recipe_'+b.dataset.logRecipe,true);document.querySelector('[data-tab="today"]').click();}));
    el.querySelectorAll('[data-del-recipe]').forEach(b=>b.addEventListener('click',()=>{if(confirm('Delete this saved recipe?')){state.recipes.splice(Number(b.dataset.delRecipe),1);saveState();populateFoodSelects();renderSavedRecipes();renderFoodLibrary();}}));
  }

  function renderHistory(){
    const keys=Object.keys(state.logs).sort().reverse(), el=$('historyList');
    if(!keys.length){el.className='history-list empty-state';el.textContent='Your completed days will appear here.';return;}
    el.className='history-list'; el.innerHTML=keys.map(k=>{const t=totalsFor(state.logs[k]);const diff=Math.round(state.targets.calories-t.kcal);return `<article class="history-card"><div><strong>${escapeHtml(formatDate(k))}</strong><br><small>${state.logs[k].length} items</small></div><div class="totals"><strong>${Math.round(t.kcal).toLocaleString()} kcal</strong><br><small>${Math.round(t.protein)} g protein · ${diff>=0?diff+' left':Math.abs(diff)+' over'}</small></div></article>`}).join('');
  }
  function saveTargets(){
    const c=clamp(Number($('targetCalories').value)||2300,1200,6000), p=clamp(Number($('targetProtein').value)||150,50,400); state.targets={calories:c,protein:p}; saveState(); renderToday(); updateSmartPortion(); renderFoodLibrary(); updateCustomSuggestion(); showToast('Targets saved');
  }
  function exportBackup(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='okello-food-backup-'+todayKey()+'.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
  }
  async function importBackup(file){
    try{const text=await file.text(),parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object')throw new Error();state={...defaultState,...parsed,targets:{...defaultState.targets,...(parsed.targets||{})}};saveState();initAll();showToast('Backup imported');}catch(e){showToast('That backup file could not be read');}
  }

  function bindEvents(){
    $('foodSelect').addEventListener('change',()=>setSelectedFood($('foodSelect').value,true));
    $('gramsInput').addEventListener('input',updateQuickCalc); $('foodSearch').addEventListener('input',e=>renderSuggestions(e.target.value)); $('addFoodBtn').addEventListener('click',addToToday);
    $('mealSelect').addEventListener('change',()=>{updateSmartPortion();renderFoodLibrary();updateCustomSuggestion();}); $('useSmartPortionBtn').addEventListener('click',useSmartPortion);
    $('clearTodayBtn').addEventListener('click',()=>{if(confirm('Clear everything logged today?')){state.logs[todayKey()]=[];saveState();renderToday();updateSmartPortion();renderFoodLibrary();}});
    $('librarySearch').addEventListener('input',renderFoodLibrary); $('saveCustomFoodBtn').addEventListener('click',saveCustomFood); $('lookupBarcodeBtn').addEventListener('click',lookupBarcode);
    ['customKcal','customProtein','customFibre','customPortion','customCategory'].forEach(id=>$(id).addEventListener('input',updateCustomSuggestion));
    $('addIngredientBtn').addEventListener('click',addIngredient); $('recipeFinalWeight').addEventListener('input',calculateRecipe); $('calculateRecipeBtn').addEventListener('click',calculateRecipe); $('saveRecipeBtn').addEventListener('click',saveRecipe);
    $('saveTargetsBtn').addEventListener('click',saveTargets); $('exportBtn').addEventListener('click',exportBackup); $('importInput').addEventListener('change',e=>{if(e.target.files[0])importBackup(e.target.files[0]);});
    document.addEventListener('click',e=>{if(!e.target.closest('.food-search-wrap')) $('foodSuggestions').hidden=true;});
    window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installBtn').hidden=false;});
    $('installBtn').addEventListener('click',async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$('installBtn').hidden=true;}else{showToast('On iPhone: Safari → Share → Add to Home Screen');}});
  }

  function initAll(){
    populateFoodSelects(); $('targetCalories').value=state.targets.calories; $('targetProtein').value=state.targets.protein; setSelectedFood(selectedFoodId,true); renderToday(); renderFoodLibrary(); renderIngredients(); renderSavedRecipes(); renderHistory(); updateCustomSuggestion();
  }

  initTabs(); bindEvents(); initAll();
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('service-worker.js').catch(()=>{});
})();
