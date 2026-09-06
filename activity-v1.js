(() => {
  'use strict';

  const STORE = 'okello_activity_v1';
  const MAIN_STORE = 'okello_food_tracker_v3';
  const $ = id => document.getElementById(id);
  const qs = (s, r=document) => r.querySelector(s);
  const qsa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const round1 = n => Math.round((Number(n)||0)*10)/10;
  const clamp = (n,a,b) => Math.min(b,Math.max(a,n));
  const todayKey = () => new Date().toISOString().slice(0,10);
  const uid = p => (crypto.randomUUID ? `${p}_${crypto.randomUUID()}` : `${p}_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const esc = s => String(s ?? '').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

  const main = qs('main');
  const tabs = qs('.tabs');
  const todayPanel = $('tab-today');
  const settingsPanel = $('tab-settings');
  if (!main || !tabs || !todayPanel || !settingsPanel) return;

  const defaultData = {
    goals:{steps:5000,minutes:20},
    daily:{},
    entries:[],
    preferences:{useLatestWeight:true,fallbackWeightKg:158},
    version:1
  };

  function readActivity(){
    try{
      const raw = JSON.parse(localStorage.getItem(STORE)||'null');
      if(!raw) return structuredClone(defaultData);
      return {
        ...structuredClone(defaultData),
        ...raw,
        goals:{...defaultData.goals,...(raw.goals||{})},
        daily:raw.daily||{},
        entries:Array.isArray(raw.entries)?raw.entries:[],
        preferences:{...defaultData.preferences,...(raw.preferences||{})}
      };
    }catch(_){ return structuredClone(defaultData); }
  }
  function writeActivity(d){ try{localStorage.setItem(STORE,JSON.stringify(d));}catch(_){} }
  let data = readActivity();

  function readMain(){ try{return JSON.parse(localStorage.getItem(MAIN_STORE)||'{}')||{};}catch(_){return {};} }
  function latestWeightKg(){
    const m=readMain();
    const logs=Array.isArray(m.weightLogs)?m.weightLogs:[];
    if(data.preferences.useLatestWeight && logs.length){
      const sorted=[...logs].sort((a,b)=>String(a.date||'').localeCompare(String(b.date||'')));
      const last=sorted[sorted.length-1]||{};
      const v=Number(last.kg ?? last.weight ?? last.value ?? last.weightKg);
      if(v>30 && v<400) return v;
    }
    return Number(data.preferences.fallbackWeightKg)||158;
  }
  function toast(msg){
    const t=$('toast'); if(!t)return;
    t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t);
    toast.t=setTimeout(()=>t.classList.remove('show'),1900);
  }
  function dayRecord(date=todayKey()){
    if(!data.daily[date]) data.daily[date]={manualSteps:null};
    return data.daily[date];
  }
  function entriesFor(date=todayKey()){ return data.entries.filter(x=>x.date===date); }
  function dayTotals(date=todayKey()){
    const e=entriesFor(date);
    const manual=Number(data.daily?.[date]?.manualSteps);
    const summedSteps=e.reduce((s,x)=>s+(Number(x.steps)||0),0);
    return {
      steps:Number.isFinite(manual)&&manual>=0?manual:summedSteps,
      stepSource:Number.isFinite(manual)&&manual>=0?'manual':'estimated',
      minutes:e.reduce((s,x)=>s+(Number(x.minutes)||0),0),
      distance:e.reduce((s,x)=>s+(Number(x.distanceKm)||0),0),
      calories:e.reduce((s,x)=>s+(Number(x.activeCalories)||0),0)
    };
  }
  function metFor(type){
    return ({
      'Easy walk':2.8,
      'Walking':3.5,
      'Brisk walk':4.5,
      'Cycling, easy':4.0,
      'Cycling, moderate':6.0,
      'Strength training':3.5,
      'Stairs':6.0,
      'Swimming':6.0,
      'Housework':3.0,
      'Other activity':3.0
    })[type] || 3.0;
  }
  function activeCalories(type,minutes,weight=latestWeightKg()){
    const met=metFor(type);
    return Math.max(0,(met-1)*weight*(Number(minutes)||0)/60);
  }
  function metFromSpeed(kmh){
    if(!Number.isFinite(kmh)||kmh<=0) return 3.5;
    if(kmh<3.2) return 2.8;
    if(kmh<4.3) return 3.3;
    if(kmh<5.3) return 3.8;
    if(kmh<6.4) return 4.8;
    return 6.0;
  }
  function activeCaloriesFromWalk(minutes,distanceKm,weight=latestWeightKg()){
    const h=(Number(minutes)||0)/60;
    const speed=h>0?(Number(distanceKm)||0)/h:0;
    const met=metFromSpeed(speed);
    return Math.max(0,(met-1)*weight*h);
  }
  function fmtDate(iso){
    try{return new Intl.DateTimeFormat('en-GB',{weekday:'short',day:'numeric',month:'short'}).format(new Date(iso+'T12:00:00'));}
    catch(_){return iso;}
  }
  function hms(sec){
    sec=Math.max(0,Math.floor(sec||0));
    const h=Math.floor(sec/3600),m=Math.floor((sec%3600)/60),s=sec%60;
    return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;
  }
  function haversine(a,b){
    const R=6371, rad=x=>x*Math.PI/180;
    const dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon);
    const q=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;
    return 2*R*Math.asin(Math.sqrt(q));
  }

  const css=document.createElement('style');
  css.textContent=`
    .activity-hero{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:12px 0}
    .activity-stat{background:#fff;border:1px solid var(--rule);border-radius:16px;padding:13px;min-width:0}.activity-stat span{display:block;color:var(--muted);font-size:.75rem;font-weight:800;text-transform:uppercase;letter-spacing:.05em}.activity-stat strong{display:block;color:var(--forest);font-size:1.45rem;margin-top:4px}.activity-stat small{display:block;color:var(--muted);font-size:.72rem;margin-top:2px}
    .goal-track{height:8px;background:var(--tint);border-radius:99px;overflow:hidden;margin-top:8px}.goal-fill{height:100%;background:var(--forest);border-radius:99px;transition:width .25s ease}.goal-fill.gold{background:var(--gold)}
    .activity-grid{display:grid;grid-template-columns:1.1fr .9fr;gap:14px}.activity-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.activity-form-grid label{min-width:0}.activity-form-grid .wide{grid-column:1/-1}
    .live-walk{background:linear-gradient(145deg,var(--forest),#315e4b);color:#fff;border-radius:18px;padding:16px}.live-walk .eyebrow{color:rgba(255,255,255,.72)}.live-walk h3{color:#fff;margin:2px 0 10px}.walk-live-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:12px 0}.walk-live-grid div{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.14);border-radius:12px;padding:10px}.walk-live-grid span{display:block;font-size:.69rem;opacity:.76;text-transform:uppercase;font-weight:800}.walk-live-grid strong{display:block;font-size:1.15rem;margin-top:2px}.live-actions{display:flex;gap:8px}.live-actions button{flex:1}.walk-start{background:#fff!important;color:var(--forest)!important;border:0!important}.walk-stop{background:#b94a31!important;color:#fff!important;border:0!important}.walk-note{font-size:.76rem;opacity:.78;margin:9px 0 0}
    .activity-log{display:grid;gap:8px}.activity-entry{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid var(--rule)}.activity-entry:last-child{border-bottom:0}.activity-entry strong{display:block}.activity-entry small{display:block;color:var(--muted);margin-top:3px}.activity-entry button{border:0;background:transparent;color:#a6402d;font-weight:800;padding:7px}
    .steps-row{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:end}.steps-row button{min-height:46px}
    .week-move{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;height:155px;align-items:end;margin-top:12px}.move-day{height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px}.move-bar-wrap{width:100%;height:118px;background:var(--tint);border-radius:9px;display:flex;align-items:flex-end;overflow:hidden}.move-bar{width:100%;background:var(--forest);border-radius:9px 9px 0 0;min-height:2px}.move-day small{font-size:.66rem;color:var(--muted)}
    .activity-insight{padding:12px 13px;border-radius:14px;background:var(--tint);color:var(--ink);font-size:.88rem;line-height:1.45}.activity-insight strong{color:var(--forest)}
    .today-move-strip{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:center;margin:10px 0 14px;padding:12px 13px;background:#fff;border:1px solid var(--rule);border-radius:15px}.today-move-strip strong{color:var(--forest)}.today-move-strip small{display:block;color:var(--muted);margin-top:2px}.today-move-strip button{border:1px solid var(--rule);background:var(--tint);color:var(--forest);border-radius:11px;padding:9px 11px;font-weight:800}
    .activity-goals{display:grid;grid-template-columns:1fr 1fr;gap:10px}.activity-tip{font-size:.78rem;color:var(--muted);line-height:1.45;margin-top:10px}
    @media(max-width:700px){
      .tabs{grid-template-columns:repeat(6,1fr)!important}.tab{font-size:.64rem!important;padding-left:1px!important;padding-right:1px!important}
      .activity-hero{grid-template-columns:1fr 1fr}.activity-grid{grid-template-columns:1fr}.activity-form-grid{grid-template-columns:1fr 1fr}.walk-live-grid{grid-template-columns:repeat(3,1fr)}
    }
    @media(max-width:390px){.tab{font-size:.59rem!important}.activity-form-grid{grid-template-columns:1fr}.activity-form-grid .wide{grid-column:auto}.activity-goals{grid-template-columns:1fr}}
  `;
  document.head.appendChild(css);

  // Add Activity tab before Settings.
  let activityTab=qs('.tab[data-tab="activity"]');
  if(!activityTab){
    activityTab=document.createElement('button');
    activityTab.className='tab'; activityTab.dataset.tab='activity'; activityTab.type='button'; activityTab.textContent='Activity';
    const settingsTab=qs('.tab[data-tab="settings"]');
    tabs.insertBefore(activityTab,settingsTab||null);
  }

  let panel=$('tab-activity');
  if(!panel){
    panel=document.createElement('section'); panel.id='tab-activity'; panel.className='panel'; panel.setAttribute('aria-labelledby','activityTitle');
    panel.innerHTML=`
      <div class="section-heading top-gap"><div><p class="eyebrow">MOVEMENT</p><h2 id="activityTitle">Activity</h2></div></div>
      <p class="lede">Walking, steps and exercise for the day. Activity calories are shown separately and do not automatically increase your food allowance.</p>

      <div class="activity-hero">
        <article class="activity-stat"><span>Steps</span><strong id="actSteps">0</strong><small id="actStepsSub">of 5,000</small><div class="goal-track"><div id="actStepsBar" class="goal-fill"></div></div></article>
        <article class="activity-stat"><span>Active minutes</span><strong id="actMinutes">0</strong><small id="actMinutesSub">of 20 min</small><div class="goal-track"><div id="actMinutesBar" class="goal-fill gold"></div></div></article>
        <article class="activity-stat"><span>Distance</span><strong id="actDistance">0 km</strong><small>logged today</small></article>
        <article class="activity-stat"><span>Active kcal</span><strong id="actCalories">0</strong><small>estimate, not food credit</small></article>
      </div>

      <div id="activityInsight" class="activity-insight"></div>

      <div class="activity-grid top-gap">
        <section class="card">
          <p class="eyebrow">QUICK LOG</p><h3>Add activity</h3>
          <div class="activity-form-grid">
            <label>Activity<select id="activityType"><option>Walking</option><option>Easy walk</option><option>Brisk walk</option><option>Cycling, easy</option><option>Cycling, moderate</option><option>Strength training</option><option>Stairs</option><option>Swimming</option><option>Housework</option><option>Other activity</option></select></label>
            <label>Minutes<input id="activityMinutesInput" type="number" min="1" max="600" value="20" inputmode="numeric"></label>
            <label>Distance, km <span class="muted">optional</span><input id="activityDistanceInput" type="number" min="0" max="200" step="0.01" inputmode="decimal" placeholder="e.g. 1.4"></label>
            <label>Steps <span class="muted">optional</span><input id="activityStepsInput" type="number" min="0" max="100000" inputmode="numeric" placeholder="e.g. 2200"></label>
          </div>
          <div id="activityEstimate" class="calc-readout" style="margin-top:10px"></div>
          <button id="activityAddBtn" class="primary-btn" type="button">Add activity</button>
        </section>

        <section class="live-walk">
          <p class="eyebrow">LIVE WALK</p><h3>Track a walk</h3>
          <div class="walk-live-grid"><div><span>Time</span><strong id="walkTime">0:00</strong></div><div><span>Distance</span><strong id="walkDistance">0.00 km</strong></div><div><span>Pace</span><strong id="walkPace">—</strong></div></div>
          <div class="live-actions"><button id="walkStartBtn" class="secondary-btn walk-start" type="button">Start walk</button><button id="walkStopBtn" class="secondary-btn walk-stop" type="button" disabled>Stop & save</button></div>
          <p id="walkStatus" class="walk-note">Uses GPS while this app stays open. Route coordinates are not saved.</p>
        </section>
      </div>

      <section class="card top-gap">
        <p class="eyebrow">STEPS FROM YOUR PHONE</p><h3>Set today's step count</h3>
        <p class="muted">For the most accurate number on iPhone, copy today's steps from the Health app. This replaces any estimated step total for today.</p>
        <div class="steps-row"><label>Today's steps<input id="manualStepsInput" type="number" min="0" max="100000" inputmode="numeric" placeholder="e.g. 5280"></label><button id="saveStepsBtn" class="secondary-btn" type="button">Save steps</button></div>
      </section>

      <section class="card top-gap">
        <div class="section-heading"><div><p class="eyebrow">THIS WEEK</p><h3>Movement trend</h3></div><span id="activityStreak" class="pill"></span></div>
        <div id="activityWeek" class="week-move"></div>
        <p id="activityWeekSummary" class="tiny-note"></p>
      </section>

      <section class="card top-gap">
        <div class="section-heading"><div><p class="eyebrow">TODAY'S ACTIVITY</p><h3>Your movement log</h3></div></div>
        <div id="activityLog" class="activity-log empty-state">Nothing logged yet.</div>
      </section>

      <section class="card top-gap">
        <p class="eyebrow">GOALS & ESTIMATES</p><h3>Your movement targets</h3>
        <div class="activity-goals"><label>Step goal<input id="stepGoalInput" type="number" min="500" max="50000" step="500"></label><label>Active minute goal<input id="minuteGoalInput" type="number" min="5" max="300" step="5"></label></div>
        <div class="activity-goals" style="margin-top:10px"><label>Fallback weight, kg<input id="activityWeightInput" type="number" min="30" max="400" step="0.1" inputmode="decimal"></label><label style="display:flex;align-items:center;gap:8px;margin-top:26px"><input id="useLatestWeightInput" type="checkbox" style="width:auto"> Use latest weight entry</label></div>
        <button id="saveActivitySettingsBtn" class="secondary-btn" type="button" style="margin-top:10px">Save activity settings</button>
        <p class="activity-tip">Calories burned are rough estimates based on activity intensity, time and body weight. They are useful for trends, not precise enough to automatically “eat back”. A native commercial app could later connect directly to Apple Health or Google Health Connect.</p>
      </section>`;
    main.insertBefore(panel,settingsPanel);
  }

  function showActivity(){
    qsa('.panel').forEach(p=>p.classList.remove('active'));
    qsa('.tab').forEach(b=>b.classList.remove('active'));
    panel.classList.add('active'); activityTab.classList.add('active');
    renderAll(); window.scrollTo({top:0,behavior:'smooth'});
  }
  activityTab.addEventListener('click',showActivity);

  // Compact movement strip on Today.
  if(!$('todayMoveStrip')){
    const strip=document.createElement('div'); strip.id='todayMoveStrip'; strip.className='today-move-strip';
    strip.innerHTML=`<div><strong id="todayMoveMain">0 steps · 0 active min</strong><small id="todayMoveSub">Movement is tracked separately from your food target.</small></div><button id="todayMoveBtn" type="button">Activity</button>`;
    const progress=qs('.progress-wrap',todayPanel);
    if(progress) progress.insertAdjacentElement('afterend',strip); else todayPanel.prepend(strip);
    $('todayMoveBtn').addEventListener('click',showActivity);
  }

  // Existing tab clicks should hide Activity correctly even though it was injected later.
  qsa('.tab').filter(b=>b!==activityTab).forEach(b=>b.addEventListener('click',()=>{panel.classList.remove('active');activityTab.classList.remove('active');}));

  function estimatePreview(){
    const type=$('activityType')?.value||'Walking';
    const mins=Math.max(0,Number($('activityMinutesInput')?.value)||0);
    const kcal=activeCalories(type,mins);
    const weight=latestWeightKg();
    $('activityEstimate').textContent=mins?`About ${Math.round(kcal)} active kcal using ${round1(weight)} kg. This is an estimate.`:'Enter minutes to estimate activity calories.';
  }
  ['activityType','activityMinutesInput'].forEach(id=>$(id)?.addEventListener('input',estimatePreview));

  $('activityAddBtn')?.addEventListener('click',()=>{
    const type=$('activityType').value;
    const minutes=Math.max(0,Number($('activityMinutesInput').value)||0);
    if(!minutes){toast('Enter the activity minutes first.');return;}
    const distanceKm=Math.max(0,Number($('activityDistanceInput').value)||0);
    let steps=Math.max(0,Math.round(Number($('activityStepsInput').value)||0));
    if(!steps && distanceKm>0 && /walk/i.test(type)) steps=Math.round(distanceKm*1350);
    data.entries.push({id:uid('act'),date:todayKey(),type,minutes:round1(minutes),distanceKm:round1(distanceKm),steps,activeCalories:round1(activeCalories(type,minutes)),source:'manual',createdAt:new Date().toISOString()});
    writeActivity(data);
    $('activityDistanceInput').value=''; $('activityStepsInput').value='';
    toast('Activity added.'); renderAll();
  });

  $('saveStepsBtn')?.addEventListener('click',()=>{
    const v=Number($('manualStepsInput').value);
    if(!Number.isFinite(v)||v<0){toast('Enter today’s step count.');return;}
    dayRecord().manualSteps=Math.round(v); writeActivity(data); toast('Today’s steps saved.'); renderAll();
  });

  $('saveActivitySettingsBtn')?.addEventListener('click',()=>{
    const steps=Number($('stepGoalInput').value),mins=Number($('minuteGoalInput').value),w=Number($('activityWeightInput').value);
    if(steps>=500)data.goals.steps=Math.round(steps); if(mins>=5)data.goals.minutes=Math.round(mins); if(w>=30)data.preferences.fallbackWeightKg=round1(w);
    data.preferences.useLatestWeight=!!$('useLatestWeightInput').checked; writeActivity(data); toast('Activity settings saved.'); renderAll();
  });

  let walk={running:false,start:0,distance:0,last:null,watchId:null,timer:null,wakeLock:null};
  function renderWalk(){
    const sec=walk.running?(Date.now()-walk.start)/1000:0;
    $('walkTime').textContent=hms(sec);
    $('walkDistance').textContent=`${walk.distance.toFixed(2)} km`;
    const h=sec/3600, speed=h>0?walk.distance/h:0;
    $('walkPace').textContent=speed>0.3?`${speed.toFixed(1)} km/h`:'—';
  }
  async function startWalk(){
    if(walk.running)return;
    if(!navigator.geolocation){$('walkStatus').textContent='GPS is not available in this browser.';return;}
    walk={running:true,start:Date.now(),distance:0,last:null,watchId:null,timer:null,wakeLock:null};
    $('walkStartBtn').disabled=true; $('walkStopBtn').disabled=false; $('walkStatus').textContent='Starting GPS… keep the app open while walking.';
    try{ if(navigator.wakeLock?.request) walk.wakeLock=await navigator.wakeLock.request('screen'); }catch(_){}
    walk.timer=setInterval(renderWalk,1000);
    walk.watchId=navigator.geolocation.watchPosition(pos=>{
      const p={lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy||999,time:pos.timestamp||Date.now()};
      if(p.accuracy<=60){
        if(walk.last){
          const km=haversine(walk.last,p);
          const dt=Math.max(1,(p.time-walk.last.time)/1000);
          const speedKmh=km/(dt/3600);
          if(km<0.25 && speedKmh<12) walk.distance+=km;
        }
        walk.last=p; $('walkStatus').textContent=`GPS active · accuracy about ${Math.round(p.accuracy)} m. Route is not stored.`;
      } else $('walkStatus').textContent='GPS signal is weak. Waiting for a better location…';
      renderWalk();
    },err=>{
      $('walkStatus').textContent=err.code===1?'Location permission was denied. You can still log the walk manually.':'Could not get a reliable GPS signal. You can log the walk manually.';
    },{enableHighAccuracy:true,maximumAge:3000,timeout:12000});
  }
  async function stopWalk(save=true){
    if(!walk.running)return;
    const minutes=Math.max(0.1,(Date.now()-walk.start)/60000);
    if(walk.watchId!==null)navigator.geolocation.clearWatch(walk.watchId);
    if(walk.timer)clearInterval(walk.timer);
    try{await walk.wakeLock?.release();}catch(_){}
    const distance=walk.distance;
    walk.running=false; $('walkStartBtn').disabled=false; $('walkStopBtn').disabled=true;
    if(save){
      const steps=distance>0?Math.round(distance*1350):0;
      const kcal=activeCaloriesFromWalk(minutes,distance);
      data.entries.push({id:uid('walk'),date:todayKey(),type:'Walking',minutes:round1(minutes),distanceKm:round1(distance),steps,activeCalories:round1(kcal),source:'gps',createdAt:new Date().toISOString()});
      writeActivity(data);
      $('walkStatus').textContent=`Saved ${round1(minutes)} min${distance?` · ${round1(distance)} km`:''}.`;
      toast('Walk saved.'); renderAll();
    }
    walk={running:false,start:0,distance:0,last:null,watchId:null,timer:null,wakeLock:null}; renderWalk();
  }
  $('walkStartBtn')?.addEventListener('click',startWalk);
  $('walkStopBtn')?.addEventListener('click',()=>stopWalk(true));
  window.addEventListener('pagehide',()=>{ if(walk.running) stopWalk(false); });

  function renderLog(){
    const el=$('activityLog'); const rows=entriesFor().slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
    if(!rows.length){el.className='activity-log empty-state';el.textContent='Nothing logged yet.';return;}
    el.className='activity-log';
    el.innerHTML=rows.map(x=>`<div class="activity-entry"><div><strong>${esc(x.type)}</strong><small>${round1(x.minutes)} min${x.distanceKm?` · ${round1(x.distanceKm)} km`:''}${x.steps?` · ${Math.round(x.steps).toLocaleString()} steps`:''} · ~${Math.round(x.activeCalories||0)} active kcal${x.source==='gps'?' · GPS':''}</small></div><button type="button" data-del-act="${esc(x.id)}">Delete</button></div>`).join('');
    qsa('[data-del-act]',el).forEach(b=>b.addEventListener('click',()=>{data.entries=data.entries.filter(x=>x.id!==b.dataset.delAct);writeActivity(data);renderAll();toast('Activity removed.');}));
  }
  function lastNDates(n){const out=[];const d=new Date();d.setHours(12,0,0,0);for(let i=n-1;i>=0;i--){const x=new Date(d);x.setDate(d.getDate()-i);out.push(x.toISOString().slice(0,10));}return out;}
  function renderWeek(){
    const dates=lastNDates(7),vals=dates.map(d=>dayTotals(d));
    const max=Math.max(data.goals.minutes,...vals.map(v=>v.minutes),1);
    $('activityWeek').innerHTML=dates.map((d,i)=>`<div class="move-day"><div class="move-bar-wrap"><div class="move-bar" style="height:${clamp(vals[i].minutes/max*100,2,100)}%" title="${round1(vals[i].minutes)} active minutes"></div></div><small>${new Intl.DateTimeFormat('en-GB',{weekday:'narrow'}).format(new Date(d+'T12:00:00'))}</small></div>`).join('');
    const totalMin=vals.reduce((s,v)=>s+v.minutes,0),totalKm=vals.reduce((s,v)=>s+v.distance,0),totalSteps=vals.reduce((s,v)=>s+v.steps,0);
    $('activityWeekSummary').textContent=`Last 7 days: ${Math.round(totalSteps).toLocaleString()} steps · ${Math.round(totalMin)} active min · ${round1(totalKm)} km logged.`;
    let streak=0;for(let i=vals.length-1;i>=0;i--){if(vals[i].minutes>=data.goals.minutes)streak++;else break;}
    $('activityStreak').textContent=streak?`${streak} day streak`:'Build your streak';
  }
  function renderInsight(t){
    const bits=[];
    if(t.minutes>=data.goals.minutes) bits.push(`<strong>Active-minute goal reached.</strong>`); else bits.push(`<strong>${Math.max(0,Math.round(data.goals.minutes-t.minutes))} active minutes</strong> to your daily movement goal.`);
    if(t.steps>=data.goals.steps) bits.push('Your step goal is also reached.'); else bits.push(`${Math.max(0,Math.round(data.goals.steps-t.steps)).toLocaleString()} steps remain to your step goal.`);
    if(t.calories>0) bits.push(`Estimated active burn is about ${Math.round(t.calories)} kcal, but the food target stays unchanged.`);
    $('activityInsight').innerHTML=bits.join(' ');
  }
  function renderAll(){
    data=readActivity();
    const t=dayTotals();
    $('actSteps').textContent=Math.round(t.steps).toLocaleString(); $('actStepsSub').textContent=`of ${data.goals.steps.toLocaleString()}${t.stepSource==='manual'?' · phone total':''}`; $('actStepsBar').style.width=`${clamp(t.steps/data.goals.steps*100,0,100)}%`;
    $('actMinutes').textContent=Math.round(t.minutes); $('actMinutesSub').textContent=`of ${data.goals.minutes} min`; $('actMinutesBar').style.width=`${clamp(t.minutes/data.goals.minutes*100,0,100)}%`;
    $('actDistance').textContent=`${round1(t.distance)} km`; $('actCalories').textContent=Math.round(t.calories).toLocaleString();
    $('manualStepsInput').value=t.stepSource==='manual'?Math.round(t.steps):'';
    $('stepGoalInput').value=data.goals.steps; $('minuteGoalInput').value=data.goals.minutes; $('activityWeightInput').value=data.preferences.fallbackWeightKg; $('useLatestWeightInput').checked=!!data.preferences.useLatestWeight;
    $('todayMoveMain').textContent=`${Math.round(t.steps).toLocaleString()} steps · ${Math.round(t.minutes)} active min`;
    $('todayMoveSub').textContent=t.calories?`~${Math.round(t.calories)} active kcal · food target unchanged`:'Movement is tracked separately from your food target.';
    renderInsight(t);renderLog();renderWeek();estimatePreview();
  }

  renderAll();
})();