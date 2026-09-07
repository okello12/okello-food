const VERSION='43';
const CACHE='okello-food-v43';
const SCANNER_LIB='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=43',
  './bootstrap-v14.js?v=43',
  './storage-migration-v1.js?v=43',
  './ghana-foods.js?v=43',
  './world-foods.js?v=43',
  './smart-support.js?v=43',
  './meal-data-contract-v1.js?v=43',
  './food-data-layer-v1.js?v=43',
  './amount-quality-v2.js?v=43',
  './product-data-v1.js?v=43',
  './category-rules-v1.js?v=43',
  './app.js?v=43',
  './meal-catalog-facade-v1.js?v=43',
  './food-intelligence-v1.js?v=43',
  './personal-food-memory-v1.js?v=43',
  './piece-entry-v41.js?v=43',
  './piece-usual-v41.js?v=43',
  './smart-portion-output-v41.js?v=43',
  './piece-sheet-contract-v41.js?v=43',
  './piece-sheet-v41.js?v=43',
  './scanner.js?v=43',
  './ux-v2.js?v=43',
  './scanner-launch-v1.js?v=43',
  './shopping-v1.js?v=43',
  './personal-shelf-v1.js?v=43',
  './world-library-v1.js?v=43',
  './template-engine-v41.js?v=43',
  './features-v1.js?v=43',
  './template-runtime-v41.js?v=43',
  './quick-add-piece-v41.js?v=43',
  './catalog-ui-v41.js?v=43',
  './day-forecast-v1.js?v=43',
  './smart-meal-fit-v41.js?v=43',
  './smart-meal-guard-v42.js?v=43',
  './smart-v3.js?v=43',
  './smart-meal-runtime-v41.js?v=43',
  './search-intelligence-v1.js?v=43',
  './recipe-assistant-v1.js?v=43',
  './activity-v1.js?v=43',
  './beta-feedback-v43.js?v=43',
  './backup-v2.js?v=43',
  './update-v1.js?v=43',
  './app-chrome-v1.js?v=43',
  './ios-exit-v1.js?v=43',
  './interaction-v1.js?v=43',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install',e=>e.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  await cache.addAll(ASSETS);
  try{
    await cache.add(new Request(SCANNER_LIB,{mode:'cors'}));
  }catch(err){
    console.warn('Scanner dependency pre-cache failed; it can retry online later.',err);
  }
  await self.skipWaiting();
})()));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('message',e=>{
  if(!e.data) return;
  if(e.data.type==='SKIP_WAITING') self.skipWaiting();
  if(e.data.type==='GET_VERSION' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({version:VERSION});
  }
});

async function networkFirst(request, fallback){
  const cache=await caches.open(CACHE);
  try{
    const fresh=await fetch(request,{cache:'no-store'});
    if(fresh && fresh.ok) cache.put(request,fresh.clone());
    return fresh;
  }catch(_){
    return (await cache.match(request)) || (fallback ? await cache.match(fallback) : Response.error());
  }
}

async function cacheFirstScannerDependency(request){
  const cache=await caches.open(CACHE);
  const cached=await cache.match(SCANNER_LIB);
  if(cached) return cached;
  try{
    const fresh=await fetch(request);
    if(fresh && (fresh.ok || fresh.type==='opaque')) await cache.put(SCANNER_LIB,fresh.clone());
    return fresh;
  }catch(_){
    return Response.error();
  }
}

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);

  if(url.href===SCANNER_LIB){
    e.respondWith(cacheFirstScannerDependency(e.request));
    return;
  }
  if(url.origin!==self.location.origin) return;

  const isNavigation=e.request.mode==='navigate';
  const isCode=/\.(?:js|css)$/.test(url.pathname);

  if(isNavigation){
    e.respondWith(networkFirst(e.request,'./index.html'));
    return;
  }
  if(isCode){
    e.respondWith(networkFirst(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }))
  );
});