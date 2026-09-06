from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_WRONG_TURN_REROUTE_V64 */'
if marker in s:
    raise SystemExit(0)

anchor="function confirmedOffRoute(distanceMeters,accuracy){return distanceMeters>Math.max(55,(Number(accuracy)||0)*2)}"
helper="""function confirmedOffRoute(distanceMeters,accuracy){return distanceMeters>Math.max(55,(Number(accuracy)||0)*2)}
function headingDelta(a,b){if(!Number.isFinite(a)||!Number.isFinite(b))return 0;return Math.abs(((a-b+540)%360)-180)}
function wrongTurnDetected(r,n){
  if(!r?.coords?.length||!n||!Number.isFinite(state.gpsHeading))return false;
  const ahead=routePointFromProjection(r.coords,n,45);if(!ahead)return false;
  const routeHeading=bearing(n.point,ahead),kmh=(Number(state.speed)||0)*3.6;
  return kmh>=6&&n.distance>=18&&headingDelta(state.gpsHeading,routeHeading)>=70;
}"""
if anchor not in s:
    raise SystemExit('confirmedOffRoute anchor missing')
s=s.replace(anchor,helper,1)

old="  const offRoute=confirmedOffRoute(n.distance,state.accuracy);"
new="  const offRoute=confirmedOffRoute(n.distance,state.accuracy)||wrongTurnDetected(r,n);"
if old not in s:
    raise SystemExit('trim offRoute anchor missing')
s=s.replace(old,new,1)

old2="  const isOffRoute=!arrived&&confirmedOffRoute(n.distance,state.accuracy);"
new2="  const isOffRoute=!arrived&&(confirmedOffRoute(n.distance,state.accuracy)||wrongTurnDetected(r,n));"
if old2 not in s:
    raise SystemExit('updateNavigation offRoute anchor missing')
s=s.replace(old2,new2,1)

for required in ["function wrongTurnDetected(r,n)","n.distance>=18","headingDelta(state.gpsHeading,routeHeading)>=70"]:
    if required not in s:
        raise SystemExit('missing '+required)

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
