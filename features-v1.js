(() => {
  'use strict';

  const STORE = 'okello_food_tracker_v3';
  const FAV_STORE = 'okello_food_favourites_v1';
  const $ = id => document.getElementById(id);
  const qs = (s, root=document) => root.querySelector(s);
  const qsa = (s, root=document) => Array.from(root.querySelectorAll(s));
  const round1 = n => Math.round((Number(n)||0)*10)/10;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const todayKey = () => new Date().toISOString().slice(0,10);

  const todayLog = $('todayLog');
  const historyPanel = $('tab-history');
  const recipesPanel = $('tab-recipes');
  const foodsPanel = $('tab-foods');
  const settingsPanel = $('tab-settings');
  if (!todayLog || !historyPanel || !recipesPanel || !settingsPanel) return;

  function readState(){
    try { return JSON.parse(localStorage.getItem(STORE) || '{}') || {}; }
    catch (_) { return {}; }
  }
  function writeState(s){
    localStorage.setItem(STORE, JSON.stringify(s));
  }
  function ensureState(){
    const s = readState();
    s.targets = s.targets || {calories:2300, protein:150};
    s.logs = s.logs || {};
    s.customFoods = Array.isArray(s.customFoods) ? s.customFoods : [];
    s.recipes = Array.isArray(s.recipes) ? s.recipes : [];
    s.mealTemplates = Array.isArray(s.mealTemplates) ? s.mealTemplates : [];
    s.weightLogs = Array.isArray(s.weightLogs) ? s.weightLogs : [];
    return s;
  }
  function uid(prefix='id'){
    if (crypto.randomUUID) return prefix + '_' + crypto.randomUUID();
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).slice(2);
  }
  function toast(msg){
    const t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 1900);
  }
  function reloadWithMessage(msg){
    if (msg) sessionStorage.setItem('okello_flash', msg);
    location.reload();
  }
  const flash = sessionStorage.getItem('okello_flash');
  if (flash) {
    sessionStorage.removeItem('okello_flash');
    setTimeout(() => toast(flash), 250);
  }

  const css = document.createElement('style');
  css.textContent = `
    .feature-actions{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;margin-top:6px}
    .feature-mini{min-height:34px;border:1px solid var(--rule);border-radius:999px;background:#fff;color:var(--forest);padding:5px 10px;font-size:.73rem;font-weight:800}
    .feature-mini.primary{background:var(--forest);border-color:var(--forest);color:#fff}
    .feature-mini.danger{color:var(--clay)}
    .feature-card{background:var(--white);border:1px solid var(--rule);border-radius:20px;padding:18px;margin:14px 0;box-shadow:var(--shadow)}
    .feature-card h3{margin:0}.feature-sub{margin:4px 0 0;color:var(--muted);font-size:.86rem}
    .week-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;align-items:end;height:150px;margin-top:16px;padding-top:10px;border-bottom:1px solid var(--rule)}
    .week-day{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px;min-width:0}
    .week-track{height:104px;width:100%;max-width:34px;background:var(--tint);border-radius:9px 9px 3px 3px;display:flex;align-items:flex-end;overflow:hidden}
    .week-fill{width:100%;background:var(--success);border-radius:8px 8px 0 0;min-height:2px}
    .week-fill.over{background:var(--clay)}.week-fill.empty{background:var(--rule)}
    .week-day small{font-size:.66rem;color:var(--muted);white-space:nowrap}.week-day strong{font-size:.67rem;color:var(--ink)}
    .week-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
    .week-stat{background:var(--tint);border-radius:12px;padding:10px}.week-stat span{display:block;font-size:.68rem;color:var(--muted)}.week-stat strong{display:block;margin-top:2px}
    .template-list{display:grid;gap:9px;margin-top:12px}.template-row{border:1px solid var(--rule);border-radius:14px;padding:11px;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;background:#fff}
    .template-row small{display:block;color:var(--muted);margin-top:2px}.template-buttons{display:flex;gap:6px;align-items:center}
    .yesterday-row{display:flex;gap:8px;overflow-x:auto;scrollbar-width:none;margin-top:10px;padding-bottom:2px}.yesterday-row::-webkit-scrollbar{display:none}
    .yesterday-pill{flex:0 0 auto;border:1px solid var(--rule);border-radius:14px;background:var(--tint);color:var(--forest);padding:9px 11px;text-align:left}.yesterday-pill strong{display:block;font-size:.8rem}.yesterday-pill small{display:block;font-size:.69rem;color:var(--muted);margin-top:2px}
    .feature-modal[hidden]{display:none!important}.feature-modal{position:fixed;inset:0;z-index:1300;background:rgba(10,18,14,.68);display:flex;align-items:flex-end;justify-content:center;padding:14px}
    .feature-sheet{width:min(620px,100%);max-height:90%;overflow:auto;background:var(--paper);border-radius:24px;padding:17px}.feature-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.feature-head h3{margin:0}.feature-close{width:44px;height:44px;border:1px solid var(--rule);border-radius:50%;background:#fff;font-size:1.15rem}
    .feature-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.feature-form label{font-size:.78rem}.feature-form input,.feature-form select{margin-top:5px}
    .feature-buttons{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px}.feature-buttons button{flex:1 1 140px}
    .weight-top{display:grid;grid-template-columns:1fr 1fr auto;gap:9px;align-items:end}.weight-top button{min-height:46px}
    .weight-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:13px 0}.weight-stat{background:var(--tint);border-radius:12px;padding:10px}.weight-stat span{display:block;color:var(--muted);font-size:.68rem}.weight-stat strong{display:block;margin-top:2px}
    .weight-chart{width:100%;height:170px;display:block}.weight-axis{stroke:var(--rule);stroke-width:1}.weight-line{fill:none;stroke:var(--forest);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.weight-dot{fill:var(--gold);stroke:var(--paper);stroke-width:2}
    .weight-empty{padding:18px 0;color:var(--muted);font-size:.88rem}
    .recipe-smart-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:10px}.recipe-smart-result{margin-top:12px;background:var(--tint);border-radius:14px;padding:13px}.recipe-smart-result strong{font-size:1.45rem;color:var(--clay)}.recipe-smart-result small{display:block;color:var(--muted);margin-top:3px}
    .quality-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 7px;font-size:.66rem;font-weight:850;margin-top:7px;border:1px solid var(--rule)}
    .quality-high{background:#edf6f1;color:#24513d;border-color:#bcd7c9}.quality-mid{background:#f5f0df;color:#6b5519;border-color:#ddc98b}.quality-low{background:#f7e9e5;color:#83321f;border-color:#e0b4a9}
    .quality-guide{border-left:4px solid var(--gold)}.quality-guide p{margin:.25rem 0;color:var(--muted);font-size:.84rem}
    .secure-transfer .feature-form{grid-template-columns:1fr}.secure-note{font-size:.79rem;color:var(--muted);margin-top:9px}
    @media(max-width:700px){
      .feature-form,.weight-top,.recipe-smart-grid{grid-template-columns:1fr}
      .week-summary,.weight-stats{grid-template-columns:1fr 1fr 1fr}
      .template-row{grid-template-columns:1fr}.template-buttons{justify-content:flex-start}
    }
  `;
  document.head.appendChild(css);

  // ---------- Modal ----------
  const modal = document.createElement('div');
  modal.className = 'feature-modal';
  modal.hidden = true;
  modal.innerHTML = `<div class="feature-sheet" role="dialog" aria-modal="true" aria-labelledby="featureModalTitle">
    <div class="feature-head"><div><p class="eyebrow" id="featureModalEyebrow">EDIT</p><h3 id="featureModalTitle">Edit item</h3></div><button class="feature-close" type="button" aria-label="Close">×</button></div>
    <div id="featureModalBody"></div>
  </div>`;
  document.body.appendChild(modal);
  qs('.feature-close', modal).addEventListener('click', () => modal.hidden = true);
  modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });
  function openModal(title, eyebrow, html){
    $('featureModalTitle').textContent = title;
    $('featureModalEyebrow').textContent = eyebrow;
    $('featureModalBody').innerHTML = html;
    modal.hidden = false;
  }

  // ---------- Edit and repeat logged items ----------
  function enhanceTodayLog(){
    const s = ensureState();
    const entries = s.logs[todayKey()] || [];
    qsa('.log-row', todayLog).forEach((row, index) => {
      if (row.dataset.featureEnhanced === '1') return;
      row.dataset.featureEnhanced = '1';
      const numbers = qs('.numbers', row) || row;
      const wrap = document.createElement('div');
      wrap.className = 'feature-actions';
      wrap.innerHTML = `<button class="feature-mini" type="button" data-edit="${index}">Edit</button><button class="feature-mini" type="button" data-repeat="${index}">Repeat</button>`;
      numbers.appendChild(wrap);
    });
    qsa('[data-edit]', todayLog).forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', () => editEntry(Number(b.dataset.edit)));
    });
    qsa('[data-repeat]', todayLog).forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1';
      b.addEventListener('click', () => repeatEntry(Number(b.dataset.repeat)));
    });
  }

  function editEntry(index){
    const s = ensureState();
    const list = s.logs[todayKey()] || [];
    const x = list[index];
    if (!x) return;
    openModal('Edit logged food', 'TODAY', `
      <p class="feature-sub">${esc((x.emoji||'🍽️') + ' ' + x.name)}</p>
      <div class="feature-form" style="margin-top:12px">
        <label>Amount (g)<input id="editGrams" type="number" min="1" max="5000" value="${Number(x.grams)||1}"></label>
        <label>Meal<select id="editMeal">${['Lunch','Dinner','Snack','Other'].map(m=>`<option ${m===x.meal?'selected':''}>${m}</option>`).join('')}</select></label>
      </div>
      <div class="feature-buttons"><button id="saveEditEntry" class="primary-btn" type="button">Save changes</button><button id="cancelEditEntry" class="secondary-btn" type="button">Cancel</button></div>`);
    $('cancelEditEntry').addEventListener('click', () => modal.hidden = true);
    $('saveEditEntry').addEventListener('click', () => {
      const grams = Math.max(1, Math.min(5000, Number($('editGrams').value)||x.grams||1));
      const oldG = Number(x.grams)||1;
      const ratio = grams / oldG;
      x.grams = grams;
      x.meal = $('editMeal').value;
      x.kcal = (Number(x.kcal)||0) * ratio;
      x.protein = (Number(x.protein)||0) * ratio;
      x.fibre = (Number(x.fibre)||0) * ratio;
      writeState(s);
      modal.hidden = true;
      reloadWithMessage('Meal updated');
    });
  }

  function repeatEntry(index){
    const s = ensureState();
    const list = s.logs[todayKey()] || [];
    const x = list[index];
    if (!x) return;
    list.push({...x, id:uid('repeat'), ts:Date.now()});
    s.logs[todayKey()] = list;
    writeState(s);
    reloadWithMessage(`${x.name} added again`);
  }

  new MutationObserver(enhanceTodayLog).observe(todayLog,{childList:true,subtree:true});
  enhanceTodayLog();

  // ---------- Weekly dashboard ----------
  const progress = qs('.progress-wrap', $('tab-today'));
  const weekly = document.createElement('section');
  weekly.className = 'feature-card';
  weekly.id = 'weeklyProgressCard';
  if (progress) progress.insertAdjacentElement('afterend', weekly);

  function dateKeyOffset(offset){
    const d = new Date();
    d.setDate(d.getDate()+offset);
    return d.toISOString().slice(0,10);
  }
  function fmtDay(k){
    return new Intl.DateTimeFormat('en-GB',{weekday:'short'}).format(new Date(k+'T12:00:00'));
  }
  function totals(list){
    return (list||[]).reduce((a,x)=>({kcal:a.kcal+(Number(x.kcal)||0),protein:a.protein+(Number(x.protein)||0)}),{kcal:0,protein:0});
  }
  function renderWeekly(){
    const s = ensureState();
    const target = Number(s.targets?.calories)||2300;
    const days = Array.from({length:7},(_,i)=>dateKeyOffset(i-6)).map(k=>({k,...totals(s.logs[k]||[])}));
    const withFood = days.filter(d=>d.kcal>0);
    const avg = withFood.length ? withFood.reduce((n,d)=>n+d.kcal,0)/withFood.length : 0;
    const avgProtein = withFood.length ? withFood.reduce((n,d)=>n+d.protein,0)/withFood.length : 0;
    const onTarget = withFood.filter(d=>d.kcal<=target).length;
    weekly.innerHTML = `<div class="section-heading"><div><p class="eyebrow">7-DAY VIEW</p><h3>Weekly progress</h3><p class="feature-sub">A quick view of calories logged against your ${target.toLocaleString()} kcal target.</p></div></div>
      <div class="week-grid">${days.map(d=>{
        const pct=Math.min(100,(d.kcal/target)*100);
        const cls=d.kcal===0?'empty':d.kcal>target?'over':'';
        return `<div class="week-day"><strong>${d.kcal?Math.round(d.kcal):'—'}</strong><div class="week-track"><div class="week-fill ${cls}" style="height:${d.kcal?Math.max(3,pct):2}%"></div></div><small>${fmtDay(d.k)}</small></div>`;
      }).join('')}</div>
      <div class="week-summary"><div class="week-stat"><span>Average</span><strong>${avg?Math.round(avg).toLocaleString():'—'} kcal</strong></div><div class="week-stat"><span>Protein avg</span><strong>${avgProtein?Math.round(avgProtein)+' g':'—'}</strong></div><div class="week-stat"><span>At/below target</span><strong>${onTarget}/${withFood.length||0} days</strong></div></div>`;
  }
  renderWeekly();

  // ---------- Meal templates and repeat yesterday ----------
  const logCard = todayLog.closest('.card');
  const shortcuts = document.createElement('section');
  shortcuts.className = 'feature-card';
  shortcuts.id = 'mealShortcutsCard';
  if (logCard) logCard.insertAdjacentElement('beforebegin', shortcuts);

  function templateCalories(t){ return (t.items||[]).reduce((n,x)=>n+(Number(x.kcal)||0),0); }
  function renderShortcuts(){
    const s = ensureState();
    const yKey = dateKeyOffset(-1);
    const yEntries = s.logs[yKey] || [];
    const groups = {};
    yEntries.forEach(x => (groups[x.meal||'Other'] ||= []).push(x));
    shortcuts.innerHTML = `<div class="section-heading"><div><p class="eyebrow">ONE-TAP MEALS</p><h3>Repeat or save a meal</h3><p class="feature-sub">Reuse meals you already know fit your routine.</p></div><button id="newTemplateBtn" class="secondary-btn mini" type="button">Save today as template</button></div>
      ${Object.keys(groups).length?`<div class="yesterday-row">${Object.entries(groups).map(([meal,items])=>`<button class="yesterday-pill" data-repeat-meal="${esc(meal)}" type="button"><strong>Repeat yesterday's ${esc(meal.toLowerCase())}</strong><small>${items.length} items · ${Math.round(items.reduce((n,x)=>n+(Number(x.kcal)||0),0))} kcal</small></button>`).join('')}</div>`:''}
      <div class="template-list">${s.mealTemplates.length?s.mealTemplates.map((t,i)=>`<div class="template-row"><div><strong>${esc(t.name)}</strong><small>${(t.items||[]).length} items · ${Math.round(templateCalories(t))} kcal</small></div><div class="template-buttons"><button class="feature-mini primary" data-use-template="${i}" type="button">Add</button><button class="feature-mini danger" data-delete-template="${i}" type="button">Delete</button></div></div>`).join(''):'<div class="empty-state">No saved meal templates yet.</div>'}</div>`;
    $('newTemplateBtn')?.addEventListener('click', openTemplateCreator);
    qsa('[data-repeat-meal]',shortcuts).forEach(b=>b.addEventListener('click',()=>repeatMealFromDay(yKey,b.dataset.repeatMeal)));
    qsa('[data-use-template]',shortcuts).forEach(b=>b.addEventListener('click',()=>useTemplate(Number(b.dataset.useTemplate))));
    qsa('[data-delete-template]',shortcuts).forEach(b=>b.addEventListener('click',()=>deleteTemplate(Number(b.dataset.deleteTemplate))));
  }
  function repeatMealFromDay(day, meal){
    const s=ensureState();
    const items=(s.logs[day]||[]).filter(x=>(x.meal||'Other')===meal);
    if(!items.length)return;
    const target=s.logs[todayKey()]||(s.logs[todayKey()]=[]);
    items.forEach(x=>target.push({...x,id:uid('repeatmeal'),ts:Date.now()}));
    writeState(s);reloadWithMessage(`${meal} repeated`);
  }
  function openTemplateCreator(){
    const s=ensureState();
    const entries=s.logs[todayKey()]||[];
    const meals=[...new Set(entries.map(x=>x.meal||'Other'))];
    if(!meals.length){toast('Log a meal first');return;}
    openModal('Save meal template','TEMPLATE',`
      <div class="feature-form">
        <label>Template name<input id="templateName" type="text" placeholder="e.g. Eggs & sardines lunch"></label>
        <label>Meal<select id="templateMeal">${meals.map(m=>`<option>${esc(m)}</option>`).join('')}</select></label>
      </div>
      <div class="feature-buttons"><button id="saveTemplateBtn" class="primary-btn" type="button">Save template</button><button id="cancelTemplateBtn" class="secondary-btn" type="button">Cancel</button></div>`);
    $('cancelTemplateBtn').addEventListener('click',()=>modal.hidden=true);
    $('saveTemplateBtn').addEventListener('click',()=>{
      const meal=$('templateMeal').value;
      const items=(s.logs[todayKey()]||[]).filter(x=>(x.meal||'Other')===meal).map(x=>({...x,id:undefined,ts:undefined}));
      if(!items.length)return;
      const name=$('templateName').value.trim()||`${meal} template`;
      s.mealTemplates.push({id:uid('template'),name,items,createdAt:Date.now()});
      writeState(s);modal.hidden=true;renderShortcuts();toast('Meal template saved');
    });
  }
  function useTemplate(i){
    const s=ensureState();const t=s.mealTemplates[i];if(!t)return;
    const target=s.logs[todayKey()]||(s.logs[todayKey()]=[]);
    (t.items||[]).forEach(x=>target.push({...x,id:uid('templateitem'),ts:Date.now()}));
    writeState(s);reloadWithMessage(`${t.name} added`);
  }
  function deleteTemplate(i){
    const s=ensureState();s.mealTemplates.splice(i,1);writeState(s);renderShortcuts();toast('Template deleted');
  }
  renderShortcuts();

  // ---------- Weight tracking ----------
  const weightCard=document.createElement('section');
  weightCard.className='feature-card';
  const histHeading=qs('.section-heading',historyPanel);
  if(histHeading) histHeading.insertAdjacentElement('afterend',weightCard);

  function renderWeight(){
    const s=ensureState();
    const logs=[...s.weightLogs].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
    const last=logs.at(-1), first=logs[0];
    const change=last&&first?Number(last.kg)-Number(first.kg):0;
    const target=Number(s.weightTarget)||0;
    weightCard.innerHTML=`<div class="section-heading"><div><p class="eyebrow">WEIGHT</p><h3>Weight trend</h3><p class="feature-sub">Log it under similar conditions and judge the trend, not one reading.</p></div></div>
      <div class="weight-top"><label>Weight (kg)<input id="weightKg" type="number" min="30" max="400" step="0.1" inputmode="decimal" placeholder="${last?esc(last.kg):'e.g. 158.0'}"></label><label>Date<input id="weightDate" type="date" value="${todayKey()}"></label><button id="addWeightBtn" class="primary-btn" type="button">Log weight</button></div>
      <div class="weight-stats"><div class="weight-stat"><span>Latest</span><strong>${last?round1(last.kg)+' kg':'—'}</strong></div><div class="weight-stat"><span>Change</span><strong>${logs.length>1?(change>0?'+':'')+round1(change)+' kg':'—'}</strong></div><div class="weight-stat"><span>Entries</span><strong>${logs.length}</strong></div></div>
      ${logs.length>=2?weightSvg(logs):'<div class="weight-empty">Add at least two weight entries to see the trend chart.</div>'}
      <div class="feature-form" style="margin-top:10px"><label>Optional target weight (kg)<input id="weightTarget" type="number" min="30" max="300" step="0.1" value="${target||''}" placeholder="Optional"></label><label>&nbsp;<button id="saveWeightTarget" class="secondary-btn" style="width:100%;margin-top:5px" type="button">Save target</button></label></div>`;
    $('addWeightBtn').addEventListener('click',()=>{
      const kg=Number($('weightKg').value),date=$('weightDate').value;
      if(!(kg>=30&&kg<=400)||!date){toast('Enter a valid weight and date');return;}
      const idx=s.weightLogs.findIndex(x=>x.date===date);
      const row={id:idx>=0?s.weightLogs[idx].id:uid('weight'),date,kg:round1(kg),ts:Date.now()};
      if(idx>=0)s.weightLogs[idx]=row;else s.weightLogs.push(row);
      writeState(s);renderWeight();toast('Weight logged');
    });
    $('saveWeightTarget').addEventListener('click',()=>{
      const v=Number($('weightTarget').value);
      s.weightTarget=v>=30&&v<=300?round1(v):null;writeState(s);renderWeight();toast('Target saved');
    });
  }
  function weightSvg(logs){
    const pts=logs.slice(-12);const vals=pts.map(x=>Number(x.kg));
    const min=Math.min(...vals),max=Math.max(...vals),range=Math.max(1,max-min);
    const W=560,H=150,pad=18;
    const coords=pts.map((x,i)=>({x:pad+(i*(W-pad*2)/Math.max(1,pts.length-1)),y:pad+((max-Number(x.kg))/range)*(H-pad*2),kg:Number(x.kg),date:x.date}));
    const d=coords.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+' '+p.y.toFixed(1)).join(' ');
    return `<svg class="weight-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Weight trend"><line class="weight-axis" x1="${pad}" y1="${H-pad}" x2="${W-pad}" y2="${H-pad}"></line><path class="weight-line" d="${d}"></path>${coords.map(p=>`<circle class="weight-dot" cx="${p.x}" cy="${p.y}" r="5"><title>${esc(p.date)}: ${round1(p.kg)} kg</title></circle>`).join('')}<text x="${pad}" y="${pad}" font-size="11" fill="currentColor">${round1(max)} kg</text><text x="${pad}" y="${H-3}" font-size="11" fill="currentColor">${round1(min)} kg</text></svg>`;
  }
  renderWeight();

  // ---------- Smart recipe servings ----------
  const recipeTool=document.createElement('section');
  recipeTool.className='feature-card';
  const recipeLede=qs('.lede',recipesPanel);
  if(recipeLede) recipeLede.insertAdjacentElement('afterend',recipeTool);

  function renderRecipeTool(){
    const s=ensureState();
    if(!s.recipes.length){
      recipeTool.innerHTML=`<p class="eyebrow">SMART SERVING</p><h3>Recipe serving calculator</h3><p class="feature-sub">Save a recipe first. Then this will calculate grams for your calorie budget.</p>`;
      return;
    }
    recipeTool.innerHTML=`<div class="section-heading"><div><p class="eyebrow">SMART SERVING</p><h3>How much of my recipe?</h3><p class="feature-sub">Choose a saved pot and either use the selected meal budget or set a calorie amount yourself.</p></div></div>
      <div class="recipe-smart-grid"><label>Recipe<select id="smartRecipeSelect">${s.recipes.map((r,i)=>`<option value="${i}">${esc(r.name)} · ${round1(r.kcalPer100)} kcal/100 g</option>`).join('')}</select></label><label>Meal<select id="smartRecipeMeal"><option>Lunch</option><option selected>Dinner</option><option>Snack</option><option>Other</option></select></label><label>Or target kcal<input id="smartRecipeKcal" type="number" min="50" max="2000" step="10" placeholder="Optional"></label></div>
      <div id="smartRecipeResult" class="recipe-smart-result"></div>
      <div class="feature-buttons"><button id="useSmartRecipe" class="primary-btn" type="button">Use this serving</button><button id="saveRecipeDefault" class="secondary-btn" type="button">Set as recipe default</button></div>`;
    ['smartRecipeSelect','smartRecipeMeal','smartRecipeKcal'].forEach(id=>$(id).addEventListener('input',updateSmartRecipe));
    $('useSmartRecipe').addEventListener('click',useSmartRecipe);
    $('saveRecipeDefault').addEventListener('click',saveRecipeDefault);
    updateSmartRecipe();
  }
  function currentRecipeSuggestion(){
    const s=ensureState();const r=s.recipes[Number($('smartRecipeSelect')?.value||0)];if(!r||!(Number(r.kcalPer100)>0))return null;
    const meal=$('smartRecipeMeal')?.value||'Dinner';
    const custom=Number($('smartRecipeKcal')?.value);
    const shares={Lunch:.30,Dinner:.45,Snack:.15,Other:.10};
    const today=totals(s.logs[todayKey()]||[]).kcal;
    const dailyRemain=Math.max(0,(Number(s.targets?.calories)||2300)-today);
    const mealUsed=(s.logs[todayKey()]||[]).filter(x=>(x.meal||'Other')===meal).reduce((n,x)=>n+(Number(x.kcal)||0),0);
    const mealRemain=Math.max(0,(Number(s.targets?.calories)||2300)*(shares[meal]||.10)-mealUsed);
    const budget=custom>0?Math.min(custom,dailyRemain||custom):Math.min(dailyRemain,mealRemain*.85);
    const grams=Math.max(0,Math.min(1000,Math.round((budget/(Number(r.kcalPer100)/100))/5)*5));
    return {r,meal,budget,grams,kcal:grams*(Number(r.kcalPer100)/100),dailyRemain,mealRemain};
  }
  function updateSmartRecipe(){
    const x=currentRecipeSuggestion();const box=$('smartRecipeResult');if(!box)return;
    if(!x||x.grams<=0){box.innerHTML='<strong>0 g</strong><small>No calorie room available for this calculation yet, or the recipe has no calorie value.</small>';return;}
    box.innerHTML=`<strong>${x.grams} g</strong><small>About ${Math.round(x.kcal)} kcal of ${esc(x.r.name)}. Daily room before this serving: ${Math.round(x.dailyRemain)} kcal.</small>`;
  }
  function useSmartRecipe(){
    const x=currentRecipeSuggestion();if(!x||!x.grams)return;
    const select=$('foodSelect'),grams=$('gramsInput'),meal=$('mealSelect');
    const id='recipe_'+x.r.id;
    if(select&&Array.from(select.options).some(o=>o.value===id)){
      select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));grams.value=x.grams;grams.dispatchEvent(new Event('input',{bubbles:true}));meal.value=x.meal;
      qs('.tab[data-tab="today"]')?.click();setTimeout(()=>qs('.quick-add-card')?.scrollIntoView({behavior:'smooth',block:'start'}),80);
    } else toast('Saved recipe could not be selected');
  }
  function saveRecipeDefault(){
    const x=currentRecipeSuggestion();if(!x||!x.grams)return;
    const s=ensureState();const idx=Number($('smartRecipeSelect').value);if(!s.recipes[idx])return;
    s.recipes[idx].defaultPortion=x.grams;writeState(s);toast('Recipe default updated');
  }
  renderRecipeTool();

  // ---------- Data-quality labels ----------
  const qualityGuide=document.createElement('section');
  qualityGuide.className='feature-card quality-guide';
  qualityGuide.innerHTML=`<p class="eyebrow">DATA QUALITY</p><h3>Know how certain the number is</h3><p><strong>Higher confidence:</strong> packet/barcode nutrition or your own weighed recipe. <strong>Reference:</strong> standard single foods. <strong>Estimated:</strong> mixed Ghanaian dishes whose oil, water and meat vary.</p>`;
  const libSearch=$('librarySearch');
  if(foodsPanel&&libSearch) libSearch.insertAdjacentElement('beforebegin',qualityGuide);

  function classifyCard(card){
    const title=(qs('h4',card)?.textContent||'').trim();
    const text=card.textContent.toLowerCase();
    const s=ensureState();
    const custom=s.customFoods.find(f=>String(f.name).trim()===title);
    const recipe=s.recipes.find(r=>String(r.name).trim()===title);
    if(recipe) return ['Your recipe','quality-high'];
    if(custom?.barcode) return ['Package data','quality-high'];
    if(custom && !String(custom.id||'').startsWith('ghana_')) return ['Manual label','quality-high'];
    if(text.includes('estimate')||text.includes('recipe dependent')||text.includes('varies')||String(custom?.id||'').startsWith('ghana_')) return ['Estimated','quality-low'];
    return ['Reference','quality-mid'];
  }
  function enhanceFoodCards(){
    qsa('.food-card').forEach(card=>{
      if(card.dataset.quality==='1')return;
      card.dataset.quality='1';
      const [label,cls]=classifyCard(card);
      const target=qs('.portion',card)||qs('div:nth-child(2)',card)||card;
      const badge=document.createElement('span');badge.className='quality-badge '+cls;badge.textContent=label;target.appendChild(badge);
    });
  }
  const foodLibrary=$('foodLibrary');
  if(foodLibrary){new MutationObserver(enhanceFoodCards).observe(foodLibrary,{childList:true,subtree:true});enhanceFoodCards();}

  // ---------- Secure encrypted device transfer ----------
  const secure=document.createElement('section');
  secure.className='feature-card secure-transfer';
  secure.innerHTML=`<p class="eyebrow">SECURE TRANSFER</p><h3>Move your private data between devices</h3><p class="feature-sub">This encrypts your logs on the phone before creating a backup file. It is a secure manual bridge until the app has a private account backend for real automatic sync.</p>
    <div class="feature-form" style="margin-top:12px"><label>Passphrase<input id="syncPassphrase" type="password" autocomplete="new-password" placeholder="Use a passphrase you will remember"></label></div>
    <div class="feature-buttons"><button id="encryptedExportBtn" class="primary-btn" type="button">Create encrypted backup</button><label class="secondary-btn file-label" style="text-align:center">Restore encrypted backup<input id="encryptedImportInput" type="file" accept=".okello,application/json" hidden></label></div>
    <p class="secure-note">The passphrase is not stored. If you lose it, the encrypted file cannot be restored. Your food and weight history is not uploaded to the public GitHub repository.</p>`;
  const installCard=qs('.install-help',settingsPanel);
  if(installCard) installCard.insertAdjacentElement('beforebegin',secure); else settingsPanel.appendChild(secure);

  function bytesToB64(bytes){let s='';bytes.forEach(b=>s+=String.fromCharCode(b));return btoa(s);}
  function b64ToBytes(s){const raw=atob(s);return Uint8Array.from(raw,c=>c.charCodeAt(0));}
  async function deriveKey(pass,salt){
    const keyMaterial=await crypto.subtle.importKey('raw',new TextEncoder().encode(pass),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:180000,hash:'SHA-256'},keyMaterial,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  $('encryptedExportBtn').addEventListener('click',async()=>{
    const pass=$('syncPassphrase').value;
    if(pass.length<8){toast('Use at least 8 characters');return;}
    try{
      const payload={version:1,exportedAt:new Date().toISOString(),state:ensureState(),favourites:JSON.parse(localStorage.getItem(FAV_STORE)||'[]')};
      const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),key=await deriveKey(pass,salt);
      const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(payload))));
      const out={format:'okello-encrypted-v1',salt:bytesToB64(salt),iv:bytesToB64(iv),data:bytesToB64(cipher)};
      const blob=new Blob([JSON.stringify(out)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='okello-food-private-'+todayKey()+'.okello';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast('Encrypted backup created');
    }catch(_){toast('Could not create encrypted backup');}
  });
  $('encryptedImportInput').addEventListener('change',async e=>{
    const file=e.target.files?.[0],pass=$('syncPassphrase').value;if(!file)return;if(pass.length<8){toast('Enter the backup passphrase first');return;}
    try{
      const enc=JSON.parse(await file.text());if(enc.format!=='okello-encrypted-v1')throw new Error('format');
      const salt=b64ToBytes(enc.salt),iv=b64ToBytes(enc.iv),cipher=b64ToBytes(enc.data),key=await deriveKey(pass,salt);
      const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},key,cipher);const payload=JSON.parse(new TextDecoder().decode(plain));
      if(!payload.state||typeof payload.state!=='object')throw new Error('payload');
      writeState(payload.state);if(Array.isArray(payload.favourites))localStorage.setItem(FAV_STORE,JSON.stringify(payload.favourites));reloadWithMessage('Encrypted backup restored');
    }catch(_){toast('Could not restore: check the file and passphrase');}
  });
})();