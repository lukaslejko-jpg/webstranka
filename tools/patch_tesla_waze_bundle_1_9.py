from pathlib import Path
import re, gzip, base64

jp=Path('tesla-waze-preview/app.js')
cp=Path('tesla-waze-preview/app.css')
s=jp.read_text(encoding='utf-8')
css=cp.read_text(encoding='utf-8')

def one(old,new,label):
    global s
    n=s.count(old)
    if n!=1:
        raise SystemExit(f'{label}: expected 1 match, got {n}')
    s=s.replace(old,new,1)

one("routeLoading:false};","routeLoading:false,lastCameraAt:0,lastCameraCenter:null,trafficPaintSig:'',alertPaintSig:''};","state extras")
s=s.replace('state.recents.slice(0,10)','state.recents.slice(0,20)')
s=s.replace('].slice(0,10);save(LS.recent,state.recents)','].slice(0,20);save(LS.recent,state.recents)')

pat=r"function applyHeadingUp\(center,zoom\)\{.*?\}\nfunction stopHeadingUp"
repl="""function applyHeadingUp(center,zoom){
  if(!state.map||!state.navigating)return;
  if(state.heading!=null&&typeof state.map.setHeading==='function')state.map.setHeading(state.heading,{ease:.16,deadzone:1.5});
  else if(state.heading!=null&&typeof state.map.setBearing==='function')state.map.setBearing(-state.heading);
  if(!center)return;
  const now=Date.now(),curZoom=Number(state.map.getZoom?.()??zoom),moved=state.lastCameraCenter?dist(state.lastCameraCenter,center):Infinity;
  if(now-state.lastCameraAt<650&&moved<22&&Math.abs(curZoom-zoom)<.55)return;
  if(moved<10&&Math.abs(curZoom-zoom)<.35)return;
  state.lastCameraAt=now;state.lastCameraCenter={lat:center.lat,lng:center.lng};
  if(Math.abs(curZoom-zoom)>=.65)state.map.setView(center,zoom,{animate:false});
  else state.map.panTo(center,{animate:true,duration:.16,noMoveStart:true});
}
function stopHeadingUp"""
s,n=re.subn(pat,repl,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'camera patch: {n}')

