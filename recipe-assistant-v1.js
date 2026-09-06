(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const recipesPanel = $('tab-recipes');
  const recipeName = $('recipeName');
  const finalWeight = $('recipeFinalWeight');
  const recipeFoodSelect = $('recipeFoodSelect');
  const gramsInput = $('recipeIngredientGrams');
  const addIngredientBtn = $('addIngredientBtn');
  const ingredientList = $('ingredientList');
  const toastEl = $('toast');
  if (!recipesPanel || !recipeName || !finalWeight || !recipeFoodSelect || !gramsInput || !addIngredientBtn || !ingredientList) return;

  const DRAFT_KEY = 'okello_recipe_voice_draft_v1';
  const esc = s => String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const round1 = n => Math.round((Number(n)||0)*10)/10;

  function toast(msg){
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => toastEl.classList.remove('show'), 2100);
  }

  const aliases = [
    {id:'raw_groundnut_paste', names:['groundnut paste','peanut paste','peanut butter'], density:1.07, cup:258},
    {id:'raw_pepper_base', names:['tomato pepper onion base','tomato pepper and onion base','pepper base','blended tomatoes pepper onion','blended tomato pepper onion','stew base'], density:1.0, cup:240},
    {id:'raw_tomato_paste', names:['tomato paste','tomato puree','tomato purée'], density:1.08, cup:260},
    {id:'raw_smoked_fish', names:['smoked dried fish','smoked fish','dried fish'], density:1, cup:110},
    {id:'raw_corn_dough', names:['fermented corn dough','corn dough','maize dough'], density:1, cup:240},
    {id:'raw_cassava_dough', names:['cassava dough'], density:1, cup:240},
    {id:'raw_kontomire', names:['kontomire leaves','kontomire'], density:1, cup:70},
    {id:'raw_garden_egg', names:['garden eggs','garden egg'], density:1, cup:150},
    {id:'raw_egusi', names:['agushi seeds','agushie seeds','agushi','agushie','egusi seeds','egusi'], density:1, cup:145},
    {id:'raw_palm_oil', names:['red palm oil','palm oil'], density:.91, cup:218},
    {id:'raw_veg_oil', names:['vegetable oil','sunflower oil','rapeseed oil','canola oil','olive oil','cooking oil','oil'], density:.91, cup:218},
    {id:'raw_stock_cube', names:['stock cubes','stock cube','seasoning cubes','seasoning cube','maggi cubes','maggi cube'], density:1, each:10},
    {id:'raw_chicken', names:['raw chicken','chicken'], density:1, cup:145},
    {id:'raw_beef', names:['raw beef','stewing beef','beef'], density:1, cup:150},
    {id:'raw_goat', names:['raw goat','goat meat','goat'], density:1, cup:150},
    {id:'raw_fish', names:['fresh fish','raw fish','tilapia','cod','hake','fish'], density:1, cup:145},
    {id:'raw_plantain', names:['raw plantain','plantain'], density:1, cup:155},
    {id:'raw_yam', names:['raw yam','yam'], density:1, cup:150},
    {id:'raw_okro', names:['raw okro','raw okra','okro','okra'], density:1, cup:100},
    {id:'raw_onion', names:['raw onions','raw onion','onions','onion'], density:1, cup:160},
    {id:'raw_rice', names:['raw rice','dry rice','uncooked rice','rice'], density:1, cup:185},
    {id:'raw_beans', names:['dry beans','raw beans','beans'], density:1, cup:190}
  ];

  const examples = {
    jollof:{name:'My jollof rice', text:'1 kg raw rice, 120 g vegetable oil, 1.2 kg tomato pepper onion base, 200 g tomato paste, 250 g onion, 30 g stock cubes, 1.2 kg chicken. Finished pot weight 5.2 kg.'},
    okro:{name:'My okro soup', text:'700 g raw okro, 900 g goat, 350 g smoked fish, 100 g palm oil, 500 g tomato pepper onion base, 200 g onion, 20 g stock cubes. Finished pot weight 4.5 kg.'},
    groundnut:{name:'My groundnut soup', text:'500 g groundnut paste, 1 kg chicken, 900 g tomato pepper onion base, 200 g onion, 20 g stock cubes. Finished pot weight 4.8 kg.'},
    stew:{name:'My beef stew', text:'1 kg beef, 120 g vegetable oil, 1.2 kg tomato pepper onion base, 250 g tomato paste, 250 g onion, 20 g stock cubes. Finished pot weight 3.2 kg.'}
  };

  const style = document.createElement('style');
  style.textContent = `
    .recipe-ai-card{border:1px solid var(--rule);border-radius:20px;background:var(--white);padding:18px;margin:14px 0;box-shadow:var(--shadow)}
    .recipe-ai-card h3{margin:0}.recipe-ai-card p{color:var(--muted);margin:.35rem 0 .8rem;line-height:1.45}
    .recipe-ai-text{width:100%;min-height:118px;border:1px solid var(--rule);border-radius:14px;background:#fff;color:var(--ink);padding:12px 13px;font-size:16px;resize:vertical}
    .recipe-ai-actions,.recipe-ai-examples{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.recipe-ai-actions button,.recipe-ai-examples button{min-height:42px;border-radius:12px;font-weight:800;padding:9px 12px}
    .recipe-ai-primary{border:0;background:var(--forest);color:#fff}.recipe-ai-secondary{border:1px solid var(--forest);background:#fff;color:var(--forest)}
    .recipe-ai-example{border:1px solid var(--rule);background:var(--tint);color:var(--forest)}
    .recipe-ai-preview{display:grid;gap:8px;margin-top:12px}.recipe-ai-row{display:grid;grid-template-columns:minmax(0,1fr) 108px auto;gap:8px;align-items:center;border:1px solid var(--rule);background:#fff;border-radius:13px;padding:9px}
    .recipe-ai-row select,.recipe-ai-row input{width:100%;min-height:42px;border:1px solid var(--rule);border-radius:10px;background:#fff;color:var(--ink);padding:7px 9px;font-size:15px}.recipe-ai-row button{width:40px;height:40px;border:1px solid var(--rule);border-radius:50%;background:#fff;color:var(--clay);font-weight:900}
    .recipe-ai-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:4px;font-size:.71rem;color:var(--muted)}.recipe-ai-badge{display:inline-flex;border-radius:999px;padding:3px 7px;background:var(--tint);color:var(--forest);font-weight:800}
    .recipe-ai-unmatched{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f7eee8;color:#7a3827;font-size:.82rem}.recipe-ai-status{margin-top:10px;padding:11px 12px;border-radius:12px;background:var(--tint);color:var(--ink);font-size:.84rem}
    .pot-check{border-left:4px solid var(--gold)}.pot-check-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.pot-check-stat{background:var(--tint);border-radius:12px;padding:10px}.pot-check-stat span{display:block;color:var(--muted);font-size:.69rem}.pot-check-stat strong{display:block;color:var(--forest);margin-top:2px}.pot-check-list{display:grid;gap:7px;margin-top:10px}.pot-check-item{padding:9px 10px;border-radius:10px;background:var(--tint);font-size:.82rem}.pot-check-item.warn{background:#f7eee8;color:#7a3827}.pot-check-item.good{background:#edf6f1;color:#24513d}
    @media(max-width:700px){.recipe-ai-row{grid-template-columns:1fr 92px auto}.pot-check-grid{grid-template-columns:1fr 1fr 1fr}.recipe-ai-actions button{flex:1 1 140px}}
  `;
  document.head.appendChild(style);

  const card = document.createElement('section');
  card.className = 'recipe-ai-card';
  card.id = 'recipeAssistantCard';
  card.innerHTML = `
    <p class="eyebrow">SMART POT ASSISTANT</p>
    <h3>Describe the whole pot</h3>
    <p>Type or dictate what went into the pot. I will match raw ingredients, convert common units to grams and let you review everything before it is added.</p>
    <textarea id="recipeAiText" class="recipe-ai-text" placeholder="Example: 1 kg raw rice, 120 g oil, 800 g chicken, 1.2 kg tomato pepper onion base. Finished pot weight 4.8 kg."></textarea>
    <div class="recipe-ai-actions">
      <button id="recipeAiParse" class="recipe-ai-primary" type="button">Understand my pot</button>
      <button id="recipeAiVoice" class="recipe-ai-secondary" type="button">🎙 Dictate</button>
      <button id="recipeAiClear" class="recipe-ai-secondary" type="button">Clear</button>
    </div>
    <div class="recipe-ai-examples">
      <button class="recipe-ai-example" data-recipe-example="jollof" type="button">Jollof example</button>
      <button class="recipe-ai-example" data-recipe-example="okro" type="button">Okro example</button>
      <button class="recipe-ai-example" data-recipe-example="groundnut" type="button">Groundnut soup</button>
      <button class="recipe-ai-example" data-recipe-example="stew" type="button">Beef stew</button>
    </div>
    <div id="recipeAiStatus" class="recipe-ai-status" hidden></div>
    <div id="recipeAiPreview" class="recipe-ai-preview"></div>
    <div id="recipeAiUnmatched" class="recipe-ai-unmatched" hidden></div>
    <div class="recipe-ai-actions" id="recipeAiCommitWrap" hidden>
      <button id="recipeAiCommit" class="recipe-ai-primary" type="button">Add reviewed ingredients to pot</button>
    </div>`;

  const recipeIntro = qs('.lede', recipesPanel);
  if (recipeIntro) recipeIntro.insertAdjacentElement('afterend', card);
  else recipesPanel.insertAdjacentElement('afterbegin', card);

  const checkCard = document.createElement('section');
  checkCard.className = 'recipe-ai-card pot-check';
  checkCard.id = 'potIntelligenceCard';
  const baseRecipeCard = qsa('.card', recipesPanel)[0];
  if (baseRecipeCard) baseRecipeCard.insertAdjacentElement('afterend', checkCard);
  else recipesPanel.appendChild(checkCard);

  let parsedItems = [];
  const textEl = $('recipeAiText');
  const previewEl = $('recipeAiPreview');
  const unmatchedEl = $('recipeAiUnmatched');
  const statusEl = $('recipeAiStatus');
  const commitWrap = $('recipeAiCommitWrap');

  try { textEl.value = localStorage.getItem(DRAFT_KEY) || ''; } catch (_) {}
  textEl.addEventListener('input', () => { try { localStorage.setItem(DRAFT_KEY, textEl.value); } catch (_) {} });

  function rawOptions(){
    return qsa('option', recipeFoodSelect)
      .filter(o => String(o.value).startsWith('raw_'))
      .map(o => ({id:o.value,label:o.textContent.trim()}));
  }

  function normaliseNumbers(text){
    return String(text||'')
      .replace(/\bone\s+and\s+a\s+half\b/gi,'1.5')
      .replace(/\btwo\s+and\s+a\s+half\b/gi,'2.5')
      .replace(/\bhalf\s+(?:a\s+)?(?:kilo|kilogram)\b/gi,'.5 kg')
      .replace(/\bquarter\s+(?:of\s+)?(?:a\s+)?(?:kilo|kilogram)\b/gi,'.25 kg')
      .replace(/\bone\b/gi,'1').replace(/\btwo\b/gi,'2').replace(/\bthree\b/gi,'3').replace(/\bfour\b/gi,'4').replace(/\bfive\b/gi,'5');
  }

  function matchAlias(label){
    const q = label.toLowerCase().replace(/[.]/g,' ').replace(/\s+/g,' ').trim();
    let best = null;
    for (const a of aliases) {
      for (const n of a.names) {
        if (q.includes(n) && (!best || n.length > best.alias.length)) best = {...a,alias:n};
      }
    }
    return best;
  }

  function toGrams(amount, unit, alias){
    const u = unit.toLowerCase();
    if (/^kg|kilogram/.test(u)) return {grams:amount*1000,note:'kg converted exactly'};
    if (/^g|gram/.test(u)) return {grams:amount,note:'grams'};
    if (/^l$|litre|liter/.test(u)) return {grams:amount*1000*(alias?.density||1),note:'litres converted using food density'};
    if (/^ml|millilitre|milliliter/.test(u)) return {grams:amount*(alias?.density||1),note:'ml converted using food density'};
    if (/^tbsp|tablespoon/.test(u)) return {grams:amount*15*(alias?.density||1),note:'tablespoon conversion is approximate'};
    if (/^tsp|teaspoon/.test(u)) return {grams:amount*5*(alias?.density||1),note:'teaspoon conversion is approximate'};
    if (/^cup/.test(u)) return {grams:amount*(alias?.cup||240),note:'cup conversion is approximate'};
    return {grams:amount,note:'check unit'};
  }

  function detectFinishedWeight(text){
    const t = normaliseNumbers(text);
    const patterns = [
      /(?:finished|final|cooked)\s+(?:pot\s+)?(?:weight|weighs?|weighed)?\s*(?:is|was|=|at)?\s*(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?)\b/i,
      /(?:pot\s+)?(?:weighs?|weighed)\s*(\d+(?:\.\d+)?)\s*(kg|kilograms?|g|grams?)\b/i
    ];
    for (const re of patterns) {
      const m=t.match(re); if(!m) continue;
      return /^kg|kilogram/i.test(m[2]) ? Number(m[1])*1000 : Number(m[1]);
    }
    return 0;
  }

  function detectRecipeName(text){
    const t = String(text||'').toLowerCase();
    if (t.includes('jollof')) return 'My jollof rice';
    if (t.includes('groundnut') || t.includes('peanut soup')) return 'My groundnut soup';
    if (t.includes('okro') || t.includes('okra')) return 'My okro soup';
    if (t.includes('kontomire')) return 'My kontomire stew';
    if (t.includes('beef stew')) return 'My beef stew';
    if (t.includes('light soup')) return 'My light soup';
    return '';
  }

  function parseText(){
    const source = normaliseNumbers(textEl.value);
    parsedItems = [];
    const unmatched = [];
    const weight = detectFinishedWeight(source);
    if (weight > 0) finalWeight.value = Math.round(weight);
    if (!recipeName.value.trim()) {
      const detected = detectRecipeName(source);
      if (detected) recipeName.value = detected;
    }

    const cleaned = source
      .replace(/(?:finished|final|cooked)\s+(?:pot\s+)?(?:weight|weighs?|weighed)?\s*(?:is|was|=|at)?\s*\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|grams?)/ig,'')
      .replace(/(?:pot\s+)?(?:weighs?|weighed)\s*\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|grams?)/ig,'');

    const segments = cleaned.split(/[,;\n]+|\s+and\s+(?=\d|\.\d)/i).map(s=>s.trim()).filter(Boolean);
    const quantityRe = /(\d+(?:\.\d+)?)\s*(kg|kilograms?|kilogrammes?|g|grams?|grammes?|ml|millilitres?|milliliters?|l|litres?|liters?|tbsp|tablespoons?|tsp|teaspoons?|cups?)\s+(?:of\s+)?(.+)/i;
    const cubeRe = /(\d+(?:\.\d+)?)\s*(?:x\s*)?(stock|seasoning|maggi)?\s*cubes?\b/i;

    for (const segment of segments) {
      let m = segment.match(quantityRe);
      if (m) {
        const amount=Number(m[1]); const unit=m[2]; const label=m[3].trim(); const alias=matchAlias(label);
        if (!alias) { unmatched.push(segment); continue; }
        const conv=toGrams(amount,unit,alias);
        parsedItems.push({id:alias.id,label,grams:Math.max(1,Math.round(conv.grams)),note:conv.note,confidence:/approximate|density/i.test(conv.note)?'Check conversion':'Matched'});
        continue;
      }
      m = segment.match(cubeRe);
      if (m) {
        parsedItems.push({id:'raw_stock_cube',label:'stock cubes',grams:Math.max(1,Math.round(Number(m[1])*10)),note:'10 g per cube estimate',confidence:'Check conversion'});
        continue;
      }
      if (segment.length > 2) unmatched.push(segment);
    }

    renderPreview(unmatched);
  }

  function renderPreview(unmatched=[]){
    const opts = rawOptions();
    previewEl.innerHTML = parsedItems.map((it,i)=>`<div class="recipe-ai-row" data-rai="${i}">
      <div><select data-rai-food="${i}">${opts.map(o=>`<option value="${esc(o.id)}" ${o.id===it.id?'selected':''}>${esc(o.label)}</option>`).join('')}</select><div class="recipe-ai-meta"><span class="recipe-ai-badge">${esc(it.confidence)}</span><span>${esc(it.note)}</span></div></div>
      <input data-rai-grams="${i}" type="number" min="1" max="20000" value="${Math.round(it.grams)}" aria-label="Ingredient grams">
      <button data-rai-remove="${i}" type="button" aria-label="Remove ingredient">×</button>
    </div>`).join('');
    commitWrap.hidden = parsedItems.length===0;
    statusEl.hidden=false;
    statusEl.textContent = parsedItems.length ? `${parsedItems.length} ingredient${parsedItems.length===1?'':'s'} understood. Review the matches and grams before adding them to the pot.` : 'I could not confidently match an ingredient yet. Try quantities such as “1 kg raw rice” or “120 g oil”.';
    unmatchedEl.hidden = unmatched.length===0;
    unmatchedEl.innerHTML = unmatched.length ? `<strong>Please check these:</strong> ${esc(unmatched.join(' · '))}` : '';

    qsa('[data-rai-food]',previewEl).forEach(el=>el.addEventListener('change',()=>{const i=Number(el.dataset.raiFood); if(parsedItems[i]) parsedItems[i].id=el.value;}));
    qsa('[data-rai-grams]',previewEl).forEach(el=>el.addEventListener('input',()=>{const i=Number(el.dataset.raiGrams); if(parsedItems[i]) parsedItems[i].grams=Math.max(1,Number(el.value)||1);}));
    qsa('[data-rai-remove]',previewEl).forEach(btn=>btn.addEventListener('click',()=>{parsedItems.splice(Number(btn.dataset.raiRemove),1);renderPreview(unmatched);}));
  }

  function commitParsed(){
    if (!parsedItems.length) return;
    let added=0;
    parsedItems.forEach(it=>{
      const option=qs(`option[value="${CSS.escape(it.id)}"]`,recipeFoodSelect);
      if(!option) return;
      recipeFoodSelect.value=it.id;
      gramsInput.value=Math.max(1,Math.round(Number(it.grams)||1));
      addIngredientBtn.click();
      added++;
    });
    toast(`${added} ingredient${added===1?'':'s'} added to the pot`);
    renderPotCheck();
  }

  $('recipeAiParse').addEventListener('click', parseText);
  $('recipeAiCommit').addEventListener('click', commitParsed);
  $('recipeAiClear').addEventListener('click',()=>{
    textEl.value=''; parsedItems=[]; previewEl.innerHTML=''; statusEl.hidden=true; unmatchedEl.hidden=true; commitWrap.hidden=true;
    try { localStorage.removeItem(DRAFT_KEY); } catch(_){}
  });

  qsa('[data-recipe-example]').forEach(btn=>btn.addEventListener('click',()=>{
    const ex=examples[btn.dataset.recipeExample]; if(!ex)return;
    textEl.value=ex.text; if(!recipeName.value.trim()) recipeName.value=ex.name;
    try { localStorage.setItem(DRAFT_KEY,textEl.value); } catch(_){}
    parseText();
  }));

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) $('recipeAiVoice').hidden=true;
  else $('recipeAiVoice').addEventListener('click',()=>{
    const btn=$('recipeAiVoice'); const rec=new SpeechRecognition(); rec.lang='en-GB'; rec.interimResults=false; rec.maxAlternatives=1;
    btn.disabled=true; btn.textContent='Listening…';
    rec.onresult=e=>{ const words=e.results?.[0]?.[0]?.transcript||''; textEl.value=(textEl.value.trim()?textEl.value.trim()+', ':'')+words; try{localStorage.setItem(DRAFT_KEY,textEl.value);}catch(_){} parseText(); };
    rec.onerror=()=>toast('Voice entry was not available. You can type the recipe instead.');
    rec.onend=()=>{btn.disabled=false;btn.textContent='🎙 Dictate';};
    try{rec.start();}catch(_){btn.disabled=false;btn.textContent='🎙 Dictate';}
  });

  function currentRows(){
    return qsa('.ingredient-row',ingredientList).map(row=>{
      const txt=row.textContent.replace(/remove\s*$/i,'').trim();
      const gm=txt.match(/([\d,.]+)\s*g\b/i);
      return {text:txt,grams:gm?Number(gm[1].replace(/,/g,'')):0,raw:/\(recipe\)/i.test(txt)};
    });
  }

  function renderPotCheck(){
    const rows=currentRows();
    const fWeight=Number(finalWeight.value)||0;
    const oil=rows.filter(r=>/oil/i.test(r.text)).reduce((n,r)=>n+r.grams,0);
    const recorded=rows.reduce((n,r)=>n+r.grams,0);
    const rawCount=rows.filter(r=>r.raw).length;
    const notes=[];
    if (!rows.length) notes.push({kind:'warn',text:'Add the ingredients that actually went into the pot.'});
    if (rows.length && rawCount===0) notes.push({kind:'warn',text:'These look like cooked foods. For a whole-pot recipe, raw ingredient weights are usually more accurate.'});
    if (!fWeight) notes.push({kind:'warn',text:'Weigh the finished pot after cooking. That final weight is what makes calories per 100 g accurate.'});
    if (fWeight && recorded && fWeight < recorded*.30) notes.push({kind:'warn',text:'The finished pot weight looks unusually low compared with the ingredients. Double-check the scale entry.'});
    const name=recipeName.value.toLowerCase();
    if (rows.length && /(jollof|stew|okro|kontomire)/.test(name) && oil===0) notes.push({kind:'warn',text:'No cooking oil is recorded. If oil was used, add its weighed amount because it can change the calories substantially.'});
    if (oil>250 || (recorded>0 && oil/recorded>.12)) notes.push({kind:'warn',text:`You have about ${Math.round(oil)} g of oil recorded. That may be correct, but it is worth checking because oil is very calorie dense.`});
    if (rows.length && fWeight && rawCount>0) notes.push({kind:'good',text:'You have raw ingredient weights and a finished pot weight. This is the strongest way to calculate your own dish.'});
    if (!notes.length) notes.push({kind:'good',text:'The pot setup looks sensible. Calculate it, review the result, then save the recipe.'});

    checkCard.innerHTML=`<p class="eyebrow">POT CHECK</p><h3>Recipe intelligence</h3><p>I check the structure of the recipe before you save it. This catches the mistakes that can distort calories most.</p>
      <div class="pot-check-grid"><div class="pot-check-stat"><span>Ingredients</span><strong>${rows.length}</strong></div><div class="pot-check-stat"><span>Raw entries</span><strong>${rawCount}</strong></div><div class="pot-check-stat"><span>Finished pot</span><strong>${fWeight?Math.round(fWeight).toLocaleString()+' g':'Needed'}</strong></div></div>
      <div class="pot-check-list">${notes.map(n=>`<div class="pot-check-item ${n.kind}">${esc(n.text)}</div>`).join('')}</div>`;
  }

  new MutationObserver(renderPotCheck).observe(ingredientList,{childList:true,subtree:true});
  finalWeight.addEventListener('input',renderPotCheck);
  recipeName.addEventListener('input',renderPotCheck);
  renderPotCheck();
})();