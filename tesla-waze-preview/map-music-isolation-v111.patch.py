from pathlib import Path

jsp=Path('tesla-waze-preview/app.js')
cssp=Path('tesla-waze-preview/app.css')
engp=Path('tesla-waze-preview/music-isolated-engine-v111.html')
js=jsp.read_text(encoding='utf-8')
css=cssp.read_text(encoding='utf-8')

if '/* MAP_MUSIC_ISOLATION_V111 */' not in js:
    old="""  if(headingChanged&&now-(state.lastBearingAt||0)>=2500){
    if(typeof state.map.setHeading==='function')state.map.setHeading(h,{ease:1,deadzone:0});
    else if(typeof state.map.setBearing==='function')state.map.setBearing(-h);
    state.lastAppliedHeading=h;state.lastBearingAt=now;
  }"""
    new="""  if(headingChanged&&now-(state.lastBearingAt||0)>=1200){
    // Leaflet Rotate expects the camera bearing itself. Positive route heading makes
    // the driven road point straight to the top of the Tesla display.
    if(typeof state.map.setBearing==='function')state.map.setBearing(h);
    else if(typeof state.map.setHeading==='function')state.map.setHeading(h,{ease:0,deadzone:0});
    state.lastAppliedHeading=h;state.lastBearingAt=now;
  }"""
    if old not in js:
        raise SystemExit('heading block anchor missing')
    js=js.replace(old,new,1)

    old="function stopHeadingUp(reset=true){if(typeof state.map?.setHeading==='function')state.map.setHeading(null);if(typeof state.map?.stopHeadingUp==='function')state.map.stopHeadingUp();if(reset&&typeof state.map?.setBearing==='function')state.map.setBearing(0);state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraZoom=null;state.lastCameraAt=0;state.lastBearingAt=0}"
    new="function stopHeadingUp(reset=true){if(typeof state.map?.setHeading==='function')state.map.setHeading(null);if(typeof state.map?.stopHeadingUp==='function')state.map.stopHeadingUp();if(typeof state.map?.setBearing==='function')state.map.setBearing(0);state.lastAppliedHeading=null;state.lastCameraCenter=null;state.lastCameraZoom=null;state.lastCameraAt=0;state.lastBearingAt=0}"
    if old not in js:
        raise SystemExit('stopHeadingUp anchor missing')
    js=js.replace(old,new,1)

    # The v110 hidden iframe used a large off-screen, semi-transparent composited layer.
    # Tesla Chromium can invalidate the whole page when YouTube navigates that surface.
    old="f.style.cssText='position:fixed;left:-1200px;top:-1200px;width:320px;height:180px;border:0;opacity:.001;pointer-events:none;z-index:-1;background:#000;contain:strict;isolation:isolate;';"
    new="f.style.cssText='position:absolute;left:0;top:0;width:2px;height:2px;border:0;pointer-events:none;z-index:-1;background:#000;overflow:hidden;clip-path:inset(50%);contain:strict;isolation:isolate;';"
    if old not in js:
        raise SystemExit('isolated frame style anchor missing')
    js=js.replace(old,new,1)

    old="const TW_MUSIC_ENGINE_URL='https://raw.githack.com/lukaslejko-jpg/webstranka/tesla-waze-emergency-direct/tesla-waze-preview/music-isolated-engine-v110.html?v=110';"
    new="const TW_MUSIC_ENGINE_URL='https://raw.githack.com/lukaslejko-jpg/webstranka/tesla-waze-preview-v1/tesla-waze-preview/music-isolated-engine-v111.html?v=111';"
    if old not in js:
        raise SystemExit('engine URL anchor missing')
    js=js.replace(old,new,1)

    # Do not rebuild the whole minimized queue on each Next/Previous. That DOM churn was
    # still sharing the same rendering surface as Leaflet and could trigger full-screen flashes.
    old="const q=ensureMusicQueue(),box=r.querySelector('.music-mini-queue');if(box)wireMiniQueue(box,q,s.id);"
    new="const q=ensureMusicQueue(),box=r.querySelector('.music-mini-queue');if(box){box.querySelectorAll('[data-mini-play]').forEach(b=>b.classList.toggle('active',b.dataset.miniPlay===s.id));}"
    if old not in js:
        raise SystemExit('mini queue rerender anchor missing')
    js=js.replace(old,new,1)

    # Keep media-state UI changes tiny during track switches.
    js=js.replace("if(d.type==='time'){\n    twMusicEngineState.now=Number(d.now)||0;twMusicEngineState.duration=Number(d.duration)||0;twMusicEngineState.state=Number.isFinite(Number(d.state))?Number(d.state):-1;updateMiniSeek();return;\n  }",
                  "if(d.type==='time'){\n    twMusicEngineState.now=Number(d.now)||0;twMusicEngineState.duration=Number(d.duration)||0;twMusicEngineState.state=Number.isFinite(Number(d.state))?Number(d.state):-1;if(document.visibilityState==='visible')updateMiniSeek();return;\n  }",1)

    js+='\n/* MAP_MUSIC_ISOLATION_V111 */\n'

