from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* TMY_EXACT_NAV_V21 */'
if marker in s:
    raise SystemExit(0)

# 1) Normalize every Waze route once so coords always run origin -> destination.
old="state.routes=Array.isArray(d.routes)?d.routes:[];if(!state.routes.length)throw Error(d.error||'no routes');"
new="state.routes=Array.isArray(d.routes)?d.routes:[];if(!state.routes.length)throw Error(d.error||'no routes');for(const rr of state.routes){if(rr?.coords?.length>1&&state.pos&&state.dest?.location){const a=dist(rr.coords[0],state.pos),b=dist(rr.coords.at(-1),state.pos),da=dist(rr.coords[0],state.dest.location),db=dist(rr.coords.at(-1),state.dest.location);if(b<a&&da<db)rr.coords=[...rr.coords].reverse()}};"
if old not in s:
    raise SystemExit('route normalization anchor missing')
s=s.replace(old,new,1)

# 2) Replace all custom screen-anchor/180-degree camera logic with tm-y camera semantics:
#    heading from real vehicle movement, center 65 m ahead, camera update every ~500 ms.
pat=re.compile(r"function applyHeadingUp\(markerPosition,zoom\)\{.*?function stopHeadingUp\(reset=true\)\{[^\n]*\}",re.S)
repl=r'''function applyHeadingUp(markerPosition,zoom){
  if(!state.map||!state.navigating||!markerPosition)return;
  const now=Date.now(),h=Number.isFinite(state.gpsHeading)?state.gpsHeading:state.heading;
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
}''' + marker + r'''
function stopHeadingUp(reset=true){if(typeof state.map?.setHeading==='function')state.map.setHeading(null);if(typeof state.map?.stopHeadingUp==='function')state.map.stopHeadingUp();if(reset&&typeof state.map?.setBearing==='function')state.map.setBearing(0);state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraAt=0;state.lastBearingAt=0}'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('camera block anchor missing')

# 3) Keep only the remaining route ahead of the vehicle, exactly as tm-y does.
pat=re.compile(r"function trimActiveRouteBehindCar\(r,n,markerPosition\)\{.*?\n\}",re.S)
repl=r'''function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex];
  if(active?.setLatLngs){
    active.setLatLngs([markerPosition,...r.coords.slice(Math.min(r.coords.length,n.index+1))]);
    active.setStyle?.({opacity:.96,weight:8,color:'#14b8e6'});
  }
  state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
}'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('trim route anchor missing')

# 4) Remove route-derived heading/180-degree compensation. tm-y uses real vehicle heading.
old_block=re.compile(r"  const kmh=\(state\.speed\|\|0\)\*3\.6,op=String\(maneuver\?\.opcode\|\|''\)\.toUpperCase\(\);\n  let lookAhead=.*?  applyHeadingUp\(markerPosition,navigationZoom\(dm,maneuver\?\.opcode,kmh\)\);",re.S)
new_block="  const kmh=(state.speed||0)*3.6;\n  applyHeadingUp(markerPosition,navigationZoom(dm,maneuver?.opcode,kmh));"
s,n=old_block.subn(new_block,s,count=1)
if n!=1:
    raise SystemExit('updateNavigation heading block missing')

p.write_text(s,encoding='utf-8')
