from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_CORE_STABILITY_V69 */'
if marker in s:
    raise SystemExit(0)

# 1) Normalize maneuver handling and skip routine CONTINUE/STRAIGHT steps when a real maneuver exists.
pat=re.compile(r"function instruction\(step\)\{.*?\}\nfunction normalizeSpeechText",re.S)
repl=r'''function normalizedOpcode(step){return String(step?.opcode||'').replace(/-/g,'_').toUpperCase()}
function isActionableManeuver(step){
  const op=normalizedOpcode(step);
  if(!op||op.includes('CONTINUE')||op.includes('STRAIGHT'))return false;
  return /(TURN|KEEP|RAMP|EXIT|ROUNDABOUT|DESTINATION|UTURN|U_TURN|MERGE|FORK|SLIGHT|SHARP)/.test(op);
}
function nextActionableStepIndex(r,meta,passed,after=-1){
  const steps=r?.steps||[],distances=meta?.stepDistances||[];
  for(let i=Math.max(0,after+1);i<steps.length;i++)if(Number.isFinite(distances[i])&&distances[i]>passed+12&&isActionableManeuver(steps[i]))return i;
  for(let i=Math.max(0,after+1);i<steps.length;i++)if(Number.isFinite(distances[i])&&distances[i]>passed+12)return i;
  return steps.length?steps.length-1:0;
}
function nextActionableStepAfter(r,index){
  const steps=r?.steps||[];
  for(let i=Math.max(0,index+1);i<steps.length;i++)if(isActionableManeuver(steps[i]))return i;
  return -1;
}
function instruction(step){const op=normalizedOpcode(step), street=step?.street?` na ${step.street}`:'';if(op.includes('RAMP_RIGHT')||op.includes('EXIT_RIGHT'))return `Zíďte z diaľnice vpravo${street}.`;if(op.includes('RAMP_LEFT')||op.includes('EXIT_LEFT'))return `Zíďte z diaľnice vľavo${street}.`;if((op.includes('TURN')||op.includes('SLIGHT')||op.includes('SHARP'))&&op.includes('RIGHT'))return `Odbočte doprava${street}.`;if((op.includes('TURN')||op.includes('SLIGHT')||op.includes('SHARP'))&&op.includes('LEFT'))return `Odbočte doľava${street}.`;if(op.includes('ROUNDABOUT'))return `Pokračujte cez kruhový objazd${street}.`;if(op.includes('DESTINATION'))return 'Cieľ je pred vami.';if(op.includes('KEEP_RIGHT'))return `Držte sa vpravo${street}.`;if(op.includes('KEEP_LEFT'))return `Držte sa vľavo${street}.`;if(op.includes('CONTINUE')||op.includes('STRAIGHT'))return `Pokračujte rovno${street}.`;return `Pokračujte podľa trasy${street}.`}
function normalizeSpeechText'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('instruction block missing')

# maneuver icon must use the same normalized direction logic.
pat=re.compile(r"function maneuverIcon\(step\)\{.*?\}/\* NAV_SAFE_ICONS_V13 \*/",re.S)
repl_icon=r'''function maneuverIcon(step){const op=normalizedOpcode(step);if(op.includes('ROUNDABOUT'))return 'O';if((op.includes('TURN')||op.includes('SLIGHT')||op.includes('SHARP')||op.includes('RAMP')||op.includes('EXIT'))&&op.includes('RIGHT'))return '→';if((op.includes('TURN')||op.includes('SLIGHT')||op.includes('SHARP')||op.includes('RAMP')||op.includes('EXIT'))&&op.includes('LEFT'))return '←';if(op.includes('KEEP_RIGHT'))return '↗';if(op.includes('KEEP_LEFT'))return '↖';if(op.includes('DESTINATION'))return '✓';return '↑'}/* NAV_SAFE_ICONS_V13 */'''
s,n=pat.subn(repl_icon,s,count=1)
if n!=1:
    raise SystemExit('maneuverIcon block missing')

# 2) Heading-aware route projection prevents snapping to a nearby opposite/parallel carriageway.
anchor="function cumulative(c){"
if anchor not in s:
    raise SystemExit('cumulative anchor missing')
nav_nearest=r'''function nearestNavigation(p,coords,start=0){
  if(!coords?.length)return null;
  let best=null;const cos=111320*Math.cos(p.lat*Math.PI/180),kmh=(Number(state.speed)||0)*3.6;
  for(let i=Math.max(0,start-20);i<Math.min(coords.length-1,start+350);i++){
    const a=coords[i],b=coords[i+1],ax=(a.lng-p.lng)*cos,ay=(a.lat-p.lat)*111320,bx=(b.lng-p.lng)*cos,by=(b.lat-p.lat)*111320,dx=bx-ax,dy=by-ay,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,-(ax*dx+ay*dy)/l)):0,d=Math.hypot(ax+t*dx,ay+t*dy);
    const segHeading=bearing(a,b),hd=Number.isFinite(state.gpsHeading)?headingDelta(state.gpsHeading,segHeading):0,penalty=kmh>=5?(hd>=120?120:hd>=85?65:hd>=60?25:0):0,score=d+penalty;
    if(!best||score<best.score)best={index:i,t,distance:d,score,point:{lat:a.lat+(b.lat-a.lat)*t,lng:a.lng+(b.lng-a.lng)*t}};
  }
  return best;
}
'''
s=s.replace(anchor,nav_nearest+anchor,1)

# 3) Strong wrong-turn detection, but suppress it briefly after accepting a freshly recalculated route.
pat=re.compile(r"function wrongTurnDetected\(r,n\)\{.*?\n\}",re.S)
repl_wrong=r'''function wrongTurnDetected(r,n){
  if(!r?.coords?.length||!n||!Number.isFinite(state.gpsHeading))return false;
  if(Date.now()-(state.routeAcceptedAt||0)<2500)return false;
  const ahead=routePointFromProjection(r.coords,n,65);if(!ahead)return false;
  const routeHeading=bearing(n.point,ahead),kmh=(Number(state.speed)||0)*3.6;
  return kmh>=5&&headingDelta(state.gpsHeading,routeHeading)>=80;
}'''
s,n=pat.subn(repl_wrong,s,count=1)
if n!=1:
    raise SystemExit('wrongTurnDetected block missing')

# 4) Stabilize camera: no unconditional setHeading/setView loop. Only meaningful movement/heading/zoom changes render.
pat=re.compile(r"function applyHeadingUp\(markerPosition,zoom\)\{.*?\}/\* TMY_EXACT_NAV_V21 \*/",re.S)
repl_cam=r'''function applyHeadingUp(markerPosition,zoom){
  if(!state.map||!state.navigating||!markerPosition)return;
  const now=Date.now();
  if(now-state.lastCameraAt<500)return;
  const h=Number.isFinite(state.gpsHeading)?state.gpsHeading:(Number.isFinite(state.lastAppliedHeading)?state.lastAppliedHeading:null),center=Number.isFinite(h)?destinationPoint(markerPosition,65,h):markerPosition;
  const moved=state.lastCameraCenter?dist(state.lastCameraCenter,center):Infinity,headingChanged=Number.isFinite(h)&&(!Number.isFinite(state.lastAppliedHeading)||headingDelta(h,state.lastAppliedHeading)>=6),zoomChanged=!Number.isFinite(state.lastCameraZoom)||Math.abs(Number(zoom)-Number(state.lastCameraZoom))>=.35;
  if(moved<7&&!headingChanged&&!zoomChanged)return;
  state.lastCameraAt=now;
  if(headingChanged){
    if(typeof state.map.setHeading==='function')state.map.setHeading(h,{ease:1,deadzone:0});
    else if(typeof state.map.setBearing==='function')state.map.setBearing(-h);
    state.lastAppliedHeading=h;state.lastBearingAt=now;
  }
  if(zoomChanged&&moved>=7)state.map.setView(center,zoom,{animate:false});
  else if(zoomChanged&&typeof state.map.setZoom==='function')state.map.setZoom(zoom,{animate:false});
  else if(moved>=7&&typeof state.map.panTo==='function')state.map.panTo(center,{animate:false});
  else if(moved>=7)state.map.setView(center,zoom,{animate:false});
  state.lastCameraCenter={lat:center.lat,lng:center.lng};state.lastCameraZoom=Number(zoom);
}/* TMY_EXACT_NAV_V21 */'''
s,n=pat.subn(repl_cam,s,count=1)
if n!=1:
    raise SystemExit('applyHeadingUp block missing')

# keep camera zoom state reset.
s=s.replace("state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraAt=0;state.lastBearingAt=0","state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraZoom=null;state.lastCameraAt=0;state.lastBearingAt=0",1)

# 5) Do not jump to destination before overview when GPS is already known.
s=s.replace("state.map.setView(x.location,15);renderDestination();if(state.pos){","if(!state.pos)state.map.setView(x.location,15,{animate:false});renderDestination();if(state.pos){",1)

# 6) Navigation UI should show next real maneuver, not the next routine CONTINUE step.
old="const step=r.steps?.[p?.stepIdx||0],rawNext=r.steps?.[(p?.stepIdx||0)+1],arrived=!!p?.arrived,next=arrived?null:(/DESTINATION/i.test(String(rawNext?.opcode||''))&&((p?.remainingDistance??Infinity)>350)?null:rawNext);"
new="const step=r.steps?.[p?.stepIdx||0],nextIdx=nextActionableStepAfter(r,p?.stepIdx||0),rawNext=nextIdx>=0?r.steps?.[nextIdx]:null,arrived=!!p?.arrived,next=arrived?null:(/DESTINATION/i.test(String(rawNext?.opcode||''))&&((p?.remainingDistance??Infinity)>350)?null:rawNext);"
if old not in s:
    raise SystemExit('renderTeslaNavigation next-step anchor missing')
s=s.replace(old,new,1)

# 7) Never draw a rubber-band line. If car is not snapped to active route, hide line until new route arrives.
pat=re.compile(r"function trimActiveRouteBehindCar\(r,n,markerPosition\)\{.*?\n\}",re.S)
repl_trim=r'''function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex],snapped=shouldSnapToRoute(n.distance,state.accuracy),rerouting=confirmedOffRoute(n.distance,state.accuracy)||wrongTurnDetected(r,n);
  if(rerouting||!snapped){
    if(active?.setLatLngs)active.setLatLngs([]);
    active?.setStyle?.({opacity:0});
    state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
    return;
  }
  if(active?.setLatLngs){
    active.setLatLngs([n.point,...r.coords.slice(Math.min(r.coords.length,n.index+1))]);
    active.setStyle?.({opacity:.96,weight:8,color:'#14b8e6'});
  }
  state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
}'''
s,n=pat.subn(repl_trim,s,count=1)
if n!=1:
    raise SystemExit('trimActiveRouteBehindCar block missing')

# 8) Replace progress / maneuver selection / reroute core.
pat=re.compile(r"function updateNavigation\(\)\{.*?\n\}\nfunction renderRouteBox",re.S)
repl_update=r'''function updateNavigation(){
  const r=state.routes[state.routeIndex];
  if(!state.navigating||state.overview||!state.pos||!r?.coords?.length)return;
  const n=nearestNavigation(state.pos,r.coords,state.routeCursor);if(!n)return;state.routeCursor=Math.max(state.routeCursor,n.index);
  const meta=routeMeta(r),cum=meta.cum,total=meta.total,passed=(cum[n.index]||0)+n.t*((cum[n.index+1]??cum[n.index]??0)-(cum[n.index]||0));
  const directToDest=state.dest?.location?dist(state.pos,state.dest.location):Infinity,arrived=directToDest<=routeArrivalRadius();
  const remaining=arrived?0:Math.max(0,total-passed);
  let si=nextActionableStepIndex(r,meta,passed,-1);
  const destIdx=(r.steps||[]).findIndex(x=>/DESTINATION/i.test(String(x?.opcode||'')));if(arrived&&destIdx>=0)si=destIdx;
  const maneuver=r.steps?.[si],stepDistance=meta.stepDistances[si],dm=arrived?0:(Number.isFinite(stepDistance)?Math.max(0,stepDistance-passed):remaining);
  state.routeProgress={remainingDistance:remaining,remainingTime:arrived?0:(r.time||0)*(remaining/Math.max(total,1)),stepIdx:si,distanceToManeuver:dm,offRoute:n.distance,progressRatio:Math.max(0,Math.min(1,passed/Math.max(total,1))),arrived,directToDestination:directToDest};
  if(!state.lastTrailAt||dist(state.lastTrailAt,state.pos)>=25){state.tripTrail.push({...state.pos});state.lastTrailAt={...state.pos};if(state.tripTrail.length>500)state.tripTrail=state.tripTrail.filter((_,i)=>i%2===0)}
  const snapped=shouldSnapToRoute(n.distance,state.accuracy),markerPosition=snapped?n.point:state.pos;
  if(state.car)state.car.setLatLng(markerPosition);
  const wrongTurn=!arrived&&wrongTurnDetected(r,n);
  if(wrongTurn)state.wrongTurnHits=(state.wrongTurnHits||0)+1;else state.wrongTurnHits=0;
  trimActiveRouteBehindCar(r,n,markerPosition);
  const kmh=(state.speed||0)*3.6;
  applyHeadingUp(markerPosition,navigationZoom(dm,maneuver?.opcode,kmh));
  if(state.wrongTurnHits>=1&&!state.routeLoading&&Date.now()-state.lastReroute>2000){
    state.wrongTurnHits=0;state.offRouteHits=0;state.lastReroute=Date.now();
    const active=state.routeLines?.[state.routeIndex];if(active?.setLatLngs)active.setLatLngs([]);active?.setStyle?.({opacity:0});
    calculateRoute(false);renderRouteBox();renderTeslaNavigation();return;
  }
  const isOffRoute=!arrived&&confirmedOffRoute(n.distance,state.accuracy);
  if(isOffRoute)state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;
  if(state.offRouteHits>=2&&!state.routeLoading&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();const active=state.routeLines?.[state.routeIndex];if(active?.setLatLngs)active.setLatLngs([]);active?.setStyle?.({opacity:0});calculateRoute(false);renderRouteBox();renderTeslaNavigation();return}
  renderRouteBox();renderTeslaNavigation();voiceNavigation();findAheadAlert();findAheadTraffic();
}
function renderRouteBox'''
s,n=pat.subn(repl_update,s,count=1)
if n!=1:
    raise SystemExit('updateNavigation block missing')

# 9) Remove automatic second route calculation merely because heading became available.
s=s.replace("if(Number.isFinite(state.gpsHeading)&&state.routeHadHeading===false){state.routeHadHeading=true;calculateRoute(false)}\n","")

# 10) Mark accepted route and reset wrong-turn guard after every successful route calculation.
old="state.routeProgress=null;state.routeCursor=0;state.offRouteHits=0;drawRoutes(!state.navigating);"
new="state.routeProgress=null;state.routeCursor=0;state.offRouteHits=0;state.wrongTurnHits=0;state.routeAcceptedAt=Date.now();drawRoutes(!state.navigating);"
if old not in s:
    raise SystemExit('calculateRoute acceptance anchor missing')
s=s.replace(old,new,1)

# State additions.
if "routeAcceptedAt:" not in s:
    s=s.replace("routeHadHeading:false};","routeHadHeading:false,routeAcceptedAt:0,wrongTurnHits:0};",1)

# Hard invariants.
checks=[
    "function nextActionableStepIndex",
    "function nearestNavigation",
    "if(rerouting||!snapped)",
    "active.setLatLngs([])",
    "state.wrongTurnHits>=1",
    "state.routeAcceptedAt=Date.now()",
    "if(!state.pos)state.map.setView(x.location,15,{animate:false})",
]
for item in checks:
    if item not in s:
        raise SystemExit('V69 validation failed: '+item)
if "state.map.setView(x.location,15);" in s:
    raise SystemExit('old destination jump still present')
if "state.routeHadHeading=true;calculateRoute(false)" in s:
    raise SystemExit('automatic heading recalc still present')

s += "\n"+marker+"\n"
p.write_text(s,encoding='utf-8')
