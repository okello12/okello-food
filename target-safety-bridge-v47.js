(() => {
  'use strict';

  const PROFILE_KEY='okello_first_run_v44';
  const $=id=>document.getElementById(id);

  function readProfile(){
    try{
      const value=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');
      return value&&typeof value==='object'?value:{};
    }catch(_){return {};}
  }
  function writeProfile(value){
    try{localStorage.setItem(PROFILE_KEY,JSON.stringify(value));return true;}
    catch(_){return false;}
  }
  function mode(){return window.OkelloTargetSafetyV46?.mode?.()||readProfile().targetMode||null;}

  function neutralizeInputs(){
    const kcal=$('targetCalories');
    const protein=$('targetProtein');
    if(kcal){kcal.value='';kcal.placeholder='Enter your target';}
    if(protein){protein.value='';protein.placeholder='Enter your target';}
  }

  function removeStarterTargetAdvice(){
    document.querySelectorAll('.v44-default-note').forEach(node=>{
      const text=(node.textContent||'').toLowerCase();
      if(text.includes('starter target')||text.includes('2,300 kcal')||text.includes('150 g protein')) node.remove();
    });
    const onboarding=$('v44Onboarding');
    if(onboarding){
      onboarding.querySelectorAll('details').forEach(node=>{
        if(node.querySelector('#v44Calories,#v44Protein')) node.remove();
      });
    }
  }

  function applyResolvedMode(){
    const current=mode();
    if(!current) return;
    document.documentElement.classList.remove('targets-unconfirmed');
    if(current==='tracking-only') neutralizeInputs();
    removeStarterTargetAdvice();
  }

  // first-run-v44 historically rewrites the whole profile object. Capture its
  // onboarding action and merge culture/focus into the already-governed target
  // profile instead, so targetMode/customTargets survive.
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#v44Start,#v44Skip');
    if(!button) return;
    const modal=$('v44Onboarding');
    if(!modal) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const previous=readProfile();
    const culture=$('v44Culture')?.value||previous.culture||'ghana-west-africa';
    const focus=$('v44Focus')?.value||previous.focus||'just-see';
    const skipped=button.id==='v44Skip';
    writeProfile({
      ...previous,
      version:previous.version||1,
      culture,
      focus,
      skipped,
      createdAt:previous.createdAt||new Date().toISOString()
    });
    modal.remove();
    window.OkelloFirstRunV44?.renderStarterShelf?.();
    $('globalFoodSearch')?.focus();
    applyResolvedMode();
  },true);

  const observer=new MutationObserver(()=>{
    removeStarterTargetAdvice();
    applyResolvedMode();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  removeStarterTargetAdvice();
  applyResolvedMode();

  window.OkelloTargetSafetyBridgeV47=Object.freeze({version:1,apply:applyResolvedMode});
})();
