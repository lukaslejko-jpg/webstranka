// TEST03 HIT: retire legacy Music Offline PWA worker and its shell caches.
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("music-offline-shell-")).map(k=>caches.delete(k)));await self.registration.unregister();const cs=await self.clients.matchAll({type:"window"});for(const c of cs)c.navigate(c.url);})()));
self.addEventListener("fetch",()=>{});
