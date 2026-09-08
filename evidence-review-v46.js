(() => {
  'use strict';
  const VERSION=2;
  const STORE='okello_food_tracker_v3';
  const catalog=window.OkelloFoodCatalog;
  const foodData=window.OkelloFoodData;
  if(!catalog)return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]||c));

  // Usage always ranks first. These are only zero-use fallback candidates so a
  // fresh beta review queue is not accidentally a Ghana-only catalogue review.
  const FALLBACK=[
    // West Africa
    'ghana_waakye','banku','kenkey','ghana_fufu','jollof','ghana_groundnut_soup','ghana_shito','plantain','yam','goat','tilapia',
    // Caribbean / Latin America
    'world_jerk_chicken','world_rice_peas','world_callaloo','world_tortilla_corn','world_arroz_con_pollo','world_feijoada',
    // South Asia
    'world_chapati','world_biryani_chicken','world_dal','world_chicken_curry','world_chana_masala','world_samosa_veg',
    // East and Southeast Asia
    'world_fried_rice','world_tofu_firm','world_ramen','world_pad_thai','world_pho_beef','world_kimchi',
    // North Africa / Middle East
    'world_couscous','world_bulgur','world_pita',
    // UK / Europe
    'bread','egg','world_baked_beans','world_lasagne','potato','salmon',
    // Global ingredients and packaged-food anchors
    'rice','beans','lentils','chicken','beef','sardines','yoghurt','banana','raw_rice','raw_beans','raw_veg_oil'
  ];

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
    card.innerHTML=`<p class="eyebrow">FOOD EVIDENCE</p><h3>Review what people actually use first</h3><p class="muted">Logged foods rank first. On a fresh install, the fallback queue spans several food traditions rather than treating one country as the whole product. A precise-looking value is not reviewed until its source, identity, basis and licence have been checked.</p><div style="display:grid;gap:7px;margin:10px 0">${rows.map((item,index)=>`<div style="display:grid;grid-template-columns:28px 1fr auto;gap:8px;align-items:center;padding:8px 0;border-bottom:1px solid var(--rule)"><strong>${index+1}</strong><span><strong>${esc(item.name)}</strong><small style="display:block;color:var(--muted)">${esc(status(item))}${item.uses?` · ${item.uses} log${item.uses===1?'':'s'}`:''}</small></span><span class="v44-estimate-badge">${esc(item.confidence||'unreviewed')}</span></div>`).join('')}</div><p class="tiny-note">Top-75 fully source-reviewed: ${reviewed}. Source selection follows the food: licensed analytical literature for distinctive composites, FDC/CoFID for matching generics, packet labels for exact products, and the user's recipe for their own variable dish. WAFCT remains comparison-only unless commercial permission is cleared.</p><button id="v46EvidenceExport" class="secondary-btn" type="button">Export top-75 review queue</button>`;
    $('v46EvidenceExport')?.addEventListener('click',download);
  }
  render();setTimeout(render,800);
  window.addEventListener('okello:food-log-changed',()=>setTimeout(render,0));

  window.OkelloEvidenceReviewV46=Object.freeze({version:VERSION,queue,csvText,render,fallback:[...FALLBACK]});
})();