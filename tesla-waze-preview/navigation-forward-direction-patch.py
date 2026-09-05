from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_FORWARD_TO_DEST_V20 */'
if marker in s:
    raise SystemExit(0)

# Add direction helpers before the remaining-route trimmer.
anchor="/* NAV_REMAINING_ROUTE_V13 */\nfunction trimActiveRouteBehindCar(r,n,markerPosition){"
helpers=r'''/* NAV_REMAINING_ROUTE_V13 */
function routeDestinationAtEnd(r){
  const coords=r?.coords||[],d=state.dest?.location;
  if(coords.length<2||!d)return true;
  return dist(coords.at(-1),d)<=dist(coords[0],d);
}
function routeForwardCoords(r,n,markerPosition){
  const coords=r?.coords||[];
  if(!coords.length||!n)return markerPosition?[markerPosition]:[];
  if(routeDestinationAtEnd(r))return [markerPosition,...coords.slice(Math.min(coords.length,n.index+1))];
  return [markerPosition,...coords.slice(0,Math.max(0,n.index+1)).reverse()];
}
function routeForwardPointToDestination(r,n,meters){
  const coords=r?.coords||[];
  if(!coords.length||!n)return null;
  let left=Math.max(0,Number(meters)||0),start=n.point;
  if(routeDestinationAtEnd(r)){
    for(let i=n.index+1;i<coords.length;i++){
      const end=coords[i],d=dist(start,end);
      if(d>=left&&d>0){const t=left/d;return {lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t}}
      left-=d;start=end;
    }
    return coords.at(-1);
  }
  for(let i=n.index;i>=0;i--){
    const end=coords[i],d=dist(start,end);
    if(d>=left&&d>0){const t=left/d;return {lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t}}
    left-=d;start=end;
  }
  return coords[0];
}
function trimActiveRouteBehindCar(r,n,markerPosition){'''
if anchor not in s:
    raise SystemExit('remaining route anchor missing')
s=s.replace(anchor,helpers,1)

old="    const tail=r.coords.slice(Math.min(r.coords.length,n.index+1));\n    active.setLatLngs([markerPosition,...tail]);"
new="    const remaining=routeForwardCoords(r,n,markerPosition);\n    active.setLatLngs(remaining);"
if old not in s:
    raise SystemExit('tail slice anchor missing')
s=s.replace(old,new,1)

old2="  const headingTarget=routePointFromProjection(r.coords,n,Math.max(80,Math.min(180,lookAhead)));"
new2="  const headingTarget=routeForwardPointToDestination(r,n,Math.max(80,Math.min(180,lookAhead)));"
if old2 not in s:
    raise SystemExit('heading target anchor missing')
s=s.replace(old2,new2,1)

# Remove the temporary 180-degree compensation. Direction is now determined from the real destination.
old3="state.map.setHeading((state.heading+180)%360,{ease:1,deadzone:0});/* NAV_HEADING_DIRECTION_V19 */"
new3="state.map.setHeading(state.heading,{ease:1,deadzone:0});/* NAV_HEADING_DIRECTION_V19 */"+marker
if old3 not in s:
    raise SystemExit('180 heading anchor missing')
s=s.replace(old3,new3,1)

p.write_text(s,encoding='utf-8')
