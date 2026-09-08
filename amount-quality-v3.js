(() => {
  'use strict';

  const VERSION=3;
  const STORE='okello_food_tracker_v3';
  const repo=window.OkelloStateRepository;
  const $=id=>document.getElementById(id);
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
  const todayKey=()=>new Date().toISOString().slice(0,10);
  const VALID=new Set(['weighed','estimated']);

  function readState(){
    if(repo)return repo.read();
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){return {};}
  }
  function collectIds(state){
    const ids=new Set();
    for(const entries of Object.values(state?.logs||{}))for(const entry of entries||[])if(entry?.id!=null)ids.add(String(entry.id));
    return ids;
  }

  let armedQuality=null;
  let armedTimer=null;
  let quickQuality='estimated';

  function clearArm(){armedQuality=null;clearTimeout(armedTimer);armedTimer=null;}
  function arm(quality){armedQuality=VALID.has(quality)?quality:'estimated';clearTimeout(armedTimer);armedTimer=setTimeout(clearArm,1800);}

  // v3 no longer patches Storage.prototype. Amount provenance is a governed
  // write middleware on the single main-state repository.
  repo?.registerBeforeWrite(({next,current})=>{
    if(!armedQuality)return next;
    const known=collectIds(current);
    let tagged=0;
    for(const entries of Object.values(next?.logs||{})){
      for(const entry of entries||[]){
        if(entry?.id==null||known.has(String(entry.id)))continue;
        if(!VALID.has(entry.amountQuality))entry.amountQuality=armedQuality;
        tagged++;
      }
    }
    if(tagged)clearArm();
    return next;
  });

  function qualityLabel(q){if(q==='weighed')return '⚖ Weighed';if(q==='estimated')return '≈ Estimated';return 'Amount?';}

  const style=document.createElement('style');
  style.textContent=`
    .amount-quality-control{margin:10px 0;padding:10px 11px;border:1px solid var(--rule);border-radius:13px;background:var(--tint)}
    .amount-quality-head{display:flex;justify-content:space-between;gap:10px;align-items:center}.amount-quality-head strong{font-size:.82rem;color:var(--forest)}.amount-quality-head small{color:var(--muted);font-size:.7rem}
    .amount-quality-buttons{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-top:8px}.amount-quality-buttons button{min-height:40px;border:1px solid var(--rule);border-radius:10px;background:#fff;color:var(--forest);font-weight:800}.amount-quality-buttons button.active{background:var(--forest);color:#fff;border-color:var(--forest)}
    .amount-quality-select{display:inline-block;width:auto!important;min-height:30px!important;margin-top:5px!important;padding:3px 24px 3px 7px!important;border:1px solid var(--rule)!important;border-radius:999px!important;background:#fff!important;color:var(--muted)!important;font-size:.68rem!important;font-weight:800!important}
    .amount-quality-card{border-left:4px solid var(--gold)}.amount-quality-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.amount-quality-stat{background:var(--tint);border-radius:11px;padding:9px}.amount-quality-stat span{display:block;color:var(--muted);font-size:.67rem}.amount-quality-stat strong{display:block;color:var(--forest);margin-top:2px}
    @media(max-width:700px){.amount-quality-stats{grid-template-columns:1fr 1fr 1fr}}
  `;
  document.head.appendChild(style);

  const quick=document.querySelector('.quick-add-card');
  const quickCalc=$('quickCalc');
  if(quick&&quickCalc&&!$('amountQualityControl')){
    const box=document.createElement('div');box.id='amountQualityControl';box.className='amount-quality-control';
    box.innerHTML='<div class="amount-quality-head"><strong>How was this amount measured?</strong><small>Amount quality, not food source</small></div><div class="amount-quality-buttons"><button type="button" data-amount-choice="weighed">⚖ Weighed on scale</button><button type="button" data-amount-choice="estimated">≈ Estimated / by eye</button></div>';
    quickCalc.insertAdjacentElement('beforebegin',box);
    const renderQuick=()=>qsa('[data-amount-choice]',box).forEach(button=>button.classList.toggle('active',button.dataset.amountChoice===quickQuality));
    qsa('[data-amount-choice]',box).forEach(button=>button.addEventListener('click',()=>{quickQuality=button.dataset.amountChoice;renderQuick();}));
    renderQuick();
  }

  document.addEventListener('click',event=>{
    const target=event.target?.closest?.('button,[role="button"]');if(!target)return;
    if(target.id==='addFoodBtn'){arm(quickQuality);return;}
    if(target.matches('[data-smartmeal],[data-smartmeal-v42],#nlAdd,#plateAdd,#restAdd,[data-repeat],[data-repeat-meal],[data-use-template]'))arm('estimated');
    if(target.id==='useSmartPortionBtn'||target.id==='memoryUseUsual'){
      quickQuality='estimated';qsa('[data-amount-choice]').forEach(button=>button.classList.toggle('active',button.dataset.amountChoice==='estimated'));
    }
  },true);

  function writeEntryQuality(day,index,quality){
    if(!VALID.has(quality))return;
    const result=repo?.mutate?.(state=>{const rows=state.logs?.[day];if(!Array.isArray(rows)||!rows[index])return state;rows[index].amountQuality=quality;return state;},{source:'amount-quality-edit-v3'});
    if(!repo){const state=readState();const rows=state.logs?.[day];if(!Array.isArray(rows)||!rows[index])return;rows[index].amountQuality=quality;localStorage.setItem(STORE,JSON.stringify(state));}
    if(repo&&!result?.ok)return;
    enhanceTodayRows();renderWeeklyQuality();window.dispatchEvent(new CustomEvent('okello:amount-quality-changed'));
  }

  const todayLog=$('todayLog');
  function enhanceTodayRows(){
    if(!todayLog)return;
    const rows=readState().logs?.[todayKey()]||[];
    qsa('.log-row',todayLog).forEach((row,index)=>{
      const entry=rows[index];if(!entry)return;
      let select=qs('.amount-quality-select',row);
      if(!select){
        select=document.createElement('select');select.className='amount-quality-select';select.setAttribute('aria-label','Amount measurement quality');select.innerHTML='<option value="">Amount?</option><option value="weighed">⚖ Weighed</option><option value="estimated">≈ Estimated</option>';
        const meta=qs('.meta',row);if(meta)meta.insertAdjacentElement('afterend',select);else row.appendChild(select);
        select.addEventListener('change',()=>{if(VALID.has(select.value))writeEntryQuality(todayKey(),index,select.value);});
      }
      select.value=VALID.has(entry.amountQuality)?entry.amountQuality:'';select.title=qualityLabel(entry.amountQuality);
    });
  }
  if(todayLog){new MutationObserver(enhanceTodayRows).observe(todayLog,{childList:true,subtree:true});enhanceTodayRows();}

  function dateKeys(n){const out=[];for(let i=n-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);out.push(d.toISOString().slice(0,10));}return out;}
  function qualityStats(days=7){
    const state=readState();const out={weighed:0,estimated:0,unknown:0,total:0,entries:0};
    for(const key of dateKeys(days))for(const entry of state.logs?.[key]||[]){const kcal=Number(entry?.kcal)||0;out.total+=kcal;out.entries++;if(entry?.amountQuality==='weighed')out.weighed+=kcal;else if(entry?.amountQuality==='estimated')out.estimated+=kcal;else out.unknown+=kcal;}
    const pct=value=>out.total?Math.round(value/out.total*100):0;return {...out,weighedPct:pct(out.weighed),estimatedPct:pct(out.estimated),unknownPct:pct(out.unknown)};
  }
  function qualitySentence(){
    const q=qualityStats(7);if(!q.total)return 'Log some meals and amount-quality coverage will appear here.';if(q.unknownPct===100)return 'This week’s older entries do not yet say whether their amounts were weighed or estimated.';
    let text=`${q.estimatedPct}% of this week’s logged calories came from estimated amounts; ${q.weighedPct}% came from weighed amounts.`;if(q.unknownPct)text+=` ${q.unknownPct}% is still unclassified.`;return text;
  }
  function setText(el,text){if(el&&el.textContent!==text)el.textContent=text;}
  function renderWeeklyQuality(){
    const intel=$('intelList');if(intel){let insight=qs('.amount-quality-intel',intel);if(!insight){insight=document.createElement('div');insight.className='insight amount-quality-intel';intel.appendChild(insight);}setText(insight,qualitySentence());}
    const card=$('amountQualitySettingsCard');if(card){const q=qualityStats(7);setText(qs('[data-q="weighed"]',card),q.total?q.weighedPct+'%':'—');setText(qs('[data-q="estimated"]',card),q.total?q.estimatedPct+'%':'—');setText(qs('[data-q="unknown"]',card),q.total?q.unknownPct+'%':'—');}
  }

  const settings=$('tab-settings');
  if(settings&&!$('amountQualitySettingsCard')){
    const card=document.createElement('section');card.id='amountQualitySettingsCard';card.className='card amount-quality-card';
    card.innerHTML='<p class="eyebrow">AMOUNT QUALITY</p><h3>Know what was weighed and what was guessed</h3><p class="muted">Food-source confidence and amount confidence are separate. Estimated amounts do not become direct observations merely because they are converted to grams.</p><div class="amount-quality-stats"><div class="amount-quality-stat"><span>Weighed kcal · 7 days</span><strong data-q="weighed">—</strong></div><div class="amount-quality-stat"><span>Estimated kcal</span><strong data-q="estimated">—</strong></div><div class="amount-quality-stat"><span>Unclassified kcal</span><strong data-q="unknown">—</strong></div></div><p class="tiny-note">v3 provenance is applied inside the governed state-write contract; the old global storage interception is retired.</p>';
    settings.appendChild(card);
  }

  const history=$('tab-history');if(history&&!$('intelList')){const observer=new MutationObserver(()=>{if(!$('intelList'))return;observer.disconnect();renderWeeklyQuality();});observer.observe(history,{childList:true,subtree:true});}
  renderWeeklyQuality();

  window.OkelloAmountQuality=Object.freeze({version:VERSION,arm,stats:qualityStats,qualityOf:entry=>VALID.has(entry?.amountQuality)?entry.amountQuality:'unknown'});
})();