(() => {
  'use strict';

  const STORE='okello_beta_feedback_v1';
  const FORMAT='okello-beta-feedback-v1';
  const VERSION=1;
  const MAX_RECORDS=500;
  const $=id=>document.getElementById(id);
  const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
  const nowIso=()=>new Date().toISOString();
  const uid=()=>globalThis.crypto?.randomUUID?.()||`feedback_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  function cleanText(value,max=700){
    return String(value??'').replace(/\s+/g,' ').trim().slice(0,max);
  }

  function readRecords(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORE)||'[]');
      return Array.isArray(parsed)?parsed:[];
    }catch(_){return [];}
  }

  function writeRecords(records){
    const safe=(Array.isArray(records)?records:[]).slice(-MAX_RECORDS);
    localStorage.setItem(STORE,JSON.stringify(safe));
    return safe;
  }

  function safeTrace(){
    try{
      const trace=window.OkelloSmartMealRuntime?.lastTrace?.();
      if(!trace||typeof trace!=='object')return null;
      return JSON.parse(JSON.stringify(trace));
    }catch(_){return null;}
  }

  function activeTab(){
    return document.querySelector('.tab.active')?.dataset?.tab||null;
  }

  function baseContext(){
    return {
      appVersion:document.documentElement.dataset.okelloVersion||null,
      activeTab:activeTab(),
      standalone:window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true,
      capturedAt:nowIso()
    };
  }

  function contextFor(surface){
    const context=baseContext();
    if(surface==='smart-meal'){
      context.meal=$('smartMealType')?.value||null;
      context.style=$('smartMealStyle')?.value||null;
      context.resultText=cleanText($('smartMealList')?.textContent,1200);
      context.trace=safeTrace();
    }else if(surface==='quick-log'){
      context.input=cleanText($('nlInput')?.value,800);
      context.meal=$('nlMeal')?.value||null;
      context.resultText=cleanText($('nlResult')?.textContent,1200);
    }else if(surface==='barcode'){
      context.barcode=cleanText($('barcodeInput')?.value,80);
      context.status=cleanText($('barcodeStatus')?.textContent,500);
      context.previewText=cleanText($('barcodePreview')?.textContent,1200);
    }else if(surface==='food-search'){
      context.query=cleanText($('foodSearch')?.value,300);
      context.selectedFood=$('foodSelect')?.value||null;
      context.suggestions=cleanText($('foodSuggestions')?.textContent,1000);
    }
    return context;
  }

  function submit(surface,verdict,{issue=null,note='',context=null}={}){
    const allowed=new Set(['right','issue']);
    if(!allowed.has(verdict))throw new Error('invalid-verdict');
    const row={
      id:uid(),
      createdAt:nowIso(),
      surface:String(surface||'unknown'),
      verdict,
      issue:issue?String(issue):null,
      note:cleanText(note,1000),
      context:context&&typeof context==='object'?context:contextFor(surface)
    };
    const rows=readRecords();
    rows.push(row);
    writeRecords(rows);
    window.dispatchEvent(new CustomEvent('okello:beta-feedback-added',{detail:{id:row.id,surface:row.surface,verdict:row.verdict}}));
    return row;
  }

  function bundle(){
    return {format:FORMAT,version:VERSION,exportedAt:nowIso(),records:readRecords()};
  }

  function csvEscape(value){
    const text=String(value??'');
    return /[",\n]/.test(text)?`"${text.replace(/"/g,'""')}"`:text;
  }

  function csvText(){
    const rows=readRecords();
    const header=['id','createdAt','surface','verdict','issue','note','context'];
    const lines=[header.join(',')];
    for(const row of rows){
      lines.push([
        row.id,row.createdAt,row.surface,row.verdict,row.issue||'',row.note||'',JSON.stringify(row.context||{})
      ].map(csvEscape).join(','));
    }
    return lines.join('\n');
  }

  function downloadText(text,name,type){
    const blob=new Blob([text],{type});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href),1500);
  }

  function exportJson(){
    downloadText(JSON.stringify(bundle(),null,2),`okello-beta-feedback-${new Date().toISOString().slice(0,10)}.json`,'application/json');
  }

  function exportCsv(){
    downloadText(csvText(),`okello-beta-feedback-${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8');
  }

  function toast(message){
    const node=$('toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),2000);
  }

  const style=document.createElement('style');
  style.textContent=`
    .beta-feedback-strip[hidden]{display:none!important}.beta-feedback-strip{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:9px 0 2px;padding:9px 10px;border:1px solid var(--rule);border-radius:12px;background:#fff}.beta-feedback-strip span{font-size:.76rem;color:var(--muted);font-weight:750}.beta-feedback-actions{display:flex;gap:6px;flex-wrap:wrap}.beta-feedback-btn{min-height:34px;border-radius:999px;padding:6px 10px;border:1px solid var(--rule);background:#fff;color:var(--forest);font-size:.72rem;font-weight:850}.beta-feedback-btn.issue{color:var(--clay)}
    .beta-feedback-modal[hidden]{display:none!important}.beta-feedback-modal{position:fixed;inset:0;z-index:2900;background:rgba(10,18,14,.7);display:flex;align-items:flex-end;justify-content:center;padding:14px}.beta-feedback-sheet{width:min(620px,100%);background:var(--paper);border-radius:24px 24px 18px 18px;padding:18px;box-shadow:0 22px 70px rgba(0,0,0,.28)}.beta-feedback-sheet h3{margin:0;color:var(--forest)}.beta-feedback-sheet p{margin:5px 0 12px;color:var(--muted);font-size:.86rem}.beta-feedback-sheet label{display:block;font-size:.78rem;font-weight:800;margin-top:10px}.beta-feedback-sheet select,.beta-feedback-sheet textarea{width:100%;margin-top:5px;border:1px solid var(--rule);border-radius:12px;background:#fff;color:var(--ink);padding:10px 12px;font-size:16px}.beta-feedback-sheet textarea{min-height:90px;resize:vertical}.beta-feedback-sheet .button-row{margin-top:13px}.beta-feedback-count{display:inline-block;margin-left:5px;color:var(--forest);font-weight:850}
  `;
  document.head.appendChild(style);

  const modal=document.createElement('div');
  modal.className='beta-feedback-modal';
  modal.hidden=true;
  modal.innerHTML=`<div class="beta-feedback-sheet" role="dialog" aria-modal="true" aria-labelledby="betaFeedbackTitle"><h3 id="betaFeedbackTitle">What was wrong?</h3><p>Your report stays on this device until you export it.</p><label>Issue<select id="betaFeedbackIssue"><option value="wrong-food">Wrong food or match</option><option value="wrong-amount">Wrong amount or portion</option><option value="missing-component">Something was missing</option><option value="misleading-guidance">Suggestion or guidance was not useful</option><option value="barcode-mismatch">Barcode/product mismatch</option><option value="other">Other</option></select></label><label>What should have happened? <span style="font-weight:500;color:var(--muted)">(optional)</span><textarea id="betaFeedbackNote" placeholder="A short correction helps us find repeated failures."></textarea></label><div class="button-row"><button id="betaFeedbackSave" class="primary-btn" type="button">Save report</button><button id="betaFeedbackCancel" class="secondary-btn" type="button">Cancel</button></div></div>`;
  document.body.appendChild(modal);

  let pending=null;
  function openIssue(surface,signature){
    pending={surface,signature,context:contextFor(surface)};
    $('betaFeedbackIssue').value='wrong-food';
    $('betaFeedbackNote').value='';
    modal.hidden=false;
    setTimeout(()=>$('betaFeedbackIssue')?.focus(),0);
  }
  function closeIssue(){modal.hidden=true;pending=null;}
  $('betaFeedbackCancel').addEventListener('click',closeIssue);
  modal.addEventListener('click',event=>{if(event.target===modal)closeIssue();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)closeIssue();});
  $('betaFeedbackSave').addEventListener('click',()=>{
    if(!pending)return;
    submit(pending.surface,'issue',{issue:$('betaFeedbackIssue').value,note:$('betaFeedbackNote').value,context:pending.context});
    markThanks(pending.surface,pending.signature,'Report saved');
    closeIssue();
    refreshSettings();
    toast('Feedback saved on this device');
  });

  const surfaces=[
    {id:'smart-meal',anchor:'smartMealList',ready:()=>!!$('smartMealList')?.querySelector('.meal-suggestion')},
    {id:'quick-log',anchor:'nlResult',ready:()=>!!$('nlResult')?.querySelector('.parsed-row')},
    {id:'barcode',anchor:'barcodePreview',ready:()=>!!$('barcodePreview')&&!$('barcodePreview').hidden&&cleanText($('barcodePreview').textContent).length>0},
    {id:'food-search',anchor:'foodSuggestions',ready:()=>cleanText($('foodSearch')?.value).length>=2&&!!$('foodSuggestions')&&!$('foodSuggestions').hidden&&cleanText($('foodSuggestions').textContent).length>0}
  ];

  function signatureFor(surface){
    const ctx=contextFor(surface);
    return cleanText(JSON.stringify(ctx),1600);
  }

  function stripFor(surface){return document.querySelector(`.beta-feedback-strip[data-feedback-surface="${surface}"]`);}

  function ensureStrip(def){
    const anchor=$(def.anchor);
    if(!anchor)return null;
    let strip=stripFor(def.id);
    if(!strip){
      strip=document.createElement('div');
      strip.className='beta-feedback-strip';
      strip.dataset.feedbackSurface=def.id;
      strip.innerHTML=`<span>Was this right?</span><div class="beta-feedback-actions"><button class="beta-feedback-btn" type="button" data-feedback-right>✓ Looks right</button><button class="beta-feedback-btn issue" type="button" data-feedback-issue>Report issue</button></div>`;
      anchor.insertAdjacentElement('afterend',strip);
      strip.addEventListener('click',event=>{
        const right=event.target.closest('[data-feedback-right]');
        const issue=event.target.closest('[data-feedback-issue]');
        if(!right&&!issue)return;
        const signature=strip.dataset.signature||signatureFor(def.id);
        if(right){
          submit(def.id,'right',{context:contextFor(def.id)});
          markThanks(def.id,signature,'Thanks — saved');
          refreshSettings();
        }else{
          openIssue(def.id,signature);
        }
      });
    }
    return strip;
  }

  function renderStrip(def){
    const strip=ensureStrip(def);
    if(!strip)return;
    const ready=def.ready();
    strip.hidden=!ready;
    if(!ready)return;
    const signature=signatureFor(def.id);
    if(strip.dataset.signature!==signature){
      strip.dataset.signature=signature;
      strip.dataset.answered='0';
      strip.querySelector('span').textContent='Was this right?';
      strip.querySelector('.beta-feedback-actions').hidden=false;
    }
  }

  function markThanks(surface,signature,message){
    const strip=stripFor(surface);
    if(!strip)return;
    strip.dataset.signature=signature||strip.dataset.signature||'';
    strip.dataset.answered='1';
    strip.querySelector('span').textContent=message;
    strip.querySelector('.beta-feedback-actions').hidden=true;
  }

  function refreshSurfaces(){surfaces.forEach(renderStrip);}

  for(const def of surfaces){
    const anchor=$(def.anchor);
    if(anchor)new MutationObserver(()=>renderStrip(def)).observe(anchor,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['hidden']});
  }
  for(const id of ['smartMealType','smartMealStyle','nlInput','nlMeal','barcodeInput','foodSearch','foodSelect']){
    const node=$(id);
    if(node){node.addEventListener('input',refreshSurfaces);node.addEventListener('change',refreshSurfaces);}
  }

  let settingsCard=null;
  function ensureSettings(){
    const settings=$('tab-settings');
    if(!settings||settingsCard)return;
    settingsCard=document.createElement('section');
    settingsCard.id='betaFeedbackCard';
    settingsCard.className='card';
    settingsCard.innerHTML=`<p class="eyebrow">BETA FEEDBACK</p><h3>Export what the app got right and wrong</h3><p class="muted">Feedback is stored only on this device. Nothing is submitted to a server. Export it when you want to review or share the evidence.</p><p class="tiny-note">Saved reports: <span id="betaFeedbackCount" class="beta-feedback-count">0</span></p><div class="button-row"><button id="betaFeedbackExportJson" class="secondary-btn" type="button">Export JSON</button><button id="betaFeedbackExportCsv" class="secondary-btn" type="button">Export CSV</button></div><button id="betaFeedbackClear" class="text-btn danger" type="button" style="margin-top:10px">Clear beta feedback</button>`;
    const backup=$('exportBtn')?.closest('.card');
    if(backup)backup.insertAdjacentElement('beforebegin',settingsCard);else settings.appendChild(settingsCard);
    $('betaFeedbackExportJson').addEventListener('click',()=>{exportJson();toast('Beta feedback export created');});
    $('betaFeedbackExportCsv').addEventListener('click',()=>{exportCsv();toast('Beta feedback CSV created');});
    $('betaFeedbackClear').addEventListener('click',()=>{
      if(!window.confirm('Clear all saved beta feedback from this device? Export it first if you want to keep a copy.'))return;
      writeRecords([]);
      refreshSettings();
      toast('Beta feedback cleared');
    });
  }

  function refreshSettings(){
    ensureSettings();
    const count=$('betaFeedbackCount');
    if(count)count.textContent=String(readRecords().length);
  }

  ensureSettings();
  refreshSettings();
  refreshSurfaces();

  window.OkelloBetaFeedback=Object.freeze({
    version:VERSION,
    storeKey:STORE,
    format:FORMAT,
    maxRecords:MAX_RECORDS,
    read:readRecords,
    submit,
    contextFor,
    bundle,
    csvText,
    exportJson,
    exportCsv,
    clear:()=>writeRecords([]),
    refresh:()=>{refreshSurfaces();refreshSettings();}
  });
})();
