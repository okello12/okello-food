(() => {
  'use strict';

  const migration=window.OkelloStorageMigration;
  if(!migration?.resolveFoodId)return;

  const VERSION=1;
  const resolve=id=>migration.resolveFoodId(id);
  let scheduled=false;

  function normaliseSelect(select,notify=false){
    if(!select)return false;
    const before=select.value;
    const options=Array.from(select.options||[]);
    const exact=new Set(options.map(o=>String(o.value)).filter(v=>resolve(v)===v));
    for(const option of options){
      const original=String(option.value||'');
      const canonical=resolve(original);
      if(!original||canonical===original)continue;
      if(exact.has(canonical))option.remove();
      else option.value=canonical;
    }
    const wanted=resolve(before);
    if(wanted!==before&&Array.from(select.options||[]).some(o=>o.value===wanted)){
      select.value=wanted;
      if(notify)select.dispatchEvent(new Event('change',{bubbles:true}));
      return true;
    }
    return false;
  }

  function normaliseButtonSurface(root,attribute,cardSelector){
    if(!root)return;
    const buttons=Array.from(root.querySelectorAll(`[${attribute}]`));
    const exact=new Set(buttons.map(b=>String(b.getAttribute(attribute)||'')).filter(v=>resolve(v)===v));
    for(const button of buttons){
      const original=String(button.getAttribute(attribute)||'');
      const canonical=resolve(original);
      if(!original||canonical===original)continue;
      if(exact.has(canonical))button.closest(cardSelector)?.remove();
      else button.setAttribute(attribute,canonical);
    }
  }

  function normaliseAll(){
    scheduled=false;
    normaliseSelect(document.getElementById('foodSelect'),true);
    normaliseSelect(document.getElementById('recipeFoodSelect'),false);
    normaliseButtonSurface(document.getElementById('foodLibrary'),'data-log-food','.food-card');
    normaliseButtonSurface(document.getElementById('foodSuggestions'),'data-food','.suggestion');
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    queueMicrotask(normaliseAll);
  }

  // Legacy app.js re-renders these surfaces from its closure-owned catalogue.
  // Identity normalisation therefore runs after DOM mutations while downstream
  // catalog consumers use the canonical facade directly.
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  document.addEventListener('change',event=>{
    if(event.target?.matches?.('#foodSelect,#recipeFoodSelect'))schedule();
  });
  schedule();

  window.OkelloCatalogUiV41=Object.freeze({version:VERSION,normaliseSelect,normaliseButtonSurface,normaliseAll});
})();