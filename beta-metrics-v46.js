(() => {
  'use strict';

  const VERSION=1;
  const STORE='okello_beta_metrics_v1';
  const MAIN_STORE='okello_food_tracker_v3';
  const SESSION_KEY='okello_beta_session_started_v1';
  const MAX=1200;
  const $=id=>document.getElementById(id);
  const now=()=>new Date().toISOString();
  const sessionStart=(()=>{const existing=Number(sessionStorage.getItem(SESSION_KEY));if(existing>0)return existing;const value=Date.now();try{sessionStorage.setItem(SESSION_KEY,String(value));}catch(_){}return value;})();
  let firstMealThisSession=false;

  function read(){try{const value=JSON.parse(localStorage.getItem(STORE)||'[]');return Array.isArray(value)?value:[];}catch(_){return [];}}
  function write(rows){const safe=(Array.isArray(rows)?rows:[]).slice(-MAX);try{localStorage.setItem(STORE,JSON.stringify(safe));}catch(_){}return safe;}
  function record(type,detail={}){
    const row={at:now(),type:String(type),appVersion:document.documentElement.dataset.okelloVersion||null,...detail};
    const rows=read();rows.push(row);write(rows);return row;
  }
  function state(){try{return JSON.parse(localStorage.getItem(MAIN_STORE)||'{}')||{};}catch(_){return {};}}
  function summary(){
    const rows=read();const s=state();const days=Object.entries(s.logs||{}).filter(([,entries])=>Array.isArray(entries)&&entries.length).map(([day])=>day);
    const firstMeal=rows.find(x=>x.type==='first-meal-in-session');
    return {events:rows.length,loggedDays:new Set(days).size,sessions:rows.filter(x=>x.type==='session').length,firstMealMs:firstMeal?.milliseconds??null,buildMyMealCommits:rows.filter(x=>x.type==='meal-logged'&&x.source==='build-my-meal-v46').length,countableCommits:rows.filter(x=>x.type==='meal-logged'&&/countable-serving/.test(String(x.source||''))).length,feedbackIssues:rows.filter(x=>x.type==='feedback-issue').length};
  }
  function csv(){const rows=read();const cols=['at','type','appVersion','source','entries','milliseconds','surface'];return [cols.join(','),...rows.map(row=>cols.map(k=>JSON.stringify(row[k]??'')).join(','))].join('\n');}
  function download(text,name,type){const blob=new Blob([text],{type});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
  function toast(message){const node=$('toast');if(!node)return;node.textContent=message;node.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('show'),1800);}

  record('session',{standalone:window.matchMedia?.('(display-mode: standalone)')?.matches||window.navigator.standalone===true});
  window.addEventListener('okello:food-log-changed',event=>{
    const detail=event.detail||{};
    if(!firstMealThisSession){firstMealThisSession=true;record('first-meal-in-session',{milliseconds:Math.max(0,Date.now()-sessionStart),source:detail.source||null,entries:Number(detail.entries)||null});}
    record('meal-logged',{source:detail.source||null,entries:Number(detail.entries)||null});
    render();
  });
  window.addEventListener('okello:beta-feedback-added',event=>{const d=event.detail||{};record(d.verdict==='issue'?'feedback-issue':'feedback-right',{surface:d.surface||null});render();});

  function render(){
    const settings=$('tab-settings');if(!settings)return;
    let card=$('v46BetaMetricsCard');
    if(!card){
      card=document.createElement('section');card.id='v46BetaMetricsCard';card.className='card';
      card.innerHTML='<p class="eyebrow">BETA EVIDENCE</p><h3>Local adoption metrics</h3><p class="muted">These metrics stay on this device. They record event types and timing, not food names, weights or diary contents. Export them when running a structured beta.</p><div id="v46BetaMetricsSummary" class="tiny-note"></div><div class="button-row" style="margin-top:10px"><button id="v46MetricsJson" class="secondary-btn" type="button">Export metrics JSON</button><button id="v46MetricsCsv" class="secondary-btn" type="button">Export metrics CSV</button></div><button id="v46MetricsClear" class="text-btn danger" type="button" style="margin-top:8px">Clear local beta metrics</button>';
      const feedback=$('betaFeedbackCard');if(feedback)feedback.insertAdjacentElement('afterend',card);else settings.appendChild(card);
      $('v46MetricsJson').addEventListener('click',()=>{download(JSON.stringify({format:'okello-beta-metrics-v1',version:VERSION,exportedAt:now(),summary:summary(),events:read()},null,2),`okello-beta-metrics-${new Date().toISOString().slice(0,10)}.json`,'application/json');toast('Beta metrics export created');});
      $('v46MetricsCsv').addEventListener('click',()=>{download(csv(),`okello-beta-metrics-${new Date().toISOString().slice(0,10)}.csv`,'text/csv;charset=utf-8');toast('Beta metrics CSV created');});
      $('v46MetricsClear').addEventListener('click',()=>{if(!window.confirm('Clear local beta metrics from this device?'))return;write([]);render();});
    }
    const s=summary();const node=$('v46BetaMetricsSummary');if(node)node.textContent=`${s.loggedDays} logged day${s.loggedDays===1?'':'s'} · ${s.sessions} recorded session${s.sessions===1?'':'s'} · Build My Meal ${s.buildMyMealCommits} · count-unit logs ${s.countableCommits}${s.firstMealMs!=null?` · first measured meal ${(s.firstMealMs/1000).toFixed(0)} s`:''}.`;
  }
  render();setTimeout(render,700);

  window.OkelloBetaMetricsV46=Object.freeze({version:VERSION,storeKey:STORE,read,record,summary,csv,clear:()=>write([])});
})();