# Remove the v110 rule that hard-disabled transforms on the map container. Leaflet Rotate
# must be allowed to own its transforms or heading-up becomes diagonal/incorrect.
css=css.replace("#map,.mapwrap{transform:none!important;filter:none!important;will-change:auto!important}",
                "#map,.mapwrap{filter:none!important;isolation:isolate!important}",1)

if '/* MAP_MUSIC_ISOLATION_UI_V111 */' not in css:
    css += r'''

/* MAP_MUSIC_ISOLATION_UI_V111 */
/* Tiny clipped playback surface when video is hidden: no 320x180 translucent GPU layer. */
#twMusicEngine:not(.music-engine-visible){
  position:absolute!important;left:0!important;top:0!important;width:2px!important;height:2px!important;
  min-width:2px!important;min-height:2px!important;max-width:2px!important;max-height:2px!important;
  opacity:1!important;overflow:hidden!important;clip-path:inset(50%)!important;pointer-events:none!important;
  border:0!important;z-index:-1!important;background:#000!important;
}
#twMusicEngine.music-engine-visible{clip-path:none!important;overflow:visible!important;opacity:1!important;z-index:7005!important}
/* Leaflet/leaflet-rotate controls map transforms. Do not override transform on map containers. */
#map,.mapwrap{isolation:isolate!important;backface-visibility:hidden;-webkit-backface-visibility:hidden}
'''

engine='''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#player{margin:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%!important;height:100%!important;border:0!important}</style></head><body><div id="player"></div><script>
(()=>{\n'use strict';\nconst parentWin=window.parent;let player=null,currentId='',ready=false,lastTick=0;\nconst send=(type,data={})=>{try{parentWin.postMessage({source:'tw-music-engine-v110',type,...data},'*')}catch{}};\nwindow.onYouTubeIframeAPIReady=()=>{player=new YT.Player('player',{host:'https://www.youtube-nocookie.com',playerVars:{autoplay:1,playsinline:1,rel:0,controls:1,modestbranding:1},events:{onReady:()=>{ready=true;send('ready');if(currentId){try{player.loadVideoById({videoId:currentId,startSeconds:0})}catch{}}},onStateChange:e=>send('state',{state:Number(e.data)}),onError:e=>send('error',{code:Number(e.data)||0})}});};\nconst s=document.createElement('script');s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);\nfunction call(cmd,d){if(cmd==='load'){currentId=String(d.videoId||'');if(ready&&currentId)player.loadVideoById({videoId:currentId,startSeconds:Number(d.startSeconds)||0});return}if(!ready||!player)return;try{if(cmd==='play')player.playVideo();else if(cmd==='pause')player.pauseVideo();else if(cmd==='seek')player.seekTo(Number(d.seconds)||0,true);else if(cmd==='stop')player.stopVideo()}catch{}}\nwindow.addEventListener('message',e=>{const d=e.data;if(!d||d.source!=='tw-music-main-v110')return;call(d.cmd,d)});\nsetInterval(()=>{if(!ready||!player)return;try{const now=Number(player.getCurrentTime?.()||0),duration=Number(player.getDuration?.()||0),state=Number(player.getPlayerState?.()??-1);if(Date.now()-lastTick>1450){lastTick=Date.now();send('time',{now,duration,state})}}catch{}},750);\nsend('boot');\n})();\n</script></body></html>'''
engp.write_text(engine,encoding='utf-8')

jsp.write_text(js,encoding='utf-8')
cssp.write_text(css,encoding='utf-8')
print('Applied v111 map heading + zero-flicker music compositor patch')
