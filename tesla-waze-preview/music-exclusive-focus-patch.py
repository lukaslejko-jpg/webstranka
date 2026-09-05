from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_EXCLUSIVE_FOCUS_V27 */'
if marker in s:
    raise SystemExit(0)

repls=[
("if(live){refreshCurrentMusicUi();if(music.wantsPlayback&&!music.userPaused){startMusicKeepalive();setMusicPlaying(true)}}else renderPlayer()",
 "if(live){refreshCurrentMusicUi();if(music.wantsPlayback&&!music.userPaused){stopMusicKeepalive();setMusicPlaying(true)}}else renderPlayer()"),
("function setMusicPlaying(playing){document.querySelectorAll('[data-ma=toggle]').forEach(b=>b.textContent=playing?'Pauza':'Prehrať');try{navigator.mediaSession.playbackState=playing?'playing':'paused'}catch{}stopMediaSessionRefresh();if(playing){if(music.wantsPlayback&&!music.userPaused)startMusicKeepalive();syncMediaSession();mediaSessionRefreshTimer=setInterval(syncMediaSession,1800)}else if(music.userPaused||!music.wantsPlayback)stopMusicKeepalive()}",
 "function setMusicPlaying(playing){document.querySelectorAll('[data-ma=toggle]').forEach(b=>b.textContent=playing?'Pauza':'Prehrať');try{navigator.mediaSession.playbackState=playing?'playing':'paused'}catch{}stopMediaSessionRefresh();if(playing){stopMusicKeepalive();syncMediaSession();mediaSessionRefreshTimer=setInterval(syncMediaSession,1800)}else if(music.userPaused||!music.wantsPlayback)stopMusicKeepalive()}"),
("function playMusic(){music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();syncMediaSession();if(music.audio)",
 "function playMusic(){music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();if(music.audio)"),
("music.current=t;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();syncMediaSession();renderPlayer();",
 "music.current=t;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();renderPlayer();"),
("if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();setMusicPlaying(true);syncMediaSession()}",
 "if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true);syncMediaSession()}"),
("music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();setMusicPlaying(true)};",
 "music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true)};"),
]

for old,new in repls:
    if old not in s:
        raise SystemExit('exclusive focus anchor missing: '+old[:90])
    s=s.replace(old,new,1)

# Keep transition protection from V18 intact: timer primes keepalive shortly before end,
# and handoffYoutubeTrack starts keepalive while the next track is loading.
if "left<=1.2)startMusicKeepalive()" not in s:
    raise SystemExit('transition keepalive timer missing')
if "music.gaplessBusy=true;startMusicKeepalive();" not in s:
    raise SystemExit('handoff keepalive missing')

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
