(()=>{
'use strict';
/* MAP_FORWARD_PREFETCH_V159
   Passive anti-flicker prefetch. Does not change Leaflet map state, zoom, bearing,
   GPS, route geometry or routing. It only warms browser HTTP image cache ahead
   of the current GPS heading at current and adjacent zoom levels. */
try{
  const warmed=new Map();
  const MAX=1400;
  const remember=url=>{
    if(!url||warmed.has(url))return false;
    warmed.set(url,Date.now());
    if(warmed.size>MAX){const first=warmed.keys().next().value;if(first)warmed.delete(first)}
    const img=new Image();img.decoding='async';img.referrerPolicy='no-referrer-when-downgrade';img.src=url;
    return true;
  };
  const tileXY=(lat,lng,z)=>{
    const n=2**z,x=Math.floor((lng+180)/360*n),r=lat*Math.PI/180,y=Math.floor((1-Math.asinh(Math.tan(r))/Math.PI)/2*n);
    return {x:Math.max(0,Math.min(n-1,x)),y:Math.max(0,Math.min(n-1,y))};
  };
  const dest=(lat,lng,meters,heading)=>{
    const R=6371000,a=meters/R,b=heading*Math.PI/180,p1=lat*Math.PI/180,l1=lng*Math.PI/180;
    const p2=Math.asin(Math.sin(p1)*Math.cos(a)+Math.cos(p1)*Math.sin(a)*Math.cos(b));
    const l2=l1+Math.atan2(Math.sin(b)*Math.sin(a)*Math.cos(p1),Math.cos(a)-Math.sin(p1)*Math.sin(p2));
    return {lat:p2*180/Math.PI,lng:l2*180/Math.PI};
  };
  const visibleTemplate=()=>{
    const img=[...document.querySelectorAll('img.leaflet-tile[src]')].find(i=>i.complete&&i.naturalWidth>0&&/waze\.com\/row-tiles\/live\/base\//.test(i.currentSrc||i.src));
    if(!img)return null;
    const u=new URL(img.currentSrc||img.src),m=u.pathname.match(/\/row-tiles\/live\/base\/(\d+)\/(\d+)\/(\d+)\/tile\.png$/);
    if(!m)return null;
    return {origin:u.origin,z:+m[1]};
  };
  let last=null,lastHeading=null,lastSpeed=0,lastAt=0;
  try{
    navigator.geolocation.watchPosition(g=>{
      const lat=Number(g.coords.latitude),lng=Number(g.coords.longitude),h=Number(g.coords.heading),s=Number(g.coords.speed);
      if(Number.isFinite(lat)&&Number.isFinite(lng))last={lat,lng};
      if(Number.isFinite(h))lastHeading=h;
      if(Number.isFinite(s))lastSpeed=Math.max(0,s);
      lastAt=Date.now();
    },()=>{},{enableHighAccuracy:false,maximumAge:4000,timeout:10000});
  }catch{}
  const run=()=>{
    if(document.hidden||!last||Date.now()-lastAt>15000||!Number.isFinite(lastHeading))return;
    const t=visibleTemplate();if(!t)return;
    const kmh=lastSpeed*3.6,distances=kmh>90?[600,1200,2200]:kmh>45?[400,800,1500]:[250,500,900];
    let budget=18;
    for(const meters of distances){
      const p=dest(last.lat,last.lng,meters,lastHeading);
      for(const z of [Math.max(1,t.z-1),t.z,Math.min(20,t.z+1)]){
        const {x,y}=tileXY(p.lat,p.lng,z),n=2**z;
        for(const [dx,dy] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){
          if(budget<=0)break;
          const xx=Math.max(0,Math.min(n-1,x+dx)),yy=Math.max(0,Math.min(n-1,y+dy));
          if(remember(`${t.origin}/row-tiles/live/base/${z}/${xx}/${yy}/tile.png`))budget--;
        }
      }
      if(budget<=0)break;
    }
  };
  setInterval(run,1600);setTimeout(run,1800);
}catch(e){console.warn('Forward map tile prefetch unavailable:',e?.message||e)}
})();
