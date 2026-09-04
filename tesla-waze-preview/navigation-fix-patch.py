from pathlib import Path

path = Path('tesla-waze-preview/app.js')
js = path.read_text(encoding='utf-8')

if '/* TMY_VIEWPORT_V1 */' not in js:
    raise SystemExit('TMY viewport marker missing')

# V9: stable route-heading camera. Keep the road vertical and vehicle in lower part of the map.
if '/* NAV_ROUTE_HEADING_V9 */' not in js:
    start = js.find('function applyHeadingUp(')
    end = js.find('\nfunction stopHeadingUp', start)
    if start < 0 or end < 0:
        raise SystemExit('applyHeadingUp block not found')
    new_apply = r'''function applyHeadingUp(center,zoom){
  if(!state.map||!state.navigating)return;
  const now=Date.now();
  if(state.heading!=null){
    const delta=state.lastAppliedHeading==null?180:Math.abs(((state.heading-state.lastAppliedHeading+540)%360)-180);
    if(delta>=1.8&&now-state.lastBearingAt>=550){
      if(typeof state.map.setHeading==='function')state.map.setHeading(state.heading,{ease:.18,deadzone:1.4});
      else if(typeof state.map.setBearing==='function')state.map.setBearing(-state.heading);
      state.lastAppliedHeading=state.heading;state.lastBearingAt=now;
    }
  }
  if(!center)return;
  const curZoom=Number(state.map.getZoom?.()??zoom),moved=state.lastCameraCenter?dist(state.lastCameraCenter,center):Infinity;
  if(now-state.lastCameraAt<750&&moved<24&&Math.abs(curZoom-zoom)<.8)return;
  if(moved<14&&Math.abs(curZoom-zoom)<.45)return;
  state.lastCameraAt=now;state.lastCameraCenter={lat:center.lat,lng:center.lng};
  if(Math.abs(curZoom-zoom)>=1.0)state.map.setView(center,zoom,{animate:false});
  else state.map.panTo(center,{animate:false,noMoveStart:true});
}/* NAV_ROUTE_HEADING_V9 */'''
    js = js[:start] + new_apply + js[end:]

    old_stop = "function stopHeadingUp(reset=true){if(typeof state.map?.setHeading==='function')state.map.setHeading(null);if(typeof state.map?.stopHeadingUp==='function')state.map.stopHeadingUp();if(reset&&typeof state.map?.setBearing==='function')state.map.setBearing(0)}"
    new_stop = "function stopHeadingUp(reset=true){if(typeof state.map?.setHeading==='function')state.map.setHeading(null);if(typeof state.map?.stopHeadingUp==='function')state.map.stopHeadingUp();if(reset&&typeof state.map?.setBearing==='function')state.map.setBearing(0);state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraAt=0;state.lastBearingAt=0}"
    if old_stop not in js:
        raise SystemExit('stopHeadingUp anchor not found')
    js = js.replace(old_stop,new_stop,1)

    old_camera = """  if((state.heading==null||(state.speed||0)<.8)&&routeDirection)state.heading=smoothHeading(state.heading,bearing(n.point,routeDirection),.28);\n  if(state.car)state.car.setLatLng(markerPosition);\n  let cameraBase=markerPosition;const op=String(maneuver?.opcode||'').toUpperCase();\n  if((op.includes('RAMP')||op.includes('EXIT'))&&dm<=4000){const rampTarget=routePointFromProjection(r.coords,n,Math.min(Math.max(dm*.42,120),900));if(rampTarget)cameraBase=rampTarget}\n  const cameraHeading=state.heading!=null?state.heading:(routeDirection?bearing(markerPosition,routeDirection):0),cameraCenter=destinationPoint(cameraBase,65,cameraHeading),kmh=(state.speed||0)*3.6;\n  applyHeadingUp(cameraCenter,navigationZoom(dm,maneuver?.opcode,kmh));"""
    new_camera = """  if(state.car)state.car.setLatLng(markerPosition);\n  const kmh=(state.speed||0)*3.6,op=String(maneuver?.opcode||'').toUpperCase();\n  let lookAhead=kmh>=100?170:kmh>=70?140:kmh>=40?110:85;\n  if((op.includes('RAMP')||op.includes('EXIT'))&&dm<=1800)lookAhead=Math.max(100,Math.min(220,dm*.28));\n  const headingTarget=routePointFromProjection(r.coords,n,Math.max(80,Math.min(180,lookAhead)));\n  const routeHeading=headingTarget?bearing(markerPosition,headingTarget):(routeDirection?bearing(markerPosition,routeDirection):state.heading);\n  if(routeHeading!=null)state.heading=smoothHeading(state.heading,routeHeading,.48);\n  const cameraCenter=routePointFromProjection(r.coords,n,lookAhead)||markerPosition;\n  applyHeadingUp(cameraCenter,navigationZoom(dm,maneuver?.opcode,kmh));"""
    if old_camera not in js:
        raise SystemExit('navigation camera anchor not found')
    js = js.replace(old_camera,new_camera,1)

