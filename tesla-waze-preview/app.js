(()=>{
'use strict';
/* MOBILE_NATIVE_GPS_V12 */
(function restoreNativeGeolocationForDirectBrowser(){
  try{
    if(window.top!==window.self)return;
    const own=Object.getOwnPropertyDescriptor(navigator,'geolocation');
    if(own&&own.configurable)delete navigator.geolocation;
  }catch(e){console.warn('Native mobile geolocation restore failed:',e?.message||e)}
})();
const $=id=>document.getElementById(id), LS={fav:'teslaWaze:favorites:v1',recent:'teslaWaze:recent:v1',routing:'teslaWaze:routing:v1',voice:'teslaWaze:voice:v1',voiceMode:'teslaWaze:voiceMode:v1',voiceVolume:'teslaWaze:voiceVolume:v1',mapType:'teslaWaze:mapType:v1',device:'teslaWaze:pairedDevice:v1',mobilePair:'teslaWaze:mobilePair:v1',alerts:'teslaWaze:alerts:v1',chargeFilter:'teslaWaze:chargeFilter:v1',music:'teslaWaze:musicProfile:v2',queue:'teslaWaze:musicQueue:v2',learnedRoutes:'teslaWaze:learnedRoutes:v1'};
const load=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??d}catch{return d}}, save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const dist=(a,b)=>{const r=Math.PI/180,dlat=(b.lat-a.lat)*r,dlng=(b.lng-a.lng)*r;return 12742000*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2))};
const fmtD=m=>m<1000?`${Math.max(0,Math.round(m/10)*10)} m`:`${(m/1000).toLocaleString('sk-SK',{maximumFractionDigits:1})} km`;
const fmtSpeechD=m=>{const meters=Math.max(0,Math.round(Number(m)||0));if(meters<1000){const n=meters<20?meters:Math.max(0,Math.round(meters/10)*10);return n===1?'jeden meter':n>=2&&n<=4?`${n} metre`:`${n} metrov`}const km=Math.round(meters/100)/10;if(Number.isInteger(km))return km===1?'jeden kilometer':km>=2&&km<=4?`${km} kilometre`:`${km} kilometrov`;return `${String(km).replace('.',',')} kilometra`};
const fmtT=s=>s<3600?`${Math.max(1,Math.round(s/60))} min`:`${Math.floor(s/3600)} h ${Math.round((s%3600)/60)} min`;
const norm=s=>(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
function bearing(a,b){const p1=a.lat*Math.PI/180,p2=b.lat*Math.PI/180,dl=(b.lng-a.lng)*Math.PI/180;return (Math.atan2(Math.sin(dl)*Math.cos(p2),Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dl))*180/Math.PI+360)%360}
function smoothHeading(prev,next,alpha=.35){if(prev==null)return next;let d=((next-prev+540)%360)-180;return (prev+d*alpha+360)%360}
function instruction(step){const op=String(step?.opcode||'').toUpperCase(), street=step?.street?` na ${step.street}`:'';if(op.includes('RAMP_RIGHT')||op.includes('EXIT_RIGHT'))return `Zíďte z diaľnice vpravo${street}.`;if(op.includes('RAMP_LEFT')||op.includes('EXIT_LEFT'))return `Zíďte z diaľnice vľavo${street}.`;if(op.includes('TURN_RIGHT'))return `Odbočte doprava${street}.`;if(op.includes('TURN_LEFT'))return `Odbočte doľava${street}.`;if(op.includes('ROUNDABOUT'))return `Pokračujte cez kruhový objazd${street}.`;if(op.includes('DESTINATION'))return 'Cieľ je pred vami.';if(op.includes('KEEP_RIGHT'))return `Držte sa vpravo${street}.`;if(op.includes('KEEP_LEFT'))return `Držte sa vľavo${street}.`;return `Pokračujte rovno${street}.`}
function normalizeSpeechText(text){return String(text||'').replace(/\s*\/\s*/g,' smerom na ').replace(/\bul\.\s*/gi,'ulicu ').replace(/\bnám\.\s*/gi,'námestie ').replace(/\bč\.\s*/gi,'číslo ').replace(/\bcestu\s+cestu\b/gi,'cestu').replace(/\s+/g,' ').trim()}
function maneuverIcon(step){const op=String(step?.opcode||'').toUpperCase();if(op.includes('ROUNDABOUT'))return 'O';if(op.includes('TURN_RIGHT')||op.includes('RAMP_RIGHT')||op.includes('EXIT_RIGHT'))return '→';if(op.includes('TURN_LEFT')||op.includes('RAMP_LEFT')||op.includes('EXIT_LEFT'))return '←';if(op.includes('KEEP_RIGHT'))return '↗';if(op.includes('KEEP_LEFT'))return '↖';if(op.includes('DESTINATION'))return '◆';return '↑'}/* NAV_SAFE_ICONS_V13 */
function nearest(p,coords,start=0){if(!coords?.length)return null;let best=null;const cos=111320*Math.cos(p.lat*Math.PI/180);for(let i=Math.max(0,start-20);i<Math.min(coords.length-1,start+600);i++){const a=coords[i],b=coords[i+1],ax=(a.lng-p.lng)*cos,ay=(a.lat-p.lat)*111320,bx=(b.lng-p.lng)*cos,by=(b.lat-p.lat)*111320,dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/l)):0,d=Math.hypot(ax+t*dx,ay+t*dy);if(!best||d<best.distance)best={index:i,t,distance:d,point:{lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t}}}return best}
function cumulative(c){const a=[0];for(let i=1;i<c.length;i++)a.push(a[i-1]+dist(c[i-1],c[i]));return a}
const routeMetaCache=new WeakMap();
function routeMeta(r){let m=routeMetaCache.get(r);if(m)return m;const cum=cumulative(r.coords||[]),stepDistances=[];let cursor=0;for(const s of r.steps||[]){const p=s?.path?{lat:Number(s.path.y),lng:Number(s.path.x)}:null,n=p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)?nearest(p,r.coords,cursor):null;if(n){cursor=Math.max(cursor,n.index);const a=cum[n.index]||0,b=cum[n.index+1]??a;stepDistances.push(a+n.t*(b-a))}else stepDistances.push(Infinity)}m={cum,total:cum.at(-1)||r.distance||1,stepDistances};routeMetaCache.set(r,m);return m}
function routePointFromProjection(coords,n,meters){if(!coords?.length||!n)return null;let left=Math.max(0,meters||0),start=n.point;for(let i=n.index;i<coords.length-1;i++){const end=coords[i+1],d=dist(start,end);if(d>=left&&d>0){const t=left/d;return {lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t}}left-=d;start=end}return coords.at(-1)}
/* TMY_VIEWPORT_V1 */
function destinationPoint(p,meters,heading){
  if(!p||!Number.isFinite(meters)||!Number.isFinite(heading)||meters===0)return p;
  const R=6371000,ang=meters/R,br=heading*Math.PI/180,lat1=p.lat*Math.PI/180,lon1=p.lng*Math.PI/180;
  const lat2=Math.asin(Math.sin(lat1)*Math.cos(ang)+Math.cos(lat1)*Math.sin(ang)*Math.cos(br));
  const lon2=lon1+Math.atan2(Math.sin(br)*Math.sin(ang)*Math.cos(lat1),Math.cos(ang)-Math.sin(lat1)*Math.sin(lat2));
  return {lat:lat2*180/Math.PI,lng:lon2*180/Math.PI};
}
function navigationZoom(distanceMeters,opcode,speedKmh){const ramp=/RAMP|EXIT/i.test(String(opcode||''));if(ramp){if(distanceMeters<=250)return 18.8;if(distanceMeters<=600)return 18.2;if(distanceMeters<=1200)return 17.5;if(distanceMeters<=2500)return 16.8;return 16.2}if(distanceMeters<=250)return 19;if(distanceMeters<=700)return 18.4;if(distanceMeters<=2000)return 17.4;return speedKmh>95?15.7:16.5}
function shouldSnapToRoute(distanceMeters,accuracy){const a=Number.isFinite(accuracy)?Math.min(30,Math.max(0,accuracy)):0;return distanceMeters<=Math.max(35,a*1.5)}
function confirmedOffRoute(distanceMeters,accuracy){return distanceMeters>Math.max(55,(Number(accuracy)||0)*2)}
function routeLearningKey(origin,destination){if(!origin||!destination?.location)return'';return `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}>${destination.location.lat.toFixed(3)},${destination.location.lng.toFixed(3)}`}
function safeLearnedRoutes(){const rows=load(LS.learnedRoutes,[]);return Array.isArray(rows)?rows.filter(x=>x&&typeof x.key==='string'&&Array.isArray(x.path)&&x.path.length>=2&&Number.isFinite(x.count)).slice(0,12):[]}
function sampledPath(path,max=36){if(!Array.isArray(path)||path.length<=max)return(path||[]).map(p=>({lat:Number(p.lat),lng:Number(p.lng)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lng));const out=[];for(let i=0;i<max;i++)out.push(path[Math.round(i*(path.length-1)/(max-1))]);return out}
function pathDifference(path,reference){const samples=sampledPath(path,28);if(!samples.length||!reference?.length)return{average:Infinity,ratio:0};let total=0,different=0;for(const p of samples){let best=Infinity;for(const q of reference){const d=dist(p,q);if(d<best)best=d}total+=best;if(best>70)different++}return{average:total/samples.length,ratio:different/samples.length}}
function rememberDrivenRoute(){const trail=sampledPath(state.tripTrail,50),planned=state.tripOriginalRoute,key=state.tripKey;if(!key||trail.length<8||!planned?.length)return;const travelled=cumulative(trail).at(-1)||0,diff=pathDifference(trail,planned);if(travelled<700||diff.ratio<.18)return;const rows=safeLearnedRoutes();let match=rows.find(x=>x.key===key&&pathDifference(trail,x.path).average<120);if(match){match.count=Math.min(99,(match.count||0)+1);match.path=trail;match.lastUsedAt=new Date().toISOString()}else rows.unshift({key,count:1,path:trail,lastUsedAt:new Date().toISOString()});save(LS.learnedRoutes,rows.sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt))).slice(0,12))}
function preferLearnedRoute(routes,key){const learned=safeLearnedRoutes().filter(x=>x.key===key&&x.count>=3).sort((a,b)=>b.count-a.count)[0];if(!learned)return 0;let best={index:0,score:Infinity};routes.forEach((r,index)=>{const score=pathDifference(learned.path,r.coords||[]).average;if(score<best.score)best={index,score}});return best.score<=350?best.index:0}

const state={pos:null,accuracy:null,speed:null,gpsHeading:null,lastPos:null,heading:null,map:null,L:null,baseLayers:null,baseLayer:null,mapType:['roadmap','hybrid','satellite'].includes(load(LS.mapType,'roadmap'))?load(LS.mapType,'roadmap'):'roadmap',car:null,destMarker:null,routeLines:[],alertMarkers:[],chargerMarkers:[],trafficLines:[],routes:[],routeIndex:0,navigating:false,overview:false,routeCursor:0,routeProgress:null,dest:null,alerts:[],alertsOn:load(LS.alerts,true),jams:[],liveJams:[],chargers:[],chargersOn:false,chargeFilter:load(LS.chargeFilter,'all'),routing:{useVignette:true,avoidTolls:false,avoidFerries:false,...load(LS.routing,{})},voice:load(LS.voice,true),voiceMode:load(LS.voiceMode,'soft'),voiceVolume:Math.max(.2,Math.min(1,Number(load(LS.voiceVolume,.85))||.85)),favorites:load(LS.fav,[]),recents:load(LS.recent,[]),panelHidden:false,lastVoice:'',lastReroute:0,offRouteHits:0,overviewTimer:null,searchHome:null,routeLoading:false,routeRequestSeq:0,lastCameraAt:0,lastCameraCenter:null,lastBearingAt:0,lastAppliedHeading:null,trafficPaintSig:'',alertPaintSig:'',tripKey:'',tripTrail:[],tripOriginalRoute:null,lastTrailAt:null,pendingAutoRoute:false,routeHadHeading:false};

