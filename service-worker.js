const CACHE='okello-food-v10';
const ASSETS=['./','./index.html','./styles.css','./app.js','./ghana-foods.js','./scanner.js','./ux-v2.js','./features-v1.js','./smart-support.js','./smart-v2.js','./manifest.webmanifest','./assets/icon-192.png','./assets/icon-512.png'];

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

  if(url.pathname.endsWith('/app.js')){
    e.respondWith((async()=>{
      try{
        const cache=await caches.open(CACHE);
        let main=await cache.match('./app.js');
        let foods=await cache.match('./ghana-foods.js');
        let scanner=await cache.match('./scanner.js');
        let ux=await cache.match('./ux-v2.js');
        let features=await cache.match('./features-v1.js');
        let support=await cache.match('./smart-support.js');
        let smart=await cache.match('./smart-v2.js');
        if(!main) main=await fetch(e.request);
        const mainText=await main.text();
        const foodText=foods ? await foods.text() : '';
        const scannerText=scanner ? await scanner.text() : '';
        const uxText=ux ? await ux.text() : '';
        const featureText=features ? await features.text() : '';
        const supportText=support ? await support.text() : '';
        const smartText=smart ? await smart.text() : '';
        return new Response(foodText+'\n'+mainText+'\n'+scannerText+'\n'+uxText+'\n'+featureText+'\n'+supportText+'\n'+smartText,{
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