pat=r"function renderTeslaSettings\(\)\{.*?\n\}\nfunction toggleTeslaSettings"
repl="""function renderTeslaSettings(){
  ensureTeslaNavUI();
  const box=$('teslaSettings'),home=state.favorites.find(x=>x.kind==='home'),work=state.favorites.find(x=>x.kind==='work');
  const favs=state.favorites.filter(x=>!['home','work'].includes(x.kind)).slice(0,5),recs=state.recents.slice(0,20);
  const fs=['all','tesla','ccs2','type2','kw50','kw100','kw150'];
  box.innerHTML=`<header><b>Nastavenia</b><button class="btn" data-ts-close>✕</button></header>
  <section class="tesla-setting-block"><b>Trasa</b><button class="btn wide" data-ts-overview>${state.overview?'Späť na navigovanie':'Celá trasa'}</button><div class="chips">${state.routes.map((x,i)=>`<button class="chip ${i===state.routeIndex?'active':''}" data-ts-route="${i}">${i+1} · ${fmtT(x.time||0)} · ${fmtD(x.distance||0)}</button>`).join('')}</div></section>
  <label><span>Diaľničná známka</span><input type="checkbox" data-ts-vig ${state.routing.useVignette?'checked':''}></label>
  <label><span>Vyhnúť sa mýtu</span><input type="checkbox" data-ts-toll ${state.routing.avoidTolls?'checked':''}></label>
  <label><span>Vyhnúť sa trajektom</span><input type="checkbox" data-ts-ferry ${state.routing.avoidFerries?'checked':''}></label>
  <section class="tesla-setting-block"><b>Hlas</b><label><span>Hlasové pokyny</span><input type="checkbox" data-ts-voice ${state.voice?'checked':''}></label><div class="chips"><button class="chip ${state.voiceMode==='soft'?'active':''}" data-ts-vmode="soft">Jemný ženský</button><button class="chip ${state.voiceMode==='clear'?'active':''}" data-ts-vmode="clear">Jasný ženský</button></div><small>Predvolený režim: jemný ženský hlas</small></section>
  <section class="tesla-setting-block"><b>Upozornenia</b><label><span>Polícia / nehody / riziká</span><input type="checkbox" data-ts-alerts ${state.alertsOn?'checked':''}></label><small>${state.alerts.length?`Aktívnych hlásení v oblasti: ${state.alerts.length}`:'Momentálne bez live hlásení v oblasti'}</small></section>
  <section class="tesla-setting-block"><b>Nabíjačky</b><button class="btn wide" data-ts-chargers>⚡ ${state.chargersOn?'Skryť nabíjačky':'Zobraziť nabíjačky'}</button><div class="chips">${fs.map(f=>`<button class="chip ${f===state.chargeFilter?'active':''}" data-ts-cf="${f}">${{all:'Všetky',tesla:'Tesla',ccs2:'CCS2',type2:'Type 2',kw50:'≥50 kW',kw100:'≥100 kW',kw150:'≥150 kW'}[f]}</button>`).join('')}</div><small>${state.chargersOn?(state.chargers.length?`Načítaných staníc: ${state.chargers.length}`:'Vyhľadávam stanice v širšom okolí…'):'Nabíjačky sú vypnuté'}</small></section>
  <section class="tesla-setting-block"><b>Miesta</b><small>Aktuálny cieľ môžeš uložiť ako Domov alebo Práca.</small><div class="grid2"><button class="btn" data-ts-save-place="home" ${state.dest?'':'disabled'}>Uložiť ako Domov</button><button class="btn" data-ts-save-place="work" ${state.dest?'':'disabled'}>Uložiť ako Práca</button></div>${home||work?`<small>Uložené miesta</small><div class="grid2"><button class="btn" data-ts-go-place="home" ${home?'':'disabled'}>Domov</button><button class="btn" data-ts-go-place="work" ${work?'':'disabled'}>Práca</button></div>${home?`<small>Domov: ${esc(home.address||'')}</small>`:''}${work?`<small>Práca: ${esc(work.address||'')}</small>`:''}`:''}${favs.length?`<small>Obľúbené</small>${favs.map(x=>`<button class="result" data-ts-id="fav:${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.address)}</small></button>`).join('')}`:''}${recs.length?`<small>Posledné ciele · ${recs.length}/20</small><div class="tesla-recents-scroll">${recs.map(x=>`<button class="result" data-ts-id="rec:${esc(x.id)}"><b>${esc(x.name)}</b><small>${esc(x.address)}</small></button>`).join('')}</div>`:'<small>História cieľov je prázdna.</small>'}</section>
  <section class="tesla-setting-block"><b>Ostatné</b><button class="btn wide" data-ts-music>🎵 Hudba</button><button class="btn wide" data-ts-pair>📱 Prepojiť mobil</button><button class="btn wide" data-ts-full>⛶ Celá obrazovka</button></section>`;
  box.querySelector('[data-ts-close]').onclick=()=>box.classList.add('hidden');
  box.querySelector('[data-ts-overview]').onclick=()=>{toggleOverview();renderTeslaSettings()};
  box.querySelectorAll('[data-ts-route]').forEach(b=>b.onclick=()=>{state.routeIndex=+b.dataset.tsRoute;state.jams=[...(state.routes[state.routeIndex]?.trafficJams||[]),...(state.liveJams||[])];state.trafficPaintSig='';drawRoutes(false);state.routeCursor=0;state.routeProgress=null;if(state.overview){const rr=state.routes[state.routeIndex];if(rr?.coords?.length)state.map.fitBounds(state.L.latLngBounds(rr.coords),{padding:[70,70]})}else updateNavigation();renderTeslaSettings();renderTeslaNavigation()});
  box.querySelector('[data-ts-vig]').onchange=e=>{state.routing.useVignette=e.target.checked;save(LS.routing,state.routing);routingStatus()};
  box.querySelector('[data-ts-toll]').onchange=e=>{state.routing.avoidTolls=e.target.checked;save(LS.routing,state.routing);routingStatus()};
  box.querySelector('[data-ts-ferry]').onchange=e=>{state.routing.avoidFerries=e.target.checked;save(LS.routing,state.routing);routingStatus()};
  box.querySelector('[data-ts-voice]').onchange=e=>{state.voice=e.target.checked;save(LS.voice,state.voice)};
  box.querySelectorAll('[data-ts-vmode]').forEach(b=>b.onclick=()=>{state.voiceMode=b.dataset.tsVmode;save(LS.voiceMode,state.voiceMode);renderTeslaSettings()});
  box.querySelector('[data-ts-alerts]').onchange=e=>{state.alertsOn=e.target.checked;save(LS.alerts,state.alertsOn);state.alertPaintSig='';renderAlertMarkers();findAheadAlert()};
  box.querySelector('[data-ts-chargers]').onclick=()=>{state.chargersOn=!state.chargersOn;if(state.chargersOn)searchChargers().finally(()=>renderTeslaSettings());else{renderChargers();renderTeslaSettings()}};
  box.querySelectorAll('[data-ts-cf]').forEach(b=>b.onclick=()=>{state.chargeFilter=b.dataset.tsCf;save(LS.chargeFilter,state.chargeFilter);renderChargers();renderTeslaSettings()});
  box.querySelectorAll('[data-ts-save-place]').forEach(b=>b.onclick=()=>{if(!state.dest)return;saveFav(b.dataset.tsSavePlace);renderTeslaSettings()});
  box.querySelectorAll('[data-ts-go-place]').forEach(b=>b.onclick=()=>{const x=b.dataset.tsGoPlace==='home'?home:work;if(x){box.classList.add('hidden');selectDestination(x)}});
  box.querySelectorAll('[data-ts-id]').forEach(b=>b.onclick=()=>{const [kind,id]=b.dataset.tsId.split(':');const a=kind==='fav'?state.favorites:state.recents,x=a.find(z=>String(z.id)===id);if(x){box.classList.add('hidden');selectDestination(x)}});
  box.querySelector('[data-ts-music]').onclick=openMusicWindow;
  box.querySelector('[data-ts-pair]').onclick=startPair;
  box.querySelector('[data-ts-full]').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.();
}
function toggleTeslaSettings"""
s,n=re.subn(pat,repl,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'settings patch: {n}')

