from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_TMY_CORE_CONSOLIDATED_V67 */'
if marker in s:
    raise SystemExit(0)

# 1) Local corridors stay stored and keep influencing route geometry, but must NOT inject synthetic
# CONTINUE/DESTINATION steps into Waze maneuver data. Those synthetic steps can make voice say
# "Pokračujte rovno" while the real route turns left/right.
pat=re.compile(r"function applyLocalCorridorsToRoute\(rr,outCorridor,inCorridor\)\{.*?return rr\}",re.S)
repl=r'''function applyLocalCorridorsToRoute(rr,outCorridor,inCorridor){
  let coords=rr.coords||[],added=0;
  if(outCorridor?.path?.length){const p=sampledPath(outCorridor.path,50);coords=mergeRoutePaths(p,coords);added+=localPathLength(p)}
  if(inCorridor?.path?.length){const p=sampledPath(inCorridor.path,50);coords=mergeRoutePaths(coords,p);added+=localPathLength(p)}
  rr.coords=coords;
  rr.distance=cumulative(coords).at(-1)||rr.distance||0;
  rr.time=Math.max(1,Number(rr.time)||0)+added/7;
  rr.learnedLocal=!!(outCorridor||inCorridor);
  routeMetaCache.delete(rr);
  return rr
}'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('applyLocalCorridorsToRoute block missing')

# 2) Restore the exact TM-Y camera semantics from the original V22 reference.
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
if n!=1:
    raise SystemExit('applyHeadingUp block missing')

# Reset helper no longer needs V65 camera zoom state.
s=s.replace("state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraZoom=null;state.lastCameraAt=0;state.lastBearingAt=0","state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraAt=0;state.lastBearingAt=0")

# 3) Restore TM-Y active-route trimming. Keep a tiny isolated guard only while clearly off route
# so we do not draw a rubber-band line back to the obsolete route before reroute finishes.
pat=re.compile(r"function trimActiveRouteBehindCar\(r,n,markerPosition\)\{.*?\n\}",re.S)
repl_trim=r'''function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex];
  const rerouting=confirmedOffRoute(n.distance,state.accuracy)||wrongTurnDetected(r,n);
  if(rerouting){
    active?.setStyle?.({opacity:.16,weight:6,color:'#64748b'});
    state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
    return;
  }
  if(active?.setLatLngs){
    active.setLatLngs([markerPosition,...r.coords.slice(Math.min(r.coords.length,n.index+1))]);
    active.setStyle?.({opacity:.96,weight:8,color:'#14b8e6'});
  }
  state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
}'''
s,n=pat.subn(repl_trim,s,count=1)
if n!=1:
    raise SystemExit('trimActiveRouteBehindCar block missing')

# 4) Restore TM-Y progress and maneuver selection. Arrival handling is kept as an isolated overlay,
# and immediate wrong-turn reroute is kept as an isolated overlay as requested.
pat=re.compile(r"function updateNavigation\(\)\{.*?\n\}\nfunction renderRouteBox",re.S)
repl_update=r'''function updateNavigation(){
  const r=state.routes[state.routeIndex];
  if(!state.navigating||state.overview||!state.pos||!r?.coords?.length)return;
  const n=nearest(state.pos,r.coords,state.routeCursor);if(!n)return;state.routeCursor=Math.max(state.routeCursor,n.index);
  const meta=routeMeta(r),cum=meta.cum,total=meta.total,passed=(cum[n.index]||0)+n.t*((cum[n.index+1]??cum[n.index]??0)-(cum[n.index]||0));
  const directToDest=state.dest?.location?dist(state.pos,state.dest.location):Infinity,arrived=directToDest<=routeArrivalRadius();
  const remaining=arrived?0:Math.max(0,total-passed);
  let si=meta.stepDistances.findIndex((d,i)=>i>0&&d>passed+12);if(si<0)si=Math.max(0,(r.steps||[]).length-1);
  const destIdx=(r.steps||[]).findIndex(x=>/DESTINATION/i.test(String(x?.opcode||'')));if(arrived&&destIdx>=0)si=destIdx;
  const maneuver=r.steps?.[si],stepDistance=meta.stepDistances[si],dm=arrived?0:(Number.isFinite(stepDistance)?Math.max(0,stepDistance-passed):remaining);
  state.routeProgress={remainingDistance:remaining,remainingTime:arrived?0:(r.time||0)*(remaining/Math.max(total,1)),stepIdx:si,distanceToManeuver:dm,offRoute:n.distance,progressRatio:Math.max(0,Math.min(1,passed/Math.max(total,1))),arrived,directToDestination:directToDest};
  if(!state.lastTrailAt||dist(state.lastTrailAt,state.pos)>=25){state.tripTrail.push({...state.pos});state.lastTrailAt={...state.pos};if(state.tripTrail.length>500)state.tripTrail=state.tripTrail.filter((_,i)=>i%2===0)}
  const markerPosition=shouldSnapToRoute(n.distance,state.accuracy)?n.point:state.pos;
  if(state.car)state.car.setLatLng(markerPosition);
  trimActiveRouteBehindCar(r,n,markerPosition);
  const kmh=(state.speed||0)*3.6;
  applyHeadingUp(markerPosition,navigationZoom(dm,maneuver?.opcode,kmh));
  if(Number.isFinite(state.gpsHeading)&&state.routeHadHeading===false){state.routeHadHeading=true;calculateRoute(false)}
  const isOffRoute=!arrived&&(confirmedOffRoute(n.distance,state.accuracy)||wrongTurnDetected(r,n));
  if(isOffRoute)state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;
  if(isOffRoute&&!state.routeLoading&&Date.now()-state.lastReroute>3000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}
  renderRouteBox();renderTeslaNavigation();voiceNavigation();findAheadAlert();findAheadTraffic();
}
function renderRouteBox'''
s,n=pat.subn(repl_update,s,count=1)
if n!=1:
    raise SystemExit('updateNavigation block missing')

# 5) Restore the exact TM-Y V23 voice scheduler. No V66 bucket history or custom maneuver identity.
pat=re.compile(r"function voiceNavigation\(\)\{.*?\}/\* TMY_VOICE_V23 \*/",re.S)
repl_voice=r'''function voiceNavigation(){
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
}/* TMY_VOICE_V23 */'''
s,n=pat.subn(repl_voice,s,count=1)
if n!=1:
    raise SystemExit('voiceNavigation block missing')

# Remove any V66 voice-history state/functions if present; they must not affect V23 scheduling.
s=re.sub(r"\nfunction maneuverVoiceIdentity\(.*?\n\}","",s,flags=re.S)
s=re.sub(r"\nfunction voiceBucketRank\(.*?\n\}","",s,flags=re.S)

# Assertions: synthetic local steps gone; TM-Y camera/step selection/voice restored.
checks=[
    "destinationPoint(markerPosition,65,h)",
    "if(now-state.lastCameraAt<500)return;",
    "let si=meta.stepDistances.findIndex((d,i)=>i>0&&d>passed+12)",
    "const key=`${p.stepIdx}:${bucket}`",
    "d<=100?'now':d<=250?'200':d<=600?'500':d<=1200?'1000':'step'",
]
for item in checks:
    if item not in s:
        raise SystemExit('V67 validation failed: '+item)
if "learnedLocal:true" in s:
    raise SystemExit('synthetic learnedLocal step still present')

s += "\n"+marker+"\n"
p.write_text(s,encoding='utf-8')
