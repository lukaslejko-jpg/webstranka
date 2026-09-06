from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_DESTINATION_ARRIVAL_V57 */'
if marker in s:
    raise SystemExit(0)

# Use a Tesla-safe destination glyph instead of the filled diamond/square fallback.
s=s.replace("if(op.includes('DESTINATION'))return '◆';","if(op.includes('DESTINATION'))return '✓';",1)

anchor="function routeTotalDistance(r){if(!r?.coords?.length)return r?.distance||0;const c=cumulative(r.coords);return c.at(-1)||r.distance||0}"
helper=r'''function routeDestinationProjection(r){
  const coords=r?.coords||[],dest=state.dest?.location;
  if(coords.length<2||!dest)return null;
  const start=Math.max(0,coords.length-600),n=nearest(dest,coords,start);
  if(!n)return null;
  const cum=cumulative(coords),a=cum[n.index]||0,b=cum[n.index+1]??a;
  return {...n,at:a+n.t*(b-a)};
}
function routeArrivalRadius(){return Math.max(35,Math.min(65,(Number(state.accuracy)||0)*1.5))}
function routeEffectiveEnd(r){
  const full=routeMeta(r).total||routeTotalDistance(r)||1,proj=routeDestinationProjection(r);
  if(proj&&proj.distance<=120)return {distance:Math.max(0,Math.min(full,proj.at)),projection:proj};
  return {distance:full,projection:null};
}'''
if anchor not in s:
    raise SystemExit('routeTotalDistance anchor missing')
s=s.replace(anchor,anchor+'\n'+helper,1)