pat=r"function renderTraffic\(\)\{.*?\n\}\nasync function loadAlerts"
repl="""function renderTraffic(){
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
async function loadAlerts"""
s,n=re.subn(pat,repl,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'traffic render patch: {n}')

pat=r"function renderAlertMarkers\(\)\{.*?\}\nfunction findAheadAlert"
repl="""function renderAlertMarkers(){
  if(!state.alertsOn){state.alertMarkers.forEach(x=>x.remove());state.alertMarkers=[];state.alertPaintSig='';return}
  const list=state.alerts.slice(0,150).map(a=>({a,lat:Number(a.lat??a.location?.y??a.location?.lat),lng:Number(a.lng??a.location?.x??a.location?.lng)})).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng));
  const sig=list.map(x=>`${x.a.id||x.a.uuid||x.a.type||''}:${x.lat.toFixed(5)}:${x.lng.toFixed(5)}`).join('|');
  if(sig===state.alertPaintSig)return;
  state.alertPaintSig=sig;state.alertMarkers.forEach(x=>x.remove());state.alertMarkers=[];
  list.forEach(({a,lat,lng})=>{const type=String(a.type||'').toUpperCase(),ico=type==='POLICE'?'👮':type==='JAM'?'🚗':type==='ACCIDENT'?'💥':type==='CAMERA'?'📷':'⚠️';state.alertMarkers.push(state.L.marker([lat,lng],{icon:state.L.divIcon({className:'alert-pin',html:ico,iconSize:[30,30]}),zIndexOffset:900}).addTo(state.map))})
}
function findAheadAlert"""
s,n=re.subn(pat,repl,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'alert render patch: {n}')

pat=r"async function searchChargers\(\)\{.*?\}\nfunction chargerFiltered"
repl="""async function searchChargers(){
  if(!state.map)return;
  const msg=$('chargerMsg');if(msg)msg.textContent='Hľadám nabíjačky v okolí…';
  const c=state.pos||state.map.getCenter(),b=state.map.getBounds();
  const run=async(latHalf,lngHalf)=>{const bh=Math.max(latHalf,Math.abs(b.getNorth()-b.getSouth())/2),bw=Math.max(lngHalf,Math.abs(b.getEast()-b.getWest())/2),q=new URLSearchParams({left:c.lng-bw,right:c.lng+bw,bottom:c.lat-bh,top:c.lat+bh});const r=await fetch('/api/chargers?'+q,{cache:'no-store'});if(!r.ok)throw Error('chargers '+r.status);const d=await r.json();return Array.isArray(d.stations)?d.stations:[]};
  try{let a=await run(.16,.22);if(!a.length)a=await run(.42,.62);state.chargers=a;if(msg)msg.textContent=a.length?`Nájdených nabíjačiek: ${a.length}`:'V širšom okolí sa nenašli nabíjačky.';renderChargers()}catch(e){state.chargers=[];renderChargers();if(msg)msg.textContent='Nabíjačky sa nepodarilo načítať.'}
}
function chargerFiltered"""
s,n=re.subn(pat,repl,s,count=1,flags=re.S)
if n!=1: raise SystemExit(f'charger search patch: {n}')