function ensureQuickPlaces(){const search=document.querySelector('.searchbox'),row=search?.querySelector('.row');if(!search||!row)return null;let quick=$('searchQuickPlaces');if(!quick){quick=document.createElement('div');quick.id='searchQuickPlaces';quick.className='search-quick-places';quick.innerHTML='<button id="quickHomeBtn" class="quick-place" aria-label="Navigovať domov">Domov</button><button id="quickWorkBtn" class="quick-place" aria-label="Navigovať do práce">Práca</button>';row.insertAdjacentElement('afterend',quick)}return quick}
function useQuickPlace(place,label){if(place){selectDestination(place);return}const status=$('searchStatus');if(status)status.textContent=`${label} ešte nie je nastavený. Vyhľadajte adresu a uložte ju v nastaveniach.`}
function renderPlaces(){const fav=$('favorites'),rec=$('recents');$('favCount').textContent=state.favorites.length;$('recentCount').textContent=state.recents.length;fav.innerHTML=state.favorites.length?state.favorites.map(x=>`<button class="result" data-place="fav:${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.address)}</small></button>`).join(''):'<small>Zatiaľ bez uložených miest.</small>';rec.innerHTML=state.recents.length?state.recents.slice(0,20).map(x=>`<button class="result" data-place="rec:${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.address)}</small></button>`).join(''):'<small>História je prázdna.</small>';document.querySelectorAll('[data-place]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.place.split(':');const a=kind==='fav'?state.favorites:state.recents;const x=a.find(z=>String(z.id)===id);if(x)selectDestination(x)});const home=state.favorites.find(x=>x.kind==='home'),work=state.favorites.find(x=>x.kind==='work');$('homeBtn').disabled=!home;$('workBtn').disabled=!work;$('homeBtn').onclick=()=>home&&selectDestination(home);$('workBtn').onclick=()=>work&&selectDestination(work);ensureQuickPlaces();const qh=$('quickHomeBtn'),qw=$('quickWorkBtn');if(qh){qh.classList.toggle('is-unset',!home);qh.title=home?home.address:'Domov nie je nastavený';qh.onclick=()=>useQuickPlace(home,'Domov')}if(qw){qw.classList.toggle('is-unset',!work);qw.title=work?work.address:'Práca nie je nastavená';qw.onclick=()=>useQuickPlace(work,'Práca')}}
function routingStatus(){ $('routingStatus').textContent=state.routing.avoidTolls?'bez mýta':state.routing.useVignette?'známka zap.':'štandard'; }
function showPanel(show=true){state.panelHidden=!show;$('app').classList.toggle('panel-off',!show);$('panel').classList.toggle('hidden',!show);$('panelBtn').textContent=show?'Skryť panel':'Panel';setTimeout(()=>state.map?.invalidateSize(),100)}

function setMapType(type,persist=true){
  const next=['roadmap','hybrid','satellite'].includes(type)?type:'roadmap';
  state.mapType=next;if(persist)save(LS.mapType,next);
  if(!state.map||!state.baseLayers)return;
  if(state.baseLayer)state.map.removeLayer(state.baseLayer);
  state.baseLayer=state.baseLayers[next];state.baseLayer.addTo(state.map);
  state.routeLines.forEach(line=>line.bringToFront?.());
  state.trafficLines.forEach(line=>line.bringToFront?.());
}

async function initMap(){const L=window.L;state.L=L;state.map=L.map('map',{zoomControl:true,attributionControl:true,rotate:true,bearing:0,rotateControl:false,dragRotate:false,touchRotate:false,shiftKeyRotate:false,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false}).setView([48.9984,21.2393],12);const common={maxZoom:20,keepBuffer:8,updateWhenIdle:false,updateWhenZooming:false},imagery=()=>L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{...common,attribution:'Esri, Maxar, Earthstar Geographics'}),labels=()=>L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{...common,attribution:'Esri'});state.baseLayers={roadmap:L.tileLayer('https://www.waze.com/row-tiles/live/base/{z}/{x}/{y}/tile.png',{...common,attribution:'Waze'}),satellite:imagery(),hybrid:L.layerGroup([imagery(),labels()])};setMapType(state.mapType,false);startGPS();setInterval(loadAlerts,30000);setTimeout(loadAlerts,2200)}
function carIcon(){return state.L.divIcon({className:'car-wrap',html:'<div class="car-arrow">▲</div>',iconSize:[40,40],iconAnchor:[20,20]})}
function startGPS(){
  if(!navigator.geolocation){$('gpsNotice').querySelector('span').textContent='GPS nie je dostupné.';return}
  let lastTs=Date.now(),lastRestart=0,watch;
  const onPosition=g=>{
    const p={lat:g.coords.latitude,lng:g.coords.longitude};
    if(!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;
    lastTs=Date.now();
    const previous=state.pos,sp=Number.isFinite(g.coords.speed)?g.coords.speed:null,raw=Number.isFinite(g.coords.heading)?g.coords.heading:null,moved=previous?dist(previous,p):0;
    let h=moved>=4?bearing(previous,p):raw;
    if(h!=null)state.heading=smoothHeading(state.heading,h,.35);
    state.lastPos=previous;state.pos=p;state.accuracy=g.coords.accuracy;state.speed=sp;state.gpsHeading=raw;
    $('speed').textContent=`${sp==null?'—':Math.max(0,Math.round(sp*3.6))} km/h`;
    $('gpsNotice').querySelector('span').textContent=`GPS aktívne · presnosť približne ${Math.round(g.coords.accuracy)} m`;
    if(!state.car){state.car=state.L.marker(p,{icon:carIcon(),zIndexOffset:1000,rotation:0,rotateWithView:false}).addTo(state.map);state.map.setView(p,16,{animate:false})}
    else if(!state.navigating)state.car.setLatLng(p);
    if(state.navigating)updateNavigation();else if(state.dest&&!state.routes.length&&!state.routeLoading){const auto=!!state.pendingAutoRoute;state.pendingAutoRoute=false;calculateRoute(auto||true)}
  };
  const restart=()=>{if(watch)navigator.geolocation.clearWatch(watch);watch=navigator.geolocation.watchPosition(onPosition,e=>$('gpsNotice').querySelector('span').textContent=e.code===1?'Poloha bola zamietnutá.':'GPS momentálne nie je dostupné.',{enableHighAccuracy:true,timeout:12000,maximumAge:0})};
  restart();
  setInterval(()=>{const now=Date.now();if(state.navigating)navigator.geolocation.getCurrentPosition(onPosition,()=>{},{enableHighAccuracy:true,timeout:12000,maximumAge:0});if(now-lastTs>10000&&now-lastRestart>10000){lastRestart=now;$('gpsNotice').querySelector('span').textContent='GPS neposiela novú polohu. Obnovujem sledovanie.';restart()}},2500);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')navigator.geolocation.getCurrentPosition(onPosition,()=>{},{enableHighAccuracy:true,timeout:12000,maximumAge:0})});
}
function applyHeadingUp(markerPosition,zoom){
  if(!state.map||!state.navigating||!markerPosition)return;
  const now=Date.now();
  const h=Number.isFinite(state.gpsHeading)?state.gpsHeading:(Number.isFinite(state.lastAppliedHeading)?state.lastAppliedHeading:null);
  if(now-state.lastCameraAt<500)return;
  state.lastCameraAt=now;
  const center=Number.isFinite(h)?destinationPoint(markerPosition,65,h):markerPosition;
  if(Number.isFinite(h)){
    if(typeof state.map.setHeading==='function')state.map.setHeading(h,{ease:1,deadzone:0});
    else if(typeof state.map.setBearing==='function')state.map.setBearing(-h);
    state.lastAppliedHeading=h;state.lastBearingAt=now;
  }
  state.map.setView(center,zoom,{animate:false});
  state.lastCameraCenter={lat:center.lat,lng:center.lng};
}/* TMY_EXACT_NAV_V21 */
function stopHeadingUp(reset=true){if(typeof state.map?.setHeading==='function')state.map.setHeading(null);if(typeof state.map?.stopHeadingUp==='function')state.map.stopHeadingUp();if(reset&&typeof state.map?.setBearing==='function')state.map.setBearing(0);state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraAt=0;state.lastBearingAt=0}

let searchTimer=null,searchSeq=0;async function searchPlaces(force=false){const q=$('searchInput').value.trim();if(q.length<(force?2:3)){$('searchResults').innerHTML='';$('searchStatus').textContent='';return}const seq=++searchSeq;$('searchStatus').textContent='Vyhľadávam…';try{const u=new URLSearchParams({q});if(state.pos){u.set('lat',state.pos.lat);u.set('lng',state.pos.lng)}const r=await fetch('/api/search?'+u,{cache:'no-store'}),d=await r.json();if(seq!==searchSeq)return;renderSearch(d.results||[])}catch{$('searchStatus').textContent='Vyhľadávanie zlyhalo.'}}
function renderSearch(a){$('searchStatus').textContent='';$('searchResults').innerHTML=a.slice(0,6).map((x,i)=>`<button class="result" data-sr="${i}"><b>${esc(x.name)}</b><small>${esc(x.address)}</small></button>`).join('');document.querySelectorAll('[data-sr]').forEach(b=>b.onclick=()=>selectDestination(a[+b.dataset.sr]))}
async function selectDestination(x){unlockVoiceAudio();state.dest=x;state.routes=[];state.routeIndex=0;state.routeProgress=null;state.routeCursor=0;state.pendingAutoRoute=true;$('searchInput').value=x.searchLabel||x.name;$('searchResults').innerHTML='';state.recents=[{...x,lastUsedAt:new Date().toISOString()},...state.recents.filter(z=>z.id!==x.id)].slice(0,20);save(LS.recent,state.recents);renderPlaces();if(state.destMarker)state.destMarker.remove();state.destMarker=state.L.marker(x.location).addTo(state.map).bindTooltip(x.name);state.map.setView(x.location,15);renderDestination();if(state.pos){state.pendingAutoRoute=false;await calculateRoute(true);return}const notice=$('gpsNotice')?.querySelector('span');if(notice)notice.textContent='Čakám na GPS polohu…';try{navigator.geolocation.getCurrentPosition(()=>{},()=>{if(notice)notice.textContent='GPS poloha nie je dostupná. Povoľte polohu v prehliadači.'},{enableHighAccuracy:true,timeout:12000,maximumAge:0})}catch{}try{parent.postMessage({type:'tesla-gps-request'},'*')}catch{}}/* MOBILE_PENDING_ROUTE_V11 */
function renderDestination(){const c=$('destinationCard');if(!state.dest||state.navigating){c.classList.add('hidden');return}c.classList.remove('hidden');c.innerHTML=`<b>Cieľ: ${esc(state.dest.name)}</b><small>${esc(state.dest.address)}</small><div class="grid2"><button class="btn" data-d="save">Uložiť</button><button class="btn" data-d="route">Prepočítať trasu</button></div><div class="grid2"><button class="btn" data-d="home">Nastaviť Domov</button><button class="btn" data-d="work">Nastaviť Prácu</button></div>`;c.querySelector('[data-d=save]').onclick=()=>saveFav('custom');c.querySelector('[data-d=home]').onclick=()=>saveFav('home');c.querySelector('[data-d=work]').onclick=()=>saveFav('work');c.querySelector('[data-d=route]').onclick=()=>calculateRoute(false)}
function saveFav(kind){if(!state.dest)return;const id=kind==='custom'?`custom-${Date.now()}`:`favorite-${kind}`,x={...state.dest,id,kind,name:kind==='home'?'Domov':kind==='work'?'Práca':state.dest.name};state.favorites=[x,...state.favorites.filter(z=>z.kind!==kind&&z.id!==id)];save(LS.fav,state.favorites);renderPlaces()}
function deleteFav(kind){state.favorites=state.favorites.filter(x=>x.kind!==kind);save(LS.fav,state.favorites);renderPlaces()}

function ensureTeslaNavUI(){
  if($('teslaNavManeuver'))return;
  const wrap=document.createElement('div');
  wrap.id='teslaNavUI';
  wrap.innerHTML=`
    <div id="teslaSearchDock" class="tesla-search-dock hidden"></div>
    <section id="teslaNavManeuver" class="tesla-maneuver hidden"></section>
    <section id="teslaTripCard" class="tesla-trip hidden"></section>
    <button id="teslaSettingsClose" class="hidden"></button>
    <section id="teslaSettings" class="tesla-settings hidden"></section>`;
  document.body.appendChild(wrap);
  state.searchHome=document.createComment('search-home');
  const sb=document.querySelector('.searchbox');
  sb?.parentNode?.insertBefore(state.searchHome,sb);
}
function moveSearchToNavigation(on){
  ensureTeslaNavUI();
  const sb=document.querySelector('.searchbox'),dock=$('teslaSearchDock');
  if(!sb||!dock)return;
  dock.classList.add('hidden');
  if(on){
    sb.classList.add('hidden');
  }else{
    if(state.searchHome?.parentNode&&sb.parentNode===dock)state.searchHome.parentNode.insertBefore(sb,state.searchHome.nextSibling);
    sb.classList.remove('hidden');
  }
}
function setNavigationShell(on){
  ensureTeslaNavUI();
  document.body.classList.toggle('tesla-navigating',on);
  $('app').classList.toggle('tesla-nav-active',on);
  $('panel').classList.toggle('hidden',on);
  moveSearchToNavigation(on);
  $('teslaNavManeuver').classList.toggle('hidden',!on);
  $('teslaTripCard').classList.toggle('hidden',!on);
  if(!on)$('teslaSettings').classList.add('hidden');
  setTimeout(()=>state.map?.invalidateSize(),80);
}
function routeTotalDistance(r){if(!r?.coords?.length)return r?.distance||0;const c=cumulative(r.coords);return c.at(-1)||r.distance||0}
function renderTeslaNavigation(){
  ensureTeslaNavUI();
  const r=state.routes[state.routeIndex],p=state.routeProgress;
  if(!state.navigating||!r){$('teslaNavManeuver').classList.add('hidden');$('teslaTripCard').classList.add('hidden');return}
  const step=r.steps?.[p?.stepIdx||0],rawNext=r.steps?.[(p?.stepIdx||0)+1],next=/DESTINATION/i.test(String(rawNext?.opcode||''))&&((p?.remainingDistance??Infinity)>350)?null:rawNext;
  const man=$('teslaNavManeuver');
  const distTo=p?.distanceToManeuver??0;
  man.innerHTML=`<div class="tesla-man-main"><span class="tesla-turn">${maneuverIcon(step)}</span><div><b>${fmtD(distTo)}</b><span>${esc(step?.street||instruction(step).replace(/[.]/g,''))}</span></div></div>${next?`<div class="tesla-man-next"><span>${maneuverIcon(next)}</span><b>${esc(next.street||instruction(next).replace(/[.]/g,''))}</b></div>`:''}`;
  const total=routeTotalDistance(r)||1,remaining=p?.remainingDistance??r.distance??0,ratio=Math.max(0,Math.min(1,1-remaining/total));
  const time=p?.remainingTime??r.time??0,arr=new Date(Date.now()+time*1000).toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'});
  const trip=$('teslaTripCard');
  trip.innerHTML=`<div class="tesla-trip-stats"><b>${arr}</b><span>${fmtT(time)}</span><span>${fmtD(remaining)}</span></div><div class="tesla-progress"><i style="width:${Math.round(ratio*100)}%"></i></div><div class="tesla-trip-actions"><button class="tesla-end" data-tesla-stop>Ukončiť trasu</button><button class="tesla-dots" data-tesla-settings aria-label="Nastavenia">•••</button></div>`;
  trip.querySelector('[data-tesla-stop]').onclick=stopNavigation;
  trip.querySelector('[data-tesla-settings]').onclick=toggleTeslaSettings;
}
function renderTeslaSettings(){
  ensureTeslaNavUI();
  const box=$('teslaSettings'),home=state.favorites.find(x=>x.kind==='home'),work=state.favorites.find(x=>x.kind==='work');
  const favs=state.favorites.filter(x=>!['home','work'].includes(x.kind)).slice(0,5),recs=state.recents.slice(0,20);
  const fs=['all','tesla','ccs2','type2','kw50','kw100','kw150'];
  box.innerHTML=`<header><b>Nastavenia</b><button class="btn settings-close" data-ts-close aria-label="Zavrieť nastavenia"><span class="ui-icon ui-icon-close" aria-hidden="true"></span></button></header>
  <section class="tesla-setting-block"><b>Trasa</b><button class="btn wide" data-ts-overview>${state.overview?'Späť na navigovanie':'Celá trasa'}</button><div class="chips">${state.routes.map((x,i)=>`<button class="chip ${i===state.routeIndex?'active':''}" data-ts-route="${i}">${i+1} · ${fmtT(x.time||0)} · ${fmtD(x.distance||0)}</button>`).join('')}</div></section>
  <section class="tesla-setting-block"><b>Zobrazenie mapy</b><div class="chips"><button class="chip ${state.mapType==='roadmap'?'active':''}" data-ts-map="roadmap">Cestná</button><button class="chip ${state.mapType==='hybrid'?'active':''}" data-ts-map="hybrid">Hybridná</button><button class="chip ${state.mapType==='satellite'?'active':''}" data-ts-map="satellite">Satelitná</button></div></section>
  <label><span>Diaľničná známka</span><input type="checkbox" data-ts-vig ${state.routing.useVignette?'checked':''}></label>
  <label><span>Vyhnúť sa mýtu</span><input type="checkbox" data-ts-toll ${state.routing.avoidTolls?'checked':''}></label>
  <label><span>Vyhnúť sa trajektom</span><input type="checkbox" data-ts-ferry ${state.routing.avoidFerries?'checked':''}></label>
  <section class="tesla-setting-block"><b>Hlas</b><label><span>Hlasové pokyny</span><input type="checkbox" data-ts-voice ${state.voice?'checked':''}></label><div class="chips"><button class="chip ${state.voiceMode==='soft'?'active':''}" data-ts-vmode="soft">Jemný ženský</button><button class="chip ${state.voiceMode==='clear'?'active':''}" data-ts-vmode="clear">Jasný ženský</button></div><label style="display:block"><span style="display:flex;justify-content:space-between;gap:12px;margin-bottom:8px"><span>Hlasitosť navigácie</span><b data-ts-vvol-label>${Math.round(state.voiceVolume*100)} %</b></span><input type="range" min="20" max="100" step="5" value="${Math.round(state.voiceVolume*100)}" data-ts-vvol style="width:100%;min-height:38px"></label><small>Mení iba hlas navigácie. Hlasitosť hudby zostáva nezmenená.</small></section>
  <section class="tesla-setting-block"><b>Upozornenia</b><label><span>Polícia / nehody / riziká</span><input type="checkbox" data-ts-alerts ${state.alertsOn?'checked':''}></label><small>${state.alerts.length?`Aktívnych hlásení v oblasti: ${state.alerts.length}`:'Momentálne bez live hlásení v oblasti'}</small></section>
  <section class="tesla-setting-block"><b>Nabíjačky</b><button class="btn wide" data-ts-chargers>${state.chargersOn?'Skryť nabíjačky':'Zobraziť nabíjačky'}</button><div class="chips">${fs.map(f=>`<button class="chip ${f===state.chargeFilter?'active':''}" data-ts-cf="${f}">${{all:'Všetky',tesla:'Tesla',ccs2:'CCS2',type2:'Type 2',kw50:'≥50 kW',kw100:'≥100 kW',kw150:'≥150 kW'}[f]}</button>`).join('')}</div><small>${state.chargersOn?(state.chargers.length?`Načítaných staníc: ${state.chargers.length}`:'Vyhľadávam stanice v širšom okolí…'):'Nabíjačky sú vypnuté'}</small></section>
  <section class="tesla-setting-block"><b>Miesta</b><small>Vyhľadaný cieľ môžeš nastaviť ako novú adresu Domov alebo Práca.</small><div class="saved-place-list">${[['home','Domov',home],['work','Práca',work]].map(([kind,label,place])=>`<div class="saved-place"><button class="saved-place-main" data-ts-go-place="${kind}" ${place?'':'disabled'}><span class="saved-place-icon saved-place-icon-${kind}" aria-hidden="true"></span><span><b>${label}</b><small>${place?esc(place.address||'Bez adresy'):'Adresa nie je nastavená'}</small></span></button><button class="saved-place-action" data-ts-save-place="${kind}" ${state.dest?'':'disabled'} aria-label="${place?'Zmeniť':'Nastaviť'} ${label}"><span class="ui-icon ui-icon-edit" aria-hidden="true"></span></button><button class="saved-place-action danger" data-ts-delete-place="${kind}" ${place?'':'disabled'} aria-label="Vymazať ${label}"><span class="ui-icon ui-icon-close" aria-hidden="true"></span></button></div>`).join('')}</div>${favs.length?`<small>Obľúbené</small>${favs.map(x=>`<button class="result" data-ts-id="fav:${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.address)}</small></button>`).join('')}`:''}${recs.length?`<small>Posledné ciele · ${recs.length}/20</small><div class="tesla-recents-scroll">${recs.map(x=>`<button class="result" data-ts-id="rec:${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.address)}</small></button>`).join('')}</div>`:'<small>História cieľov je prázdna.</small>'}</section>
  <section class="tesla-setting-block"><b>Ostatné</b><button class="btn wide" data-ts-music>Hudba</button><button class="btn wide" data-ts-pair>${load(LS.device,null)?.paired?'Mobil prepojený':'Prepojiť mobil'}</button><button class="btn wide" data-ts-full>Celá obrazovka</button></section>`;
  box.querySelector('[data-ts-close]').onclick=()=>box.classList.add('hidden');
  box.querySelector('[data-ts-overview]').onclick=()=>{toggleOverview();renderTeslaSettings()};
  box.querySelectorAll('[data-ts-route]').forEach(b=>b.onclick=()=>{state.routeIndex=+b.dataset.tsRoute;state.jams=[...(state.routes[state.routeIndex]?.trafficJams||[]),...(state.liveJams||[])];state.trafficPaintSig='';drawRoutes(false);state.routeCursor=0;state.routeProgress=null;if(state.overview){const rr=state.routes[state.routeIndex];if(rr?.coords?.length)state.map.fitBounds(state.L.latLngBounds(rr.coords),{padding:[70,70]})}else updateNavigation();renderTeslaSettings();renderTeslaNavigation()});
  box.querySelectorAll('[data-ts-map]').forEach(b=>b.onclick=()=>{setMapType(b.dataset.tsMap);renderTeslaSettings()});
  box.querySelector('[data-ts-vig]').onchange=e=>{state.routing.useVignette=e.target.checked;save(LS.routing,state.routing);routingStatus()};
  box.querySelector('[data-ts-toll]').onchange=e=>{state.routing.avoidTolls=e.target.checked;save(LS.routing,state.routing);routingStatus()};
  box.querySelector('[data-ts-ferry]').onchange=e=>{state.routing.avoidFerries=e.target.checked;save(LS.routing,state.routing);routingStatus()};
  box.querySelector('[data-ts-voice]').onchange=e=>{state.voice=e.target.checked;save(LS.voice,state.voice)};
  box.querySelectorAll('[data-ts-vmode]').forEach(b=>b.onclick=()=>{state.voiceMode=b.dataset.tsVmode;save(LS.voiceMode,state.voiceMode);renderTeslaSettings()});const vv=box.querySelector('[data-ts-vvol]'),vvl=box.querySelector('[data-ts-vvol-label]');if(vv)vv.oninput=e=>{state.voiceVolume=Math.max(.2,Math.min(1,Number(e.target.value)/100||.85));save(LS.voiceVolume,state.voiceVolume);if(vvl)vvl.textContent=Math.round(state.voiceVolume*100)+' %'};
  box.querySelector('[data-ts-alerts]').onchange=e=>{state.alertsOn=e.target.checked;save(LS.alerts,state.alertsOn);state.alertPaintSig='';renderAlertMarkers();findAheadAlert()};
  box.querySelector('[data-ts-chargers]').onclick=()=>{state.chargersOn=!state.chargersOn;renderTeslaSettings();if(state.chargersOn)searchChargers().finally(()=>renderTeslaSettings());else renderChargers()};
  box.querySelectorAll('[data-ts-cf]').forEach(b=>b.onclick=()=>{state.chargeFilter=b.dataset.tsCf;save(LS.chargeFilter,state.chargeFilter);renderChargers();renderTeslaSettings()});
  box.querySelectorAll('[data-ts-save-place]').forEach(b=>b.onclick=()=>{if(!state.dest)return;saveFav(b.dataset.tsSavePlace);renderTeslaSettings()});
  box.querySelectorAll('[data-ts-delete-place]').forEach(b=>b.onclick=()=>{const kind=b.dataset.tsDeletePlace,label=kind==='home'?'Domov':'Prácu';if(confirm(`Vymazať uložené miesto ${label}?`)){deleteFav(kind);renderTeslaSettings()}});
  box.querySelectorAll('[data-ts-go-place]').forEach(b=>b.onclick=()=>{const x=b.dataset.tsGoPlace==='home'?home:work;if(x){box.classList.add('hidden');selectDestination(x)}});
  box.querySelectorAll('[data-ts-id]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.tsId.split(':');const a=kind==='fav'?state.favorites:state.recents,x=a.find(z=>String(z.id)===id);if(x){box.classList.add('hidden');selectDestination(x)}});
  box.querySelector('[data-ts-music]').onclick=openMusicWindow;
  box.querySelector('[data-ts-pair]').onclick=startPair;
  box.querySelector('[data-ts-full]').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
}
function toggleTeslaSettings(){const box=$('teslaSettings');renderTeslaSettings();box.classList.toggle('hidden')}
function beginNavigationOverview(){
  const r=state.routes[state.routeIndex];if(!r)return;
  clearTimeout(state.overviewTimer);
  state.navigating=true;state.overview=true;state.offRouteHits=0;state.routeCursor=0;state.routeProgress=null;state.lastVoice='';state.lastTrafficVoice='';
  state.tripKey=routeLearningKey(state.pos,state.dest);state.tripTrail=state.pos?[{...state.pos}]:[];state.tripOriginalRoute=(r.coords||[]).map(p=>({...p}));state.lastTrailAt=state.pos?{...state.pos}:null;
  setNavigationShell(true);
  stopHeadingUp(false);
  if(r.coords?.length)state.map.fitBounds(state.L.latLngBounds(r.coords),{padding:[70,70]});
  renderTeslaNavigation();
  state.overviewTimer=setTimeout(()=>{if(!state.navigating)return;state.overview=false;updateNavigation();renderTeslaNavigation()},3000);
}

async function calculateRoute(autoStart=false){if(!state.pos||!state.dest||state.routeLoading)return;state.routeLoading=true;state.routeHadHeading=Number.isFinite(state.gpsHeading);const request=++state.routeRequestSeq,q=new URLSearchParams({fromLat:state.pos.lat,fromLng:state.pos.lng,toLat:state.dest.location.lat,toLng:state.dest.location.lng,useVignette:String(state.routing.useVignette),avoidTolls:String(state.routing.avoidTolls),avoidFerries:String(state.routing.avoidFerries)});try{const r=await fetch('https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twroute?'+q,{cache:'no-store'});if(!r.ok)throw Error('route '+r.status);const d=await r.json();if(request!==state.routeRequestSeq)return;state.routes=Array.isArray(d.routes)?d.routes:[];if(!state.routes.length)throw Error(d.error||'no routes');for(const rr of state.routes){if(rr?.coords?.length>1&&state.pos&&state.dest?.location){const first=rr.coords[0],last=rr.coords.at(-1),forward=dist(first,state.pos)+dist(last,state.dest.location),reverse=dist(last,state.pos)+dist(first,state.dest.location);if(reverse<forward)rr.coords=[...rr.coords].reverse()}};state.routeIndex=state.navigating?0:preferLearnedRoute(state.routes,routeLearningKey(state.pos,state.dest));state.jams=[...(state.routes[state.routeIndex]?.trafficJams||[]),...(state.liveJams||[])];state.routeProgress=null;state.routeCursor=0;drawRoutes(!state.navigating);renderRouteCard();if(autoStart)beginNavigationOverview();else if(state.navigating)updateNavigation()}catch(e){if(request===state.routeRequestSeq)$('gpsNotice').querySelector('span').textContent='Trasu sa nepodarilo načítať.'}finally{if(request===state.routeRequestSeq)state.routeLoading=false}}
function drawRoutes(fit=false){state.routeLines.forEach(x=>x.remove());state.routeLines=[];state.routes.forEach((r,i)=>{if(!r.coords?.length)return;const line=state.L.polyline(r.coords,{weight:i===state.routeIndex?8:5,opacity:i===state.routeIndex?.96:.42,color:i===state.routeIndex?'#14b8e6':'#94a3b8'}).addTo(state.map);line.on('click',()=>{state.routeIndex=i;state.jams=[...(state.routes[i]?.trafficJams||[]),...(state.liveJams||[])];drawRoutes(false);renderRouteCard()});state.routeLines.push(line)});const r=state.routes[state.routeIndex];if(fit&&r?.coords?.length)state.map.fitBounds(state.L.latLngBounds(r.coords),{padding:[45,45]});renderTraffic()}
function renderRouteCard(){const r=state.routes[state.routeIndex],c=$('routeCard');if(!r){c.classList.add('hidden');return}c.classList.remove('hidden');c.innerHTML=`<b>${esc(r.routeName||r.name||'Trasa')}</b><div class="chips">${state.routes.map((x,i)=>`<button class="chip ${i===state.routeIndex?'active':''}" data-ri="${i}">${i+1}: ${fmtT(x.time||0)} · ${fmtD(x.distance||0)}</button>`).join('')}</div><div class="grid2"><button class="btn" data-r="view">${state.overview?'Späť na navigovanie':'Celá trasa'}</button><button class="btn danger" data-r="stop">Ukončiť</button></div>`;c.querySelectorAll('[data-ri]').forEach(b=>b.onclick=()=>{state.routeIndex=+b.dataset.ri;state.jams=[...(state.routes[state.routeIndex]?.trafficJams||[]),...(state.liveJams||[])];drawRoutes(false);renderRouteCard()});c.querySelector('[data-r=view]').onclick=toggleOverview;c.querySelector('[data-r=stop]').onclick=stopNavigation;renderRouteBox()}
function toggleOverview(){const r=state.routes[state.routeIndex];if(!r)return;clearTimeout(state.overviewTimer);state.overview=!state.overview;if(state.overview){stopHeadingUp(false);state.map.fitBounds(state.L.latLngBounds(r.coords),{padding:[70,70]})}else updateNavigation();renderRouteCard();renderTeslaNavigation();$('routeModeBtn').textContent=state.overview?'Späť na navigovanie':'Celá trasa'}
function stopNavigation(recenter=true){clearTimeout(state.overviewTimer);cancelNavigationVoice();if(state.navigating)rememberDrivenRoute();state.routeRequestSeq++;state.routeLoading=false;state.navigating=false;state.overview=false;state.routeProgress=null;state.routeCursor=0;state.routeHadHeading=false;state.tripKey='';state.tripTrail=[];state.tripOriginalRoute=null;state.lastTrailAt=null;stopHeadingUp(true);$('app').classList.remove('navcompact');$('panel').classList.remove('navcompact');$('routeModeBtn').classList.add('hidden');$('alertBox').classList.add('hidden');state.routeLines.forEach(x=>x.remove());state.routeLines=[];state.trafficLines.forEach(x=>x.remove());state.trafficLines=[];state.trafficPaintSig='';if(state.destMarker)state.destMarker.remove();state.destMarker=null;state.routes=[];state.routeIndex=0;state.dest=null;state.jams=[];$('searchInput').value='';$('searchResults').innerHTML='';$('searchStatus').textContent='';setNavigationShell(false);renderDestination();renderRouteBox();renderRouteCard();renderTeslaNavigation();if(!recenter)return;const center=state.pos||state.car?.getLatLng?.();[100,320].forEach(delay=>setTimeout(()=>{if(!state.map||!center)return;state.map.stop();state.map.invalidateSize({pan:false});state.map.setView(center,16,{animate:false})},delay))}
function routeAheadPoint(coords,startIndex,meters){if(!coords?.length)return null;let left=Math.max(0,meters||0),i=Math.max(0,Math.min(startIndex,coords.length-1));for(;i<coords.length-1;i++){const d=dist(coords[i],coords[i+1]);if(d>=left&&d>0){const t=left/d;return {lat:coords[i].lat+(coords[i+1].lat-coords[i].lat)*t,lng:coords[i].lng+(coords[i+1].lng-coords[i].lng)*t}}left-=d}return coords.at(-1)}
/* NAV_REMAINING_ROUTE_V13 */
function routeDestinationAtEnd(r){
  const coords=r?.coords||[],d=state.dest?.location;
  if(coords.length<2||!d)return true;
  return dist(coords.at(-1),d)<=dist(coords[0],d);
}
function routeForwardCoords(r,n,markerPosition){
  const coords=r?.coords||[];
  if(!coords.length||!n)return markerPosition?[markerPosition]:[];
  if(routeDestinationAtEnd(r))return [markerPosition,...coords.slice(Math.min(coords.length,n.index+1))];
  return [markerPosition,...coords.slice(0,Math.max(0,n.index+1)).reverse()];
}
function routeForwardPointToDestination(r,n,meters){
  const coords=r?.coords||[];
  if(!coords.length||!n)return null;
  let left=Math.max(0,Number(meters)||0),start=n.point;
  if(routeDestinationAtEnd(r)){
    for(let i=n.index+1;i<coords.length;i++){
      const end=coords[i],d=dist(start,end);
      if(d>=left&&d>0){const t=left/d;return {lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t}}
      left-=d;start=end;
    }
    return coords.at(-1);
  }
  for(let i=n.index;i>=0;i--){
    const end=coords[i],d=dist(start,end);
    if(d>=left&&d>0){const t=left/d;return {lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t}}
    left-=d;start=end;
  }
  return coords[0];
}
function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex];
  if(active?.setLatLngs){
    active.setLatLngs([markerPosition,...r.coords.slice(Math.min(r.coords.length,n.index+1))]);
    active.setStyle?.({opacity:.96,weight:8,color:'#14b8e6'});
  }
  state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
}
function updateNavigation(){
  const r=state.routes[state.routeIndex];
  if(!state.navigating||state.overview||!state.pos||!r?.coords?.length)return;
  const n=nearest(state.pos,r.coords,state.routeCursor);if(!n)return;state.routeCursor=Math.max(state.routeCursor,n.index);
  const meta=routeMeta(r),cum=meta.cum,total=meta.total,passed=(cum[n.index]||0)+n.t*((cum[n.index+1]??cum[n.index]??0)-(cum[n.index]||0)),remaining=Math.max(0,total-passed);
  let si=meta.stepDistances.findIndex((d,i)=>i>0&&d>passed+12);if(si<0)si=Math.max(0,(r.steps||[]).length-1);
  const maneuver=r.steps?.[si],stepDistance=meta.stepDistances[si],dm=Number.isFinite(stepDistance)?Math.max(0,stepDistance-passed):remaining;
  state.routeProgress={remainingDistance:remaining,remainingTime:(r.time||0)*(remaining/Math.max(total,1)),stepIdx:si,distanceToManeuver:dm,offRoute:n.distance,progressRatio:Math.max(0,Math.min(1,passed/Math.max(total,1)))};
  if(!state.lastTrailAt||dist(state.lastTrailAt,state.pos)>=25){state.tripTrail.push({...state.pos});state.lastTrailAt={...state.pos};if(state.tripTrail.length>500)state.tripTrail=state.tripTrail.filter((_,i)=>i%2===0)}
  const markerPosition=shouldSnapToRoute(n.distance,state.accuracy)?n.point:state.pos,routeDirection=routePointFromProjection(r.coords,n,30);
  if(state.car)state.car.setLatLng(markerPosition);
  trimActiveRouteBehindCar(r,n,markerPosition);
  const kmh=(state.speed||0)*3.6;
  applyHeadingUp(markerPosition,navigationZoom(dm,maneuver?.opcode,kmh));
  if(Number.isFinite(state.gpsHeading)&&state.routeHadHeading===false){state.routeHadHeading=true;calculateRoute(false)}
  if(confirmedOffRoute(n.distance,state.accuracy))state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;
  if(state.offRouteHits>=2&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}
  renderRouteBox();renderTeslaNavigation();voiceNavigation();findAheadAlert();findAheadTraffic();
}
function renderRouteBox(){const r=state.routes[state.routeIndex],p=state.routeProgress,b=$('routeBox');if(!r){b.classList.add('hidden');return}b.classList.remove('hidden');const time=p?.remainingTime??r.time,di=p?.remainingDistance??r.distance,arr=new Date(Date.now()+1000*(time||0)).toLocaleTimeString('sk-SK',{hour:'2-digit',minute:'2-digit'}),title=state.navigating?instruction(r.steps?.[p?.stepIdx||0]):(r.routeName||r.name||'Trasa');b.innerHTML=`<b>${esc(title)}</b>${state.navigating&&p?`<small>manéver o ${fmtD(p.distanceToManeuver)}${p.offRoute>50?' · odchýlka '+fmtD(p.offRoute):''}</small>`:''}<div class="routeStats"><div><b>${fmtT(time||0)}</b><small>zostáva</small></div><div><b>${fmtD(di||0)}</b><small>vzdialenosť</small></div><div><b>${arr}</b><small>príchod</small></div></div>`}
let voiceContext=null,activeVoiceSource=null,voiceGeneration=0,cloudVoiceUnavailable=false,voiceAnnouncementTimer=null;const voiceCache=new Map();
/* NAV_VOICE_CANCEL_V10 */
function cancelNavigationVoice(){
  voiceGeneration++;
  if(voiceAnnouncementTimer){clearTimeout(voiceAnnouncementTimer);voiceAnnouncementTimer=null}
  try{activeVoiceSource?.stop()}catch{}
  activeVoiceSource=null;
  try{window.speechSynthesis?.cancel()}catch{}
  state.lastVoice='';
}
function unlockVoiceAudio(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{voiceContext=voiceContext||new C();voiceContext.resume?.()}catch{}}
function browserSpeak(text,force=false,generation=voiceGeneration){
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
  const synth=window.speechSynthesis;let done=false;
  const say=()=>{
    if(done||generation!==voiceGeneration||((!state.voice||!state.navigating)&&!force))return;done=true;
    const v=synth.getVoices()||[],female=['laura','zuzana','vlasta','tereza','lucia','lucie','viktoria','victoria','alena','iveta','jana','katka','monika','zdenka','veronika','maria','marie','eva','hana','female','woman','žena','female voice'],male=['filip','martin','jakub','petr','peter','michal','tomas','tomáš','ondrej','matej','jiri','jan ','adam','daniel','david','male','man'];
    const name=x=>(x.name||'').toLowerCase(),isFemale=x=>female.some(n=>name(x).includes(n))&&!male.some(n=>name(x).includes(n)),isSlovak=x=>/^sk(?:-|_)/i.test(x.lang||''),isCzech=x=>/^(?:cs|cz)(?:-|_)/i.test(x.lang||'');
    const voice=v.find(x=>isSlovak(x)&&isFemale(x))||v.find(x=>isCzech(x)&&isFemale(x))||v.find(isSlovak)||v.find(isCzech)||v.find(isFemale)||v[0]||null,u=new SpeechSynthesisUtterance(text);
    if(voice){u.voice=voice;u.lang=voice.lang||'sk-SK'}else u.lang='sk-SK';u.rate=state.voiceMode==='soft'?.9:.96;u.pitch=state.voiceMode==='soft'?1.08:1;u.volume=state.voiceVolume;
    try{synth.cancel();synth.resume()}catch{}synth.speak(u)
  };
  if((synth.getVoices()||[]).length)say();else{try{synth.addEventListener('voiceschanged',say,{once:true})}catch{}setTimeout(say,350)}
}
async function speak(text,force=false){
  if((!state.voice||!state.navigating)&&!force)return;
  const normalized=normalizeSpeechText(text),generation=++voiceGeneration;unlockVoiceAudio();
  if(!cloudVoiceUnavailable){try{
    const key=`${state.voiceMode}:${normalized}`;let encoded=voiceCache.get(key);
    if(!encoded){const response=await fetch(PROD_ORIGIN+'/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:normalized,profile:state.voiceMode})});if(response.status===503)cloudVoiceUnavailable=true;if(!response.ok)throw Error('tts '+response.status);const data=await response.json();encoded=data.audioContent;if(typeof encoded!=='string')throw Error('tts audio');if(voiceCache.size>=30)voiceCache.clear();voiceCache.set(key,encoded)}
    if(generation!==voiceGeneration||((!state.voice||!state.navigating)&&!force))return;
    const C=window.AudioContext||window.webkitAudioContext;if(C){voiceContext=voiceContext||new C();await voiceContext.resume();const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),buffer=await voiceContext.decodeAudioData(bytes.buffer);if(generation!==voiceGeneration||((!state.voice||!state.navigating)&&!force))return;try{activeVoiceSource?.stop()}catch{}const source=voiceContext.createBufferSource(),gain=voiceContext.createGain();gain.gain.value=4*state.voiceVolume;source.buffer=buffer;source.connect(gain).connect(voiceContext.destination);activeVoiceSource=source;source.onended=()=>{if(activeVoiceSource===source)activeVoiceSource=null};source.start();return}
  }catch(e){console.warn('Cloud navigation voice failed:',e?.message||e)}}
  if(generation===voiceGeneration&&((state.voice&&state.navigating)||force))browserSpeak(normalized,force,generation)
}
function voiceNavigation(){
  if(!state.voice||!state.navigating)return;
  const r=state.routes[state.routeIndex],p=state.routeProgress;
  if(!r||!p)return;
  const step=r.steps?.[p.stepIdx];
  if(!step)return;
  const d=Number(p.distanceToManeuver),op=String(step?.opcode||'').replace(/-/g,'_').toUpperCase(),ramp=op.startsWith('RAMP_')||op.startsWith('EXIT_');
  let bucket='step';
  if(Number.isFinite(d)&&d>=0){
    if(ramp) bucket=d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':d<=2200?'2000':d<=3200?'3000':'step';
    else bucket=d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':'step';
  }
  const key=`${p.stepIdx}:${bucket}`;
  if(key===state.lastVoice)return;
  state.lastVoice=key;
  const distance=Number.isFinite(d)&&d>=0?`${fmtSpeechD(d)}. `:'';
  const text=`${distance}${instruction(step)}`;
  if(voiceAnnouncementTimer)clearTimeout(voiceAnnouncementTimer);
  voiceAnnouncementTimer=setTimeout(()=>{
    voiceAnnouncementTimer=null;
    if(!state.voice||!state.navigating||state.lastVoice!==key)return;
    speak(text);
  },200);
}/* TMY_VOICE_V23 */
function findAheadTraffic(){
  if(!state.navigating||!state.pos||!state.jams?.length)return;
  const r=state.routes[state.routeIndex];if(!r?.coords?.length)return;
  const me=nearest(state.pos,r.coords,state.routeCursor||0);if(!me)return;
  const cum=cumulative(r.coords),at=(cum[me.index]||0)+me.t*((cum[me.index+1]||cum[me.index])-(cum[me.index]||0));
  let best=null;
  for(const j of state.jams){
    const level=Number(j.level||0);if(level<2||!j.line?.length)continue;
    const p=j.line[0],n=nearest(p,r.coords,Math.max(0,me.index-10));
    if(!n||n.distance>420)continue;
    const on=(cum[n.index]||0)+n.t*((cum[n.index+1]||cum[n.index])-(cum[n.index]||0)),ahead=on-at;
    if(ahead<-120||ahead>8000)continue;
    if(!best||ahead<best.ahead)best={jam:j,ahead:Math.max(0,ahead),level};
  }
  if(!best)return;
  const label=best.level>=4?'Silná kolóna':best.level===3?'Kolóna':'Spomalená doprava',street=String(best.jam.street||'').trim();
  const box=$('alertBox');
  if(box?.classList.contains('hidden')){box.textContent=`${label} · ${fmtD(best.ahead)} pred vozidlom${street?' · '+street:''}`;box.classList.remove('hidden')}
  if(best.ahead<=3500){const key=String(best.jam.id||`${street}:${best.level}:${Math.round(best.ahead/250)}`);if(key!==state.lastTrafficVoice){state.lastTrafficVoice=key;speak(`${label} o ${fmtSpeechD(best.ahead)}${street?' na '+street:''}.`)}}
}
function renderTraffic(){
  const r=state.routes[state.routeIndex];
  if(!state.map||!r?.coords?.length||!state.jams?.length){state.trafficLines.forEach(x=>x.remove());state.trafficLines=[];state.trafficPaintSig='';return}
  const visible=[];
  for(const j of state.jams){
    if(!j.line?.length)continue;
    const probes=[j.line[0],j.line[Math.floor(j.line.length/2)],j.line.at(-1)].filter(Boolean);
    let near=Infinity;for(const p of probes){const n=nearest(p,r.coords,state.routeCursor||0);if(n)near=Math.min(near,n.distance)}
    const level=Number(j.level||0);if(near<=420&&level>0)visible.push(j);
  }
  const sig=visible.map(j=>`${j.id||''}:${Number(j.level||0)}:${j.line?.length||0}:${j.line?.[0]?.lat||0}:${j.line?.[0]?.lng||0}`).join('|');
  if(sig===state.trafficPaintSig)return;
  state.trafficPaintSig=sig;state.trafficLines.forEach(x=>x.remove());state.trafficLines=[];
  for(const j of visible){const level=Number(j.level||0),color=level>=4?'#d93025':level===3?'#f97316':'#f4c542';state.trafficLines.push(state.L.polyline(j.line,{weight:9,opacity:.95,color,lineCap:'round',lineJoin:'round',interactive:false}).addTo(state.map))}
}
async function loadAlerts(){
  if(!state.map)return;
  const b=state.map.getBounds(),boxes=[{left:b.getWest(),right:b.getEast(),bottom:b.getSouth(),top:b.getNorth()}],route=state.routes[state.routeIndex];
  if(state.navigating&&state.pos&&route?.coords?.length){const me=nearest(state.pos,route.coords,state.routeCursor);if(me){const cum=cumulative(route.coords),start=cum[me.index]||0,points=[];for(let i=me.index;i<route.coords.length&&(cum[i]||0)-start<=30000;i++)points.push(route.coords[i]);if(points.length){const lats=points.map(p=>Number(p.lat??p[0])),lngs=points.map(p=>Number(p.lng??p[1]));boxes.push({left:Math.min(...lngs)-.025,right:Math.max(...lngs)+.025,bottom:Math.min(...lats)-.02,top:Math.max(...lats)+.02})}}}
  try{const responses=await Promise.allSettled(boxes.map(async x=>{const q=new URLSearchParams(x);const r=await fetch('https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twtraffic?'+q,{cache:'no-store'});if(!r.ok)throw Error('traffic '+r.status);return r.json()})),payloads=responses.filter(x=>x.status==='fulfilled').map(x=>x.value);if(!payloads.length)return;const unique=(items,key)=>[...new Map(items.map(x=>[key(x),x])).values()];state.alerts=unique(payloads.flatMap(d=>Array.isArray(d.alerts)?d.alerts:[]),a=>String(a.id||a.uuid||`${a.type}:${a.lat??a.location?.y}:${a.lng??a.location?.x}`)).slice(0,500);state.liveJams=unique(payloads.flatMap(d=>Array.isArray(d.jams)?d.jams:[]),j=>String(j.id||j.uuid||`${j.level}:${j.line?.[0]?.lat}:${j.line?.[0]?.lng}`));state.jams=[...(route?.trafficJams||[]),...state.liveJams];renderAlertMarkers();renderTraffic();findAheadAlert();findAheadTraffic()}catch{}
}
function renderAlertMarkers(){
  if(!state.alertsOn){state.alertMarkers.forEach(x=>x.remove());state.alertMarkers=[];state.alertPaintSig='';return}
  const list=state.alerts.slice(0,150).map(a=>({a,lat:Number(a.lat??a.location?.y??a.location?.lat),lng:Number(a.lng??a.location?.x??a.location?.lng)})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  const sig=list.map(x=>`${x.a.id||x.a.uuid||x.a.type||''}:${x.lat.toFixed(5)}:${x.lng.toFixed(5)}`).join('|');
  if(sig===state.alertPaintSig)return;
  state.alertPaintSig=sig;state.alertMarkers.forEach(x=>x.remove());state.alertMarkers=[];
  list.forEach(({a,lat,lng})=>{const type=String(a.type||'').toUpperCase(),kind=type==='POLICE'?'police':type==='JAM'?'jam':type==='ACCIDENT'?'accident':type==='CAMERA'?'camera':'warning',label=type==='POLICE'?'P':type==='JAM'?'K':type==='CAMERA'?'R':'!';state.alertMarkers.push(state.L.marker([lat,lng],{icon:state.L.divIcon({className:`alert-pin alert-pin-${kind}`,html:`<span>${label}</span>`,iconSize:[32,32]}),zIndexOffset:900}).addTo(state.map))})
}
function findAheadAlert(){if(!state.alertsOn)return $('alertBox').classList.add('hidden');const r=state.routes[state.routeIndex];if(!state.navigating||!state.pos||!r?.coords?.length)return $('alertBox').classList.add('hidden');const me=nearest(state.pos,r.coords,state.routeCursor);if(!me)return;const cum=cumulative(r.coords),at=(cum[me.index]||0)+me.t*((cum[me.index+1]||cum[me.index])-(cum[me.index]||0));let best=null;for(const a of state.alerts){const lat=Number(a.lat??a.location?.y??a.location?.lat),lng=Number(a.lng??a.location?.x??a.location?.lng);if(!Number.isFinite(lat)||!Number.isFinite(lng))continue;const n=nearest({lat,lng},r.coords,Math.max(0,me.index-10));if(!n||n.distance>450)continue;const ahead=(cum[n.index]||0)+n.t*((cum[n.index+1]||cum[n.index])-(cum[n.index]||0))-at;if(ahead>=-80&&ahead<=5500&&(!best||ahead<best.ahead))best={a,ahead}}if(!best)return $('alertBox').classList.add('hidden');const type=String(best.a.type||'').toUpperCase(),label=type==='POLICE'?'Polícia':type==='ACCIDENT'?'Nehoda':type==='JAM'?'Kolóna':type==='ROAD_CLOSED'?'Uzávierka':type==='CAMERA'?'Pevný radar':'Nebezpečenstvo';$('alertBox').textContent=`${label} · ${fmtD(Math.max(0,best.ahead))} pred vozidlom`;$('alertBox').classList.remove('hidden')}
async function searchChargers(){
  if(!state.map)return;
  const msg=$('chargerMsg');if(msg)msg.textContent='Hľadám nabíjačky v okolí…';
  const c=state.pos||state.map.getCenter(),b=state.map.getBounds();
  const run=async(latHalf,lngHalf)=>{const bh=Math.max(latHalf,Math.abs(b.getNorth()-b.getSouth())/2),bw=Math.max(lngHalf,Math.abs(b.getEast()-b.getWest())/2),q=new URLSearchParams({left:c.lng-bw,right:c.lng+bw,bottom:c.lat-bh,top:c.lat+bh});const r=await fetch('https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twchargers?'+q,{cache:'no-store'});if(!r.ok)throw Error('chargers '+r.status);const d=await r.json();return Array.isArray(d.stations)?d.stations:[]};
  try{let a=await run(.16,.22);if(!a.length)a=await run(.42,.62);state.chargers=a;if(msg)msg.textContent=a.length?`Nájdených nabíjačiek: ${a.length}`:'V širšom okolí sa nenašli nabíjačky.';renderChargers()}catch(e){state.chargers=[];renderChargers();if(msg)msg.textContent='Nabíjačky sa nepodarilo načítať.'}
}
function chargerFiltered(){return state.chargers.filter(e=>{const f=state.chargeFilter;if(f==='all')return true;const t=(e.connectors||[]).map(x=>x.type).join(' ');if(f==='tesla')return/TESLA|NACS/i.test(`${t} ${e.name||''} ${e.operator||''}`);if(f==='ccs2')return/CCS|COMBO/i.test(t);if(f==='type2')return/TYPE.?2|MENNEKES/i.test(t);const kw=f==='kw50'?50:f==='kw100'?100:150;return(e.maxKw||0)>=kw})}
function renderChargers(){state.chargerMarkers.forEach(x=>x.remove());state.chargerMarkers=[];if(!state.chargersOn)return;const a=chargerFiltered();$('chargerStatus').textContent=`${a.length} v okolí`;a.forEach(x=>{const m=state.L.marker(x.location,{icon:state.L.divIcon({className:'charge-pin',html:`⚡${x.maxKw?`<small>${Math.round(x.maxKw)}</small>`:''}`,iconSize:[34,34]}),zIndexOffset:850,riseOnHover:true}).addTo(state.map).bindPopup(`<b>${esc(x.name)}</b><br>${esc(x.address||'')}<br>${x.maxKw?x.maxKw+' kW':''}`);m.on('click',()=>setTimeout(()=>selectDestination({id:x.id,name:x.name,address:x.address||'',location:x.location}),180));state.chargerMarkers.push(m)})}

// Pairing
const PROD_ORIGIN='https://tesla-waze.vercel.app';
const MOBILE_PAIR_PAGE=PROD_ORIGIN;
const PAIR_API='https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twpair';
const MUSIC_RESOLVE_API='https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twmusic';
let pairPollTimer=null;
function stopPairPolling(){if(pairPollTimer){clearInterval(pairPollTimer);pairPollTimer=null}}
async function pairing(action,payload={}){const r=await fetch(PAIR_API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,...payload}),cache:'no-store'}),d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||'pairing');return d}
let qrLibraryPromise=null;
function loadQrLibrary(){if(window.QRCode)return Promise.resolve();if(qrLibraryPromise)return qrLibraryPromise;qrLibraryPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';s.onload=resolve;s.onerror=reject;document.head.appendChild(s)});return qrLibraryPromise}
async function renderLocalQr(url){const host=$('pairQr');if(!host||!url)return;await loadQrLibrary();host.innerHTML='';new QRCode(host,{text:url,width:260,height:260,colorDark:'#071016',colorLight:'#ffffff',correctLevel:QRCode.CorrectLevel.M})}
async function beginNewPair(body){
  stopPairPolling();body.innerHTML='<p>Pripravujem bezpečné prepojenie…</p>';
  const d=await pairing('start');
  const dev={version:2,deviceId:d.deviceId,deviceSecret:d.deviceSecret,paired:false};save(LS.device,dev);
  const rawPairUrl=d.pairingUrl||d.pairUrl||'';let pairUrl='';
  try{const raw=new URL(rawPairUrl),code=String(d.pairingCode||raw.searchParams.get('pair')||''),token=String(raw.searchParams.get('pt')||'');if(code&&token){const safe=new URL(MOBILE_PAIR_PAGE);safe.search=new URLSearchParams({pair:code,pt:token}).toString();pairUrl=safe.toString()}}catch{}
  body.innerHTML=`${pairUrl?'<div id="pairQr" class="pair-local-qr" aria-label="QR kód na prepojenie mobilu"></div>':''}<div class="code">${esc(d.pairingCode||'')}</div><p><b>Naskenujte QR kód iPhonom.</b><br>Po potvrdení sa spojenie na tejto obrazovke aktivuje automaticky.</p><p id="pairStatus">Čakám na mobil…</p>`;
  renderLocalQr(pairUrl).catch(()=>{const s=$('pairStatus');if(s)s.textContent='QR kód sa nepodarilo vytvoriť. Skúste nový kód.'});
  const expires=Date.parse(d.expiresAt||'')||Date.now()+10*60*1000;
  const check=async()=>{try{const st=await pairing('status',dev),paired=st.paired||['paired','connected','claimed'].includes(String(st.status||'').toLowerCase());if(paired){stopPairPolling();const saved={...dev,paired:true,claimedAt:st.claimedAt||new Date().toISOString()};save(LS.device,saved);startDeviceInbox();body.innerHTML='<div style="font-size:32px;color:#22d3ee">✓</div><h3>Mobil je prepojený</h3><p>Prepojenie bolo úspešne potvrdené.</p><button id="pairAgain" class="btn">Spárovať iný mobil</button>';const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body);try{renderTeslaSettings()}catch{};return}if(st.status==='expired'||Date.now()>expires){stopPairPolling();body.innerHTML='<p>Párovací kód vypršal.</p><button id="pairAgain" class="btn">Vytvoriť nový kód</button>';const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body)}}catch{}};
  pairPollTimer=setInterval(check,1800);setTimeout(check,350);
}
async function startPair(){const body=$('pairBody');$('pairModal').classList.remove('hidden');stopPairPolling();try{const credentials=load(LS.device,null);if(credentials?.deviceId&&credentials?.deviceSecret){try{const st=await pairing('status',credentials),paired=st.paired||['paired','connected','claimed'].includes(String(st.status||'').toLowerCase());if(paired){const saved={...credentials,paired:true,claimedAt:st.claimedAt||credentials.claimedAt};save(LS.device,saved);startDeviceInbox();body.innerHTML='<div style="font-size:32px;color:#22d3ee">✓</div><h3>Mobil je prepojený</h3><p>Spojenie je aktívne.</p><button id="pairAgain" class="btn">Spárovať iný mobil</button>';const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body);return}}catch{}}await beginNewPair(body)}catch(e){body.innerHTML=`<p>${esc(e.message)}</p><button id="pairAgain" class="btn">Skúsiť znova</button>`;const a=$('pairAgain');if(a)a.onclick=()=>beginNewPair(body)}}
function mobilePairMessage(title,message,error=false){document.body.innerHTML=`<main class="mobile-pair-page"><section class="mobile-pair-card"><div class="${error?'mobile-pair-error':'mobile-pair-mark'}">${error?'!':'↗'}</div><p class="mobile-pair-brand">TESLA MAPS</p><h1>${esc(title)}</h1><p id="mobilePairStatus">${esc(message)}</p></section></main>`}
function renderMobileSender(session){document.body.innerHTML=`<main class="mobile-pair-page mobile-sender-page"><section class="mobile-pair-card mobile-sender-card"><div class="mobile-sender-head"><div><p class="mobile-pair-brand">TESLA MAPS</p><h1>Poslať cieľ do auta</h1></div><span class="mobile-connected">Prepojené</span></div><p>Vyhľadajte adresu a odošlite ju priamo na obrazovku vozidla.</p><div class="mobile-search-row"><input id="mobileSearchInput" type="search" autocomplete="street-address" placeholder="Adresa, mesto alebo firma"><button id="mobileSearchButton" class="btn primary">Hľadať</button></div><div id="mobileSendStatus" class="mobile-send-status"></div><div id="mobileSearchResults" class="mobile-search-results"></div></section></main>`;const input=$('mobileSearchInput'),button=$('mobileSearchButton'),status=$('mobileSendStatus'),results=$('mobileSearchResults');let timer=null,seq=0,items=[];const find=async()=>{const q=input.value.trim();if(q.length<3){results.innerHTML='';status.textContent='Zadajte aspoň 3 znaky.';return}const n=++seq;button.disabled=true;status.textContent='Vyhľadávam…';try{const d=await (await fetch('/api/search?q='+encodeURIComponent(q),{cache:'no-store'})).json();if(n!==seq)return;items=(d.results||[]).slice(0,8);status.textContent=items.length?'Vyberte cieľ.':'Nenašli sa žiadne výsledky.';results.innerHTML=items.map((x,i)=>`<button class="mobile-result" data-mobile-result="${i}"><b>${esc(x.name)}</b><small>${esc(x.address||'')}</small></button>`).join('');results.querySelectorAll('[data-mobile-result]').forEach(b=>b.onclick=async()=>{const x=items[Number(b.dataset.mobileResult)];if(!x)return;results.querySelectorAll('button').forEach(z=>z.disabled=true);status.textContent='Odosielam cieľ do auta…';try{await pairing('send-destination',{...session,destination:x});status.innerHTML=`<strong>Cieľ bol odoslaný do auta.</strong><span>${esc(x.name)}</span>`}catch{status.textContent='Cieľ sa nepodarilo odoslať. Skontrolujte spojenie a skúste to znova.'}finally{results.querySelectorAll('button').forEach(z=>z.disabled=false)}})}catch{status.textContent='Vyhľadávanie sa nepodarilo načítať.'}finally{button.disabled=false}};button.onclick=find;input.onkeydown=e=>{if(e.key==='Enter')find()};input.oninput=()=>{clearTimeout(timer);status.textContent='';if(input.value.trim().length>=3)timer=setTimeout(find,450)};setTimeout(()=>input.focus(),100)}
function openMobilePairing(){const u=new URL(location.href),fragment=new URLSearchParams(u.hash.replace(/^#/,'')),code=String(u.searchParams.get('pair')||fragment.get('pair')||''),token=String(u.searchParams.get('pt')||fragment.get('pt')||''),stored=load(LS.mobilePair,null),fromQr=/^\d{6}$/.test(code)&&!!token,isMobile=u.searchParams.get('mobile')==='1'&&stored?.pairingCode&&stored?.pairToken;if(!fromQr&&!isMobile)return false;const session=fromQr?{pairingCode:code,pairToken:token}:stored;mobilePairMessage(fromQr?'Prepájam mobil':'Otváram mobilnú aplikáciu','Bezpečne overujem spojenie s obrazovkou vozidla…');pairing(fromQr?'claim':'mobile-status',session).then(()=>{save(LS.mobilePair,session);history.replaceState({},'',location.pathname+'?mobile=1');renderMobileSender(session)}).catch(()=>{history.replaceState({},'',location.pathname);mobilePairMessage('Prepojenie zlyhalo','QR kód vypršal alebo už nie je platný. Vytvorte v aute nový QR kód.',true)});return true}
let deviceInboxTimer=null,lastDeviceDestination='',deviceInboxBusy=false;
function startDeviceInbox(){
  if(deviceInboxTimer){clearInterval(deviceInboxTimer);deviceInboxTimer=null}
  const check=async()=>{
    if(deviceInboxBusy)return;
    const credentials=load(LS.device,null);
    if(!credentials?.deviceId||!credentials?.deviceSecret)return;
    deviceInboxBusy=true;
    try{
      const st=await pairing('status',credentials);
      if(!st.paired||!st.destination||!st.destinationUpdatedAt||st.destinationUpdatedAt===lastDeviceDestination)return;
      const incoming=st.destination;
      if(state.navigating||state.routes.length||state.dest)stopNavigation(false);
      await selectDestination(incoming);
      lastDeviceDestination=st.destinationUpdatedAt;
      showPanel(true);
      const notice=$('searchStatus');
      if(notice)notice.textContent=`Cieľ prijatý z mobilu: ${incoming.name||'cieľ'}. Trasa bola načítaná.`;
      await pairing('ack-destination',credentials);
    }catch(e){
      console.warn('Prijatie cieľa z mobilu zlyhalo:',e?.message||e);
    }finally{deviceInboxBusy=false}
  };
  check();
  deviceInboxTimer=setInterval(check,2500);
}

// Smart Music window
const MUSIC_WIN_KEY='teslaWaze:musicWindow:v1';
function musicWindowState(){return load(MUSIC_WIN_KEY,{width:520,height:Math.min(window.innerHeight,760),miniHeight:520,minimized:false})}
function applyMusicWindow(){const shell=document.querySelector('.music-shell');if(!shell)return;const cfg=musicWindowState(),maxW=Math.max(340,window.innerWidth-20),maxH=Math.max(360,window.innerHeight-20),isMax=!!cfg.maximized;if(isMax){shell.style.width=`${maxW}px`;shell.style.height=`${maxH}px`}else{const normalMaxW=Math.max(340,Math.min(window.innerWidth-20,760));shell.style.width=`${Math.max(340,Math.min(normalMaxW,cfg.width||520))}px`;const miniH=Math.max(360,Math.min(maxH,cfg.miniHeight||520));const fullH=Math.max(360,Math.min(maxH,cfg.height||Math.min(window.innerHeight,760)));shell.style.height=`${cfg.minimized?miniH:fullH}px`}shell.classList.toggle('music-minimized',!!cfg.minimized);shell.classList.toggle('music-maximized',isMax);const b=$('musicMinimize');if(b)b.textContent=cfg.minimized?'Rozbaliť':'Minimalizovať';const s=$('musicSize');if(s)s.textContent=isMax?'Pôvodný rozmer':'Maximalizovať'}/* MUSIC_MINI_RESIZE_V4 *//* MUSIC_MAX_TWO_COL_V8 */
function saveMusicWindow(patch){const cfg={...musicWindowState(),...patch};save(MUSIC_WIN_KEY,cfg);applyMusicWindow()}
function ensureMusicWindowControls(){
  const shell=document.querySelector('.music-shell'),head=document.querySelector('.music-head');if(!shell||!head||$('musicMinimize'))return;
  const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Rozmer';head.insertBefore(size,$('closeMusic'));
  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';head.insertBefore(min,$('closeMusic'));
  const left=document.createElement('div');left.className='music-resize music-resize-left';left.setAttribute('aria-hidden','true');shell.appendChild(left);
  const top=document.createElement('div');top.className='music-resize music-resize-top';top.setAttribute('aria-hidden','true');shell.appendChild(top);
  const corner=document.createElement('div');corner.className='music-resize music-resize-corner';corner.setAttribute('aria-label','Zmeniť veľkosť hudobného okna');shell.appendChild(corner);
  min.onclick=()=>{saveMusicWindow({minimized:!musicWindowState().minimized});updateMiniSeek()};/* MUSIC_LAYOUT_NO_RESTART_V5 */
  size.onclick=()=>{const cfg=musicWindowState();saveMusicWindow({maximized:!cfg.maximized})};
  const bindResize=(node,mode)=>node.addEventListener('pointerdown',e=>{e.preventDefault();node.setPointerCapture?.(e.pointerId);const sx=e.clientX,sy=e.clientY,sw=shell.getBoundingClientRect().width,sh=shell.getBoundingClientRect().height;const move=ev=>{if(mode==='w'||mode==='both'){const w=Math.max(340,Math.min(Math.min(window.innerWidth-20,760),sw+(sx-ev.clientX)));shell.style.width=w+'px'}if(mode==='h'||mode==='both'){const h=Math.max(360,Math.min(window.innerHeight-20,sh+(sy-ev.clientY)));shell.style.height=h+'px'}};const up=ev=>{node.releasePointerCapture?.(ev.pointerId);node.removeEventListener('pointermove',move);node.removeEventListener('pointerup',up);node.removeEventListener('pointercancel',up);(()=>{const rect=shell.getBoundingClientRect(),mini=musicWindowState().minimized;saveMusicWindow(mini?{width:Math.round(rect.width),miniHeight:Math.round(rect.height),minimized:true}:{width:Math.round(rect.width),height:Math.round(rect.height),minimized:false})})()};node.addEventListener('pointermove',move);node.addEventListener('pointerup',up);node.addEventListener('pointercancel',up)});
  bindResize(left,'w');bindResize(top,'h');bindResize(corner,'both');applyMusicWindow();window.addEventListener('resize',applyMusicWindow);
}
function syncMusicFab(){const f=$('musicFab'),m=$('musicModal');if(!f||!m)return;const open=!m.classList.contains('hidden');document.documentElement.classList.toggle('music-window-open',open);document.body.classList.toggle('music-window-open',open);f.classList.toggle('hidden',open);f.style.setProperty('display',open?'none':'flex','important')}
function setMusicWindowOpen(on){const m=$('musicModal');if(!m)return;m.classList.toggle('hidden',!on);syncMusicFab()}
function openMusicWindow(){ensureMusicWindowControls();setMusicWindowOpen(true);applyMusicWindow();if($('musicSearch'))$('musicSearch').placeholder='Video, rozprávka, skladba alebo interpret';renderMusicStatus();renderMusicList();const r=$('musicPlayer');const live=!!(music.current&&r&&r.children.length&&(music.audio||music.ytPlayer));if(live){refreshCurrentMusicUi();if(music.wantsPlayback&&!music.userPaused){stopMusicKeepalive();setMusicPlaying(true)}}else renderPlayer()}

const music={profile:load(LS.music,{tracks:{},artists:{},events:[],youtube:{connected:false,email:'lukaslejko@gmail.com'}}),queue:load(LS.queue,[]),current:null,audio:null,ytPlayer:null,tab:'forYou',started:0,shuffle:load('teslaWaze:musicShuffle:v1',false),autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null,anonymousYoutube:false,fallbackAttempts:0,fallbackTimer:null,gaplessBusy:false,gaplessTimer:null};
function mt(t){const id=t.id||`${norm(t.artist)}::${norm(t.title)}`;return music.profile.tracks[id]||(music.profile.tracks[id]={id,title:t.title||'',artist:t.artist||'',score:0,plays:0,completed:0,skips:0,liked:false,disliked:false,lastPlayed:null,source:t.source||'',streamUrl:t.streamUrl||'',artwork:t.artwork||'',youtubeId:t.youtubeId||''})}
function ma(n){const k=norm(n)||'unknown';return music.profile.artists[k]||(music.profile.artists[k]={name:n||'',score:0,plays:0})}
function mev(type,t){const s=mt(t),a=ma(t.artist),d={like:5,dislike:-6,complete:3,play:.4,skip:-1.5,replay:2}[type]||0;s.score+=d;a.score+=d*.7;if(type==='play'){s.plays++;a.plays++;s.lastPlayed=new Date().toISOString()}if(type==='complete')s.completed++;if(type==='skip')s.skips++;if(type==='like'){s.liked=true;s.disliked=false}music.profile.events.push({type,id:s.id,at:new Date().toISOString()});music.profile.events=music.profile.events.slice(-500);save(LS.music,music.profile);renderMusicStatus()}
function isYoutubePreference(t){return !!(t?.youtubeId||String(t?.id||'').startsWith('youtube:')||String(t?.source||'').toLowerCase().includes('youtube'))}
function musicItems(){let a=Object.values(music.profile.tracks).filter(x=>!x.disliked);if(music.tab==='likes')a=a.filter(x=>x.liked);if(music.tab==='recent')a=a.filter(x=>x.lastPlayed).sort((x,y)=>Date.parse(y.lastPlayed)-Date.parse(x.lastPlayed));else a.sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));return a.slice(0,40)}
function renderMusicStatus(){const n=Object.keys(music.profile.tracks).length,y=music.profile.youtube;$('musicStatus').textContent=`${n} naučených skladieb`;$('musicAccount').textContent=y.connected?`${y.email||'lukaslejko@gmail.com'} · synchronizované`:'lukaslejko@gmail.com · YouTube nepripojený';$('musicMiniStatus').textContent=$('musicAccount').textContent}
function canPlayInApp(t){return !!(t?.streamUrl||t?.youtubeId||String(t?.id||'').startsWith('youtube:'))}
function musicCard(t){const s=mt(t),play=!!t.streamUrl,yt=isYoutubePreference(t)||isYoutubePreference(s),inApp=play||yt;return `<div class="music-track" data-mrow="${esc(s.id)}"><img class="music-art" src="${esc(t.artwork||'')}" onerror="this.style.visibility='hidden'"><div><div class="music-title">${esc(t.title||'Bez názvu')}</div><div class="music-sub">${esc(t.artist||'')} · ${esc(t.source||'')}</div><span class="music-source">${play?'▶ FREE':yt?'▶ YOUTUBE':esc((t.source||'NÁJSŤ').toUpperCase())}</span>${s.liked?' <span class="music-source">♥</span>':''}</div><button class="btn ${inApp?'primary':''}" data-mplay="${esc(s.id)}">${inApp?'Prehrať':'Nájsť zdroj'}</button></div>`}
function renderMusicList(a=musicItems(),node=$('musicList')){node.innerHTML=a.length?a.map(musicCard).join(''):'<div class="music-empty">Zatiaľ nič. Synchronizuj YouTube alebo vyhľadaj video či skladbu.</div>';const open=t=>{if(!t)return;canPlayInApp(t)?mplay(t):musicSources(t)};node.querySelectorAll('[data-mplay]').forEach(b=>b.onclick=e=>{e.stopPropagation();open(a.find(x=>mt(x).id===b.dataset.mplay))});node.querySelectorAll('[data-mrow]').forEach(r=>r.onclick=()=>open(a.find(x=>mt(x).id===r.dataset.mrow)))}
function renderMusicGroups(groups,node){const all=groups.flatMap(g=>g.items),byId=new Map(all.map(t=>[mt(t).id,t]));node.innerHTML=groups.filter(g=>g.items.length).map(g=>`<div class="music-group-title">${esc(g.title)} <span>${g.items.length}</span></div>${g.items.map(musicCard).join('')}`).join('')||'<div class="music-empty">Nenašli sa žiadne výsledky. Skontrolujte pripojenie YouTube alebo skúste iný názov.</div>';const open=t=>{if(!t)return;canPlayInApp(t)?mplay(t):musicSources(t)};node.querySelectorAll('[data-mplay]').forEach(b=>b.onclick=e=>{e.stopPropagation();open(byId.get(b.dataset.mplay))});node.querySelectorAll('[data-mrow]').forEach(r=>r.onclick=()=>open(byId.get(r.dataset.mrow)))}
/* MUSIC_MINI_QUEUE_V1 */
function fmtMusicClock(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0)),m=Math.floor(s/60),r=s%60;return `${m}:${String(r).padStart(2,'0')}`}
function musicCurrentTime(){try{if(music.audio)return Number(music.audio.currentTime||0);if(music.ytPlayer)return Number(music.ytPlayer.getCurrentTime?.()||0)}catch{}return 0}
function musicDuration(){try{if(music.audio)return Number(music.audio.duration||0);if(music.ytPlayer)return Number(music.ytPlayer.getDuration?.()||0)}catch{}return 0}
function seekMusicTo(seconds){try{const d=musicDuration(),v=Math.max(0,Math.min(d||Infinity,Number(seconds)||0));if(music.audio){music.audio.currentTime=v;return}if(music.ytPlayer)music.ytPlayer.seekTo(v,true)}catch{}}
function updateMiniSeek(){const seek=$('musicMiniSeek'),now=$('musicMiniNow'),total=$('musicMiniTotal');if(!seek)return;const d=musicDuration(),p=musicCurrentTime();if(now)now.textContent=fmtMusicClock(p);if(total)total.textContent=d>0?fmtMusicClock(d):'--:--';seek.disabled=!(d>0);if(d>0&&document.activeElement!==seek)seek.value=String(Math.max(0,Math.min(1000,Math.round(p/d*1000))))}
function miniQueueMarkup(q,currentId){return q.slice(0,40).map((t,i)=>{const s=mt(t),active=s.id===currentId;return `<button type="button" class="music-mini-track ${active?'active':''}" data-mini-play="${esc(s.id)}"><span class="music-mini-index">${i+1}</span><img class="music-mini-art" src="${esc(t.artwork||s.artwork||'')}" onerror="this.style.visibility='hidden'"><span class="music-mini-meta"><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></span>${active?'<span class="music-mini-playing">▶</span>':''}</button>`}).join('')}

