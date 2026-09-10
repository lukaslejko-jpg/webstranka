(()=>{
'use strict';

/* SEARCH_DIRECT_OSM_FALLBACK_V146
   Address search must not depend on Supabase egress. Intercept only /api/search;
   all GPS, routing, map and music requests keep their existing paths.
   Slovak cadastral/orientation address forms such as 2547/41 are normalized only
   when the exact query returns no result. */
try{
  const previousFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    try{
      const raw=typeof input==='string'?input:(input&&input.url)||'';
      const u=new URL(raw,location.href);
      if(u.origin===location.origin&&u.pathname==='/api/search'){
        const q=(u.searchParams.get('q')||'').trim();
        if(q.length<2)return new Response(JSON.stringify({source:'osm-direct',results:[]}),{status:200,headers:{'content-type':'application/json; charset=utf-8'}});
        const lat=Number(u.searchParams.get('lat')),lng=Number(u.searchParams.get('lng'));
        const run=async(query)=>{
          const n=new URL('https://nominatim.openstreetmap.org/search');
          n.searchParams.set('q',query);
          n.searchParams.set('format','jsonv2');
          n.searchParams.set('addressdetails','1');
          n.searchParams.set('limit','10');
          n.searchParams.set('countrycodes','sk,cz,hu,pl,at');
          n.searchParams.set('accept-language','sk');
          if(Number.isFinite(lat)&&Number.isFinite(lng)){
            n.searchParams.set('viewbox',`${lng-1.6},${lat+1.2},${lng+1.6},${lat-1.2}`);
            n.searchParams.set('bounded','0');
          }
          const nr=await previousFetch(n.toString(),{cache:'no-store'});
          if(!nr.ok)throw new Error('nominatim '+nr.status);
          const rows=await nr.json();
          return Array.isArray(rows)?rows:[];
        };
        let rows=await run(q);
        if(!rows.length){
          const m=q.match(/^(.*?)(\d+)\s*\/\s*(\d+)(.*)$/);
          if(m){
            const prefix=m[1],supisne=m[2],orientacne=m[3],suffix=m[4]||'';
            const variants=[
              `${prefix}${orientacne}${suffix}`.trim(),
              `${prefix}${supisne}${suffix}`.trim(),
              `${prefix}${supisne} ${orientacne}${suffix}`.trim()
            ].filter((v,i,a)=>v&&v!==q&&a.indexOf(v)===i);
            for(const variant of variants){
              const alt=await run(variant);
              if(alt.length){rows=alt;break}
            }
          }
        }
        const results=rows.map((x,i)=>{
          const la=Number(x.lat),ln=Number(x.lon),ad=x.address||{};
          const house=String(ad.house_number||'').trim();
          const road=String(ad.road||ad.pedestrian||ad.residential||'').trim();
          const settlement=String(ad.village||ad.town||ad.city||ad.municipality||'').trim();
          let name=String(x.name||x.display_name?.split(',')[0]||q).trim();
          if(/^\d+[A-Za-zÀ-ž\/-]*$/.test(name)&&road)name=`${road} ${house||name}`.trim();
          else if(/^\d+[A-Za-zÀ-ž\/-]*$/.test(name)&&settlement)name=`${settlement} ${name}`;
          const searchLabel=name||q;
          return {id:String(x.place_id??i),name:searchLabel,searchLabel,address:String(x.display_name||''),location:{lat:la,lng:ln},lat:la,lng:ln,type:String(x.type||x.addresstype||''),source:'osm-direct'};
        }).filter(x=>Number.isFinite(x.location.lat)&&Number.isFinite(x.location.lng));
        return new Response(JSON.stringify({source:'osm-direct',results}),{status:200,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
      }
    }catch(e){
      console.warn('Direct address search failed:',e?.message||e);
      if((typeof input==='string'&&input.startsWith('/api/search'))||(input&&input.url&&new URL(input.url,location.href).pathname==='/api/search')){
        return new Response(JSON.stringify({source:'osm-direct',results:[],error:String(e?.message||e)}),{status:502,headers:{'content-type':'application/json; charset=utf-8'}});
      }
    }
    return previousFetch(input,init);
  };
}catch(e){console.warn('Search fallback init failed:',e?.message||e)}

/* MAP_TILE_PREFETCH_V155
   Passive only: never changes Leaflet state, zoom, bearing, GPS or route.
   It warms the browser image cache for nearby tiles and the next zoom level. */
try{
  const warmed=new Set();
  const warm=url=>{
    if(!url||warmed.has(url)||warmed.size>900)return false;
    warmed.add(url);
    const img=new Image();
    img.decoding='async';
    img.referrerPolicy='no-referrer-when-downgrade';
    img.src=url;
    return true;
  };
  const candidates=src=>{
    const out=[];
    try{
      const u=new URL(src,location.href);
      let m=u.pathname.match(/\/row-tiles\/live\/base\/(\d+)\/(\d+)\/(\d+)\/tile\.png$/);
      if(m){
        const z=+m[1],x=+m[2],y=+m[3],base=`${u.origin}/row-tiles/live/base`;
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]])out.push(`${base}/${z}/${x+dx}/${y+dy}/tile.png`);
        if(z<20){const zz=z+1,xx=x*2,yy=y*2;out.push(`${base}/${zz}/${xx}/${yy}/tile.png`,`${base}/${zz}/${xx+1}/${yy}/tile.png`,`${base}/${zz}/${xx}/${yy+1}/tile.png`,`${base}/${zz}/${xx+1}/${yy+1}/tile.png`)}
        if(z>1)out.push(`${base}/${z-1}/${Math.floor(x/2)}/${Math.floor(y/2)}/tile.png`);
        return out;
      }
      m=u.pathname.match(/^(.*\/MapServer\/tile)\/(\d+)\/(\d+)\/(\d+)$/);
      if(m){
        const base=u.origin+m[1],z=+m[2],y=+m[3],x=+m[4];
        for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])out.push(`${base}/${z}/${y+dy}/${x+dx}`);
        if(z<20){const zz=z+1,xx=x*2,yy=y*2;out.push(`${base}/${zz}/${yy}/${xx}`,`${base}/${zz}/${yy}/${xx+1}`,`${base}/${zz}/${yy+1}/${xx}`,`${base}/${zz}/${yy+1}/${xx+1}`)}
      }
    }catch{}
    return out;
  };
  const prefetch=()=>{
    if(document.hidden)return;
    const tiles=[...document.querySelectorAll('img.leaflet-tile[src]')].filter(img=>img.complete&&img.naturalWidth>0);
    let budget=14;
    for(const tile of tiles){
      if(budget<=0)break;
      for(const url of candidates(tile.currentSrc||tile.src)){
        if(budget<=0)break;
        if(warm(url))budget--;
      }
    }
  };
  setInterval(prefetch,1800);
  setTimeout(prefetch,1200);
}catch(e){console.warn('Map tile prefetch unavailable:',e?.message||e)}

