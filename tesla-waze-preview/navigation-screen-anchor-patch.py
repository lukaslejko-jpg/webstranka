from pathlib import Path
import re

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* NAV_SCREEN_ANCHOR_V16 */'
if marker in s:
    raise SystemExit(0)

# Replace the old geographic camera-centering function with a true screen-space anchor.
pat = re.compile(r"function applyHeadingUp\(center,zoom\)\{.*?\}/\* NAV_AUDIO_STABILITY_V14 \*/", re.S)
new = r'''function applyHeadingUp(markerPosition,zoom){
  if(!state.map||!state.navigating||!markerPosition)return;
  const now=Date.now();
  if(state.heading!=null){
    const delta=state.lastAppliedHeading==null?180:Math.abs(((state.heading-state.lastAppliedHeading+540)%360)-180);
    if(delta>=4&&now-state.lastBearingAt>=1200){
      if(typeof state.map.setHeading==='function')state.map.setHeading(state.heading,{ease:0,deadzone:0});
      else if(typeof state.map.setBearing==='function')state.map.setBearing(-state.heading);
      state.lastAppliedHeading=state.heading;state.lastBearingAt=now;
    }
  }
  const curZoom=Number(state.map.getZoom?.()??zoom);
  if(Math.abs(curZoom-zoom)>=.75&&now-state.lastCameraAt>=900){
    if(typeof state.map.setZoom==='function')state.map.setZoom(zoom,{animate:false});
    else state.map.setView(state.map.getCenter(),zoom,{animate:false});
  }
  const size=state.map.getSize?.();
  if(!size)return;
  const desiredX=size.x*.50,desiredY=size.y*.68;
  const pt=state.map.latLngToContainerPoint?.(markerPosition);
  if(!pt)return;
  const dx=pt.x-desiredX,dy=pt.y-desiredY;
  if(Math.abs(dx)>2||Math.abs(dy)>2){
    state.map.panBy([dx,dy],{animate:false,noMoveStart:true});
  }
  state.lastCameraAt=now;state.lastCameraCenter={lat:markerPosition.lat,lng:markerPosition.lng};
}/* NAV_SCREEN_ANCHOR_V16 *//* NAV_AUDIO_STABILITY_V14 */'''
s2, n = pat.subn(new, s, count=1)
if n != 1:
    raise SystemExit('applyHeadingUp anchor missing')
s = s2

# Stop using the geographic look-ahead point as the map center.
old = "const cameraCenter=routePointFromProjection(r.coords,n,lookAhead)||markerPosition;\n  applyHeadingUp(cameraCenter,navigationZoom(dm,maneuver?.opcode,kmh));"
new_call = "applyHeadingUp(markerPosition,navigationZoom(dm,maneuver?.opcode,kmh));"
if old not in s:
    raise SystemExit('cameraCenter anchor missing')
s = s.replace(old, new_call, 1)

# Keep the vehicle icon above route/traffic paths.
old_marker = "state.car=state.L.marker(state.pos,{icon:state.L.divIcon({className:'car-wrap',html:'<div class=\"car-arrow\">▲</div>',iconSize:[38,38],iconAnchor:[19,19]})}).addTo(state.map)"
if old_marker in s:
    s = s.replace(old_marker, old_marker + ";state.car.setZIndexOffset?.(5000)", 1)

p.write_text(s, encoding='utf-8')