/* MUSIC_MINI_SEARCH_V6 */
function wireMiniQueue(container,q,currentId){if(!container)return;container.innerHTML=miniQueueMarkup(q,currentId||'');const byId=new Map(q.map(t=>[mt(t).id,t]));container.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)})}
function wireMiniSearch(root){
  const input=root?.querySelector?.('#musicMiniSearch'),btn=root?.querySelector?.('#musicMiniSearchBtn');if(!input||!btn)return;
  const run=async()=>{const q=input.value.trim();if(!q)return;const full=$('musicSearch');if(full)full.value=q;btn.disabled=true;btn.textContent='Hľadám…';try{await musicSearch();const box=root.querySelector('.music-mini-queue'),cur=music.current?mt(music.current).id:'';wireMiniQueue(box,Array.isArray(music.queue)?music.queue:[],cur)}finally{btn.disabled=false;btn.textContent='Hľadať'}};
  btn.onclick=run;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}};
}
function renderPlayer(){
  const r=$('musicPlayer');
  if(!music.current){
    const q=musicItems();music.queue=q;save(LS.queue,music.queue);
    r.innerHTML=`<div class="music-mini-search"><input id="musicMiniSearch" type="search" placeholder="Hľadať skladbu…" autocomplete="off"><button id="musicMiniSearchBtn" type="button" class="btn primary">Hľadať</button></div><div class="music-empty music-mini-empty">Vyber skladbu.</div><div class="music-mini-panel"><div class="music-mini-queue" style="flex:1;min-height:0;overflow-y:auto">${miniQueueMarkup(q,'')}</div></div>`;
    music.audio=null;music.ytPlayer=null;stopMediaSessionRefresh();
    const byId=new Map(q.map(t=>[mt(t).id,t]));
    r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});
    wireMiniSearch(r);
    return;
  }
  const s=mt(music.current),yt=music.current.youtubeId||s.youtubeId||(String(music.current.id||'').startsWith('youtube:')?String(music.current.id).slice(8):''),q=ensureMusicQueue(),curId=s.id;
  const media=yt?`<div id="ytPlayerHost" class="yt-player"></div>`:'<audio controls></audio>';
  const freeRow=yt?`<div class="music-free-row"><span data-free-status>${music.anonymousYoutube?'Free YouTube · reklamy môžu byť zobrazené':'YouTube účet'}</span><button type="button" class="btn" data-ma="free">S reklamami</button></div>`:'';
  const controls=`<div class="music-controls music-controls-6"><button class="btn" data-ma="prev" title="Predchádzajúca skladba">Späť</button><button class="btn primary" data-ma="toggle">Prehrať</button><button class="btn" data-ma="next" title="Ďalšia skladba">Ďalšia</button><button class="btn ${music.shuffle?'primary':''}" data-ma="shuffle">Náhodne</button><button class="btn ${music.autoNext?'primary':''}" data-ma="auto">Auto</button><button class="btn ${s.liked?'primary':''}" data-ma="like">Obľúbiť</button></div>`;
  r.innerHTML=`<div class="music-mini-search"><input id="musicMiniSearch" type="search" placeholder="Hľadať skladbu…" autocomplete="off"><button id="musicMiniSearchBtn" type="button" class="btn primary">Hľadať</button></div><div class="music-now"><img class="music-art" src="${esc(music.current.artwork||'')}"><div><div class="music-title">${esc(music.current.title)}</div><div class="music-sub">${esc(music.current.artist||'')} · ${esc(music.current.source||'')}</div></div></div>${media}${freeRow}${controls}<div class="music-mini-panel"><div class="music-mini-seekrow"><span id="musicMiniNow">0:00</span><input id="musicMiniSeek" type="range" min="0" max="1000" value="0" step="1" aria-label="Pozícia skladby"><span id="musicMiniTotal">--:--</span></div><div class="music-mini-queue" style="flex:1;min-height:0;overflow-y:auto">${miniQueueMarkup(q,curId)}</div></div>`;
  music.audio=r.querySelector('audio');music.ytPlayer=null;
  if(music.audio){music.audio.src=music.current.streamUrl||'';wireAudio()}else if(yt){setupYoutubePlayer(yt)}
  const freeBtn=r.querySelector('[data-ma=free]');if(freeBtn)freeBtn.onclick=()=>switchYoutubeToFree(yt,true);
  r.querySelector('[data-ma=toggle]').onclick=toggleMusicPlayback;
  r.querySelector('[data-ma=prev]').onclick=mprev;
  r.querySelector('[data-ma=next]').onclick=mnext;
  r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};
  r.querySelector('[data-ma=auto]').onclick=()=>{music.autoNext=!music.autoNext;save('teslaWaze:musicAutoNext:v1',music.autoNext);r.querySelector('[data-ma=auto]').classList.toggle('primary',music.autoNext)};
  r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();r.querySelector('[data-ma=like]').classList.toggle('primary',mt(music.current).liked)};
  const byId=new Map(q.map(t=>[mt(t).id,t]));
  r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});
  wireMiniSearch(r);
  const seek=$('musicMiniSeek');if(seek){seek.oninput=()=>{const d=musicDuration(),now=$('musicMiniNow');if(d>0&&now)now.textContent=fmtMusicClock(d*(Number(seek.value)||0)/1000)};seek.onchange=()=>{const d=musicDuration();if(d>0)seekMusicTo(d*(Number(seek.value)||0)/1000);updateMiniSeek()}}
  syncMediaSession();setTimeout(updateMiniSeek,250);
}
let mediaSessionRefreshTimer=null;
function stopMediaSessionRefresh(){if(mediaSessionRefreshTimer){clearInterval(mediaSessionRefreshTimer);mediaSessionRefreshTimer=null}}
function setMusicPlaying(playing){document.querySelectorAll('[data-ma=toggle]').forEach(b=>b.textContent=playing?'Pauza':'Prehrať');try{navigator.mediaSession.playbackState=playing?'playing':'paused'}catch{}stopMediaSessionRefresh();if(playing){stopMusicKeepalive();syncMediaSession();mediaSessionRefreshTimer=setInterval(syncMediaSession,1800)}else if(music.userPaused||!music.wantsPlayback)stopMusicKeepalive()}
let musicKeepalive=null,musicKeepaliveUrl=null;
function buildSilentWavUrl(){
  if(musicKeepaliveUrl)return musicKeepaliveUrl;
  try{
    const rate=8000,seconds=2,samples=rate*seconds,buf=new ArrayBuffer(44+samples*2),v=new DataView(buf);
    const w=(o,t)=>{for(let i=0;i<t.length;i++)v.setUint8(o+i,t.charCodeAt(i))};
    w(0,'RIFF');v.setUint32(4,36+samples*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,samples*2,true);for(let i=0;i<samples;i++)v.setInt16(44+i*2,(i&1)?1:-1,true);
    musicKeepaliveUrl=URL.createObjectURL(new Blob([buf],{type:'audio/wav'}));
    return musicKeepaliveUrl;
  }catch{return ''}
}
function ensureMusicKeepalive(){
  if(musicKeepalive)return musicKeepalive;
  const src=buildSilentWavUrl();if(!src)return null;
  const a=document.createElement('audio');a.src=src;a.loop=true;a.preload='auto';a.playsInline=true;a.setAttribute('playsinline','');a.volume=1;
  a.style.position='fixed';a.style.width='1px';a.style.height='1px';a.style.opacity='0';a.style.pointerEvents='none';a.setAttribute('aria-hidden','true');
  document.body.appendChild(a);musicKeepalive=a;return a;
}
function startMusicKeepalive(){
  if(music.userPaused||!music.wantsPlayback)return;
  const a=ensureMusicKeepalive();if(!a)return;
  try{if(a.paused)a.play().catch(()=>{})}catch{}
}
function stopMusicKeepalive(){try{if(musicKeepalive){musicKeepalive.pause();musicKeepalive.remove();musicKeepalive=null}}catch{}return true}
/* MUSIC_AUDIO_KEEPALIVE_V17 */
function playMusic(){music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();if(music.audio){music.audio.play().catch(()=>{});return}try{music.ytPlayer?.playVideo?.()}catch{}}
function pauseMusic(){music.userPaused=true;music.wantsPlayback=false;stopMusicKeepalive();if(music.resumeTimer){clearTimeout(music.resumeTimer);music.resumeTimer=null}if(music.audio){music.audio.pause();return}try{music.ytPlayer?.pauseVideo?.()}catch{}}
function toggleMusicPlayback(){if(music.audio){music.audio.paused?playMusic():pauseMusic();return}if(!music.ytPlayer)return;try{music.ytPlayer.getPlayerState()===YT.PlayerState.PLAYING?pauseMusic():playMusic()}catch{}}
function seekMusic(seconds){try{if(music.audio){music.audio.currentTime=Math.max(0,Math.min(music.audio.duration||Infinity,music.audio.currentTime+seconds));return}if(music.ytPlayer){const now=Number(music.ytPlayer.getCurrentTime?.()||0);music.ytPlayer.seekTo(Math.max(0,now+seconds),true)}}catch{}}
function scheduleMusicResume(){if(music.userPaused||!music.wantsPlayback||!state.navigating)return;if(music.resumeTimer)clearTimeout(music.resumeTimer);music.resumeTimer=setTimeout(()=>{music.resumeTimer=null;if(music.userPaused||!music.wantsPlayback||!state.navigating)return;if(music.audio){if(music.audio.paused)music.audio.play().catch(()=>{});return}try{const st=music.ytPlayer?.getPlayerState?.();if(st!==YT.PlayerState.PLAYING&&st!==YT.PlayerState.BUFFERING)music.ytPlayer?.playVideo?.()}catch{}},420)}
setInterval(()=>{if(state.navigating&&music.wantsPlayback&&!music.userPaused)scheduleMusicResume()},1800);
function syncMediaSession(){updateMiniSeek();if(!('mediaSession' in navigator)||!music.current)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:music.current.title||'Bez názvu',artist:music.current.artist||'',album:'Tesla Maps Smart Music',artwork:music.current.artwork?[{src:music.current.artwork}]:[]});navigator.mediaSession.playbackState=(music.wantsPlayback&&!music.userPaused)?'playing':'paused'}catch{}const actions={play:playMusic,pause:pauseMusic,stop:pauseMusic,previoustrack:mprev,nexttrack:mnext,seekbackward:()=>seekMusic(-15),seekforward:()=>seekMusic(15)};for(const [name,handler] of Object.entries(actions))try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}/* MUSIC_TESLA_MEDIA_CONTROLS_V26 */
function wireAudio(){if(!music.audio)return;music.audio.onended=()=>{if(music.current)mev('complete',music.current);if(music.autoNext){music.wantsPlayback=true;startMusicKeepalive();mnext()}else{music.wantsPlayback=false;stopMusicKeepalive();setMusicPlaying(false)}};music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true)};music.audio.onpause=()=>{setMusicPlaying(false);scheduleMusicResume()};music.audio.ontimeupdate=()=>{updateMiniSeek();if(!('mediaSession' in navigator)||!music.audio?.duration||!Number.isFinite(music.audio.duration))return;try{navigator.mediaSession.setPositionState({duration:music.audio.duration,playbackRate:music.audio.playbackRate||1,position:Math.min(music.audio.currentTime,music.audio.duration)})}catch{}}}
function ensureMusicQueue(){const items=musicItems();if(music.queue.length<2||!music.current||!music.queue.some(x=>mt(x).id===mt(music.current).id)){music.queue=items;save(LS.queue,music.queue)}return music.queue}
function mplay(t){const st=mt(t),yt=t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'');if(!t.streamUrl&&!yt)return musicSources(t);if(music.current&&music.started&&Date.now()-music.started<15000)mev('skip',music.current);const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();renderPlayer();music.started=Date.now();mev(replay?'replay':'play',t);if(music.audio)music.audio.play().catch(()=>{})}
function youtubeIdForTrack(t){if(!t)return'';const st=mt(t);return t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'')}
function nextMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;if(music.shuffle&&q.length>1){const cur=music.current?mt(music.current).id:'';const candidates=q.filter(x=>mt(x).id!==cur);return candidates[Math.floor(Math.random()*candidates.length)]||null}const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i+1+q.length)%q.length]||null}
function prevMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i-1+q.length)%q.length]||null}
function refreshCurrentMusicUi(){const r=$('musicPlayer'),t=music.current;if(!r||!t)return;const st=mt(t),art=r.querySelector('.music-now .music-art'),title=r.querySelector('.music-now .music-title'),sub=r.querySelector('.music-now .music-sub');if(art)art.src=t.artwork||st.artwork||'';if(title)title.textContent=t.title||st.title||'Bez názvu';if(sub)sub.textContent=`${t.artist||st.artist||''} · ${t.source||st.source||''}`;const like=r.querySelector('[data-ma=like]');if(like)like.classList.toggle('primary',!!st.liked);wireMiniQueue(r.querySelector('.music-mini-queue'),ensureMusicQueue(),st.id);syncMediaSession();setTimeout(updateMiniSeek,80)}
function handoffYoutubeTrack(next,reason='next'){if(!next||music.gaplessBusy||!music.ytPlayer)return false;const id=youtubeIdForTrack(next);if(!id)return false;const currentId=currentYoutubeId();if(!currentId)return false;music.gaplessBusy=true;startMusicKeepalive();const prev=music.current;music.current=next;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();if(prev)mev(reason==='auto'?'complete':'skip',prev);mev('play',next);refreshCurrentMusicUi();try{music.ytPlayer.loadVideoById(id,0,'default');setMusicPlaying(true);setTimeout(()=>{music.gaplessBusy=false},900);return true}catch{music.gaplessBusy=false;music.current=prev;return false}}
function mnext(reason='next'){const n=nextMusicTrack();if(!n)return false;if(handoffYoutubeTrack(n,reason))return true;mplay(n);return true}function mprev(){const p=prevMusicTrack();if(!p)return false;if(handoffYoutubeTrack(p,'prev'))return true;mplay(p);return true}
let ytApiPromise=null;function loadYoutubeApi(){if(window.YT&&window.YT.Player)return Promise.resolve();if(ytApiPromise)return ytApiPromise;ytApiPromise=new Promise(resolve=>{const prev=window.onYouTubeIframeAPIReady;window.onYouTubeIframeAPIReady=()=>{try{prev&&prev()}catch{}resolve()};if(!document.querySelector('script[data-yt-api]')){const s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';s.dataset.ytApi='1';document.head.appendChild(s)}});return ytApiPromise}
function currentYoutubeId(){const t=music.current;if(!t)return'';const s=mt(t);return t.youtubeId||s.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'')}
function setYoutubeFallbackStatus(text,active=false){const el=document.querySelector('[data-free-status]');if(el){el.textContent=text;el.classList.toggle('active',active)}}
async function switchYoutubeToFree(yt,manual=false){if(!yt)return;music.anonymousYoutube=true;music.fallbackAttempts=0;if(music.fallbackTimer){clearTimeout(music.fallbackTimer);music.fallbackTimer=null}setYoutubeFallbackStatus(manual?'Spúšťam bezplatné YouTube s reklamami…':'YouTube účet je blokovaný · prepínam na prehrávanie s reklamami…',true);try{music.ytPlayer?.destroy?.()}catch{}music.ytPlayer=null;const host=document.getElementById('ytPlayerHost');if(host){host.innerHTML=''}await setupYoutubePlayer(yt,true)}
function noteYoutubeBlockedState(yt){if(music.anonymousYoutube||music.userPaused||!music.wantsPlayback)return;music.fallbackAttempts=(music.fallbackAttempts||0)+1;if(music.fallbackAttempts>=3)switchYoutubeToFree(yt,false)}
async function setupYoutubePlayer(yt,anonymous=music.anonymousYoutube){try{await loadYoutubeApi();const host=document.getElementById('ytPlayerHost');if(!host)return;music.anonymousYoutube=!!anonymous;try{music.ytPlayer?.destroy?.()}catch{}host.innerHTML='';setYoutubeFallbackStatus(anonymous?'Free YouTube · reklamy môžu byť zobrazené':'YouTube účet',anonymous);music.ytPlayer=new YT.Player('ytPlayerHost',{host:anonymous?'https://www.youtube-nocookie.com':'https://www.youtube.com',videoId:yt,playerVars:{autoplay:1,playsinline:1,rel:0,origin:location.origin},events:{onReady:e=>{syncMediaSession();try{e.target.playVideo()}catch{}},onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();setTimeout(()=>{if(music.wantsPlayback&&!music.userPaused){stopMusicKeepalive();syncMediaSession()}},2000)}else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED||e.data===YT.PlayerState.UNSTARTED){if(!music.gaplessBusy){setMusicPlaying(false);scheduleMusicResume();noteYoutubeBlockedState(currentYoutubeId()||yt)}}else if(e.data===YT.PlayerState.ENDED){if(music.autoNext&&mnext('auto'))return;music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current)}},onError:()=>{if(!anonymous&&music.wantsPlayback&&!music.userPaused)noteYoutubeBlockedState(yt)}}})}catch{const h=document.getElementById('ytPlayerHost');if(h){const base=anonymous?'https://www.youtube-nocookie.com':'https://www.youtube.com';h.innerHTML=`<iframe class="yt-player" src="${base}/embed/${encodeURIComponent(yt)}?autoplay=1&playsinline=1" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;setYoutubeFallbackStatus(anonymous?'Free YouTube · reklamy môžu byť zobrazené':'YouTube účet',anonymous)}syncMediaSession()}}
setInterval(()=>{if(music.anonymousYoutube||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.();if(st!==YT.PlayerState.PLAYING&&st!==YT.PlayerState.BUFFERING)noteYoutubeBlockedState(currentYoutubeId())}catch{}},2600);setInterval(()=>{if(!music.autoNext||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.(),d=Number(music.ytPlayer.getDuration?.()||0),t=Number(music.ytPlayer.getCurrentTime?.()||0),left=d-t;if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=5.0)startMusicKeepalive();if(!music.gaplessBusy&&st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=0.38){const n=nextMusicTrack();if(n)handoffYoutubeTrack(n,'auto')}}catch{}},120);
/* MUSIC_TRANSITION_KEEPALIVE_V18 *//* MUSIC_GAPLESS_HANDOFF_V16 *//* MUSIC_FREE_FALLBACK_V15 */
async function resolveMusic(q){const r=await fetch(MUSIC_RESOLVE_API+'?q='+encodeURIComponent(q),{cache:'no-store'});if(!r.ok)throw new Error('music '+r.status);const d=await r.json();return Array.isArray(d.results)?d.results:[]}
async function searchYoutube(q){const r=await fetch(PROD_ORIGIN+'/api/music/youtube/search?q='+encodeURIComponent(q),{cache:'no-store',credentials:'include'});if(r.status===401)return [];if(!r.ok)throw new Error('youtube search '+r.status);const d=await r.json();return Array.isArray(d.items)?d.items:[]}
function setMusicSearchMode(active){document.querySelector('.music-tabs')?.classList.toggle('hidden',active);$('musicList')?.classList.toggle('hidden',active);if(!active)$('musicSearchResults').innerHTML=''}
async function musicSearch(){const q=$('musicSearch').value.trim(),o=$('musicSearchResults');if(!q){setMusicSearchMode(false);return}setMusicSearchMode(true);o.innerHTML='<div class="music-empty">Hľadám na YouTube a v ďalších zdrojoch…</div>';const nq=norm(q),profile=Object.values(music.profile.tracks).filter(t=>isYoutubePreference(t)&&!t.disliked),matching=profile.filter(t=>norm(`${t.artist} ${t.title}`).includes(nq)).sort((a,b)=>b.score-a.score),[ytResult,freeResult]=await Promise.allSettled([searchYoutube(q),resolveMusic(q)]),found=ytResult.status==='fulfilled'?ytResult.value:[],resolved=freeResult.status==='fulfilled'?freeResult.value.filter(t=>t.streamUrl):[],seen=new Set(),take=items=>items.filter(t=>{const k=t.youtubeId?`youtube:${t.youtubeId}`:`${norm(t.artist)}::${norm(t.title)}`;if(seen.has(k))return false;seen.add(k);return true}),youtube=take([...found,...matching]),seedArtists=new Set(youtube.slice(0,4).map(t=>norm(t.artist)).filter(Boolean)),recommended=youtube.length?take(profile.filter(t=>!norm(`${t.artist} ${t.title}`).includes(nq)&&seedArtists.has(norm(t.artist))).sort((a,b)=>(b.score+(b.liked?4:0))-(a.score+(a.liked?4:0))).slice(0,8)):[],other=take(resolved),a=[...youtube,...recommended,...other];if(ytResult.status==='rejected')console.warn('YouTube vyhľadávanie zlyhalo:',ytResult.reason?.message||ytResult.reason);if(freeResult.status==='rejected')console.warn('Vyhľadávanie ďalších zdrojov zlyhalo:',freeResult.reason?.message||freeResult.reason);music.queue=a;save(LS.queue,a);renderMusicGroups([{title:'YouTube',items:youtube},{title:'Podobné a odporúčané',items:recommended},{title:'Ďalšie prehrateľné zdroje',items:other}],o);if(ytResult.status==='rejected')o.insertAdjacentHTML('afterbegin','<div class="music-search-warning">YouTube vyhľadávanie sa teraz nepodarilo načítať. Skúste to znova o chvíľu.</div>')}
async function musicSources(t){const o=$('musicSources'),q=`${t.artist||''} ${t.title||''}`.trim();o.innerHTML='<div class="music-card">Hľadám prehrateľný zdroj v aplikácii…</div>';let free=[];try{free=(await resolveMusic(q)).filter(x=>x.streamUrl)}catch{}o.innerHTML=`<div class="music-card"><b>${esc(t.artist||'')} — ${esc(t.title||'')}</b>${free.length?free.map(musicCard).join(''):'<div class="music-empty">Prehrateľná verzia sa v dostupných zdrojoch nenašla.</div>'}</div>`;o.querySelectorAll('[data-mplay]').forEach(b=>b.onclick=()=>{const x=free.find(y=>mt(y).id===b.dataset.mplay);if(x){music.queue=free;mplay(x)}})}
async function syncYoutube(){try{const r=await fetch(PROD_ORIGIN+'/api/music/youtube/likes',{cache:'no-store',credentials:'include'});if(r.status===401){const u=PROD_ORIGIN+'/api/music/google/start',auth=window.open(u,'tesla-youtube-auth','popup,width=560,height=760');if($('musicAccount'))$('musicAccount').textContent=auth?'Dokončite prihlásenie v otvorenom okne':'Povoľte v prehliadači vyskakovacie okno pre prihlásenie';return}if(!r.ok)throw new Error('youtube '+r.status);const d=await r.json();(d.items||[]).forEach(t=>{const s=mt(t);s.score=Math.max(s.score,4);s.liked=true;s.artwork=t.artwork||s.artwork;s.source='YouTube Like';ma(t.artist).score=Math.max(ma(t.artist).score,2.5)});music.profile.youtube={connected:true,email:d.email||'lukaslejko@gmail.com',lastSync:new Date().toISOString(),count:d.count||0};save(LS.music,music.profile);music.queue=musicItems();save(LS.queue,music.queue);renderMusicStatus();renderMusicList()}catch(e){console.warn('YouTube synchronizácia zlyhala:',e?.message||e);if($('musicAccount'))$('musicAccount').textContent='YouTube synchronizácia zlyhala · skúste znova'}}

function bind(){ensureTeslaNavUI();ensureMusicWindowControls();renderPlaces();routingStatus();$('useVignette').checked=state.routing.useVignette;$('avoidTolls').checked=state.routing.avoidTolls;$('avoidFerries').checked=state.routing.avoidFerries;$('voiceEnabled').checked=state.voice;$('hidePanel').onclick=()=>showPanel(false);$('panelBtn').onclick=()=>showPanel(state.panelHidden);$('fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();$('routeModeBtn').onclick=toggleOverview;$('searchBtn').onclick=()=>searchPlaces(true);$('searchInput').onkeydown=e=>{if(e.key==='Enter')searchPlaces(true)};$('searchInput').oninput=()=>{clearTimeout(searchTimer);searchSeq++;$('searchResults').innerHTML='';const q=$('searchInput').value.trim();$('searchStatus').textContent=q.length>=3?'Vyhľadávam…':'';if(q.length>=3)searchTimer=setTimeout(()=>searchPlaces(false),450)};['useVignette','avoidTolls','avoidFerries'].forEach(id=>$(id).onchange=e=>{state.routing[id]=e.target.checked;save(LS.routing,state.routing);routingStatus()});$('voiceEnabled').onchange=e=>{state.voice=e.target.checked;save(LS.voice,state.voice);if(!state.voice)cancelNavigationVoice();else state.lastVoice=''};document.querySelectorAll('[data-voice]').forEach(b=>b.onclick=()=>{state.voiceMode=b.dataset.voice;save(LS.voiceMode,state.voiceMode);document.querySelectorAll('[data-voice]').forEach(x=>x.classList.toggle('active',x===b))});$('voiceTest').onclick=()=>speak('O 300 metrov odbočte doprava. Polícia pred vami, približne 800 metrov.',true);$('pairBtn').onclick=startPair;document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>{if(b.dataset.close==='pairModal')stopPairPolling();$(b.dataset.close).classList.add('hidden')});const fs=['all','tesla','ccs2','type2','kw50','kw100','kw150'];$('chargerFilters').innerHTML=fs.map(f=>`<button class="chip ${f===state.chargeFilter?'active':''}" data-cf="${f}">${{all:'Všetky',tesla:'Tesla',ccs2:'CCS2',type2:'Type 2',kw50:'≥50 kW',kw100:'≥100 kW',kw150:'≥150 kW'}[f]}</button>`).join('');document.querySelectorAll('[data-cf]').forEach(b=>b.onclick=()=>{state.chargeFilter=b.dataset.cf;save(LS.chargeFilter,state.chargeFilter);document.querySelectorAll('[data-cf]').forEach(x=>x.classList.toggle('active',x===b));renderChargers()});$('chargerToggle').onclick=()=>{state.chargersOn=!state.chargersOn;$('chargerControls').classList.toggle('hidden',!state.chargersOn);$('chargerToggle').textContent=`Nabíjačky ${state.chargersOn?'zap.':'vyp.'}`;if(state.chargersOn)searchChargers();else renderChargers()};$('chargerSearch').onclick=searchChargers;$('openMusic').onclick=openMusicWindow;if($('musicFab'))$('musicFab').onclick=()=>openMusicWindow();$('closeMusic').onclick=()=>setMusicWindowOpen(false);syncMusicFab();$('musicSearchBtn').onclick=musicSearch;$('musicSearch').onkeydown=e=>{if(e.key==='Enter')musicSearch()};let musicSearchTimer;$('musicSearch').oninput=()=>{clearTimeout(musicSearchTimer);const q=$('musicSearch').value.trim();if(q.length<3){setMusicSearchMode(false);return}musicSearchTimer=setTimeout(musicSearch,350)};$('youtubeSync').onclick=syncYoutube;document.querySelectorAll('[data-mtab]').forEach(b=>b.onclick=()=>{music.tab=b.dataset.mtab;music.queue=musicItems();save(LS.queue,music.queue);document.querySelectorAll('[data-mtab]').forEach(x=>x.classList.toggle('active',x===b));renderMusicList()});renderMusicStatus();renderPlayer();const u=new URL(location.href);if(u.searchParams.get('music')==='1'){u.searchParams.delete('music');history.replaceState({},'',u.pathname+u.search);openMusicWindow();syncYoutube()}}

window.addEventListener('click',event=>{const button=event.target?.closest?.('#youtubeSync');if(!button)return;event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();syncYoutube()},true);
window.addEventListener('message',event=>{if(event.data?.type==='tesla-youtube-connected')setTimeout(syncYoutube,450)});
if(!openMobilePairing()){bind();if($('musicFab')){$('musicFab').textContent='♫';$('musicFab').setAttribute('aria-label','Otvoriť hudbu')}initMap();startDeviceInbox()}
})();

/* TMY_FULL_NAV_V22 */

/* MUSIC_CONTINUOUS_SESSION_V24 */

/* NAV_VOICE_VOLUME_V25 */

/* MUSIC_EXCLUSIVE_FOCUS_V27 */

/* MUSIC_DISABLE_KEEPALIVE_V28 */

/* MUSIC_TRANSITION_BRIDGE_2S_V29 */

/* MUSIC_TRANSITION_BRIDGE_V30 */

/* MUSIC_TRANSITION_BRIDGE_V31 */
