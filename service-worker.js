const CACHE='okello-food-v5';
const ASSETS=['./','./index.html','./styles.css','./app.js','./ghana-foods.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];

self.addEventListener('install',e=>e.waitUntil(
  caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())
));

self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))
    .then(()=>self.clients.claim())
));

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const url=new URL(e.request.url);

  // Load the expandable Ghanaian-food catalogue before the main app executes.
  // This lets us grow the library without disturbing users' saved logs.
  if(url.pathname.endsWith('/app.js')){
    e.respondWith((async()=>{
      try{
        const cache=await caches.open(CACHE);
        let main=await cache.match('./app.js');
        let extras=await cache.match('./ghana-foods.js');
        if(!main) main=await fetch(e.request);
        const mainText=await main.text();
        const extraText=extras ? await extras.text() : '';
        return new Response(extraText+'\n'+mainText,{
          status:200,
          headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-cache'}
        });
      }catch(err){
        return fetch(e.request);
      }
    })());
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached=>cached||fetch(e.request).then(r=>{
      const copy=r.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copy));
      return r;
    }).catch(()=>caches.match('./index.html')))
  );
});
