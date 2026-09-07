(() => {
  'use strict';

  const VERSION=1;
  const guardedSelector='[data-smartmeal],#plateAdd,#nlAdd';

  function toast(message){
    const node=document.getElementById('toast');
    if(!node)return;
    node.textContent=message;
    node.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>node.classList.remove('show'),1600);
  }

  // smart-v3 creates its legacy controls before the governed v42 adapter runs.
  // This capture guard closes that tiny boot window so no legacy thin-record or
  // token-portion write can occur while the next script is still loading.
  document.addEventListener('click',event=>{
    const target=event.target?.closest?.(guardedSelector);
    if(!target||window.OkelloSmartMealRuntime)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    toast('Finishing the meal update… try again in a moment.');
  },true);

  window.OkelloSmartMealGuard=Object.freeze({version:VERSION,guardedSelector});
})();
