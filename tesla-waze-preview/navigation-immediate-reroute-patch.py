from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_IMMEDIATE_REROUTE_V63 */'
if marker in s:
    raise SystemExit(0)

# During a live reroute always start from the vehicle's CURRENT position.
# A learned outbound corridor is only for the initial route calculation.
old="async function calculateRoute(autoStart=false){if(!state.pos||!state.dest||state.routeLoading)return;state.routeLoading=true;state.routeHadHeading=Number.isFinite(state.gpsHeading);const outCorridor=activeLocalCorridor('out',state.pos),inCorridor=activeLocalCorridor('in',state.dest.location),requestStart=outCorridor?.path?.at(-1)||state.pos,requestEnd=inCorridor?.path?.[0]||state.dest.location,request=++state.routeRequestSeq"
new="async function calculateRoute(autoStart=false){if(!state.pos||!state.dest||state.routeLoading)return;state.routeLoading=true;state.routeHadHeading=Number.isFinite(state.gpsHeading);const outCorridor=state.navigating?null:activeLocalCorridor('out',state.pos),inCorridor=activeLocalCorridor('in',state.dest.location),requestStart=outCorridor?.path?.at(-1)||state.pos,requestEnd=inCorridor?.path?.[0]||state.dest.location,request=++state.routeRequestSeq"
if old not in s:
    raise SystemExit('calculateRoute corridor anchor missing')
s=s.replace(old,new,1)

# Do not draw a rubber-band connector from the car back to the stale route.
needle="""function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex];
  if(active?.setLatLngs){"""
repl="""function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex];
  const offRoute=confirmedOffRoute(n.distance,state.accuracy);
  if(offRoute){
    active?.setStyle?.({opacity:.16,weight:6,color:'#64748b'});
    state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
    return;
  }
  if(active?.setLatLngs){"""
if needle not in s:
    raise SystemExit('trimActiveRouteBehindCar anchor missing')
s=s.replace(needle,repl,1)

# One confirmed off-route GPS fix is enough to reroute. Keep only a short anti-spam cooldown.
old_block="""  if(!arrived&&confirmedOffRoute(n.distance,state.accuracy))state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;
  if(state.offRouteHits>=2&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}"""
new_block="""  const isOffRoute=!arrived&&confirmedOffRoute(n.distance,state.accuracy);
  if(isOffRoute)state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;
  if(isOffRoute&&!state.routeLoading&&Date.now()-state.lastReroute>3000){
    state.offRouteHits=0;
    state.lastReroute=Date.now();
    calculateRoute(false);
  }"""
if old_block not in s:
    raise SystemExit('off-route reroute anchor missing')
s=s.replace(old_block,new_block,1)

# Ensure a new live route immediately restores normal route styling.
old_tail="state.routeProgress=null;state.routeCursor=0;drawRoutes(!state.navigating);renderRouteCard();if(autoStart)beginNavigationOverview();else if(state.navigating)updateNavigation()"
new_tail="state.routeProgress=null;state.routeCursor=0;state.offRouteHits=0;drawRoutes(!state.navigating);renderRouteCard();if(autoStart)beginNavigationOverview();else if(state.navigating)updateNavigation()"
if old_tail not in s:
    raise SystemExit('calculateRoute completion anchor missing')
s=s.replace(old_tail,new_tail,1)

for required in [
    "const outCorridor=state.navigating?null:activeLocalCorridor('out',state.pos)",
    "const offRoute=confirmedOffRoute(n.distance,state.accuracy);",
    "Date.now()-state.lastReroute>3000",
    "if(isOffRoute&&!state.routeLoading",
]:
    if required not in s:
        raise SystemExit('missing '+required)
if "state.offRouteHits>=2&&Date.now()-state.lastReroute>15000" in s:
    raise SystemExit('old delayed reroute still present')

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
