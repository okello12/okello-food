(() => {
  'use strict';

  const STORE='okello_food_tracker_v3';
  const engine=window.OkelloTemplateEngine;
  const catalog=window.OkelloFoodCatalog;
  if(!engine||!catalog)return;

  const VERSION=1;
  const todayKey=()=>new Date().toISOString().slice(0,10);

  function readState(){
    try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}
    catch(_){return {};}
  }
  function writeState(state){localStorage.setItem(STORE,JSON.stringify(state));}
  function toast(message){
    const node=document.getElementById('toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),2200);
  }
  function reloadWithMessage(message){
    try{sessionStorage.setItem('okello_flash',message);}catch(_){}
    if(typeof location!=='undefined'&&typeof location.reload==='function')location.reload();
  }

  function renderTemplateRows(){
    const state=readState();
    const templates=Array.isArray(state.mealTemplates)?state.mealTemplates:[];
    document.querySelectorAll('[data-use-template]').forEach(button=>{
      const index=Number(button.getAttribute('data-use-template'));
      const template=templates[index];
      const row=button.closest('.template-row');
      const detail=row?.querySelector('small');
      if(!template||!row||!detail)return;
      const evaluation=engine.evaluateTemplate(template,catalog);
      const count=evaluation.template?.components?.length||0;
      const text=evaluation.complete
        ? `${count} items · ${Math.round(evaluation.kcal)} kcal`
        : `${count} items · needs repair`;
      if(detail.textContent!==text)detail.textContent=text;
      row.toggleAttribute('data-template-needs-repair',!evaluation.complete);
      button.disabled=!evaluation.complete;
      button.title=evaluation.complete?'':'One or more foods in this template can no longer be resolved.';
    });
  }

  function saveCurrentMealAsTemplate(){
    const state=readState();
    state.logs=state.logs&&typeof state.logs==='object'?state.logs:{};
    state.mealTemplates=Array.isArray(state.mealTemplates)?state.mealTemplates:[];
    const meal=document.getElementById('templateMeal')?.value||'Other';
    const entries=(state.logs[todayKey()]||[]).filter(x=>(x?.meal||'Other')===meal);
    if(!entries.length){toast('Log a meal first');return false;}
    const name=document.getElementById('templateName')?.value?.trim()||`${meal} template`;
    const template=engine.createTemplate(name,entries);
    if(!template.components.length){toast('That meal has no reusable amounts');return false;}
    state.mealTemplates.push(template);
    writeState(state);
    reloadWithMessage('Meal template saved');
    return true;
  }

  function useTemplate(index){
    const state=readState();
    state.logs=state.logs&&typeof state.logs==='object'?state.logs:{};
    const template=Array.isArray(state.mealTemplates)?state.mealTemplates[index]:null;
    if(!template)return false;
    const result=engine.instantiateTemplate(template,catalog,{ts:Date.now()});
    if(!result.ok){
      toast('This template needs repair before it can be logged.');
      renderTemplateRows();
      return false;
    }
    const day=todayKey();
    state.logs[day]=Array.isArray(state.logs[day])?state.logs[day]:[];
    state.logs[day].push(...result.entries);
    writeState(state);
    reloadWithMessage(`${template.name||'Meal template'} added`);
    return true;
  }

  // `features-v1.js` renders and re-renders these controls. Capture delegation
  // makes the v41 contract the single writer without binding to replaceable DOM.
  document.addEventListener('click',event=>{
    const save=event.target?.closest?.('#saveTemplateBtn');
    if(save){
      event.preventDefault();
      event.stopImmediatePropagation();
      saveCurrentMealAsTemplate();
      return;
    }
    const use=event.target?.closest?.('[data-use-template]');
    if(!use)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    useTemplate(Number(use.getAttribute('data-use-template')));
  },true);

  const shortcuts=document.getElementById('mealShortcutsCard');
  if(shortcuts){
    new MutationObserver(()=>queueMicrotask(renderTemplateRows)).observe(shortcuts,{childList:true,subtree:true});
  }
  queueMicrotask(renderTemplateRows);

  window.OkelloTemplateRuntime=Object.freeze({
    version:VERSION,
    readState,
    renderTemplateRows,
    saveCurrentMealAsTemplate,
    useTemplate
  });
})();