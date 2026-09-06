from pathlib import Path

APP=Path('tesla-waze-preview/app.js')
MARKER='/* MUSIC_DISABLE_MEDIASESSION_V45 */'
s=APP.read_text(encoding='utf-8')
if MARKER in s:
    raise SystemExit(0)
if '/* MUSIC_PERSISTENT_YT_V44 */' not in s:
    raise SystemExit('V44 base missing')

# Restore the pre-78fcca Tesla audio behavior: keep in-app controls and player logic,
# but stop publishing/changing MediaSession metadata, transport handlers or playbackState.
old_sync="function syncMediaSession(){updateMiniSeek();if(!('mediaSession' in navigator)||!music.current)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:music.current.title||'Bez názvu',artist:music.current.artist||'',album:'Tesla Maps Smart Music',artwork:music.current.artwork?[{src:music.current.artwork}]:[]});navigator.mediaSession.playbackState=(music.wantsPlayback&&!music.userPaused)?'playing':'paused'}catch{}const actions={play:playMusic,pause:pauseMusic,stop:pauseMusic,previoustrack:mprev,nexttrack:mnext,seekbackward:()=>seekMusic(-15),seekforward:()=>seekMusic(15)};for(const [name,handler] of Object.entries(actions))try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}"
new_sync="function syncMediaSession(){updateMiniSeek()}"
if old_sync not in s:
    raise SystemExit('syncMediaSession V44 anchor missing')
s=s.replace(old_sync,new_sync,1)

old_set="function setMusicPlaying(playing){document.querySelectorAll('[data-ma=toggle]').forEach(b=>b.textContent=playing?'Pauza':'Prehrať');try{navigator.mediaSession.playbackState=playing?'playing':'paused'}catch{}stopMediaSessionRefresh();if(playing){syncMediaSession();mediaSessionRefreshTimer=setInterval(syncMediaSession,1800)}}"
new_set="function setMusicPlaying(playing){document.querySelectorAll('[data-ma=toggle]').forEach(b=>b.textContent=playing?'Pauza':'Prehrať');stopMediaSessionRefresh();if(playing){updateMiniSeek();mediaSessionRefreshTimer=setInterval(updateMiniSeek,1800)}}"
if old_set not in s:
    raise SystemExit('setMusicPlaying V44 anchor missing')
s=s.replace(old_set,new_set,1)

# Position-state publication is also MediaSession. Keep only the local seek UI update.
old_pos="music.audio.ontimeupdate=()=>{updateMiniSeek();if(!('mediaSession' in navigator)||!music.audio?.duration||!Number.isFinite(music.audio.duration))return;try{navigator.mediaSession.setPositionState({duration:music.audio.duration,playbackRate:music.audio.playbackRate||1,position:Math.min(music.audio.currentTime,music.audio.duration)})}catch{}}"
new_pos="music.audio.ontimeupdate=()=>{updateMiniSeek()}"
if old_pos in s:
    s=s.replace(old_pos,new_pos,1)

# Validate active runtime no longer drives Tesla MediaSession.
active=s.split('/* MUSIC_DISABLE_MEDIASESSION_V45 */')[0]
for bad in ('navigator.mediaSession.metadata=', 'navigator.mediaSession.playbackState=', 'navigator.mediaSession.setActionHandler(', 'navigator.mediaSession.setPositionState('):
    if bad in active:
        raise SystemExit('active MediaSession call remains: '+bad)

s+='\n'+MARKER+'\n'
APP.write_text(s,encoding='utf-8')
