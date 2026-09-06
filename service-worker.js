const VERSION='29';
const CACHE='okello-food-v29';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=29',
  './bootstrap-v14.js?v=29',
  './storage-migration-v1.js?v=29',
  './ghana-foods.js?v=29',
  './world-foods.js?v=29',
  './food-data-layer-v1.js?v=29',
  './amount-quality-v2.js?v=29',
  './app.js?v=29',
  './food-intelligence-v1.js?v=29',
  './personal-food-memory-v1.js?v=29',
  './scanner.js?v=29',
  './ux-v2.js?v=29',
  './world-library-v1.js?v=29',
  './features-v1.js?v=29',
  './day-forecast-v1.js?v=29',
  './smart-support.js?v=29',
  './smart-v3.js?v=29',
  './search-intelligence-v1.js?v=29',
  './recipe-assistant-v1.js?v=29',
  './activity-v1.js?v=29',
  './backup-v2.js?v=29',
  './update-v1.js?v=29',
  './app-chrome-v1.js?v=29',
  './ios-exit-v1.js?v=29',
  './manifest.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png'
];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

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

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);
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