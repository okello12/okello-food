const VERSION='46';
const CACHE='okello-food-v46';
const SCANNER_LIB='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
const ASSETS=[
  './',
  './index.html',
  './privacy.html',
  './beta-terms.html',
  './third-party-notices.html',
  './styles.css?v=46',
  './bootstrap-v14.js?v=46',
  './storage-migration-v1.js?v=46',
  './state-repository-v46.js?v=46',
  './count-unit-migration-v46.js?v=46',
  './ghana-foods.js?v=46',
  './world-foods.js?v=46',
  './smart-support.js?v=46',
  './catalog-storage-v46.js?v=46',
  './meal-data-contract-v1.js?v=46',
  './food-data-layer-v2.js?v=46',
  './amount-quality-v3.js?v=46',
  './product-data-v2.js?v=46',
  './category-rules-v1.js?v=46',
  './app.js?v=46',
  './meal-catalog-facade-v1.js?v=46',
  './food-intelligence-v1.js?v=46',
  './personal-food-memory-v1.js?v=46',
  './piece-entry-v41.js?v=46',
  './piece-usual-v41.js?v=46',
  './smart-portion-output-v41.js?v=46',
  './piece-sheet-contract-v41.js?v=46',
  './piece-sheet-v41.js?v=46',
  './scanner.js?v=46',
  './ux-v2.js?v=46',
  './scanner-launch-v1.js?v=46',
  './shopping-v1.js?v=46',
  './personal-shelf-v1.js?v=46',
  './world-library-v1.js?v=46',
  './template-engine-v41.js?v=46',
  './features-v1.js?v=46',
  './template-runtime-v41.js?v=46',
  './quick-add-piece-v41.js?v=46',
  './catalog-ui-v41.js?v=46',
  './day-forecast-v1.js?v=46',
  './smart-meal-fit-v41.js?v=46',
  './smart-meal-guard-v42.js?v=46',
  './speech-guard-v46.js?v=46',
  './smart-v3.js?v=46',
  './smart-meal-runtime-v41.js?v=46',
  './search-intelligence-v1.js?v=46',
  './recipe-assistant-v1.js?v=46',
  './activity-v1.js?v=46',
  './activity-safety-v46.js?v=46',
  './beta-feedback-v43.js?v=46',
  './beta-metrics-v46.js?v=46',
  './backup-v3.js?v=46',
  './update-v1.js?v=46',
  './app-chrome-v1.js?v=46',
  './ios-exit-v1.js?v=46',
  './interaction-v1.js?v=46',
  './first-run-v44.js?v=46',
  './target-safety-v46.js?v=46',
  './countable-servings-v46.js?v=46',
  './nutrition-integrity-v46.js?v=46',
  './evidence-review-v46.js?v=46',
  './build-my-meal-v46.js?v=46',
  './meal-text-preprocessor-v46.js?v=46',
  './trust-v46.js?v=46',
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