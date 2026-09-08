(() => {
  'use strict';

  const VERSION=1;
  const STORE='okello_food_tracker_v3';
  const catalog=window.OkelloFoodCatalog;
  const foodData=window.OkelloFoodData;
  if(!catalog)return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));
  const FALLBACK=['ghana_waakye','banku','kenkey','ghana_fufu','jollof','light_soup','ghana_groundnut_soup','ghana_palmnut_soup','ghana_okro_stew','ghana_kontomire_stew','ghana_shito','plantain','yam','goat','tilapia','chicken','beef','egg','sardines','bread','beans','rice','raw_rice','raw_beans','raw_palm_oil','raw_veg_oil','raw_goat','raw_chicken','raw_fish'];

  function state(){try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch(_){return {};}}
  function queue(limit=75){
    const counts=new Map();
    for(const rows of Object.values(state().logs||{}))for(const row of rows||[]){const id=String(row?.foodId||'');if(id)counts.set(id,(counts.get(id)||0)+1);}
    for(const id of FALLBACK)if(!counts.has(id))counts.set(id,0);
    const items=[];
    for(const [id,uses] of counts){
      const food=catalog.getById?.(id);if(!food)continue;
      const missing=foodData?.completeness?.(food)?.missing||[];
      items.push({id,name:food.name||id,uses,sourceName:food.sourceName??null,sourceFoodCode:food.sourceFoodCode??null,sourceYear:food.sourceYear??null,sourceType:food.sourceType??null,confidence:food.confidence??(food.quality==='Estimated'?'low':'unreviewed'),reviewedAt:food.reviewedAt??null,quality:food.quality??null,missing:[...missing]});
    }
    return items.sort((a,b)=>b.uses-a.uses||Number(!!a.reviewedAt)-Number(!!b.reviewedAt)||a.name.localeCompare(b.name)).slice(0,limit);
  }
  function status(item){if(item.reviewedAt&&item.sourceName)return 'reviewed';if(item.sourceName)return 'source recorded, review pending';return 'source review pending';}
  function csvText(){
    const cols=['rank','foodId','name','loggedUses','status','sourceName','sourceFoodCode','sourceYear','sourceType','confidence','reviewedAt','missingNutrients'];
    const rows=queue(75).map((item,index)=>[index+1,item.id,item.name,item.uses,status(item),item.sourceName||'',item.sourceFoodCode||'',item.sourceYear||'',item.sourceType||'',item.confidence||'',item.reviewedAt||'',item.missing.join('|')]);
    const quote=value=>`"${String(value??'').replace(/"/g,'""')}"`;
    return [cols.map(quote).join(','),...rows.map(row=>row.map(quote).join(','))].join('\n');
  }
  function download(){const blob=new Blob([csvText()],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`okello-food-evidence-review-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
  function render(){
    const settings=$('tab-settings');if(!settings)return;
    let card=$('v46EvidenceQueue');if(!card){card=document.createElement('section');card.id='v46EvidenceQueue';card.className='card';settings.appendChild(card);}
    const rows=queue(10);const reviewed=queue(75).filter(x=>x.reviewedAt&&x.sourceName).length;
    card.innerHTML=`<p class="eyebrow">FOOD EVIDENCE</p><h3>Review what people actually use first</h3><p class="muted">This queue ranks logged foods first, then core starter foods. A precise-looking value is not treated as reviewed until its source, identity, basis and licence have been checked.</p><div style="display:grid;gap:7px;margin:10px 0">${rows.map((item,index)=>`<div style="display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--rule)"><strong>${index+1}</strong><span><strong>${esc(item.name)}</strong><small style="display:block;color:var(--muted)">${esc(status(item))}${item.uses?` · ${item.uses} log${item.uses===1?'':'s'}`:''}</small></span><span class="v44-estimate-badge">${esc(item.confidence||'unreviewed')}</span></div>`).join('')}</div><p class="tiny-note">Top-75 fully source-reviewed: ${reviewed}. WAFCT 2019 is a scientific candidate source, but its commercial reuse terms must be cleared before bulk use in a commercial database.</p><button id="v46EvidenceExport" class="secondary-btn" type="button">Export top-75 review queue</button>`;
    $('v46EvidenceExport')?.addEventListener('click',download);
  }
  render();setTimeout(render,800);
  window.addEventListener('okello:food-log-changed',()=>setTimeout(render,0));

  window.OkelloEvidenceReviewV46=Object.freeze({version:VERSION,queue,csvText,render});
})();