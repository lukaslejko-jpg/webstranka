from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')

if '/* MOBILE_PENDING_ROUTE_V11 */' not in s:
    # Add state flag.
    old="lastTrailAt:null};"
    new="lastTrailAt:null,pendingAutoRoute:false};"
    if old not in s:
        raise SystemExit('state anchor missing')
    s=s.replace(old,new,1)

    # When GPS arrives, start a pending destination automatically.
    old="if(state.navigating)updateNavigation();else if(state.dest&&!state.routes.length&&!state.routeLoading)calculateRoute(true);"
    new="if(state.navigating)updateNavigation();else if(state.dest&&!state.routes.length&&!state.routeLoading){const auto=!!state.pendingAutoRoute;state.pendingAutoRoute=false;calculateRoute(auto||true)}"
    if old not in s:
        raise SystemExit('GPS routing anchor missing')
    s=s.replace(old,new,1)

    # Replace destination selection so it requests GPS and queues auto-navigation if needed.
    old_sel="async function selectDestination(x){unlockVoiceAudio();state.dest=x;state.routes=[];state.routeIndex=0;state.routeProgress=null;state.routeCursor=0;$('searchInput').value=x.searchLabel||x.name;$('searchResults').innerHTML='';state.recents=[{...x,lastUsedAt:new Date().toISOString()},...state.recents.filter(z=>z.id!==x.id)].slice(0,20);save(LS.recent,state.recents);renderPlaces();if(state.destMarker)state.destMarker.remove();state.destMarker=state.L.marker(x.location).addTo(state.map).bindTooltip(x.name);state.map.setView(x.location,15);renderDestination();if(state.pos)await calculateRoute(true)}"
    new_sel="async function selectDestination(x){unlockVoiceAudio();state.dest=x;state.routes=[];state.routeIndex=0;state.routeProgress=null;state.routeCursor=0;state.pendingAutoRoute=true;$('searchInput').value=x.searchLabel||x.name;$('searchResults').innerHTML='';state.recents=[{...x,lastUsedAt:new Date().toISOString()},...state.recents.filter(z=>z.id!==x.id)].slice(0,20);save(LS.recent,state.recents);renderPlaces();if(state.destMarker)state.destMarker.remove();state.destMarker=state.L.marker(x.location).addTo(state.map).bindTooltip(x.name);state.map.setView(x.location,15);renderDestination();if(state.pos){state.pendingAutoRoute=false;await calculateRoute(true);return}const notice=$('gpsNotice')?.querySelector('span');if(notice)notice.textContent='Čakám na GPS polohu…';try{navigator.geolocation.getCurrentPosition(()=>{},()=>{if(notice)notice.textContent='GPS poloha nie je dostupná. Povoľte polohu v prehliadači.'},{enableHighAccuracy:true,timeout:12000,maximumAge:0})}catch{}try{parent.postMessage({type:'tesla-gps-request'},'*')}catch{}}/* MOBILE_PENDING_ROUTE_V11 */"
    if old_sel not in s:
        raise SystemExit('selectDestination anchor missing')
    s=s.replace(old_sel,new_sel,1)

if 'MOBILE_PENDING_ROUTE_V11' not in s:
    raise SystemExit('marker missing')

p.write_text(s,encoding='utf-8')
