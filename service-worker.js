const VERSION='26';
const CACHE='okello-food-v26';
const ASSETS=[
  './',
  './index.html',
  './styles.css?v=26',
  './bootstrap-v14.js?v=26',
  './ghana-foods.js?v=26',
  './world-foods.js?v=26',
  './food-data-layer-v1.js?v=26',
  './amount-quality-v1.js?v=26',
  './app.js?v=26',
  './food-intelligence-v1.js?v=26',
  './personal-food-memory-v1.js?v=26',
  './scanner.js?v=26',
  './ux-v2.js?v=26',
  './world-library-v1.js?v=26',
  './features-v1.js?v=26',
  './day-forecast-v1.js?v=26',
  './smart-support.js?v=26',
  './smart-v3.js?v=26',
  './search-intelligence-v1.js?v=26',
  './recipe-assistant-v1.js?v=26',
  './activity-v1.js?v=26',
  './backup-v2.js?v=26',
  './update-v1.js?v=26',
  './app-chrome-v1.js?v=26',
  './ios-exit-v1.js?v=26',
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