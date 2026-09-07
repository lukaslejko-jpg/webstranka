from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_FORWARD_GEOMETRY_V71 */'
if marker in s:
    raise SystemExit(0)

anchor="async function calculateRoute(autoStart=false){"
helper="""function routeGeometryForward(r,start,end){\n  const coords=r?.coords||[];if(coords.length<2||!start||!end)return false;\n  const first=coords[0],last=coords.at(-1),forward=dist(first,start)+dist(last,end),reverse=dist(last,start)+dist(first,end);\n  return forward<=reverse+25;\n}\n"""
if helper not in s:
    if anchor not in s: raise SystemExit('calculateRoute anchor missing')
    s=s.replace(anchor,helper+anchor,1)

old="state.routes=Array.isArray(d.routes)?d.routes:[];if(!state.routes.length)throw Error(d.error||'no routes');for(const rr of state.routes){if(rr?.coords?.length>1){const first=rr.coords[0],last=rr.coords.at(-1),forward=dist(first,requestStart)+dist(last,requestEnd),reverse=dist(last,requestStart)+dist(first,requestEnd);if(reverse<forward)rr.coords=[...rr.coords].reverse()}applyLocalCorridorsToRoute(rr,outCorridor,inCorridor)};"
new="state.routes=(Array.isArray(d.routes)?d.routes:[]).filter(rr=>routeGeometryForward(rr,requestStart,requestEnd));if(!state.routes.length)throw Error(d.error||'invalid route orientation');for(const rr of state.routes){applyLocalCorridorsToRoute(rr,outCorridor,inCorridor)};"
if old not in s:
    raise SystemExit('frontend reverse block missing')
s=s.replace(old,new,1)

# With V70 backend, route geometry is always start -> destination. Remove all reverse-direction drawing fallbacks.
pat=re.compile(r"function routeDestinationAtEnd\(r\)\{.*?\n\}\nfunction routeForwardCoords\(r,n,markerPosition\)\{.*?\n\}\nfunction routeForwardPointToDestination\(r,n,meters\)\{.*?\n\}",re.S)
repl=r'''function routeDestinationAtEnd(r){return true}
function routeForwardCoords(r,n,markerPosition){
  const coords=r?.coords||[];
  if(!coords.length||!n)return markerPosition?[markerPosition]:[];
  return [markerPosition,...coords.slice(Math.min(coords.length,n.index+1))];
}
function routeForwardPointToDestination(r,n,meters){
  const coords=r?.coords||[];
  if(!coords.length||!n)return null;
  let left=Math.max(0,Number(meters)||0),start=n.point;
  for(let i=n.index+1;i<coords.length;i++){
    const end=coords[i],d=dist(start,end);
    if(d>=left&&d>0){const t=left/d;return {lat:start.lat+(end.lat-start.lat)*t,lng:start.lng+(end.lng-start.lng)*t}}
    left-=d;start=end;
  }
  return coords.at(-1);
}'''
s,n=pat.subn(repl,s,count=1)
if n!=1: raise SystemExit('route forward helper block missing')

checks=[
    "routeGeometryForward(rr,requestStart,requestEnd)",
    "invalid route orientation",
    "return [markerPosition,...coords.slice(Math.min(coords.length,n.index+1))]",
    "return coords.at(-1);",
    "/* NAV_CORE_STABILITY_V69 */",
]
for item in checks:
    if item not in s: raise SystemExit('V71 validation failed: '+item)
if "rr.coords=[...rr.coords].reverse()" in s:
    raise SystemExit('frontend geometry reversal still present')

s += "\n"+marker+"\n"
p.write_text(s,encoding='utf-8')
