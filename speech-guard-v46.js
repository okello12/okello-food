(() => {
  'use strict';
  const VERSION=1;
  document.addEventListener('click',event=>{
    const button=event.target?.closest?.('#nlVoice,#recipeAiVoice');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const toast=document.getElementById('toast');
    if(toast){toast.textContent='Use your phone keyboard microphone for dictation. Okello Food does not start browser speech recognition.';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200);}
  },true);
  window.OkelloSpeechGuardV46=Object.freeze({version:VERSION,blockedIds:Object.freeze(['nlVoice','recipeAiVoice'])});
})();