old="function renderChargers(){state.chargerMarkers.forEach(x=>x.remove());state.chargerMarkers=[];if(!state.chargersOn)return;const a=chargerFiltered();$('chargerStatus').textContent=`${a.length} v okolí`;a.forEach(x=>{const m=state.L.marker(x.location,{icon:state.L.divIcon({className:'charge-pin',html:`⚡${x.maxKw?`<small>${Math.round(x.maxKw)}</small>`:''}`,iconSize:[34,34]})}).addTo(state.map)"
new="function renderChargers(){state.chargerMarkers.forEach(x=>x.remove());state.chargerMarkers=[];if(!state.chargersOn)return;const a=chargerFiltered();$('chargerStatus').textContent=`${a.length} v okolí`;a.forEach(x=>{const m=state.L.marker(x.location,{icon:state.L.divIcon({className:'charge-pin',html:`⚡${x.maxKw?`<small>${Math.round(x.maxKw)}</small>`:''}`,iconSize:[34,34]}),zIndexOffset:850,riseOnHover:true}).addTo(state.map)"
one(old,new,'charger markers')

one("function openMusicWindow(){ensureMusicWindowControls();$('musicModal').classList.remove('hidden');applyMusicWindow();renderMusicStatus();renderMusicList();renderPlayer()}","function syncMusicFab(){const f=$('musicFab'),m=$('musicModal');if(!f||!m)return;f.style.display=m.classList.contains('hidden')?'flex':'none'}\nfunction setMusicWindowOpen(on){const m=$('musicModal');if(!m)return;m.classList.toggle('hidden',!on);syncMusicFab()}\nfunction openMusicWindow(){ensureMusicWindowControls();setMusicWindowOpen(true);applyMusicWindow();renderMusicStatus();renderMusicList();renderPlayer()}","music open")
one("if($('musicFab'))$('musicFab').onclick=()=>{const m=$('musicModal');if(m.classList.contains('hidden'))openMusicWindow();else m.classList.add('hidden')};$('closeMusic').onclick=()=>$('musicModal').classList.add('hidden');","if($('musicFab'))$('musicFab').onclick=()=>openMusicWindow();$('closeMusic').onclick=()=>setMusicWindowOpen(false);syncMusicFab();","music bind")
s=s.replace("state.trafficLines.forEach(x=>x.remove());state.trafficLines=[];setNavigationShell(false)","state.trafficLines.forEach(x=>x.remove());state.trafficLines=[];state.trafficPaintSig='';setNavigationShell(false)")

jp.write_text(s,encoding='utf-8')

css += r'''

/* Tesla Waze UX bundle 2026-09-03 */
.tesla-navigating .alertbox{position:fixed!important;left:12px!important;top:154px!important;bottom:auto!important;right:auto!important;width:226px!important;max-width:calc(100vw - 24px)!important;z-index:5600!important;padding:9px 11px!important;border-radius:10px!important;font-size:13px!important;line-height:1.25!important;box-shadow:0 4px 16px #0003!important}
.tesla-recents-scroll{max-height:304px;overflow-y:auto;overscroll-behavior:contain;padding-right:4px;margin-top:5px;scrollbar-gutter:stable}
.tesla-recents-scroll .result{min-height:68px;margin:5px 0}
.tesla-settings [data-ts-save-place],.tesla-settings [data-ts-go-place]{white-space:normal;line-height:1.15;padding:8px}
.charge-pin{z-index:1!important;min-width:34px!important;min-height:34px!important}
.music-fab{transition:opacity .15s ease,transform .15s ease}
@media(max-width:700px){.tesla-navigating .alertbox{top:150px!important;width:210px!important;font-size:12px!important}.tesla-recents-scroll{max-height:288px}}
'''
cp.write_text(css,encoding='utf-8')

for src,out in [(jp,'tesla-waze-preview/app.js.gz.b64'),(cp,'tesla-waze-preview/app.css.gz.b64')]:
    raw=src.read_bytes()
    b64=base64.b64encode(gzip.compress(raw,compresslevel=9,mtime=0)).decode('ascii')
    Path(out).write_text(b64,encoding='ascii')
