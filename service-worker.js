const VERSION='48';
const CACHE='okello-food-v48';
const SCANNER_LIB='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
const ASSETS=[
  './index.html',
  './app-v48.html',
  './privacy.html',
  './beta-terms.html',
  './third-party-notices.html',
  './styles.css?v=48',
  './bootstrap-v14.js?v=48',
  './storage-migration-v1.js?v=48',
  './state-repository-v46.js?v=48',
  './count-unit-migration-v46.js?v=48',
  './ghana-foods.js?v=48',
  './world-foods.js?v=48',
  './smart-support.js?v=48',
  './catalog-storage-v46.js?v=48',
  './meal-data-contract-v1.js?v=48',
  './food-data-layer-v2.js?v=48',
  './amount-quality-v3.js?v=48',
  './product-data-v2.js?v=48',
  './category-rules-v1.js?v=48',
  './app.js?v=48',
  './target-safety-v46.js?v=48',
  './meal-catalog-facade-v1.js?v=48',
  './food-intelligence-v1.js?v=48',
  './personal-food-memory-v1.js?v=48',
  './piece-entry-v41.js?v=48',
  './piece-usual-v41.js?v=48',
  './smart-portion-output-v41.js?v=48',
  './piece-sheet-contract-v41.js?v=48',
  './piece-sheet-v41.js?v=48',
  './scanner.js?v=48',
  './ux-v2.js?v=48',
  './scanner-launch-v1.js?v=48',
  './shopping-v1.js?v=48',
  './personal-shelf-v1.js?v=48',
  './world-library-v1.js?v=48',
  './template-engine-v41.js?v=48',
  './features-v1.js?v=48',
  './template-runtime-v41.js?v=48',
  './quick-add-piece-v41.js?v=48',
  './catalog-ui-v41.js?v=48',
  './day-forecast-v1.js?v=48',
  './smart-meal-fit-v41.js?v=48',
  './smart-meal-guard-v42.js?v=48',
  './speech-guard-v46.js?v=48',
  './smart-v3.js?v=48',
  './smart-meal-runtime-v41.js?v=48',
  './search-intelligence-v1.js?v=48',
  './recipe-assistant-v1.js?v=48',
  './activity-v1.js?v=48',
  './activity-safety-v46.js?v=48',
  './beta-feedback-v43.js?v=48',
  './beta-metrics-v46.js?v=48',
  './backup-v3.js?v=48',
  './update-v1.js?v=48',
  './app-chrome-v1.js?v=48',
  './ios-exit-v1.js?v=48',
  './interaction-v1.js?v=48',
  './first-run-v44.js?v=48',
  './countable-servings-v46.js?v=48',
  './nutrition-integrity-v46.js?v=48',
  './evidence-review-v46.js?v=48',
  './build-my-meal-v46.js?v=48',
  './meal-text-preprocessor-v46.js?v=48',
  './global-first-v47.js?v=48',
  './trust-v46.js?v=48',
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
    e.respondWith(networkFirst(e.request,'./app-v48.html'));
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