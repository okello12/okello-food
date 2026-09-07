(() => {
  'use strict';

  const VERSION = 1;
  const PROFILE_KEY = 'okello_first_run_v44';
  const MAIN_STORE = 'okello_food_tracker_v3';
  const ACTIVITY_STORE = 'okello_activity_v1';
  const $ = id => document.getElementById(id);
  const qs = (selector, root=document) => root.querySelector(selector);
  const qsa = (selector, root=document) => Array.from(root.querySelectorAll(selector));
  const catalog = window.OkelloFoodCatalog;
  const piece = window.OkelloPieceEntry;
  if (!catalog) return;

  function readJson(key, fallback){
    try{
      const value = JSON.parse(localStorage.getItem(key) || 'null');
      return value == null ? fallback : value;
    }catch(_){ return fallback; }
  }
  function writeJson(key, value){
    try{ localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(_){ return false; }
  }
  function readState(){ return readJson(MAIN_STORE, {}) || {}; }
  function writeState(state){ return writeJson(MAIN_STORE, state); }
  function todayKey(){ return new Date().toISOString().slice(0,10); }
  function totalLogCount(state=readState()){
    return Object.values(state.logs || {}).reduce((n, rows) => n + (Array.isArray(rows) ? rows.length : 0), 0);
  }
  function isExistingUser(state=readState()){
    return totalLogCount(state) > 0 ||
      (Array.isArray(state.recipes) && state.recipes.length > 0) ||
      (Array.isArray(state.customFoods) && state.customFoods.length > 0) ||
      (Array.isArray(state.mealTemplates) && state.mealTemplates.length > 0) ||
      (Array.isArray(state.weightLogs) && state.weightLogs.length > 0);
  }
  function readProfile(){
    const value = readJson(PROFILE_KEY, null);
    return value && typeof value === 'object' ? value : null;
  }
  function toast(message){
    const node = $('toast');
    if(!node) return;
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('show'), 1900);
  }
  function clickTab(name){
    const tab = qs(`.tab[data-tab="${CSS.escape(name)}"]`);
    if(!tab) return false;
    tab.click();
    return true;
  }
  function esc(value){
    return String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c));
  }

  const css = document.createElement('style');
  css.textContent = `
    .v44-question{margin:0 0 7px}.v44-question h2{margin:0;color:var(--forest);font-size:1.22rem}.v44-question p{margin:3px 0 0;color:var(--muted);font-size:.8rem}
    .v44-starter-shelf{margin:8px 0 14px}.v44-starter-head{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:8px}.v44-starter-head strong{color:var(--forest)}.v44-starter-head span{font-size:.74rem;color:var(--muted)}
    .v44-starter-chips{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;padding:1px 0 3px}.v44-starter-chips::-webkit-scrollbar{display:none}.v44-starter-chip{flex:0 0 auto;min-height:42px;border:1px solid var(--rule);border-radius:14px;background:#fff;color:var(--ink);font-weight:800;padding:8px 11px}.v44-starter-chip small{display:block;color:var(--muted);font-weight:650;font-size:.68rem;margin-top:1px}
    .v44-default-note{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0 14px;padding:9px 11px;border:1px solid var(--rule);border-radius:13px;background:var(--tint);font-size:.77rem;color:var(--muted)}.v44-default-note button{border:0;background:transparent;color:var(--forest);font-weight:850;padding:5px}
    .v44-demo{margin:4px 0 14px;padding:11px 12px;border:1px dashed var(--rule);border-radius:14px;background:#fff}.v44-demo strong{color:var(--forest)}.v44-demo small{display:block;color:var(--muted);margin-top:3px}.v44-estimate-badge{display:inline-flex;align-items:center;min-height:22px;margin-left:6px;padding:2px 7px;border-radius:999px;background:var(--tint);color:var(--muted);font-size:.67rem;font-weight:850;vertical-align:middle}
    .v44-rough{margin:10px 0 0;padding:11px;border:1px solid var(--rule);border-radius:14px;background:var(--tint)}.v44-rough strong{display:block;color:var(--forest);font-size:.82rem}.v44-rough small{display:block;color:var(--muted);font-size:.72rem;margin-top:2px}.v44-rough-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:8px}.v44-rough-btn{min-height:40px;border:1px solid var(--rule);border-radius:11px;background:#fff;color:var(--forest);font-weight:800}.v44-rough-btn.active{background:var(--forest);color:#fff;border-color:var(--forest)}
    .v44-more-tab{display:none}.v44-more-sheet[hidden]{display:none!important}.v44-more-sheet{position:fixed;inset:0;z-index:2850;background:rgba(10,18,14,.68);display:flex;align-items:flex-end;justify-content:center;padding:14px}.v44-more-panel{width:min(620px,100%);background:var(--paper);border-radius:24px 24px 18px 18px;padding:18px}.v44-more-panel h3{margin:0;color:var(--forest)}.v44-more-grid{display:grid;gap:8px;margin-top:12px}.v44-more-grid button{min-height:50px;border:1px solid var(--rule);border-radius:13px;background:#fff;color:var(--ink);font:inherit;font-weight:800;text-align:left;padding:11px 13px}.v44-more-close{margin-top:10px;width:100%}
    .v44-on-today #okelloAppChrome{display:none!important}.v44-on-today .global-hub{top:0!important}
    .v44-unconfirmed .quick-add-card .form-grid,.v44-unconfirmed .quick-add-card .smart-box,.v44-unconfirmed .quick-add-card .calc-readout,.v44-unconfirmed .quick-add-card #addFoodBtn,.v44-unconfirmed .quick-add-card .v44-rough{display:none!important}
    .v44-unconfirmed #selectedFoodBadge{background:var(--tint);color:var(--muted)}
    .v44-hidden-empty-activity{display:none!important}
    #clearTodayBtn.v44-clear{color:var(--muted)!important;background:transparent!important;border:0!important;font-size:.76rem!important;font-weight:750!important;box-shadow:none!important}
    @media(max-width:700px){
      .app-shell{padding-bottom:calc(152px + env(safe-area-inset-bottom))!important}.panel{padding-bottom:34px}.masthead{padding-top:10px}.masthead .standfirst{max-width:34rem}
      .global-hub .hub-tools{display:none!important}.hub-search-row{grid-template-columns:minmax(0,1fr) auto}.hub-search-box input{min-width:0;text-overflow:ellipsis}.hub-scan{min-width:72px}
      .tabs{grid-template-columns:repeat(4,1fr)!important}.tabs .tab[data-tab="recipes"],.tabs .tab[data-tab="activity"],.tabs .tab[data-tab="settings"]{display:none!important}.v44-more-tab{display:block;min-width:0!important;min-height:48px;padding:7px 3px;border:0;background:transparent;border-radius:12px;font-size:.7rem;color:var(--muted);font-weight:800}.v44-more-tab.active{background:var(--forest);color:#fff}
      .ok-app-chrome{grid-template-columns:1fr 1fr!important}.ok-app-chrome .ok-refresh{display:none!important}
      .quick-add-card{scroll-margin-top:96px}.v44-rough-buttons{grid-template-columns:1fr 1fr 1fr}
    }
  `;
  document.head.appendChild(css);

  function tuneVisibleCopy(){
    if($('globalFoodSearch')) $('globalFoodSearch').placeholder = 'Search food or dish…';
    if($('foodSearch')) $('foodSearch').placeholder = 'Search food or dish…';
    if($('hubScanBtn')) $('hubScanBtn').textContent = 'Scan';
    if($('clearTodayBtn')){
      $('clearTodayBtn').textContent = 'Clear log';
      $('clearTodayBtn').classList.add('v44-clear');
    }
    if($('recipesTitle')) $('recipesTitle').textContent = 'Calculate the whole pot once';
    const fibre = $('todayFibre')?.closest('.score-card')?.querySelector('small');
    if(fibre) fibre.textContent = 'From logged foods';
    const regionTitle = qs('.region-filter-head strong');
    if(regionTitle) regionTitle.textContent = 'Browse foods by region';
    const region = qs('.region-filter');
    const librarySearch = $('librarySearch');
    if(region && librarySearch && region.nextElementSibling !== librarySearch){
      librarySearch.insertAdjacentElement('beforebegin', region);
    }
    const install = qs('.install-help');
    if(install){
      install.innerHTML = `<p class="eyebrow">INSTALL</p><h3>Keep Okello Food on your Home Screen</h3><p class="muted"><strong>iPhone:</strong> open in Safari, tap Share, then Add to Home Screen.</p><p class="muted"><strong>Android:</strong> open in Chrome, open the menu, then choose Install app or Add to Home screen.</p><p class="tiny-note">Once installed, the app can work offline. Your logs and saved recipes remain on this device.</p>`;
    }
  }

  function addQuestionToHub(){
    const hub = qs('.global-hub');
    if(!hub || qs('.v44-question', hub)) return;
    const question = document.createElement('div');
    question.className = 'v44-question';
    question.innerHTML = '<h2>What did you eat?</h2><p>Search the food first. You can be approximate about the amount.</p>';
    hub.insertAdjacentElement('afterbegin', question);
  }

  const STARTERS = {
    'ghana-west-africa': [
      ['waakye','Waakye'],['banku','Banku'],['kenkey','Kenkey'],['jollof rice','Jollof'],['light soup','Light soup'],['fried ripe plantain','Fried plantain'],['boiled egg','Egg']
    ],
    'caribbean': [
      ['jerk chicken','Jerk chicken'],['rice and peas','Rice & peas'],['plantain','Plantain'],['curry goat','Curry goat'],['ackee','Ackee'],['roti','Roti'],['oats','Oats']
    ],
    'south-asia': [
      ['chicken biryani','Biryani'],['chapati','Chapati'],['dal','Dal'],['chicken curry','Chicken curry'],['chana masala','Chana masala'],['samosa','Samosa'],['oats','Oats']
    ],
    'mixed': [
      ['waakye','Waakye'],['chicken biryani','Biryani'],['rice','Rice'],['oats','Oats'],['lentils','Lentils'],['plantain','Plantain'],['egg','Egg']
    ]
  };

  function resolveTerm(term){
    const direct = catalog.findByName?.(term);
    if(direct) return direct;
    const q = String(term||'').toLowerCase();
    return (catalog.all?.() || []).find(food => String(food.name||'').toLowerCase().includes(q)) || null;
  }

  let foodConfirmed = isExistingUser();
  let roughSelection = null;

  function setConfirmedFood(food){
    const select = $('foodSelect');
    if(!food || !select) return false;
    if(!Array.from(select.options).some(option => option.value === food.id)) return false;
    select.value = food.id;
    select.dispatchEvent(new Event('change',{bubbles:true}));
    foodConfirmed = true;
    document.body.classList.remove('v44-unconfirmed');
    const badge = $('selectedFoodBadge');
    if(badge) badge.textContent = food.name;
    refreshRoughControls();
    setTimeout(() => qs('.quick-add-card')?.scrollIntoView({behavior:'smooth',block:'start'}), 50);
    return true;
  }

  function starterCulture(){ return readProfile()?.culture || 'ghana-west-africa'; }
  function renderStarterShelf(){
    const quickAdd = qs('.quick-add-card');
    if(!quickAdd) return;
    let shelf = qs('.v44-starter-shelf');
    if(totalLogCount() > 0){
      shelf?.remove();
      qs('.quick-shelf')?.removeAttribute('hidden');
      return;
    }
    if(!shelf){
      shelf = document.createElement('section');
      shelf.className = 'v44-starter-shelf';
      quickAdd.insertAdjacentElement('beforebegin', shelf);
    }
    const culture = starterCulture();
    const items = (STARTERS[culture] || STARTERS['ghana-west-africa'])
      .map(([term,label]) => ({food:resolveTerm(term),label}))
      .filter(x => x.food)
      .slice(0,7);
    shelf.innerHTML = `<div class="v44-starter-head"><strong>${culture==='ghana-west-africa'?'Ghanaian favourites':'Familiar foods'}</strong><span>one tap to start</span></div><div class="v44-starter-chips">${items.map(({food,label}) => `<button class="v44-starter-chip" type="button" data-v44-food="${esc(food.id)}">${esc(food.emoji||'🍽️')} ${esc(label)}<small>${esc(food.name)}</small></button>`).join('')}</div>`;
    qsa('[data-v44-food]', shelf).forEach(button => button.addEventListener('click', () => setConfirmedFood(catalog.getById?.(button.dataset.v44Food))));
    const oldShelf = qs('.quick-shelf');
    if(oldShelf) oldShelf.hidden = true;
  }

  function addDemo(){
    const quickAdd = qs('.quick-add-card');
    if(!quickAdd || totalLogCount() > 0 || qs('.v44-demo')) return;
    const demo = document.createElement('div');
    demo.className = 'v44-demo';
    demo.innerHTML = '<strong>Example only: Banku + tilapia + okro <span class="v44-estimate-badge">Estimated</span></strong><small>This is just to show how a meal can look. Nothing has been added to your diary.</small>';
    quickAdd.insertAdjacentElement('afterend', demo);
  }

  function addDefaultTargetNote(){
    const profile = readProfile();
    if(!profile || profile.customTargets || qs('.v44-default-note')) return;
    const progress = qs('.progress-wrap');
    if(!progress) return;
    const state = readState();
    const kcal = Number(state.targets?.calories) || 2300;
    const protein = Number(state.targets?.protein) || 150;
    const note = document.createElement('div');
    note.className = 'v44-default-note';
    note.innerHTML = `<span>${Math.round(kcal).toLocaleString()} kcal · ${Math.round(protein)} g protein are starter targets, not personalised.</span><button type="button">Change</button>`;
    note.querySelector('button').addEventListener('click', () => clickTab('settings'));
    progress.insertAdjacentElement('afterend', note);
  }

  function pieceNative(food){
    try{ return !!piece?.optionsFor?.(food?.id, readState())?.length; }
    catch(_){ return false; }
  }

  function roughValues(food){
    const usual = Number(food?.portion) || 100;
    return {
      small: Math.max(1, Number(food?.min) || Math.round(usual * .75)),
      usual,
      large: Math.max(1, Number(food?.max) || Math.round(usual * 1.3))
    };
  }

  function ensureRoughControls(){
    const quickCalc = $('quickCalc');
    if(!quickCalc || $('v44Rough')) return;
    const node = document.createElement('div');
    node.id = 'v44Rough';
    node.className = 'v44-rough';
    node.innerHTML = '<strong>No scale? Choose a rough serving.</strong><small>We keep it as an estimate and convert it to grams behind the scenes.</small><div class="v44-rough-buttons"><button type="button" class="v44-rough-btn" data-rough="small">Small</button><button type="button" class="v44-rough-btn" data-rough="usual">Usual</button><button type="button" class="v44-rough-btn" data-rough="large">Large</button></div>';
    quickCalc.insertAdjacentElement('beforebegin', node);
    qsa('[data-rough]', node).forEach(button => button.addEventListener('click', () => {
      const food = catalog.getById?.($('foodSelect')?.value);
      if(!food || pieceNative(food)) return;
      const key = button.dataset.rough;
      const grams = roughValues(food)[key];
      roughSelection = {foodId:food.id, grams, label:key};
      if($('gramsInput')){
        $('gramsInput').value = String(Math.round(grams));
        $('gramsInput').dispatchEvent(new Event('input',{bubbles:true}));
        $('gramsInput').dispatchEvent(new Event('change',{bubbles:true}));
      }
      qsa('[data-rough]', node).forEach(b => b.classList.toggle('active', b === button));
    }));
  }

  function refreshRoughControls(){
    ensureRoughControls();
    const node = $('v44Rough');
    const food = catalog.getById?.($('foodSelect')?.value);
    roughSelection = null;
    qsa('[data-rough]', node || document).forEach(button => button.classList.remove('active'));
    if(!node) return;
    node.hidden = !foodConfirmed || !food || pieceNative(food);
    if(food && pieceNative(food)){
      node.querySelector('strong').textContent = 'This food can be logged by pieces.';
      node.querySelector('small').textContent = 'Choose the food and the piece review will handle count and size.';
    }else{
      node.querySelector('strong').textContent = 'No scale? Choose a rough serving.';
      node.querySelector('small').textContent = 'We keep it as an estimate and convert it to grams behind the scenes.';
    }
  }

  function commitRoughEstimate(){
    if(!roughSelection || !piece?.estimatedGramAmount || !piece?.createLogDraft) return false;
    const food = catalog.getById?.(roughSelection.foodId);
    if(!food || food.id !== $('foodSelect')?.value) return false;
    const amount = {
      ...piece.estimatedGramAmount(food.id, roughSelection.grams),
      estimateSource:'rough-serving-v44',
      roughServingLabel:roughSelection.label
    };
    const state = readState();
    const key = todayKey();
    state.logs = state.logs && typeof state.logs === 'object' ? state.logs : {};
    state.logs[key] = Array.isArray(state.logs[key]) ? state.logs[key] : [];
    const draft = piece.createLogDraft({
      food,
      amount,
      meal:$('mealSelect')?.value || 'Other',
      source:'rough-serving-v44',
      ts:Date.now()
    });
    if(!draft) return false;
    draft.estimateSource = 'rough-serving-v44';
    draft.roughServingLabel = roughSelection.label;
    state.logs[key].push(draft);
    if(!writeState(state)) return false;
    window.OkelloAppState?.syncFromStorage?.();
    window.dispatchEvent(new CustomEvent('okello:food-log-changed',{detail:{day:key,entries:state.logs[key].length,source:'rough-serving-v44'}}));
    roughSelection = null;
    renderStarterShelf();
    qs('.v44-demo')?.remove();
    renderEstimateBadges();
    toast('Estimated serving added');
    return true;
  }

  function armFoodConfirmation(){
    if(foodConfirmed) return;
    document.body.classList.add('v44-unconfirmed');
    const badge = $('selectedFoodBadge');
    if(badge) badge.textContent = 'Choose a food';
    document.addEventListener('pointerdown', event => {
      if(event.target === $('foodSelect')) $('foodSelect').dataset.v44Armed = '1';
    }, true);
    $('foodSelect')?.addEventListener('change', event => {
      if(event.isTrusted || $('foodSelect').dataset.v44Armed === '1'){
        delete $('foodSelect').dataset.v44Armed;
        const food = catalog.getById?.($('foodSelect').value);
        if(food){ foodConfirmed = true; document.body.classList.remove('v44-unconfirmed'); refreshRoughControls(); }
      }
    });
    document.addEventListener('click', event => {
      if(event.target.closest?.('.hub-result,[data-hub-food],.quick-food,#foodSuggestions *')){
        setTimeout(() => {
          const food = catalog.getById?.($('foodSelect')?.value);
          if(food){ foodConfirmed = true; document.body.classList.remove('v44-unconfirmed'); refreshRoughControls(); }
        }, 0);
      }
    }, true);
  }

  function estimateLabel(log){
    if(log?.amountQuality === 'weighed') return 'Weighed';
    if(log?.enteredUnit === 'pieces') return 'Estimated from pieces';
    if(log?.estimateSource === 'rough-serving-v44') return 'Estimated serving';
    const food = catalog.getById?.(log?.foodId);
    const text = `${food?.cat||''} ${food?.note||''}`.toLowerCase();
    if(text.includes('estimate') || text.includes('recipe dependent') || food?.cat === 'Soup' || food?.cat === 'Complete meal') return 'Estimated';
    return null;
  }

  let badgeRendering = false;
  function renderEstimateBadges(){
    if(badgeRendering) return;
    const logNode = $('todayLog');
    if(!logNode) return;
    badgeRendering = true;
    try{
      const rows = qsa('.log-row', logNode);
      const entries = readState().logs?.[todayKey()] || [];
      rows.forEach((row, index) => {
        qs('.v44-estimate-badge', row)?.remove();
        const label = estimateLabel(entries[index]);
        if(!label) return;
        const strong = qs('strong', row);
        if(!strong) return;
        const badge = document.createElement('span');
        badge.className = 'v44-estimate-badge';
        badge.textContent = label;
        strong.appendChild(badge);
      });
    }finally{ badgeRendering = false; }
  }

  function activityHasEvidence(){
    const data = readJson(ACTIVITY_STORE, null);
    if(!data || typeof data !== 'object') return false;
    if(Array.isArray(data.entries) && data.entries.length) return true;
    return Object.values(data.daily || {}).some(day => day && Number(day.manualSteps) > 0);
  }
  function hideDeadActivity(){
    const strip = qs('.today-move-strip');
    if(strip) strip.classList.toggle('v44-hidden-empty-activity', !activityHasEvidence());
  }

  function installMoreNavigation(){
    const tabs = qs('.tabs');
    if(!tabs || qs('.v44-more-tab', tabs)) return;
    const more = document.createElement('button');
    more.type = 'button';
    more.className = 'v44-more-tab';
    more.textContent = 'More';
    tabs.appendChild(more);
    const sheet = document.createElement('div');
    sheet.className = 'v44-more-sheet';
    sheet.hidden = true;
    sheet.innerHTML = '<div class="v44-more-panel" role="dialog" aria-modal="true" aria-labelledby="v44MoreTitle"><h3 id="v44MoreTitle">More</h3><div class="v44-more-grid"><button type="button" data-v44-tab="recipes">🍲 Recipes & whole-pot calculator</button><button type="button" data-v44-tab="activity">🚶 Activity</button><button type="button" data-v44-tab="settings">⚙️ Settings, backup & updates</button></div><button type="button" class="secondary-btn v44-more-close">Close</button></div>';
    document.body.appendChild(sheet);
    const close = () => { sheet.hidden = true; more.classList.remove('active'); };
    more.addEventListener('click', () => { sheet.hidden = false; more.classList.add('active'); });
    qs('.v44-more-close', sheet).addEventListener('click', close);
    sheet.addEventListener('click', event => { if(event.target === sheet) close(); });
    qsa('[data-v44-tab]', sheet).forEach(button => button.addEventListener('click', () => { close(); clickTab(button.dataset.v44Tab); }));
  }

  function updateTodayMode(){
    const current = qs('.tab.active')?.dataset?.tab || 'today';
    document.body.classList.toggle('v44-on-today', current === 'today');
  }

  function buildOnboarding(){
    if(readProfile() || isExistingUser()) return;
    const modal = document.createElement('div');
    modal.className = 'v44-more-sheet';
    modal.id = 'v44Onboarding';
    modal.innerHTML = `<div class="v44-more-panel" role="dialog" aria-modal="true" aria-labelledby="v44OnboardingTitle"><p class="eyebrow">WELCOME</p><h3 id="v44OnboardingTitle">Make the first log feel familiar</h3><p class="muted">Two quick choices. No medical conditions, no long questionnaire.</p><label style="display:block;margin-top:12px;font-weight:800">What foods feel like home?<select id="v44Culture" class="smart-select" style="margin-top:5px"><option value="ghana-west-africa">Ghana & West Africa</option><option value="caribbean">Caribbean</option><option value="south-asia">South Asia</option><option value="mixed">Mixed / everyday</option></select></label><label style="display:block;margin-top:12px;font-weight:800">What are you focusing on?<select id="v44Focus" class="smart-select" style="margin-top:5px"><option value="just-see">Just see what I eat</option><option value="maintain">Maintain</option><option value="lighter">Eat lighter</option><option value="protein">More protein</option></select></label><div class="v44-default-note" style="margin-top:12px"><span>Starter targets are 2,300 kcal and 150 g protein. They are defaults, not personalised.</span></div><details style="margin-top:8px"><summary style="font-weight:800;color:var(--forest);cursor:pointer">Change starter targets</summary><div class="smart-row" style="margin-top:8px"><label>Calories<input id="v44Calories" class="smart-input" type="number" min="1200" max="6000" value="2300"></label><label>Protein (g)<input id="v44Protein" class="smart-input" type="number" min="50" max="400" value="150"></label></div></details><div class="button-row" style="margin-top:14px"><button id="v44Start" class="primary-btn" type="button">Start logging</button><button id="v44Skip" class="secondary-btn" type="button">Skip for now</button></div></div>`;
    document.body.appendChild(modal);
    function finish(skipped){
      const culture = $('v44Culture').value;
      const focus = $('v44Focus').value;
      const kcal = Number($('v44Calories').value) || 2300;
      const protein = Number($('v44Protein').value) || 150;
      const customTargets = kcal !== 2300 || protein !== 150;
      writeJson(PROFILE_KEY,{version:VERSION,culture,focus,customTargets,skipped:!!skipped,createdAt:new Date().toISOString()});
      if(customTargets){
        if($('targetCalories')) $('targetCalories').value = String(kcal);
        if($('targetProtein')) $('targetProtein').value = String(protein);
        $('saveTargetsBtn')?.click();
      }
      modal.remove();
      renderStarterShelf();
      addDefaultTargetNote();
      $('globalFoodSearch')?.focus();
    }
    $('v44Start').addEventListener('click', () => finish(false));
    $('v44Skip').addEventListener('click', () => finish(true));
  }

  document.addEventListener('click', event => {
    const add = event.target.closest?.('#addFoodBtn');
    if(add && roughSelection){
      event.preventDefault();
      event.stopImmediatePropagation();
      commitRoughEstimate();
      return;
    }
    if(event.target.closest?.('.tab[data-tab]')) setTimeout(updateTodayMode, 0);
  }, true);

  $('foodSelect')?.addEventListener('change', () => setTimeout(refreshRoughControls, 0));
  window.addEventListener('okello:food-log-changed', () => {
    renderStarterShelf();
    qs('.v44-demo')?.remove();
    setTimeout(renderEstimateBadges, 0);
  });

  const todayLog = $('todayLog');
  if(todayLog) new MutationObserver(() => renderEstimateBadges()).observe(todayLog,{childList:true,subtree:true});
  const activityStrip = qs('.today-move-strip');
  if(activityStrip) new MutationObserver(hideDeadActivity).observe(activityStrip,{childList:true,subtree:true,characterData:true});

  tuneVisibleCopy();
  addQuestionToHub();
  installMoreNavigation();
  updateTodayMode();
  renderStarterShelf();
  addDemo();
  addDefaultTargetNote();
  armFoodConfirmation();
  ensureRoughControls();
  refreshRoughControls();
  hideDeadActivity();
  renderEstimateBadges();
  buildOnboarding();

  window.OkelloFirstRunV44 = Object.freeze({
    version:VERSION,
    profileKey:PROFILE_KEY,
    readProfile,
    isExistingUser,
    starterCulture,
    resolveTerm,
    roughValues,
    renderStarterShelf,
    renderEstimateBadges,
    hideDeadActivity
  });
})();
