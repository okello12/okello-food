(() => {
  'use strict';

  const VERSION=1;
  const PROTECTED=Object.freeze([
    'rice and peas','mac and cheese','fish and chips','peanut butter and jelly','bread and butter'
  ]);

  function preprocess(value){
    let text=String(value||'');
    const tokens=[];
    PROTECTED.forEach((phrase,index)=>{
      const re=new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
      text=text.replace(re,match=>{const token=`__OKELLO_AND_${index}__`;tokens[index]=match;return token;});
    });

    // Tiny seasoning additions are not useful as independent components unless
    // the user supplied an amount. Remove common unmeasured trailing seasoning
    // phrases instead of turning them into false food matches.
    text=text.replace(/(?:,?\s*(?:with\s+)?(?:a\s+)?dash\s+of\s+)(?:salt|black\s+pepper|pepper|cayenne)(?:[\s,]*(?:and\s+)?(?:salt|black\s+pepper|pepper|cayenne))*/gi,' ');
    text=text.replace(/\s+and\s+(?=[a-z])/gi,', ');
    tokens.forEach((phrase,index)=>{text=text.replaceAll(`__OKELLO_AND_${index}__`,phrase);});
    return text.replace(/\s*,\s*,+/g,', ').replace(/^\s*,|,\s*$/g,'').trim();
  }

  function prepareInput(){
    const input=document.getElementById('bmmInput');
    if(!input)return;
    const next=preprocess(input.value);
    if(next!==input.value)input.value=next;
  }

  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#bmmUnderstand'))prepareInput();
  },true);
  document.addEventListener('keydown',event=>{
    if(event.target?.id==='bmmInput'&&(event.metaKey||event.ctrlKey)&&event.key==='Enter')prepareInput();
  },true);

  window.OkelloMealTextPreprocessorV46=Object.freeze({version:VERSION,protectedPhrases:PROTECTED,preprocess});
})();