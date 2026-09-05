from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* MUSIC_TESLA_MEDIA_CONTROLS_V26 */'
if marker in s:
    raise SystemExit(0)

old = "function syncMediaSession(){updateMiniSeek();if(!('mediaSession' in navigator)||!music.current)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:music.current.title||'Bez názvu',artist:music.current.artist||'',album:'Tesla Maps Smart Music',artwork:music.current.artwork?[{src:music.current.artwork}]:[]})}catch{}const actions={play:playMusic,pause:pauseMusic,previoustrack:mprev,nexttrack:mnext,seekbackward:()=>seekMusic(-15),seekforward:()=>seekMusic(15)};for(const [name,handler] of Object.entries(actions))try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}"
new = "function syncMediaSession(){updateMiniSeek();if(!('mediaSession' in navigator)||!music.current)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:music.current.title||'Bez názvu',artist:music.current.artist||'',album:'Tesla Maps Smart Music',artwork:music.current.artwork?[{src:music.current.artwork}]:[]});navigator.mediaSession.playbackState=(music.wantsPlayback&&!music.userPaused)?'playing':'paused'}catch{}const actions={play:playMusic,pause:pauseMusic,stop:pauseMusic,previoustrack:mprev,nexttrack:mnext,seekbackward:()=>seekMusic(-15),seekforward:()=>seekMusic(15)};for(const [name,handler] of Object.entries(actions))try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}" + marker

if old not in s:
    raise SystemExit('media session anchor missing')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
