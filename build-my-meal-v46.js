(() => {
  'use strict';

  const VERSION=1;
  const repo=window.OkelloStateRepository;
  const catalog=window.OkelloFoodCatalog;
  const piece=window.OkelloPieceEntry;
  const countable=window.OkelloCountableServingsV46;
  if(!repo||!catalog||!piece)return;
  const $=id=>document.getElementById(id);
  const qs=(selector,root=document)=>root.querySelector(selector);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const round1=n=>Math.round(Number(n)*10)/10;
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
  const WORD_NUMS=Object.freeze({one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,a:1,an:1});
  let draft=[];

  function toast(message){const node=$('toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),2000);}
  function normalise(text){return String(text||'').toLowerCase().replace(/[’']/g,'').replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/g,m=>String(WORD_NUMS[m])).replace(/\s+/g,' ').trim();}
  function words(text){return new Set(normalise(text).replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(x=>x.length>1&&!['had','ate','with','some','of','the','and','toasted','toast','mixed','together','dash','salt','pepper','cayenne','high','protein'].includes(x)));}
  function scoreFood(food,segment){
    const query=normalise(segment);const name=normalise(food?.name||'');if(!name)return 0;
    if(query.includes(name))return 1000+name.length;
    const q=words(query),n=words(name);let score=0;for(const token of n)if(q.has(token))score+=token.length*3;
    if(food?.barcode&&query.includes(String(food.barcode)))score+=500;
    return score;
  }
  function guessFood(segment){
    const direct=catalog.findByName?.(segment);if(direct)return direct;
    const list=catalog.all?.()||[];let best=null,bestScore=0;
    for(const food of list){if(food?.raw)continue;const score=scoreFood(food,segment);if(score>bestScore){best=food;bestScore=score;}}
    return bestScore>=9?best:null;
  }
  function splitSegments(text){
    return String(text||'').replace(/\s+\+\s+/g,',').replace(/\s+and\s+(?=(?:\d+|half|a\s+tin|a\s+can|a\s+pot)\b)/gi,',').split(/[,;\n]+/).map(x=>x.trim()).filter(Boolean).filter(x=>!/^\s*(?:salt|pepper|black pepper|cayenne|seasoning|spices?)\s*$/i.test(x));
  }
  function parseAmount(segment,food){
    const text=normalise(segment);
    let m=text.match(/(\d+(?:\.\d+)?)\s*(?:g|grams?)\b/);if(m)return {mode:'grams',grams:Number(m[1]),amountQuality:'estimated',source:'typed-grams'};
    m=text.match(/(\d+(?:\.\d+)?)\s*(eggs?|slices?|tins?|cans?|pots?|tubs?)\b/);
    if(m){
      const count=Number(m[1]);const word=m[2];const desired=/egg/.test(word)?'egg':/slice/.test(word)?'slice':/tin/.test(word)?'tin':/can/.test(word)?'can':/pot/.test(word)?'pot':'tub';
      const def=countable?.definitionFor?.(food);
      if(def&&def.pieceKey===desired)return {mode:'count',count,def};
      // A generic bread/egg/tin definition can still be used if the natural
      // word agrees with its canonical unit.
      if(def&&((desired==='can'&&def.pieceKey==='tin')||(desired==='tin'&&def.pieceKey==='can')))return {mode:'count',count,def};
      return {mode:'unresolved-unit',count,pieceKey:desired,grams:Number(food?.portion)||100,note:`No trusted ${desired} weight is stored for this food yet.`};
    }
    if(/\bhalf\s+(?:a\s+)?pot\b/.test(text)){
      const def=countable?.definitionFor?.(food);if(def?.pieceKey==='half-pot')return {mode:'count',count:1,def};
      return {mode:'unresolved-unit',count:1,pieceKey:'half-pot',grams:Math.max(1,Math.round((Number(food?.portion)||100)/2)),note:'No trusted half-pot packet weight is stored yet.'};
    }
    m=text.match(/(\d+(?:\.\d+)?)\s*(?:tbsp|tablespoons?)\b/);
    if(m)return {mode:'unresolved-unit',count:Number(m[1]),pieceKey:'heaped-tbsp',grams:Number(food?.portion)||100,note:'Tablespoon weight varies by food. Enter grams or save a packet/personal unit before treating it as a conversion.'};
    const def=countable?.definitionFor?.(food);
    if(def)return {mode:'count',count:Math.max(1,Math.round((Number(food?.portion)||def.grams)/def.grams)),def};
    return {mode:'grams',grams:Number(food?.portion)||100,amountQuality:'estimated',source:'reference-serving'};
  }
  function parseMeal(text){
    draft=[];const unmatched=[];
    for(const segment of splitSegments(text)){
      const food=guessFood(segment);if(!food){unmatched.push(segment);continue;}
      draft.push({id:`bmm_${Date.now()}_${draft.length}`,segment,food,amount:parseAmount(segment,food)});
    }
    renderDraft(unmatched);
    return {items:draft,unmatched};
  }
  function kcalFor(item){const grams=effectiveGrams(item);return Number(item.food?.kcal)>=0?Number(item.food.kcal)*grams/100:null;}
  function effectiveGrams(item){if(item.amount.mode==='count')return Number(item.amount.count)*Number(item.amount.def.grams);return Number(item.amount.grams)||0;}
  function amountLabel(item){
    if(item.amount.mode==='count'){const n=Number(item.amount.count)||1;const key=item.amount.def.pieceKey;const label=key==='egg'?(n===1?'egg':'eggs'):key==='slice'?(n===1?'slice':'slices'):key==='tin'?(n===1?'tin':'tins'):key==='can'?(n===1?'can':'cans'):key==='pot'?(n===1?'pot':'pots'):key==='tub'?(n===1?'tub':'tubs'):key;return `${n} ${label} · ≈ ${round1(effectiveGrams(item))} g`;}
    if(item.amount.mode==='unresolved-unit')return `${item.amount.count} ${item.amount.pieceKey} · gram conversion needs review`;
    return `${round1(item.amount.grams)} g`;
  }

  const style=document.createElement('style');style.textContent=`.bmm-card{border:2px solid var(--forest);border-radius:20px;background:#fff;padding:16px;margin:12px 0;box-shadow:var(--shadow)}.bmm-card h3{margin:0;color:var(--forest)}.bmm-input-row{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:10px}.bmm-input-row textarea{min-height:62px;width:100%;box-sizing:border-box;border:1px solid var(--rule);border-radius:13px;padding:11px 12px;font:inherit;resize:vertical}.bmm-input-row button{min-width:108px;border:0;border-radius:13px;background:var(--forest);color:#fff;font-weight:900}.bmm-review{display:grid;gap:8px;margin-top:12px}.bmm-row{border:1px solid var(--rule);border-radius:14px;padding:10px;background:var(--paper);display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.bmm-row strong,.bmm-row small{display:block}.bmm-row small{color:var(--muted);margin-top:2px}.bmm-controls{display:flex;gap:6px;align-items:center}.bmm-controls button{min-width:38px;min-height:38px;border:1px solid var(--rule);border-radius:10px;background:#fff;color:var(--forest);font-weight:900}.bmm-controls input{width:78px;min-height:38px;border:1px solid var(--rule);border-radius:10px;padding:6px;text-align:center;font-size:16px}.bmm-unmatched{margin-top:10px;padding:9px 11px;border-radius:12px;background:#f7eee8;color:#7a3827;font-size:.8rem}.bmm-footer{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}.bmm-footer select,.bmm-footer button{min-height:48px;border-radius:12px;font:inherit}.bmm-footer select{border:1px solid var(--rule);background:#fff;padding:8px}.bmm-footer button{border:0;background:var(--forest);color:#fff;font-weight:900}.bmm-total{margin-top:9px;color:var(--muted);font-size:.82rem}.bmm-warning{color:#a63a20;font-weight:750}@media(max-width:520px){.bmm-input-row{grid-template-columns:1fr}.bmm-input-row button{min-height:48px}.bmm-row{grid-template-columns:1fr}.bmm-controls{justify-content:flex-start}.bmm-footer{grid-template-columns:1fr}}`;document.head.appendChild(style);

  const today=$('tab-today');const quick=qs('.quick-add-card',today);
  if(!today||!quick)return;
  const card=document.createElement('section');card.className='bmm-card';card.id='buildMyMealCard';
  card.innerHTML=`<p class="eyebrow">BUILD MY MEAL</p><h3>Describe the whole meal once</h3><p class="muted">Example: “3 eggs, 4 slices bread, 1 tin sardines, cottage cheese and kefir.” Everything is reviewed before one atomic meal save.</p><div class="bmm-input-row"><textarea id="bmmInput" placeholder="I had 3 eggs, 4 slices toast and 1 tin sardines"></textarea><button id="bmmUnderstand" type="button">Understand meal</button></div><div id="bmmReview" class="bmm-review"></div><div id="bmmUnmatched" class="bmm-unmatched" hidden></div><div id="bmmTotal" class="bmm-total"></div><div id="bmmFooter" class="bmm-footer" hidden><select id="bmmMeal" aria-label="Meal"><option>Breakfast</option><option selected>Lunch</option><option>Dinner</option><option>Snack</option><option>Other</option></select><button id="bmmCommit" type="button">Add whole meal</button></div>`;
  quick.insertAdjacentElement('beforebegin',card);

  function renderDraft(unmatched=[]){
    const review=$('bmmReview');
    review.innerHTML=draft.map((item,index)=>{
      const kcal=kcalFor(item);const count=item.amount.mode==='count';const unresolved=item.amount.mode==='unresolved-unit';
      const controls=count?`<div class="bmm-controls"><button type="button" data-bmm-step="${index}:-1">−</button><strong>${item.amount.count}</strong><button type="button" data-bmm-step="${index}:1">+</button><button type="button" data-bmm-remove="${index}" aria-label="Remove">×</button></div>`:`<div class="bmm-controls"><input data-bmm-grams="${index}" type="number" min="1" max="5000" value="${round1(item.amount.grams)}" aria-label="Amount in grams"><button type="button" data-bmm-remove="${index}" aria-label="Remove">×</button></div>`;
      return `<div class="bmm-row"><div><strong>${esc(item.food.emoji||'🍽️')} ${esc(item.food.name)}</strong><small>${esc(amountLabel(item))}${kcal!==null?` · about ${Math.round(kcal)} kcal`:''}</small>${count?`<small>${esc(item.amount.def.estimateSource==='packet-unit-weight'?'Packet unit weight':item.amount.def.estimateSource==='personal-piece-weight'?'Personal calibrated unit':'Reference unit weight')}</small>`:''}${unresolved?`<small class="bmm-warning">${esc(item.amount.note)}</small>`:''}</div>${controls}</div>`;
    }).join('');
    qsa('[data-bmm-step]',review).forEach(button=>button.addEventListener('click',()=>{const [i,delta]=button.dataset.bmmStep.split(':').map(Number);if(!draft[i])return;draft[i].amount.count=Math.max(1,Number(draft[i].amount.count)+delta);renderDraft(unmatched);}));
    qsa('[data-bmm-grams]',review).forEach(input=>input.addEventListener('input',()=>{const i=Number(input.dataset.bmmGrams);if(!draft[i])return;draft[i].amount.grams=Math.max(1,Number(input.value)||1);renderTotal();}));
    qsa('[data-bmm-remove]',review).forEach(button=>button.addEventListener('click',()=>{draft.splice(Number(button.dataset.bmmRemove),1);renderDraft(unmatched);}));
    const box=$('bmmUnmatched');box.hidden=!unmatched.length;box.textContent=unmatched.length?`Please add or clarify: ${unmatched.join(' · ')}`:'';$('bmmFooter').hidden=!draft.length;renderTotal();
  }
  function renderTotal(){let kcal=0,known=0;for(const item of draft){const k=kcalFor(item);if(k!==null){kcal+=k;known++;}}$('bmmTotal').textContent=draft.length?`${draft.length} component${draft.length===1?'':'s'} · ${known===draft.length?'about ':known?'partial · about ':''}${known?Math.round(kcal)+' kcal':'calories unavailable'}. Counts remain direct observations; gram conversions keep their provenance.`:'';}

  function draftForCommit(item,meal,plateId){
    let amount;
    if(item.amount.mode==='count'){
      const def=item.amount.def;const grams=Number(item.amount.count)*Number(def.grams);
      amount={foodId:item.food.id,enteredAmount:item.amount.count,enteredUnit:'pieces',pieceCount:item.amount.count,pieceKey:def.pieceKey,grams,estimatedGrams:grams,estimateBasisGrams:def.grams,estimateSource:def.estimateSource,amountQuality:'estimated',observationCount:def.observationCount||0};
    }else{
      amount=piece.estimatedGramAmount(item.food.id,Math.max(1,Number(item.amount.grams)||Number(item.food.portion)||100));
      if(amount)amount.estimateSource=item.amount.mode==='unresolved-unit'?'user-reviewed-unresolved-household-unit':item.amount.source||'build-my-meal-grams';
    }
    const log=piece.createLogDraft({food:item.food,amount,meal,plateId,source:'build-my-meal-v46',ts:Date.now()});
    if(log&&item.amount.mode==='unresolved-unit'){log.requestedHouseholdUnit=item.amount.pieceKey;log.requestedHouseholdCount=item.amount.count;}
    return log;
  }
  function commit(){
    if(!draft.length)return;const unresolved=draft.filter(item=>item.amount.mode==='unresolved-unit');
    if(unresolved.length&&!window.confirm(`${unresolved.length} component${unresolved.length===1?'':'s'} used a gram amount because no trusted household-unit conversion exists. Save the reviewed meal anyway?`))return;
    const meal=$('bmmMeal').value||'Other';const plateId=globalThis.crypto?.randomUUID?.()||`plate_${Date.now()}_${Math.random().toString(36).slice(2)}`;const logs=draft.map(item=>draftForCommit(item,meal,plateId));if(logs.some(x=>!x)){toast('One component could not be prepared safely. Nothing was saved.');return;}
    const result=repo.mutate(state=>{const key=todayKey();state.logs=state.logs&&typeof state.logs==='object'?state.logs:{};state.logs[key]=Array.isArray(state.logs[key])?state.logs[key]:[];state.logs[key].push(...logs);return state;},{source:'build-my-meal-v46'});
    if(!result?.ok){toast('Meal was not saved. Your existing diary was kept.');return;}
    window.OkelloAppState?.syncFromStorage?.();window.dispatchEvent(new CustomEvent('okello:food-log-changed',{detail:{day:todayKey(),plateId,entries:logs.length,source:'build-my-meal-v46'}}));draft=[];$('bmmInput').value='';renderDraft([]);toast(`${logs.length} components added as one meal`);
  }

  $('bmmUnderstand').addEventListener('click',()=>parseMeal($('bmmInput').value));$('bmmInput').addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter')parseMeal($('bmmInput').value);});$('bmmCommit').addEventListener('click',commit);

  window.OkelloBuildMyMealV46=Object.freeze({version:VERSION,parseMeal,splitSegments,guessFood,parseAmount,get draft(){return draft.map(item=>({...item,amount:{...item.amount}}));},commit});
})();