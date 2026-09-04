(()=>{
'use strict';
const BACKUP='https://raw.githubusercontent.com/lukaslejko-jpg/webstranka/tesla-waze-preview-v1-backup-20260904-nav/tesla-waze-preview/app.js.gz.b64';
const L=window.L;
if(!L||!window.pako){console.error('TM-Y viewport bootstrap: Leaflet/pako unavailable');return;}

let map=null, car=null, lastPos=null, heading=null, lastCameraAt=0, lastBearingAt=0, lastAppliedHeading=null;

const origMap=L.map;
L.map=function(...args){
  map=origMap.apply(this,args);
  window.__teslaWazeTmYMap=map;
  return map;
};
Object.assign(L.map,origMap);

const origMarker=L.marker;
L.marker=function(latlng,opts){
  const marker=origMarker.call(this,latlng,opts);
  try{
    if(opts?.icon?.options?.className==='car-wrap'){
      car=marker;
      window.__teslaWazeTmYCar=marker;
    }
  }catch{}
  return marker;
};
Object.assign(L.marker,origMarker);

const rad=d=>d*Math.PI/180;
const deg=r=>r*180/Math.PI;
const normHeading=h=>Number.isFinite(h)?((h%360)+360)%360:null;
function distance(a,b){
  if(!a||!b)return Infinity;
  const p1=rad(a.lat),p2=rad(b.lat),dlat=p2-p1,dlng=rad(b.lng-a.lng);
  return 12742000*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(p1)*Math.cos(p2)*Math.sin(dlng/2)**2));
}
function bearing(a,b){
  const p1=rad(a.lat),p2=rad(b.lat),dl=rad(b.lng-a.lng);
  return normHeading(deg(Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))))??0;
}
function smooth(prev,next,alpha=.35){
  const n=normHeading(next),p=normHeading(prev);
  if(n==null)return p;
  if(p==null)return n;
  const d=((n-p+540)%360)-180;
  return normHeading(p+d*Math.min(1,Math.max(0,alpha)));
}
function destinationPoint(p,meters,head){
  if(!p||!Number.isFinite(meters)||!Number.isFinite(head)||meters===0)return p;
  const a=meters/6371000,b=rad(head),lat1=rad(p.lat),lon1=rad(p.lng);
  const lat2=Math.asin(Math.sin(lat1)*Math.cos(a)+Math.cos(lat1)*Math.sin(a)*Math.cos(b));
  const lon2=lon1+Math.atan2(Math.sin(b)*Math.sin(a)*Math.cos(lat1),Math.cos(a)-Math.sin(lat1)*Math.sin(lat2));
  return {lat:deg(lat2),lng:deg(lon2)};
}
function flattenLatLngs(x,out=[]){
  if(!x)return out;
  if(Array.isArray(x)){for(const y of x)flattenLatLngs(y,out);return out;}
  if(Number.isFinite(x.lat)&&Number.isFinite(x.lng))out.push({lat:x.lat,lng:x.lng});
  return out;
}
function activeRoute(){
  if(!map)return [];
  let best=null;
  map.eachLayer(layer=>{
    try{
      if(!(layer instanceof L.Polyline) || layer instanceof L.Polygon)return;
      const weight=Number(layer.options?.weight)||0;
      const color=String(layer.options?.color||'').toLowerCase();
      if(weight<7 && color!=='#14b8e6')return;
      const pts=flattenLatLngs(layer.getLatLngs?.());
      if(pts.length<2)return;
      const score=(color==='#14b8e6'?100:0)+weight;
      if(!best||score>best.score)best={score,pts};
    }catch{}
  });
  return best?.pts||[];
}
function nearest(p,coords,start=0){
  if(!p||coords.length<2)return null;
  let best=null;
  const scaleX=111320*Math.cos(rad(p.lat)),scaleY=111320;
  const lo=Math.max(0,start-20),hi=Math.min(coords.length-2,start+600);
  for(let i=lo;i<=hi;i++){
    const a=coords[i],b=coords[i+1];
    const ax=(a.lng-p.lng)*scaleX, ay=(a.lat-p.lat)*scaleY;
    const bx=(b.lng-p.lng)*scaleX, by=(b.lat-p.lat)*scaleY;
    const dx=bx-ax,dy=by-ay,den=dx*dx+dy*dy;
    const t=den?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/den)):0;
    const d=Math.hypot(ax+t*dx,ay+t*dy);
    if(!best||d<best.distance)best={index:i,t,distance:d,point:{lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t}};
  }
  return best;
}
function pointAhead(coords,n,meters){
  if(!n||coords.length<2)return n?.point||null;
  let left=Math.max(0,meters),start=n.point;
  for(let i=n.index;i<coords.length-1;i++){
    const end=coords[i+1],d=distance(start,end);
    if(d>=left&&d>0){
      const t=left/d;
      return {lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t};
    }
    left-=d;start=end;
  }
  return coords.at(-1)||n.point;
}
function navActive(){
  const app=document.getElementById('app');
  const routeBtn=document.getElementById('routeModeBtn');
  return !!(app?.classList.contains('navcompact') || (routeBtn && !routeBtn.classList.contains('hidden')));
}
function maneuverInfo(){
  const box=document.getElementById('routeBox');
  if(!box)return {distance:Infinity,ramp:false};
  const title=(box.querySelector('b')?.textContent||'').toLowerCase();
  const text=box.textContent||'';
  const m=text.match(/man[eé]ver\s+o\s+([\d.,]+)\s*(km|m)\b/i);
  let d=Infinity;
  if(m){
    const v=Number(m[1].replace(/\s/g,'').replace(',','.'));
    if(Number.isFinite(v))d=v*(m[2].toLowerCase()==='km'?1000:1);
  }
  return {distance:d,ramp:/z[ií]ďte z diaľnice|ramp|exit/.test(title)};
}
function zoomFor(distanceMeters,ramp){
  const d=Number.isFinite(distanceMeters)?distanceMeters:Infinity;
  if(ramp){
    if(d<=250)return 18.8;
    if(d<=600)return 18.2;
    if(d<=1200)return 17.5;
    if(d<=2500)return 16.8;
    return 16.2;
  }
  if(d<=250)return 19;
  if(d<=700)return 18.4;
  if(d<=2000)return 17.4;
  return 16.5;
}
function control(g){
  try{
    if(!map||!navActive())return;
    const p={lat:Number(g.coords.latitude),lng:Number(g.coords.longitude)};
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;
    const accuracy=Number.isFinite(Number(g.coords.accuracy))?Number(g.coords.accuracy):null;
    if(accuracy!=null&&accuracy>150)return;

    const moved=lastPos?distance(lastPos,p):0;
    const raw=Number.isFinite(Number(g.coords.heading))?Number(g.coords.heading):null;
    const derived=lastPos&&moved>=4?bearing(lastPos,p):raw;
    if(derived!=null)heading=smooth(heading,derived,.35);
    lastPos=p;

    const route=activeRoute();
    if(route.length<2)return;
    const n=nearest(p,route,0);
    if(!n)return;

    if(heading==null){
      const ahead=pointAhead(route,n,30);
      if(ahead)heading=smooth(heading,bearing(n.point,ahead),.28);
    }
    const h=normHeading(heading);
    if(h==null)return;

    const snapLimit=Math.max(35,1.5*Math.min(accuracy!=null&&accuracy>=0?accuracy:0,30));
    const markerPosition=n.distance<=snapLimit?n.point:p;

    if(car){
      car.setLatLng(markerPosition);
      if(typeof car.setRotationAngle==='function')car.setRotationAngle(0);
      if(typeof car.setZIndexOffset==='function')car.setZindexOffset(1000);
    }

    const info=maneuverInfo();
    let focus=markerPosition;
    if(info.ramp&&Number.isFinite(info.distance)&&info.distance<=4000){
      focus=pointAhead(route,n,Math.min(.42*info.distance,900))||markerPosition;
    }
    const center=destinationPoint(focus,65,h);
    const zoom=zoomFor(info.distance,info.ramp);
    const now=Date.now();

    const delta=lastAppliedHeading==null?180:Math.abs(((h-lastAppliedHeading+540)%360)-180);
    if(delta>=3.5&&now-lastBearingAt>=500){
      if(typeof map.setBearing==='function')map.setBearing(h);
      lastAppliedHeading=h;
      lastBearingAt=now;
    }

    if(now-lastCameraAt>=500){
      lastCameraAt=now;
      const currentZoom=Number(map.getZoom?.()??zoom);
      if(Math.abs(currentZoom-zoom)>=.65)map.setView(center,zoom,{animate:false});
      else map.panTo(center,{animate:false,noMoveStart:true});
    }
  }catch(e){console.warn('TM-Y viewport controller',e);}
}