pat=re.compile(r"function trimActiveRouteBehindCar\(r,n,markerPosition\)\{.*?\n\}",re.S)
repl=r'''function trimActiveRouteBehindCar(r,n,markerPosition){
  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;
  const active=state.routeLines?.[state.routeIndex];
  if(active?.setLatLngs){
    const eff=routeEffectiveEnd(r),proj=eff.projection,arrived=!!(state.dest?.location&&state.pos&&dist(state.pos,state.dest.location)<=routeArrivalRadius());
    let pts;
    if(proj){
      const endIndex=Math.max(0,proj.index);
      if(arrived||n.index>endIndex){pts=[markerPosition,markerPosition]}
      else{
        pts=[markerPosition,...r.coords.slice(Math.min(r.coords.length,n.index+1),Math.min(r.coords.length,endIndex+1))];
        if(proj.point){const last=pts.at(-1);if(!last||dist(last,proj.point)>1)pts.push(proj.point)}
        if(pts.length<2)pts.push(markerPosition);
      }
    }else pts=[markerPosition,...r.coords.slice(Math.min(r.coords.length,n.index+1))];
    active.setLatLngs(pts);
    active.setStyle?.({opacity:.96,weight:8,color:'#14b8e6'});
  }
  state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});
}'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('trimActiveRouteBehindCar block missing')

pat=re.compile(r"function updateNavigation\(\)\{.*?\n\}\nfunction renderRouteBox",re.S)
repl=r'''function updateNavigation(){
  const r=state.routes[state.routeIndex];
  if(!state.navigating||state.overview||!state.pos||!r?.coords?.length)return;
  const n=nearest(state.pos,r.coords,state.routeCursor);if(!n)return;state.routeCursor=Math.max(state.routeCursor,n.index);
  const meta=routeMeta(r),cum=meta.cum,rawPassed=(cum[n.index]||0)+n.t*((cum[n.index+1]??cum[n.index]??0)-(cum[n.index]||0)),eff=routeEffectiveEnd(r),total=Math.max(1,eff.distance),passed=Math.max(0,Math.min(total,rawPassed));
  const directToDest=state.dest?.location?dist(state.pos,state.dest.location):Infinity,arrived=directToDest<=routeArrivalRadius(),remaining=arrived?0:Math.max(0,total-passed);
  const steps=r.steps||[],destIdx=steps.findIndex(x=>/DESTINATION/i.test(String(x?.opcode||'')));
  let si=meta.stepDistances.findIndex((d,i)=>i>0&&d>passed+12&&d<=total+25);
  if(si<0)si=destIdx>=0?destIdx:Math.max(0,steps.length-1);
  if(arrived&&destIdx>=0)si=destIdx;
  const maneuver=steps[si],stepDistance=meta.stepDistances[si],isDestination=/DESTINATION/i.test(String(maneuver?.opcode||'')),dm=arrived?0:(isDestination?remaining:(Number.isFinite(stepDistance)?Math.max(0,Math.min(remaining,stepDistance-passed)):remaining));
  const effectiveRouteTime=(r.time||0)*(total/Math.max(meta.total||total,1));
  state.routeProgress={remainingDistance:remaining,remainingTime:effectiveRouteTime*(remaining/Math.max(total,1)),stepIdx:si,distanceToManeuver:dm,offRoute:n.distance,progressRatio:Math.max(0,Math.min(1,passed/Math.max(total,1))),arrived,directToDestination:directToDest,effectiveRouteEnd:total};
  if(!state.lastTrailAt||dist(state.lastTrailAt,state.pos)>=25){state.tripTrail.push({...state.pos});state.lastTrailAt={...state.pos};if(state.tripTrail.length>500)state.tripTrail=state.tripTrail.filter((_,i)=>i%2===0)}
  const markerPosition=shouldSnapToRoute(n.distance,state.accuracy)?n.point:state.pos;
  if(state.car)state.car.setLatLng(markerPosition);
  trimActiveRouteBehindCar(r,n,markerPosition);
  const kmh=(state.speed||0)*3.6;
  applyHeadingUp(markerPosition,navigationZoom(dm,maneuver?.opcode,kmh));
  if(Number.isFinite(state.gpsHeading)&&state.routeHadHeading===false){state.routeHadHeading=true;calculateRoute(false)}
  if(!arrived&&confirmedOffRoute(n.distance,state.accuracy))state.offRouteHits=(state.offRouteHits||0)+1;else state.offRouteHits=0;
  if(state.offRouteHits>=2&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}
  renderRouteBox();renderTeslaNavigation();voiceNavigation();findAheadAlert();findAheadTraffic();
}
function renderRouteBox'''
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('updateNavigation block missing')

# Arrival HUD: show 0 m + reached text, and no bogus next maneuver after the destination.
old="  const step=r.steps?.[p?.stepIdx||0],rawNext=r.steps?.[(p?.stepIdx||0)+1],next=/DESTINATION/i.test(String(rawNext?.opcode||''))&&((p?.remainingDistance??Infinity)>350)?null:rawNext;\n  const man=$('teslaNavManeuver');\n  const distTo=p?.distanceToManeuver??0;\n  man.innerHTML=`<div class=\"tesla-man-main\"><span class=\"tesla-turn\">${maneuverIcon(step)}</span><div><b>${fmtD(distTo)}</b><span>${esc(step?.street||instruction(step).replace(/[.]/g,''))}</span></div></div>${next?`<div class=\"tesla-man-next\"><span>${maneuverIcon(next)}</span><b>${esc(next.street||instruction(next).replace(/[.]/g,''))}</b></div>`:''}`;"
new="  const step=r.steps?.[p?.stepIdx||0],rawNext=r.steps?.[(p?.stepIdx||0)+1],arrived=!!p?.arrived,next=arrived?null:(/DESTINATION/i.test(String(rawNext?.opcode||''))&&((p?.remainingDistance??Infinity)>350)?null:rawNext);\n  const man=$('teslaNavManeuver');\n  const distTo=arrived?0:(p?.distanceToManeuver??0),displayStep=arrived?{opcode:'DESTINATION'}:step,displayText=arrived?'Cieľ dosiahnutý':(step?.street||instruction(step).replace(/[.]/g,''));\n  man.innerHTML=`<div class=\"tesla-man-main\"><span class=\"tesla-turn\">${maneuverIcon(displayStep)}</span><div><b>${fmtD(distTo)}</b><span>${esc(displayText)}</span></div></div>${next?`<div class=\"tesla-man-next\"><span>${maneuverIcon(next)}</span><b>${esc(next.street||instruction(next).replace(/[.]/g,''))}</b></div>`:''}`;"
if old not in s:
    raise SystemExit('renderTeslaNavigation HUD anchor missing')
s=s.replace(old,new,1)

for needle in ["function routeDestinationProjection(r)","effectiveRouteEnd:total","displayText=arrived?'Cieľ dosiahnutý'","if(op.includes('DESTINATION'))return '✓';"]:
    if needle not in s:
        raise SystemExit('missing '+needle)
if "if(op.includes('DESTINATION'))return '◆';" in s:
    raise SystemExit('old destination diamond still present')

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
