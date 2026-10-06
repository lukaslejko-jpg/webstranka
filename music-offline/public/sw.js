// TEST03 MULTI offline shell
const VERSION = "20261004-02";
const CACHE_PREFIX = "music-offline-test03-shell-";
const CACHE = CACHE_PREFIX + VERSION + "-1";
const SHELL = [
  "./index.html", "./app.js", "./store.js", "./meta.js", "./i18n.js", "./offline.js", "./locales/sk.js", "./locales/en.js", "./locales/es.js", "./locales/pt-BR.js", "./locales/fr.js", "./locales/de.js", "./locales/zh-Hans.js", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-512-maskable.png"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k => (k.startsWith(CACHE_PREFIX)||k.startsWith("music-offline-shell-")) && k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const req=event.request;
  if(req.method!=="GET") return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;
  if(req.mode==="navigate"){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req);
        if(fresh && fresh.ok){const cache=await caches.open(CACHE);cache.put("./index.html",fresh.clone());}
        return fresh;
      }catch{
        return (await caches.match("./index.html")) || (await caches.match("./index.html",{ignoreSearch:true}));
      }
    })());
    return;
  }
  event.respondWith(fetch(req).catch(()=>caches.match(req,{ignoreSearch:true})));
});
