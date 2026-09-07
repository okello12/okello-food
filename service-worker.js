const VERSION='41';
const CACHE='okello-food-v41';
const SCANNER_LIB='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=41',
  './bootstrap-v14.js?v=41',
  './storage-migration-v1.js?v=41',
  './ghana-foods.js?v=41',
  './world-foods.js?v=41',
  './smart-support.js?v=41',
  './meal-data-contract-v1.js?v=41',
  './food-data-layer-v1.js?v=41',
  './amount-quality-v2.js?v=41',
  './product-data-v1.js?v=41',
  './category-rules-v1.js?v=41',
  './app.js?v=41',
  './meal-catalog-facade-v1.js?v=41',
  './food-intelligence-v1.js?v=41',
  './personal-food-memory-v1.js?v=41',
  './piece-entry-v41.js?v=41',
  './piece-usual-v41.js?v=41',
  './smart-portion-output-v41.js?v=41',
  './piece-sheet-contract-v41.js?v=41',
  './piece-sheet-v41.js?v=41',
  './scanner.js?v=41',
  './ux-v2.js?v=41',
  './scanner-launch-v1.js?v=41',
  './shopping-v1.js?v=41',
  './personal-shelf-v1.js?v=41',
  './world-library-v1.js?v=41',
  './template-engine-v41.js?v=41',
  './features-v1.js?v=41',
  './template-runtime-v41.js?v=41',
  './quick-add-piece-v41.js?v=41',
  './catalog-ui-v41.js?v=41',
  './day-forecast-v1.js?v=41',
  './smart-v3.js?v=41',
  './search-intelligence-v1.js?v=41',
  './recipe-assistant-v1.js?v=41',
  './activity-v1.js?v=41',
  './backup-v2.js?v=41',
  './update-v1.js?v=41',
  './app-chrome-v1.js?v=41',
  './ios-exit-v1.js?v=41',
  './interaction-v1.js?v=41',
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