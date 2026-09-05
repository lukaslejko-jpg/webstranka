from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* TMY_FULL_NAV_V22 */'
if marker in s:
    raise SystemExit(0)

# tm-y exact snap/off-route thresholds.
old_off="function confirmedOffRoute(distanceMeters,accuracy){if(Number.isFinite(accuracy)&&accuracy>80)return false;return distanceMeters>Math.max(90,(Number(accuracy)||0)*2.5)}"
new_off="function confirmedOffRoute(distanceMeters,accuracy){return distanceMeters>Math.max(55,(Number(accuracy)||0)*2)}"
if old_off in s:
    s=s.replace(old_off,new_off,1)
elif new_off not in s:
    raise SystemExit('tm-y off-route threshold anchor missing')

# Remember whether the route was calculated with a usable heading, mirroring tm-y.
state_anchor="pendingAutoRoute:false};"
if state_anchor in s:
    s=s.replace(state_anchor,"pendingAutoRoute:false,routeHadHeading:false};",1)
elif "routeHadHeading:" not in s:
    raise SystemExit('state anchor missing')

# Route calculation: remember heading availability, and normalize Waze geometry origin -> destination.
old="async function calculateRoute(autoStart=false){if(!state.pos||!state.dest||state.routeLoading)return;state.routeLoading=true;const request=++state.routeRequestSeq,q=new URLSearchParams({fromLat:state.pos.lat,fromLng:state.pos.lng,toLat:state.dest.location.lat,toLng:state.dest.location.lng,useVignette:String(state.routing.useVignette),avoidTolls:String(state.routing.avoidTolls),avoidFerries:String(state.routing.avoidFerries)});"
new="async function calculateRoute(autoStart=false){if(!state.pos||!state.dest||state.routeLoading)return;state.routeLoading=true;state.routeHadHeading=Number.isFinite(state.gpsHeading);const request=++state.routeRequestSeq,q=new URLSearchParams({fromLat:state.pos.lat,fromLng:state.pos.lng,toLat:state.dest.location.lat,toLng:state.dest.location.lng,useVignette:String(state.routing.useVignette),avoidTolls:String(state.routing.avoidTolls),avoidFerries:String(state.routing.avoidFerries)});"
if old in s:
    s=s.replace(old,new,1)
elif new not in s:
    raise SystemExit('calculateRoute heading anchor missing')

# Replace route normalization with score-based origin/destination orientation.
pat=re.compile(r"state\.routes=Array\.isArray\(d\.routes\)\?d\.routes:\[\];if\(!state\.routes\.length\)throw Error\(d\.error\|\|'no routes'\);for\(const rr of state\.routes\)\{.*?\};state\.routeIndex=",re.S)
repl="state.routes=Array.isArray(d.routes)?d.routes:[];if(!state.routes.length)throw Error(d.error||'no routes');for(const rr of state.routes){if(rr?.coords?.length>1&&state.pos&&state.dest?.location){const first=rr.coords[0],last=rr.coords.at(-1),forward=dist(first,state.pos)+dist(last,state.dest.location),reverse=dist(last,state.pos)+dist(first,state.dest.location);if(reverse<forward)rr.coords=[...rr.coords].reverse()}};state.routeIndex="
s,n=pat.subn(repl,s,count=1)
if n!=1 and repl not in s:
    raise SystemExit('route normalization block missing')

# tm-y camera semantics: real/last heading, 65 m forward center, 500 ms cadence.
pat=re.compile(r"function applyHeadingUp\(markerPosition,zoom\)\{.*?\}/\* TMY_EXACT_NAV_V21 \*/",re.S)
repl_cam=r'''function applyHeadingUp(markerPosition,zoom){
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
}/* TMY_EXACT_NAV_V21 */'''
s,n=pat.subn(repl_cam,s,count=1)
if n!=1 and repl_cam not in s:
    raise SystemExit('applyHeadingUp block missing')

# tm-y active route: snapped/current point + remaining path only.
pat=re.compile(r"function trimActiveRouteBehindCar\(r,n,markerPosition\)\{.*?\n\}",re.S)
repl_trim=r'''function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex];
  if(active?.setLatLngs){
    active.setLatLngs([markerPosition,...r.coords.slice(Math.min(r.coords.length,n.index+1))]);
    active.setStyle?.({opacity:.96,weight:8,color:'#14b8e6'});
  }
  state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
}'''
s,n=pat.subn(repl_trim,s,count=1)
if n!=1 and repl_trim not in s:
    raise SystemExit('trim block missing')

# tm-y rerouting behavior: first heading can trigger one recalc; 2 confirmed off-route fixes; 15 s cooldown; no speed gate.
old_reroute="  if(confirmedOffRoute(n.distance,state.accuracy))state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;\n  if(state.offRouteHits>=4&&kmh>8&&Date.now()-state.lastReroute>30000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}"
new_reroute="  if(Number.isFinite(state.gpsHeading)&&state.routeHadHeading===false){state.routeHadHeading=true;calculateRoute(false)}\n  if(confirmedOffRoute(n.distance,state.accuracy))state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;\n  if(state.offRouteHits>=2&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}"
if old_reroute in s:
    s=s.replace(old_reroute,new_reroute,1)
elif new_reroute not in s:
    raise SystemExit('reroute block missing')

# Stop/reset should clear the tm-y heading-route flag too.
if "state.routeCursor=0;state.routeHadHeading=false;state.tripKey='';" not in s:
    s=s.replace("state.routeCursor=0;state.tripKey='';","state.routeCursor=0;state.routeHadHeading=false;state.tripKey='';",1)

# Hard behavior assertions: do not allow an old custom reroute policy to survive this final patch.
if new_off not in s:
    raise SystemExit('tm-y off-route threshold not applied')
if "state.offRouteHits>=2&&Date.now()-state.lastReroute>15000" not in s:
    raise SystemExit('tm-y reroute policy not applied')
if "state.offRouteHits>=4&&kmh>8&&Date.now()-state.lastReroute>30000" in s:
    raise SystemExit('old reroute policy still present')
if "destinationPoint(markerPosition,65,h)" not in s or "now-state.lastCameraAt<500" not in s:
    raise SystemExit('tm-y camera cadence/offset not applied')

s += "\n"+marker+"\n"
p.write_text(s,encoding='utf-8')
