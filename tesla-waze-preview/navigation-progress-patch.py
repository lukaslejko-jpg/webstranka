from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* NAV_REMAINING_ROUTE_V13 */'
if marker in s:
    raise SystemExit(0)

anchor="function renderTeslaNavigation(){\n  ensureTeslaNavUI();\n  const r=state.routes[state.routeIndex],p=state.routeProgress;\n  if(!state.navigating||!r){$('teslaNavManeuver').classList.add('hidden');$('teslaTripCard').classList.add('hidden');return}\n  const step=r.steps?.[p?.stepIdx||0],next=r.steps?.[(p?.stepIdx||0)+1];"
repl="function renderTeslaNavigation(){\n  ensureTeslaNavUI();\n  const r=state.routes[state.routeIndex],p=state.routeProgress;\n  if(!state.navigating||!r){$('teslaNavManeuver').classList.add('hidden');$('teslaTripCard').classList.add('hidden');return}\n  const step=r.steps?.[p?.stepIdx||0],rawNext=r.steps?.[(p?.stepIdx||0)+1],next=/DESTINATION/i.test(String(rawNext?.opcode||''))&&((p?.remainingDistance??Infinity)>350)?null:rawNext;"
if anchor not in s:
    raise SystemExit('renderTeslaNavigation anchor missing')
s=s.replace(anchor,repl,1)

anchor2="function routeAheadPoint(coords,startIndex,meters){if(!coords?.length)return null;let left=Math.max(0,meters||0),i=Math.max(0,Math.min(startIndex,coords.length-1));for(;i<coords.length-1;i++){const d=dist(coords[i],coords[i+1]);if(d>=left&&d>0){const t=left/d;return {lat:coords[i].lat+(coords[i+1].lat-coords[i].lat)*t,lng:coords[i].lng+(coords[i+1].lng-coords[i].lng)*t}}left-=d}return coords.at(-1)}\nfunction updateNavigation(){"
insert="function routeAheadPoint(coords,startIndex,meters){if(!coords?.length)return null;let left=Math.max(0,meters||0),i=Math.max(0,Math.min(startIndex,coords.length-1));for(;i<coords.length-1;i++){const d=dist(coords[i],coords[i+1]);if(d>=left&&d>0){const t=left/d;return {lat:coords[i].lat+(coords[i+1].lat-coords[i].lat)*t,lng:coords[i].lng+(coords[i+1].lng-coords[i].lng)*t}}left-=d}return coords.at(-1)}\n/* NAV_REMAINING_ROUTE_V13 */\nfunction trimActiveRouteBehindCar(r,n,markerPosition){\n  if(!state.navigating||state.overview||!r?.coords?.length||!n)return;\n  const active=state.routeLines?.[state.routeIndex];\n  if(active?.setLatLngs){\n    const tail=r.coords.slice(Math.min(r.coords.length,n.index+1));\n    active.setLatLngs([markerPosition,...tail]);\n    active.setStyle?.({opacity:.96,weight:8,color:'#14b8e6'});\n  }\n  state.routeLines?.forEach((line,i)=>{if(i!==state.routeIndex)line.setStyle?.({opacity:0})});\n}\nfunction updateNavigation(){"
if anchor2 not in s:
    raise SystemExit('updateNavigation anchor missing')
s=s.replace(anchor2,insert,1)

anchor3="  if(state.car)state.car.setLatLng(markerPosition);\n  const kmh=(state.speed||0)*3.6,op=String(maneuver?.opcode||'').toUpperCase();"
repl3="  if(state.car)state.car.setLatLng(markerPosition);\n  trimActiveRouteBehindCar(r,n,markerPosition);\n  const kmh=(state.speed||0)*3.6,op=String(maneuver?.opcode||'').toUpperCase();"
if anchor3 not in s:
    raise SystemExit('markerPosition anchor missing')
s=s.replace(anchor3,repl3,1)

p.write_text(s,encoding='utf-8')
