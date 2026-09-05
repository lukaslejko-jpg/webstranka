from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* NAV_AUDIO_STABILITY_V14 */'
if marker in s:
    raise SystemExit(0)

repls = [
("function confirmedOffRoute(distanceMeters,accuracy){if(Number.isFinite(accuracy)&&accuracy>60)return false;return distanceMeters>Math.max(55,(Number(accuracy)||0)*2)}",
 "function confirmedOffRoute(distanceMeters,accuracy){if(Number.isFinite(accuracy)&&accuracy>80)return false;return distanceMeters>Math.max(90,(Number(accuracy)||0)*2.5)}"),
("if(state.offRouteHits>=2&&Date.now()-state.lastReroute>15000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}",
 "if(state.offRouteHits>=4&&kmh>8&&Date.now()-state.lastReroute>30000){state.offRouteHits=0;state.lastReroute=Date.now();calculateRoute(false)}"),
("if(delta>=1.8&&now-state.lastBearingAt>=550){",
 "if(delta>=4&&now-state.lastBearingAt>=1200){"),
("if(now-state.lastCameraAt<750&&moved<24&&Math.abs(curZoom-zoom)<.8)return;",
 "if(now-state.lastCameraAt<1000&&moved<30&&Math.abs(curZoom-zoom)<1.0)return;"),
("autoNext:load('teslaWaze:musicAutoNext:v1',true)};",
 "autoNext:load('teslaWaze:musicAutoNext:v1',true),userPaused:false,wantsPlayback:false,resumeTimer:null};"),
("function playMusic(){if(music.audio){music.audio.play().catch(()=>{});return}try{music.ytPlayer?.playVideo?.()}catch{}}",
 "function playMusic(){music.userPaused=false;music.wantsPlayback=true;if(music.audio){music.audio.play().catch(()=>{});return}try{music.ytPlayer?.playVideo?.()}catch{}}"),
("function pauseMusic(){if(music.audio){music.audio.pause();return}try{music.ytPlayer?.pauseVideo?.()}catch{}}",
 "function pauseMusic(){music.userPaused=true;music.wantsPlayback=false;if(music.resumeTimer){clearTimeout(music.resumeTimer);music.resumeTimer=null}if(music.audio){music.audio.pause();return}try{music.ytPlayer?.pauseVideo?.()}catch{}}"),
("function toggleMusicPlayback(){if(music.audio){music.audio.paused?music.audio.play().catch(()=>{}):music.audio.pause();return}if(!music.ytPlayer)return;try{music.ytPlayer.getPlayerState()===YT.PlayerState.PLAYING?music.ytPlayer.pauseVideo():music.ytPlayer.playVideo()}catch{}}",
 "function toggleMusicPlayback(){if(music.audio){music.audio.paused?playMusic():pauseMusic();return}if(!music.ytPlayer)return;try{music.ytPlayer.getPlayerState()===YT.PlayerState.PLAYING?pauseMusic():playMusic()}catch{}}"),
("function wireAudio(){if(!music.audio)return;music.audio.onended=()=>{setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()};music.audio.onplay=()=>setMusicPlaying(true);music.audio.onpause=()=>setMusicPlaying(false);",
 "function wireAudio(){if(!music.audio)return;music.audio.onended=()=>{music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()};music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)};music.audio.onpause=()=>{setMusicPlaying(false);scheduleMusicResume()};"),
("const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;renderPlayer();",
 "const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;music.userPaused=false;music.wantsPlayback=true;renderPlayer();"),
("else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED)setMusicPlaying(false);",
 "else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED){setMusicPlaying(false);scheduleMusicResume()}"),
("else if(e.data===YT.PlayerState.ENDED){setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}",
 "else if(e.data===YT.PlayerState.ENDED){music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}"),
]

for old, new in repls:
    if old not in s:
        raise SystemExit('anchor missing: ' + old[:90])
    s = s.replace(old, new, 1)

anchor = "function seekMusic(seconds){try{if(music.audio){music.audio.currentTime=Math.max(0,Math.min(music.audio.duration||Infinity,music.audio.currentTime+seconds));return}if(music.ytPlayer){const now=Number(music.ytPlayer.getCurrentTime?.()||0);music.ytPlayer.seekTo(Math.max(0,now+seconds),true)}}catch{}}"
helper = anchor + "\nfunction scheduleMusicResume(){if(music.userPaused||!music.wantsPlayback||!state.navigating)return;if(music.resumeTimer)clearTimeout(music.resumeTimer);music.resumeTimer=setTimeout(()=>{music.resumeTimer=null;if(music.userPaused||!music.wantsPlayback||!state.navigating)return;if(music.audio){if(music.audio.paused)music.audio.play().catch(()=>{});return}try{const st=music.ytPlayer?.getPlayerState?.();if(st!==YT.PlayerState.PLAYING&&st!==YT.PlayerState.BUFFERING)music.ytPlayer?.playVideo?.()}catch{}},420)}\nsetInterval(()=>{if(state.navigating&&music.wantsPlayback&&!music.userPaused)scheduleMusicResume()},1800);"
if anchor not in s:
    raise SystemExit('seek anchor missing')
s = s.replace(anchor, helper, 1)

insert = "}/* NAV_ROUTE_HEADING_V9 */"
if insert not in s:
    raise SystemExit('nav heading marker missing')
s = s.replace(insert, "}" + marker + "/* NAV_ROUTE_HEADING_V9 */", 1)

p.write_text(s, encoding='utf-8')
