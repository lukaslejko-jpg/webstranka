from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_CORE_V90_IMMEDIATE_REROUTE */'
if marker in s:
    raise SystemExit(0)

# 1) Navigation projection must never walk back behind the monotonic route cursor.
old="for(let i=Math.max(0,start-20);i<Math.min(coords.length-1,start+350);i++){"
new="for(let i=Math.max(0,start);i<Math.min(coords.length-1,start+350);i++){"
if old not in s:
    raise SystemExit('nearestNavigation anchor missing')
s=s.replace(old,new,1)

# 2) Detect a genuine route departure sooner. Accuracy still protects against GPS jitter.
old="function confirmedOffRoute(distanceMeters,accuracy){return distanceMeters>Math.max(55,(Number(accuracy)||0)*2)}"
new="function confirmedOffRoute(distanceMeters,accuracy){return distanceMeters>Math.max(35,(Number(accuracy)||0)*1.5)}"
if old not in s:
    raise SystemExit('confirmedOffRoute anchor missing')
s=s.replace(old,new,1)

# 3) Reduce raster tile churn in Tesla Chromium: fewer bearing/pan updates, without changing navigation zoom logic.
pat=re.compile(r"function applyHeadingUp\(markerPosition,zoom\)\{.*?\n\}/\* TMY_EXACT_NAV_V21 \*/",re.S)
repl=r'''function applyHeadingUp(markerPosition,zoom){
  if(!state.map||!state.navigating||!markerPosition)return;
  const now=Date.now();
  if(now-state.lastCameraAt<800)return;
  const h=Number.isFinite(state.gpsHeading)?state.gpsHeading:(Number.isFinite(state.lastAppliedHeading)?state.lastAppliedHeading:null),center=Number.isFinite(h)?destinationPoint(markerPosition,65,h):markerPosition;
  const moved=state.lastCameraCenter?dist(state.lastCameraCenter,center):Infinity,headingChanged=Number.isFinite(h)&&(!Number.isFinite(state.lastAppliedHeading)||headingDelta(h,state.lastAppliedHeading)>=12),zoomChanged=!Number.isFinite(state.lastCameraZoom)||Math.abs(Number(zoom)-Number(state.lastCameraZoom))>=.35;
  if(moved<10&&!headingChanged&&!zoomChanged)return;
  state.lastCameraAt=now;
  if(headingChanged){
    if(typeof state.map.setHeading==='function')state.map.setHeading(h,{ease:1,deadzone:0});
    else if(typeof state.map.setBearing==='function')state.map.setBearing(-h);
    state.lastAppliedHeading=h;state.lastBearingAt=now;
  }
  if(zoomChanged&&moved>=10)state.map.setView(center,zoom,{animate:false});
  else if(zoomChanged&&typeof state.map.setZoom==='function')state.map.setZoom(zoom,{animate:false});
  else if(moved>=10&&typeof state.map.panTo==='function')state.map.panTo(center,{animate:false});
  else if(moved>=10)state.map.setView(center,zoom,{animate:false});
  state.lastCameraCenter={lat:center.lat,lng:center.lng};state.lastCameraZoom=Number(zoom);
}/* TMY_EXACT_NAV_V21 */'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('applyHeadingUp anchor missing')

# 4) Clear every stale route/traffic overlay before an immediate reroute.
old="""if(state.wrongTurnHits>=1&&!state.routeLoading&&Date.now()-state.lastReroute>2000){
    state.wrongTurnHits=0;state.offRouteHits=0;state.lastReroute=Date.now();
    const active=state.routeLines?.[state.routeIndex];if(active?.setLatLngs)active.setLatLngs([]);active?.setStyle?.({opacity:0});
    calculateRoute(false);renderRouteBox();renderTeslaNavigation();return;
  }"""
new="""if(state.wrongTurnHits>=1&&!state.routeLoading&&Date.now()-state.lastReroute>1200){
    state.wrongTurnHits=0;state.offRouteHits=0;state.lastReroute=Date.now();
    state.routeLines?.forEach(line=>{if(line?.setLatLngs)line.setLatLngs([]);line?.setStyle?.({opacity:0})});
    state.trafficLines?.forEach(line=>line.remove());state.trafficLines=[];state.trafficPaintSig='';
    calculateRoute(false);renderRouteBox();renderTeslaNavigation();return;
  }"""
if old not in s:
    raise SystemExit('wrong-turn reroute anchor missing')
s=s.replace(old,new,1)

old="if(state.offRouteHits>=2&&!state.routeLoading&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();const active=state.routeLines?.[state.routeIndex];if(active?.setLatLngs)active.setLatLngs([]);active?.setStyle?.({opacity:0});calculateRoute(false);renderRouteBox();renderTeslaNavigation();return}"
new="if(state.offRouteHits>=1&&!state.routeLoading&&Date.now()-state.lastReroute>1200){state.offRouteHits=0;state.lastReroute=Date.now();state.routeLines?.forEach(line=>{if(line?.setLatLngs)line.setLatLngs([]);line?.setStyle?.({opacity:0})});state.trafficLines?.forEach(line=>line.remove());state.trafficLines=[];state.trafficPaintSig='';calculateRoute(false);renderRouteBox();renderTeslaNavigation();return}"
if old not in s:
    raise SystemExit('off-route reroute anchor missing')
s=s.replace(old,new,1)

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
