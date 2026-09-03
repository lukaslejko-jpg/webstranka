from pathlib import Path
import gzip, base64

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')

old="fetch('/api/waze-route?'+q,{cache:'no-store'})"
new="fetch('https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twroute?'+q,{cache:'no-store'})"
if s.count(old)!=1:
    raise SystemExit(f'route endpoint count {s.count(old)}')
s=s.replace(old,new,1)

old="state.routes=Array.isArray(d.routes)?d.routes:[];state.routeIndex=0;state.routeProgress=null;state.routeCursor=0;"
new="state.routes=Array.isArray(d.routes)?d.routes:[];state.routeIndex=0;state.jams=state.routes[0]?.trafficJams||[];state.routeProgress=null;state.routeCursor=0;"
if s.count(old)!=1:
    raise SystemExit(f'route state count {s.count(old)}')
s=s.replace(old,new,1)

old="line.on('click',()=>{state.routeIndex=i;drawRoutes(false);renderRouteCard()})"
new="line.on('click',()=>{state.routeIndex=i;state.jams=state.routes[i]?.trafficJams||[];drawRoutes(false);renderRouteCard()})"
if s.count(old)!=1:
    raise SystemExit(f'route line selection count {s.count(old)}')
s=s.replace(old,new,1)

old="c.querySelectorAll('[data-ri]').forEach(b=>b.onclick=()=>{state.routeIndex=+b.dataset.ri;drawRoutes(false);renderRouteCard()});"
new="c.querySelectorAll('[data-ri]').forEach(b=>b.onclick=()=>{state.routeIndex=+b.dataset.ri;state.jams=state.routes[state.routeIndex]?.trafficJams||[];drawRoutes(false);renderRouteCard()});"
if s.count(old)!=1:
    raise SystemExit(f'route chip selection count {s.count(old)}')
s=s.replace(old,new,1)

old="state.alerts=d.alerts||[];state.jams=d.jams||[];renderAlertMarkers();renderTraffic();findAheadAlert()"
new="state.alerts=d.alerts||[];renderAlertMarkers();renderTraffic();findAheadAlert()"
if s.count(old)!=1:
    raise SystemExit(f'alerts jam overwrite count {s.count(old)}')
s=s.replace(old,new,1)

old="renderRouteBox();renderTeslaNavigation();voiceNavigation();findAheadAlert()"
new="renderRouteBox();renderTeslaNavigation();voiceNavigation();findAheadAlert();findAheadTraffic()"
if s.count(old)!=1:
    raise SystemExit(f'nav alert call count {s.count(old)}')
s=s.replace(old,new,1)

marker="function renderTraffic(){"
traffic_fn="""function findAheadTraffic(){
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
  if(best.ahead<=3500){const key=String(best.jam.id||`${street}:${best.level}:${Math.round(best.ahead/250)}`);if(key!==state.lastTrafficVoice){state.lastTrafficVoice=key;speak(`${label} o ${fmtD(best.ahead)}${street?' na '+street:''}.`)}}
}
"""
if s.count(marker)!=1:
    raise SystemExit(f'traffic marker count {s.count(marker)}')
s=s.replace(marker,traffic_fn+marker,1)

old="state.routeProgress=null;state.lastVoice='';"
new="state.routeProgress=null;state.lastVoice='';state.lastTrafficVoice='';"
if s.count(old)!=1:
    raise SystemExit(f'route start reset count {s.count(old)}')
s=s.replace(old,new,1)

p.write_text(s,encoding='utf-8')
packed=gzip.compress(s.encode('utf-8'),compresslevel=9,mtime=0)
Path('tesla-waze-preview/app.js.gz.b64').write_text(base64.b64encode(packed).decode('ascii'),encoding='ascii')
