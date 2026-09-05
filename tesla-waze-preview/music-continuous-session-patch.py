from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_CONTINUOUS_SESSION_V24 */'
if marker in s:
    raise SystemExit(0)

repls=[
("function openMusicWindow(){ensureMusicWindowControls();setMusicWindowOpen(true);applyMusicWindow();if($('musicSearch'))$('musicSearch').placeholder='Video, rozprávka, skladba alebo interpret';renderMusicStatus();renderMusicList();renderPlayer()}",
"function openMusicWindow(){ensureMusicWindowControls();setMusicWindowOpen(true);applyMusicWindow();if($('musicSearch'))$('musicSearch').placeholder='Video, rozprávka, skladba alebo interpret';renderMusicStatus();renderMusicList();const r=$('musicPlayer');const live=!!(music.current&&r&&r.children.length&&(music.audio||music.ytPlayer));if(live){refreshCurrentMusicUi();if(music.wantsPlayback&&!music.userPaused){startMusicKeepalive();setMusicPlaying(true)}}else renderPlayer()}"),
("function setMusicPlaying(playing){document.querySelectorAll('[data-ma=toggle]').forEach(b=>b.textContent=playing?'Pauza':'Prehrať');try{navigator.mediaSession.playbackState=playing?'playing':'paused'}catch{}stopMediaSessionRefresh();if(playing){syncMediaSession();mediaSessionRefreshTimer=setInterval(syncMediaSession,1800)}}",
"function setMusicPlaying(playing){document.querySelectorAll('[data-ma=toggle]').forEach(b=>b.textContent=playing?'Pauza':'Prehrať');try{navigator.mediaSession.playbackState=playing?'playing':'paused'}catch{}stopMediaSessionRefresh();if(playing){if(music.wantsPlayback&&!music.userPaused)startMusicKeepalive();syncMediaSession();mediaSessionRefreshTimer=setInterval(syncMediaSession,1800)}else if(music.userPaused||!music.wantsPlayback)stopMusicKeepalive()}"),
("function playMusic(){music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();if(music.audio){music.audio.play().catch(()=>{});return}try{music.ytPlayer?.playVideo?.()}catch{}}",
"function playMusic(){music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();syncMediaSession();if(music.audio){music.audio.play().catch(()=>{});return}try{music.ytPlayer?.playVideo?.()}catch{}}"),
("function mplay(t){const st=mt(t),yt=t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'');if(!t.streamUrl&&!yt)return musicSources(t);if(music.current&&music.started&&Date.now()-music.started<15000)mev('skip',music.current);const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();renderPlayer();music.started=Date.now();mev(replay?'replay':'play',t);if(music.audio)music.audio.play().catch(()=>{})}",
"function mplay(t){const st=mt(t),yt=t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'');if(!t.streamUrl&&!yt)return musicSources(t);if(music.current&&music.started&&Date.now()-music.started<15000)mev('skip',music.current);const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();syncMediaSession();renderPlayer();music.started=Date.now();mev(replay?'replay':'play',t);if(music.audio)music.audio.play().catch(()=>{})}"),
("function mnext(reason='next'){const n=nextMusicTrack();if(!n)return;if(handoffYoutubeTrack(n,reason))return;mplay(n)}function mprev(){const p=prevMusicTrack();if(!p)return;if(handoffYoutubeTrack(p,'prev'))return;mplay(p)}",
"function mnext(reason='next'){const n=nextMusicTrack();if(!n)return false;if(handoffYoutubeTrack(n,reason))return true;mplay(n);return true}function mprev(){const p=prevMusicTrack();if(!p)return false;if(handoffYoutubeTrack(p,'prev'))return true;mplay(p);return true}"),
("if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;setMusicPlaying(true);syncMediaSession();setTimeout(()=>{stopMusicKeepalive();syncMediaSession()},450)}",
"if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();setMusicPlaying(true);syncMediaSession()}"),
("music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)};",
"music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();setMusicPlaying(true)};"),
]

for old,new in repls:
    if old not in s:
        raise SystemExit('anchor missing: '+old[:80])
    s=s.replace(old,new,1)

# Keep the browser audio session continuously alive while Smart Music is meant to play.
s += "\n"+marker+"\n"

# Self-validation of the two critical regressions.
if "renderMusicList();renderPlayer()}" in s:
    raise SystemExit('openMusicWindow still rerenders player')
if "function mnext(reason='next'){const n=nextMusicTrack();if(!n)return;if(handoffYoutubeTrack" in s:
    raise SystemExit('mnext still lacks success return')
if "function playMusic(){music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive()" in s:
    raise SystemExit('playMusic still stops keepalive')

p.write_text(s,encoding='utf-8')