/* REROUTE_ROUTE_HOLD_V158
   During a route refresh keep the existing active blue route visible.
   The normal drawRoutes() call replaces it only after the new Waze route succeeds. */
try{
  let routeRefreshes=0;
  const previousFetch=window.fetch.bind(window);
  window.fetch=async(input,init)=>{
    const raw=typeof input==='string'?input:(input&&input.url)||'';
    let isRoute=false;
    try{const u=new URL(raw,location.href);isRoute=u.hostname==='europrojekty-app.vercel.app'&&u.pathname==='/api/tesla/route'}catch{}
    if(!isRoute)return previousFetch(input,init);
    routeRefreshes++;
    try{return await previousFetch(input,init)}finally{routeRefreshes=Math.max(0,routeRefreshes-1)}
  };
  const install=()=>{
    const L=window.L;
    if(!L?.Polyline?.prototype||L.Polyline.prototype.__teslaRouteHoldV158)return false;
    const proto=L.Polyline.prototype,original=proto.setLatLngs;
    proto.setLatLngs=function(latlngs){
      const empty=Array.isArray(latlngs)&&latlngs.length===0;
      const activeBlue=String(this?.options?.color||'').toLowerCase()==='#14b8e6';
      if(routeRefreshes>0&&empty&&activeBlue)return this;
      return original.call(this,latlngs);
    };
    proto.__teslaRouteHoldV158=true;
    return true;
  };
  if(!install()){const t=setInterval(()=>{if(install())clearInterval(t)},250);setTimeout(()=>clearInterval(t),10000)}
}catch(e){console.warn('Reroute route hold unavailable:',e?.message||e)}

if(!('mediaSession' in navigator)||typeof MediaMetadata==='undefined')return;
let lastKey='';
const parseClock=s=>{const p=String(s||'').trim().split(':').map(Number);if(p.some(n=>!Number.isFinite(n)))return 0;return p.reduce((a,n)=>a*60+n,0)};
function readNow(){
  const root=document.getElementById('musicPlayer'),now=root?.querySelector('.music-now');
  if(!root||!now)return null;
  const title=now.querySelector('.music-title')?.textContent?.trim()||'';
  const sub=now.querySelector('.music-sub')?.textContent?.trim()||'';
  if(!title)return null;
  const parts=sub.split(' · '),artist=(parts[0]||'').trim(),album=(parts.slice(1).join(' · ')||'Tesla Waze').trim();
  const artwork=now.querySelector('.music-art')?.currentSrc||now.querySelector('.music-art')?.src||'';
  const toggle=root.querySelector('[data-ma="toggle"]')?.textContent?.trim().toLowerCase()||'';
  const duration=parseClock(document.getElementById('musicMiniTotal')?.textContent),position=parseClock(document.getElementById('musicMiniNow')?.textContent);
  return {title,artist,album,artwork,playing:toggle==='pauza',duration,position};
}
function sync(){
  try{
    const m=readNow();if(!m)return;
    const key=[m.title,m.artist,m.album,m.artwork].join('|');
    if(key!==lastKey){
      lastKey=key;
      navigator.mediaSession.metadata=new MediaMetadata({title:m.title,artist:m.artist,album:m.album,artwork:m.artwork?[{src:m.artwork}]:[]});
    }
    try{navigator.mediaSession.playbackState=m.playing?'playing':'paused'}catch{}
    if(typeof navigator.mediaSession.setPositionState==='function'&&m.duration>0){
      try{navigator.mediaSession.setPositionState({duration:m.duration,position:Math.min(Math.max(0,m.position),m.duration),playbackRate:1})}catch{}
    }
  }catch{}
}
const player=document.getElementById('musicPlayer');
if(player)new MutationObserver(sync).observe(player,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['src','class']});
setInterval(sync,1500);
document.addEventListener('visibilitychange',sync);
sync();
})();