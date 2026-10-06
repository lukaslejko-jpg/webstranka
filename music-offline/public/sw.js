// TEST03 HIT: retire legacy PWA worker. Do not cache or intercept navigation.
self.addEventListener("install", event => { self.skipWaiting(); });
self.addEventListener("activate", event => { event.waitUntil((async()=>{ const keys=await caches.keys(); await Promise.all(keys.filter(k=>k.startsWith("music-offline-shell-")).map(k=>caches.delete(k))); await self.registration.unregister(); const clients=await self.clients.matchAll({type:"window"}); for(const client of clients) client.navigate(client.url); })()); });
self.addEventListener("fetch", () => {});
