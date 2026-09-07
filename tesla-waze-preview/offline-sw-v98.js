/* TESLA_WAZE_OFFLINE_TILE_CACHE_V98 */
'use strict';

const CACHE_NAME='tesla-waze-tiles-v98';
const CACHE_PREFIX='tesla-waze-tiles-';
const MAX_TILE_ENTRIES=1800;
const TILE_HOSTS=new Set([
  'www.waze.com',
  'server.arcgisonline.com',
  'services.arcgisonline.com'
]);
let offlineHint=false;
let writesSincePrune=0;

self.addEventListener('install',event=>{
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(name=>name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME).map(name=>caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type==='TESLA_NETWORK_STATE')offlineHint=data.online===false;
});

function isTileRequest(request){
  if(!request||request.method!=='GET')return false;
  try{
    const url=new URL(request.url);
    if(!TILE_HOSTS.has(url.hostname))return false;
    if(url.hostname==='www.waze.com')return url.pathname.includes('/row-tiles/live/base/');
    return url.pathname.includes('/MapServer/tile/');
  }catch{return false}
}

async function pruneCache(cache){
  const keys=await cache.keys();
  if(keys.length<=MAX_TILE_ENTRIES)return;
  const remove=keys.slice(0,keys.length-MAX_TILE_ENTRIES);
  await Promise.all(remove.map(key=>cache.delete(key)));
}

function saveTile(cache,request,response,event){
  if(!response||!(response.ok||response.type==='opaque'))return;
  const task=(async()=>{
    try{
      await cache.put(request,response.clone());
      writesSincePrune++;
      if(writesSincePrune>=64){writesSincePrune=0;await pruneCache(cache)}
    }catch{}
  })();
  event.waitUntil(task);
}

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(!isTileRequest(request))return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE_NAME);
    if(offlineHint){
      const cached=await cache.match(request);
      if(cached)return cached;
    }
    try{
      const response=await fetch(request);
      saveTile(cache,request,response,event);
      return response;
    }catch(error){
      const cached=await cache.match(request);
      if(cached)return cached;
      throw error;
    }
  })());
});