const geo=navigator.geolocation;
if(geo){
  try{
    const ow=geo.watchPosition.bind(geo), og=geo.getCurrentPosition.bind(geo);
    geo.watchPosition=(ok,err,opt)=>ow(g=>{try{ok(g)}finally{queueMicrotask(()=>control(g));}},err,opt);
    geo.getCurrentPosition=(ok,err,opt)=>og(g=>{try{ok(g)}finally{queueMicrotask(()=>control(g));}},err,opt);
  }catch(e){console.warn('TM-Y viewport geolocation hook failed',e);}
}

async function loadOriginal(){
  const txt=await fetch(BACKUP+'?v='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('backup app '+r.status);return r.text()});
  const bytes=Uint8Array.from(atob(txt.trim()),c=>c.charCodeAt(0));
  const code=new TextDecoder().decode(pako.ungzip(bytes));
  await new Promise((resolve,reject)=>{
    const blob=new Blob([code],{type:'text/javascript'}),url=URL.createObjectURL(blob),s=document.createElement('script');
    s.src=url;
    s.onload=()=>{URL.revokeObjectURL(url);resolve()};
    s.onerror=e=>{URL.revokeObjectURL(url);reject(e)};
    document.body.appendChild(s);
  });
}
loadOriginal().catch(e=>{
  console.error('TM-Y viewport bootstrap failed',e);
  const n=document.getElementById('gpsNotice')?.querySelector('span');
  if(n)n.textContent='Navigačný modul sa nepodarilo načítať.';
});
})();