'use strict';
// Real browser engines, synthetic diary and two isolated origins. Not a physical-device/user test.
const {chromium,webkit}=require('playwright');
const assert=require('node:assert/strict'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
function serve(){return new Promise(resolve=>{const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');const rel=url.pathname==='/'?'index.html':url.pathname.slice(1);const full=path.resolve(root,rel);
 if(!full.startsWith(root+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);return res.end();}
 const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webmanifest':'application/manifest+json'};
 res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','Cache-Control':'no-store'});fs.createReadStream(full).pipe(res);
 });server.listen(0,'127.0.0.1',()=>resolve({server,url:'http://127.0.0.1:'+server.address().port}));});}
const day='2026-11-20', key='okello_food_tracker_v3';
async function ready(page,url){await page.goto(url,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.documentElement.dataset.okelloVersion&&window.OkelloBackup&&window.OkelloStateRepository,{},{timeout:90000});}
async function test(engine,from,to){
 const browser=await engine.launch();
 try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},timezoneId:'Europe/London'});
 // Prevent deliberate testing from sending information to a third-party host.
 await ctx.route('**/*',route=>{const u=new URL(route.request().url());return u.hostname==='127.0.0.1'?route.continue():route.abort();});
 const p=await ctx.newPage();await ready(p,from);
 const src=await p.evaluate(({day,key})=>{
  const r=window.OkelloStateRepository.mutate(s=>{
   s.logs={...(s.logs||{}),[day]:[{foodId:'banku',name:'Banku',grams:225,kcal:326.25,protein:4.95,fibre:2.25,salt:null,amountQuality:'weighed',meal:'Dinner',ts:new Date(day+'T18:00:00Z').getTime()}]};
   s.customFoods=[...(s.customFoods||[]),{id:'test_food',name:'Synthetic custom food',cat:'Custom',kcal:100,protein:3,fibre:2,salt:null,portion:100}];
   return s;
  },{source:'cross-origin-synthetic-test'});if(!r.ok)throw Error('fixture not written');
  localStorage.setItem('okello_food_favourites_v1',JSON.stringify(['banku']));
  return window.OkelloBackup.bundle();
 },{day,key});
 const q=await ctx.newPage();await ready(q,to);
 assert.equal(await q.evaluate(day=>Boolean(window.OkelloStateRepository.read().logs?.[day]),day),false,'origins not isolated');
 const before=await q.evaluate(()=>window.OkelloBackup.bundle());
 await q.evaluate(b=>{const r=window.OkelloBackup.restore(b);if(!r.ok)throw Error('restore failed');},src);
 await q.reload({waitUntil:'domcontentloaded'});await q.waitForFunction(()=>document.documentElement.dataset.okelloVersion&&window.OkelloBackup,{},{timeout:90000});
 const after=await q.evaluate(()=>window.OkelloBackup.bundle());
 assert.deepEqual(after.state.logs[day],src.state.logs[day],'history and provenance changed');
 assert.deepEqual(after.state.customFoods.find(x=>x.id==='test_food'),src.state.customFoods.find(x=>x.id==='test_food'));
 assert.deepEqual(after.favourites,src.favourites);assert.deepEqual(after.state.targets,src.state.targets);
 const invalid=await q.evaluate(()=>{try{window.OkelloBackup.restore({format:'okello-backup-v3',version:3,state:{},favourites:42});return false;}catch(e){return e.code==='backup-invalid';}});
 assert.equal(invalid,true);
 const unchanged=await q.evaluate(()=>window.OkelloBackup.bundle());assert.deepEqual(unchanged.state.logs,after.state.logs);
 const opt=await q.evaluate(()=>({enabled:window.OkelloBetaMetricsV46.enabled(),before:window.OkelloBetaMetricsV46.read().length,record:window.OkelloBetaMetricsV46.record('synthetic')}));
 assert.equal(opt.enabled,false);assert.equal(opt.record,null);
 const choice=await q.evaluate(()=>{const m=window.OkelloBetaMetricsV46;m.setEnabled(true);m.record('synthetic');const yes=m.enabled(),n=m.read().length;m.setEnabled(false);m.record('synthetic');return {yes,n,after:m.read().length,enabled:m.enabled()};});
 assert.equal(choice.yes,true);assert.equal(choice.enabled,false);assert.equal(choice.n,choice.after);
 console.log(engine.name()+': cross-origin backup, reload, invalid import, opt-in/withdrawal PASS');
 }finally{await browser.close();}
}
(async()=>{const a=await serve(),b=await serve();try{for(const engine of [chromium,webkit])await test(engine,a.url,b.url);}finally{a.server.close();b.server.close();}})().catch(err=>{console.error(err);process.exitCode=1;});