# V10: hard-stop all navigation speech and invalidate async TTS when voice/nav is disabled.
if '/* NAV_VOICE_CANCEL_V10 */' not in js:
    start = js.find('let voiceContext=null,activeVoiceSource=null,voiceGeneration=0')
    end = js.find('\nfunction findAheadTraffic()', start)
    if start < 0 or end < 0:
        raise SystemExit('voice block not found')
    voice_block = r'''let voiceContext=null,activeVoiceSource=null,voiceGeneration=0,cloudVoiceUnavailable=false;const voiceCache=new Map();
/* NAV_VOICE_CANCEL_V10 */
function cancelNavigationVoice(){
  voiceGeneration++;
  try{activeVoiceSource?.stop()}catch{}
  activeVoiceSource=null;
  try{window.speechSynthesis?.cancel()}catch{}
  state.lastVoice='';
}
function unlockVoiceAudio(){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;try{voiceContext=voiceContext||new C();voiceContext.resume?.()}catch{}}
function browserSpeak(text,force=false,generation=voiceGeneration){
  if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window))return;
  const synth=window.speechSynthesis;let done=false;
  const say=()=>{
    if(done||generation!==voiceGeneration||((!state.voice||!state.navigating)&&!force))return;done=true;
    const v=synth.getVoices()||[],female=['laura','zuzana','vlasta','tereza','lucia','lucie','viktoria','victoria','alena','iveta','jana','katka','monika','zdenka','veronika','maria','marie','eva','hana','female','woman','žena','female voice'],male=['filip','martin','jakub','petr','peter','michal','tomas','tomáš','ondrej','matej','jiri','jan ','adam','daniel','david','male','man'];
    const name=x=>(x.name||'').toLowerCase(),isFemale=x=>female.some(n=>name(x).includes(n))&&!male.some(n=>name(x).includes(n)),isSlovak=x=>/^sk(?:-|_)/i.test(x.lang||''),isCzech=x=>/^(?:cs|cz)(?:-|_)/i.test(x.lang||'');
    const voice=v.find(x=>isSlovak(x)&&isFemale(x))||v.find(x=>isCzech(x)&&isFemale(x))||v.find(isSlovak)||v.find(isCzech)||v.find(isFemale)||v[0]||null,u=new SpeechSynthesisUtterance(text);
    if(voice){u.voice=voice;u.lang=voice.lang||'sk-SK'}else u.lang='sk-SK';u.rate=state.voiceMode==='soft'?.9:.96;u.pitch=state.voiceMode==='soft'?1.08:1;u.volume=1;
    try{synth.cancel();synth.resume()}catch{}synth.speak(u)
  };
  if((synth.getVoices()||[]).length)say();else{try{synth.addEventListener('voiceschanged',say,{once:true})}catch{}setTimeout(say,350)}
}
async function speak(text,force=false){
  if((!state.voice||!state.navigating)&&!force)return;
  const normalized=normalizeSpeechText(text),generation=++voiceGeneration;unlockVoiceAudio();
  if(!cloudVoiceUnavailable){try{
    const key=`${state.voiceMode}:${normalized}`;let encoded=voiceCache.get(key);
    if(!encoded){const response=await fetch(PROD_ORIGIN+'/api/tts',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:normalized,profile:state.voiceMode})});if(response.status===503)cloudVoiceUnavailable=true;if(!response.ok)throw Error('tts '+response.status);const data=await response.json();encoded=data.audioContent;if(typeof encoded!=='string')throw Error('tts audio');if(voiceCache.size>=30)voiceCache.clear();voiceCache.set(key,encoded)}
    if(generation!==voiceGeneration||((!state.voice||!state.navigating)&&!force))return;
    const C=window.AudioContext||window.webkitAudioContext;if(C){voiceContext=voiceContext||new C();await voiceContext.resume();const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0)),buffer=await voiceContext.decodeAudioData(bytes.buffer);if(generation!==voiceGeneration||((!state.voice||!state.navigating)&&!force))return;try{activeVoiceSource?.stop()}catch{}const source=voiceContext.createBufferSource(),gain=voiceContext.createGain();gain.gain.value=4;source.buffer=buffer;source.connect(gain).connect(voiceContext.destination);activeVoiceSource=source;source.onended=()=>{if(activeVoiceSource===source)activeVoiceSource=null};source.start();return}
  }catch(e){console.warn('Cloud navigation voice failed:',e?.message||e)}}
  if(generation===voiceGeneration&&((state.voice&&state.navigating)||force))browserSpeak(normalized,force,generation)
}
function voiceNavigation(){if(!state.voice||!state.navigating)return;const r=state.routes[state.routeIndex],p=state.routeProgress;if(!r||!p)return;const band=p.distanceToManeuver<=120?'now':p.distanceToManeuver<=550?'near':p.distanceToManeuver<=1500?'mid':'far',k=`${state.routeIndex}:${p.stepIdx}:${band}`;if(k===state.lastVoice||p.distanceToManeuver>3200)return;state.lastVoice=k;const s=r.steps?.[p.stepIdx],distance=p.distanceToManeuver>60?`O ${fmtSpeechD(p.distanceToManeuver)}. `:'';speak(`${distance}${instruction(s)}`)}'''
    js = js[:start] + voice_block + js[end:]

    old_stop_start = 'function stopNavigation(recenter=true){clearTimeout(state.overviewTimer);'
    new_stop_start = 'function stopNavigation(recenter=true){clearTimeout(state.overviewTimer);cancelNavigationVoice();'
    if old_stop_start not in js:
        raise SystemExit('stopNavigation voice anchor not found')
    js = js.replace(old_stop_start,new_stop_start,1)

    old_toggle = "$('voiceEnabled').onchange=e=>{state.voice=e.target.checked;save(LS.voice,state.voice)};"
    new_toggle = "$('voiceEnabled').onchange=e=>{state.voice=e.target.checked;save(LS.voice,state.voice);if(!state.voice)cancelNavigationVoice();else state.lastVoice=''};"
    if old_toggle not in js:
        raise SystemExit('voice toggle anchor not found')
    js = js.replace(old_toggle,new_toggle,1)

for needle in ['NAV_ROUTE_HEADING_V9','NAV_VOICE_CANCEL_V10','TMY_VIEWPORT_V1']:
    if needle not in js:
        raise SystemExit(f'missing required marker: {needle}')

path.write_text(js,encoding='utf-8')
