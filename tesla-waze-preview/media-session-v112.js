(()=>{
'use strict';

/* SEARCH_DIRECT_OSM_FALLBACK_V145
   Address search must not depend on Supabase egress. Intercept only /api/search;
   all GPS, routing, map and music requests keep their existing paths. */
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
        if(!rows.length&&/\d+\/\d+/.test(q))rows=await run(q.replace(/(\d+)\/(\d+)/g,'$1 $2'));
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
