(() => {
  'use strict';

  const sheet=window.OkelloPieceSheetContract;
  const piece=window.OkelloPieceEntry;
  if(!sheet||!piece)return;

  const VERSION=1;
  let activeSession=null;
  let keyHandler=null;

  const round1=n=>Math.round((Number(n)||0)*10)/10;
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,ch=>({
    '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
  }[ch]));

  function piecePhrase(count,pieceKey){
    const n=Number(count)||0;
    const key=String(pieceKey||'piece');
    const labels={
      small:n===1?'small piece':'small pieces',
      medium:n===1?'medium piece':'medium pieces',
      large:n===1?'large piece':'large pieces',
      piece:n===1?'piece':'pieces',
      whole:n===1?'whole piece':'whole pieces',
      half:n===1?'half':'halves',
      claw:n===1?'claw':'claws'
    };
    return `${n} ${labels[key]||key}`;
  }

  function presentationFor(food,draft,state={}){
    if(!food||!draft)return null;
    const vm=sheet.viewModel(food,draft);
    const options=piece.optionsFor(draft.foodId,state);
    const currentGrams=Number(vm.currentGrams)||0;
    const targetGrams=Number(vm.targetGrams)||0;
    const gap=targetGrams>0?round1(currentGrams-targetGrams):null;
    const overTarget=gap!=null&&gap>0.5;
    const underTarget=gap!=null&&gap<-.5;
    const gapKcal=gap==null?null:round1(Math.abs(gap)*(Number(food.kcal)||0)/100);
    const smart=draft.smartSuggestion;
    const firstUsePieceSuggestion=draft.mode==='pieces'&&!draft.usualPiece&&!!smart;

    let statusText='';
    if(overTarget)statusText=`${Math.abs(gap)} g above the current Smart Portion target${gapKcal?` · about ${gapKcal} kcal`:''}`;
    else if(underTarget)statusText=`${Math.abs(gap)} g below the current Smart Portion target${gapKcal?` · about ${gapKcal} kcal unused`:''}`;
    else if(targetGrams>0)statusText='At the current Smart Portion target';

    return {
      foodId:draft.foodId,
      foodName:food.name||draft.foodId,
      emoji:food.emoji||'🍽️',
      mode:draft.mode,
      pieceKey:draft.pieceKey,
      count:draft.count,
      options,
      amount:draft.amount,
      currentGrams,
      nutrition:vm.nutrition,
      targetGrams:targetGrams||null,
      gapGrams:gap,
      gapKcal,
      overTarget,
      underTarget,
      statusText,
      usualPiece:draft.usualPiece,
      smartSuggestion:smart,
      smartPriority:firstUsePieceSuggestion?'prominent':'secondary',
      selectionSource:draft.selectionSource,
      currentLabel:draft.mode==='pieces'?piecePhrase(draft.count,draft.pieceKey):`${round1(currentGrams)} g`,
      smartLabel:smart?piecePhrase(smart.pieceCount,smart.pieceKey):null
    };
  }

  function sizeButtons(p){
    if(p.mode!=='pieces'||!p.options.length)return '';
    return `<div class="ok-piece-sizes" role="group" aria-label="Piece size">${p.options.map(option=>{
      const active=option.pieceKey===p.pieceKey;
      return `<button type="button" class="ok-piece-size${active?' is-active':''}" data-piece-size="${escapeHtml(option.pieceKey)}" aria-pressed="${active?'true':'false'}"><span>${escapeHtml(option.label)}</span><small>${round1(option.grams)} g</small></button>`;
    }).join('')}</div>`;
  }

  function smartBlock(p){
    const smart=p.smartSuggestion;
    if(!smart)return '';
    const smartGrams=round1(smart.estimatedGrams||smart.grams);
    const target=p.targetGrams?round1(p.targetGrams):null;
    const unused=target!=null?round1(target-smartGrams):null;
    const helper=p.smartPriority==='prominent'
      ? 'No usual amount learned yet. This is the strongest starting guidance available.'
      : 'A recommendation for today, separate from your learned usual.';
    return `<div class="ok-piece-smart ok-piece-smart--${p.smartPriority}">
      <div><span class="ok-piece-kicker">SMART PORTION</span><strong>${escapeHtml(p.smartLabel)} · about ${smartGrams} g</strong><small>${escapeHtml(helper)}${target!=null?` Target ${target} g${unused>0?` · leaves ${unused} g unused`:''}.`:''}</small></div>
      <button type="button" class="ok-piece-smart-use" data-piece-use-smart>Use suggestion</button>
    </div>`;
  }

  function controlsFor(p){
    if(p.mode==='pieces'){
      return `<div class="ok-piece-controls ok-piece-controls--pieces">
        ${sizeButtons(p)}
        <div class="ok-piece-stepper" role="group" aria-label="Piece count">
          <button type="button" data-piece-step="-1" aria-label="Remove one piece">−</button>
          <div class="ok-piece-count" aria-live="polite"><strong>${Number(p.count)||1}</strong><small>${escapeHtml(p.currentLabel)}</small></div>
          <button type="button" data-piece-step="1" aria-label="Add one piece">+</button>
        </div>
        <button type="button" class="ok-piece-unit-switch" data-piece-to-grams>Use grams instead</button>
      </div>`;
    }
    const quality=p.amount?.amountQuality==='weighed'?'weighed':'estimated';
    return `<div class="ok-piece-controls ok-piece-controls--grams">
      <label class="ok-piece-grams-label">Amount in grams
        <div class="ok-piece-grams-input"><input data-piece-grams type="number" inputmode="decimal" min="1" max="5000" step="0.5" value="${escapeHtml(round1(p.currentGrams))}"><span>g</span></div>
      </label>
      <div class="ok-piece-quality" role="group" aria-label="How was this gram amount measured?">
        <button type="button" data-piece-quality="estimated" aria-pressed="${quality==='estimated'?'true':'false'}" class="${quality==='estimated'?'is-active':''}">Estimated</button>
        <button type="button" data-piece-quality="weighed" aria-pressed="${quality==='weighed'?'true':'false'}" class="${quality==='weighed'?'is-active':''}">Weighed</button>
      </div>
      ${p.options.length?'<button type="button" class="ok-piece-unit-switch" data-piece-to-pieces>Use pieces instead</button>':''}
    </div>`;
  }

  function markupFor(p){
    if(!p)return '';
    const n=p.nutrition||{kcal:0,protein:0,fibre:0};
    const statusClass=p.overTarget?' is-over':p.underTarget?' is-under':'';
    const usualNote=p.usualPiece?`Your usual: ${piecePhrase(p.usualPiece.pieceCount,p.usualPiece.pieceKey)}`:'';
    return `<div class="ok-piece-backdrop" data-piece-backdrop>
      <section class="ok-piece-sheet" role="dialog" aria-modal="true" aria-labelledby="okPieceSheetTitle">
        <header class="ok-piece-header"><div><span class="ok-piece-kicker">AMOUNT</span><h3 id="okPieceSheetTitle">${escapeHtml(p.emoji)} ${escapeHtml(p.foodName)}</h3>${usualNote?`<small>${escapeHtml(usualNote)}</small>`:''}</div><button type="button" class="ok-piece-close" data-piece-close aria-label="Close">×</button></header>

        <div class="ok-piece-live${statusClass}" aria-live="polite">
          <div class="ok-piece-metric"><span>Calories</span><strong>${round1(n.kcal)}</strong><small>kcal</small></div>
          <div class="ok-piece-metric"><span>Protein</span><strong>${round1(n.protein)}</strong><small>g</small></div>
          <div class="ok-piece-metric"><span>Amount</span><strong>${round1(p.currentGrams)}</strong><small>g</small></div>
          <div class="ok-piece-target-status" role="status">${escapeHtml(p.statusText||'')}</div>
        </div>

        ${controlsFor(p)}
        ${smartBlock(p)}

        <button type="button" class="ok-piece-confirm" data-piece-confirm>Use this amount</button>
      </section>
    </div>`;
  }

  function ensureStyles(){
    if(typeof document==='undefined'||document.getElementById('okPieceSheetStyles'))return;
    const style=document.createElement('style');
    style.id='okPieceSheetStyles';
    style.textContent=`
      .ok-piece-backdrop{position:fixed;inset:0;z-index:9998;background:rgba(15,24,20,.42);display:flex;align-items:flex-end;justify-content:center;padding:0}
      .ok-piece-sheet{width:min(100%,560px);max-height:88dvh;overflow:auto;background:var(--paper,#faf8f3);border-radius:24px 24px 0 0;padding:18px 18px calc(18px + env(safe-area-inset-bottom));box-shadow:0 -16px 50px rgba(0,0,0,.20)}
      .ok-piece-header{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.ok-piece-header h3{margin:2px 0 3px;font-size:1.18rem}.ok-piece-header small{color:var(--muted,#5f6b62)}.ok-piece-kicker{display:block;font-size:.7rem;font-weight:900;letter-spacing:.12em;color:var(--forest,#1e4235)}
      .ok-piece-close{width:44px;height:44px;border:0;border-radius:50%;background:rgba(0,0,0,.06);font-size:1.6rem;line-height:1}
      .ok-piece-live{margin:14px 0 12px;min-height:112px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:12px;border:1px solid var(--rule,#ddd6c8);border-radius:16px;background:#fff}.ok-piece-live.is-over{border-color:#b65337;background:#fff8f5}.ok-piece-live.is-under{border-color:#8a7a3a}
      .ok-piece-metric{min-width:0}.ok-piece-metric span{display:block;font-size:.72rem;color:var(--muted,#5f6b62)}.ok-piece-metric strong{display:inline-block;min-width:6ch;font-variant-numeric:tabular-nums;font-size:1.32rem;line-height:1.2}.ok-piece-metric small{font-size:.72rem;color:var(--muted,#5f6b62)}.ok-piece-target-status{grid-column:1/-1;min-height:2.4em;font-size:.82rem;font-weight:750;color:var(--forest,#1e4235);display:flex;align-items:center}.ok-piece-live.is-over .ok-piece-target-status{color:#8c3825}
      .ok-piece-controls{min-height:188px;display:flex;flex-direction:column;justify-content:flex-start;gap:12px}.ok-piece-sizes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.ok-piece-size{min-height:58px;border:1px solid var(--rule,#ddd6c8);border-radius:13px;background:#fff;padding:8px}.ok-piece-size span,.ok-piece-size small{display:block}.ok-piece-size small{margin-top:3px;color:var(--muted,#5f6b62);font-variant-numeric:tabular-nums}.ok-piece-size.is-active{border:2px solid var(--forest,#1e4235);background:var(--tint,#f1ede1)}
      .ok-piece-stepper{display:grid;grid-template-columns:64px 1fr 64px;align-items:stretch;gap:10px}.ok-piece-stepper>button{min-height:64px;border:0;border-radius:16px;background:var(--forest,#1e4235);color:#fff;font-size:2rem;font-weight:800}.ok-piece-count{min-height:64px;border:1px solid var(--rule,#ddd6c8);border-radius:16px;background:#fff;display:flex;flex-direction:column;justify-content:center;align-items:center}.ok-piece-count strong{font-size:1.6rem;font-variant-numeric:tabular-nums}.ok-piece-count small{color:var(--muted,#5f6b62)}
      .ok-piece-unit-switch{align-self:center;border:0;background:transparent;color:var(--forest,#1e4235);font-weight:800;text-decoration:underline;text-underline-offset:3px;padding:8px}
      .ok-piece-grams-label{font-weight:800}.ok-piece-grams-input{margin-top:7px;display:grid;grid-template-columns:1fr auto;align-items:center;border:1px solid var(--rule,#ddd6c8);border-radius:15px;background:#fff;padding-right:14px}.ok-piece-grams-input input{min-height:60px;border:0;background:transparent;padding:12px 14px;font-size:1.35rem;font-variant-numeric:tabular-nums;width:100%}.ok-piece-quality{display:grid;grid-template-columns:1fr 1fr;gap:8px}.ok-piece-quality button{min-height:48px;border:1px solid var(--rule,#ddd6c8);border-radius:13px;background:#fff;font-weight:800}.ok-piece-quality button.is-active{border:2px solid var(--forest,#1e4235);background:var(--tint,#f1ede1)}
      .ok-piece-smart{margin:4px 0 12px;padding:11px 12px;border:1px solid var(--rule,#ddd6c8);border-radius:15px;background:#fff;display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.ok-piece-smart strong,.ok-piece-smart small{display:block}.ok-piece-smart small{margin-top:4px;color:var(--muted,#5f6b62);font-size:.76rem;line-height:1.35}.ok-piece-smart--prominent{border:2px solid var(--forest,#1e4235);background:var(--tint,#f1ede1)}.ok-piece-smart-use{min-height:44px;border:1px solid var(--forest,#1e4235);border-radius:12px;background:#fff;color:var(--forest,#1e4235);font-weight:850;padding:8px 10px}
      .ok-piece-confirm{width:100%;min-height:56px;border:0;border-radius:16px;background:var(--forest,#1e4235);color:#fff;font-weight:900;font-size:1rem}
      @media (max-width:380px){.ok-piece-sheet{padding-left:14px;padding-right:14px}.ok-piece-smart{grid-template-columns:1fr}.ok-piece-smart-use{width:100%}.ok-piece-metric strong{font-size:1.18rem;min-width:5ch}}
    `;
    document.head.appendChild(style);
  }

  function removeRoot(){
    if(typeof document!=='undefined')document.querySelector('[data-ok-piece-root]')?.remove();
  }

  function clearSession(reason='cancel',notify=true){
    const session=activeSession;
    activeSession=null;
    removeRoot();
    if(keyHandler&&typeof document!=='undefined')document.removeEventListener('keydown',keyHandler,true);
    keyHandler=null;
    if(notify&&session?.onClose)session.onClose(reason);
  }

  function render(){
    if(!activeSession||typeof document==='undefined')return;
    const p=presentationFor(activeSession.food,activeSession.draft,activeSession.state);
    const root=document.querySelector('[data-ok-piece-root]');
    if(root)root.innerHTML=markupFor(p);
  }

  function open({state={},food,meal='Other',smartResult=null,onConfirm=null,onClose=null}={}){
    if(!food||typeof document==='undefined')return false;
    clearSession('replaced',false);
    const draft=sheet.openDraft({state,food,meal,smartResult});
    if(!draft)return false;
    ensureStyles();
    const root=document.createElement('div');
    root.setAttribute('data-ok-piece-root','');
    document.body.appendChild(root);
    activeSession={state,food,meal,smartResult,draft,onConfirm,onClose};
    render();

    root.addEventListener('click',event=>{
      if(!activeSession)return;
      const target=event.target.closest('button,[data-piece-backdrop]');
      if(!target)return;
      if(target.hasAttribute('data-piece-backdrop')&&event.target===target){clearSession('backdrop');return;}
      if(target.hasAttribute('data-piece-close')){clearSession('close');return;}
      if(target.hasAttribute('data-piece-confirm')){
        const amount=sheet.finalAmount(activeSession.draft);
        if(!amount)return;
        const callback=activeSession.onConfirm;
        clearSession('confirm',false);
        if(callback)callback(amount);
        return;
      }
      if(target.hasAttribute('data-piece-step')){
        activeSession.draft=sheet.stepCount(activeSession.draft,activeSession.state,Number(target.getAttribute('data-piece-step'))||0);render();return;
      }
      if(target.hasAttribute('data-piece-size')){
        activeSession.draft=sheet.selectPieceKey(activeSession.draft,activeSession.state,target.getAttribute('data-piece-size'));render();return;
      }
      if(target.hasAttribute('data-piece-use-smart')){activeSession.draft=sheet.applySmartSuggestion(activeSession.draft,activeSession.state);render();return;}
      if(target.hasAttribute('data-piece-to-grams')){activeSession.draft=sheet.switchToGrams(activeSession.draft);render();return;}
      if(target.hasAttribute('data-piece-to-pieces')){activeSession.draft=sheet.switchToPieces(activeSession.draft,activeSession.state);render();return;}
      if(target.hasAttribute('data-piece-quality')){
        activeSession.draft=sheet.setGramValue(activeSession.draft,piece.effectiveGrams(activeSession.draft.amount),target.getAttribute('data-piece-quality'));render();
      }
    });

    root.addEventListener('input',event=>{
      if(!activeSession||!event.target.matches('[data-piece-grams]'))return;
      const quality=activeSession.draft.amount?.amountQuality==='weighed'?'weighed':'estimated';
      activeSession.draft=sheet.setGramValue(activeSession.draft,event.target.value,quality);
      render();
    });

    keyHandler=event=>{if(event.key==='Escape')clearSession('escape');};
    document.addEventListener('keydown',keyHandler,true);
    return true;
  }

  window.OkelloPieceSheet=Object.freeze({
    version:VERSION,
    open,
    close:()=>clearSession('api-close'),
    presentationFor,
    markupFor,
    piecePhrase,
    isOpen:()=>!!activeSession
  });
})();
