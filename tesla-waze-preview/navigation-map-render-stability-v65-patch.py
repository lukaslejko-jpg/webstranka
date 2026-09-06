from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_MAP_RENDER_STABILITY_V65 */'
if marker in s:
    raise SystemExit(0)

# Keep fewer raster tiles alive in Tesla Chromium to avoid GPU/tile memory pressure.
old="const common={maxZoom:20,keepBuffer:8,updateWhenIdle:false,updateWhenZooming:false}"
new="const common={maxZoom:20,keepBuffer:3,updateWhenIdle:false,updateWhenZooming:false}"
if old not in s:
    raise SystemExit('tile common anchor missing')
s=s.replace(old,new,1)

# Track last camera zoom so we can avoid unnecessary setView calls.
old_state="lastCameraAt:0,lastCameraCenter:null,lastBearingAt:0,lastAppliedHeading:null"
new_state="lastCameraAt:0,lastCameraCenter:null,lastCameraZoom:null,lastBearingAt:0,lastAppliedHeading:null"
if old_state not in s:
    raise SystemExit('camera state anchor missing')
s=s.replace(old_state,new_state,1)

pat=re.compile(r"function applyHeadingUp\(markerPosition,zoom\)\{.*?\n\}/\* TMY_EXACT_NAV_V21 \*/",re.S)
repl=r'''function applyHeadingUp(markerPosition,zoom){
  if(!state.map||!state.navigating||!markerPosition)return;
  const now=Date.now();
  const h=Number.isFinite(state.gpsHeading)?state.gpsHeading:(Number.isFinite(state.lastAppliedHeading)?state.lastAppliedHeading:null);
  if(now-state.lastCameraAt<500)return;
  const center=Number.isFinite(h)?destinationPoint(markerPosition,65,h):markerPosition;
  const moved=state.lastCameraCenter?dist(state.lastCameraCenter,center):Infinity;
  const zoomChanged=!Number.isFinite(state.lastCameraZoom)||Math.abs(Number(zoom)-Number(state.lastCameraZoom))>=.12;
  const headingChanged=Number.isFinite(h)&&(!Number.isFinite(state.lastAppliedHeading)||headingDelta(h,state.lastAppliedHeading)>=2.5);
  if(moved<12&&!zoomChanged&&!headingChanged)return;
  state.lastCameraAt=now;
  if(headingChanged){
    if(typeof state.map.setHeading==='function')state.map.setHeading(h,{ease:1,deadzone:0});
    else if(typeof state.map.setBearing==='function')state.map.setBearing(-h);
    state.lastAppliedHeading=h;state.lastBearingAt=now;
  }
  if(moved>=12||zoomChanged){
    state.map.setView(center,zoom,{animate:false});
    state.lastCameraCenter={lat:center.lat,lng:center.lng};
    state.lastCameraZoom=Number(zoom);
  }
}/* TMY_EXACT_NAV_V21 */'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('applyHeadingUp anchor missing')

old_stop="state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraAt=0;state.lastBearingAt=0"
new_stop="state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraZoom=null;state.lastCameraAt=0;state.lastBearingAt=0"
if old_stop not in s:
    raise SystemExit('stopHeadingUp anchor missing')
s=s.replace(old_stop,new_stop,1)

for needle in ["keepBuffer:3","lastCameraZoom:null","moved<12&&!zoomChanged&&!headingChanged","headingDelta(h,state.lastAppliedHeading)>=2.5"]:
    if needle not in s:
        raise SystemExit('missing '+needle)

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
