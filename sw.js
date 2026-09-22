const CACHE='territorio-runtime-v3';

self.addEventListener('install',event=>{
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);

  if(url.hostname.includes('tile.openstreetmap.org')){
    event.respondWith(caches.open(CACHE).then(async cache=>{
      const cached=await cache.match(event.request);
      const network=fetch(event.request).then(response=>{
        if(response.ok)cache.put(event.request,response.clone());
        return response;
      }).catch(()=>cached);
      return cached||network;
    }));
    return;
  }

  if(url.origin===self.location.origin){
    event.respondWith(caches.open(CACHE).then(async cache=>{
      try{
        const response=await fetch(event.request,{cache:'no-store'});
        if(response.ok)cache.put(event.request,response.clone());
        return response;
      }catch{
        return (await cache.match(event.request))||(await cache.match('/login/'))||Response.error();
      }
    }));
  }
});
