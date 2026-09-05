from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_TRANSITION_BRIDGE_2S_V29 */'
if marker in s:
    raise SystemExit(0)

# Re-enable the helper audio ONLY as a short bridge before a YouTube track ends.
old_start='function startMusicKeepalive(){return false}'
new_start="""function startMusicKeepalive(){
  if(music.userPaused||!music.wantsPlayback)return;
  const a=ensureMusicKeepalive();if(!a)return;
  try{if(a.paused)a.play().catch(()=>{})}catch{}
}"""
if old_start not in s:
    raise SystemExit('disabled keepalive anchor missing')
s=s.replace(old_start,new_start,1)

# Start the bridge early enough that Tesla cannot fall back to FM during the handoff.
old='if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=1.2)startMusicKeepalive();'
new='if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=2.2)startMusicKeepalive();'
if old not in s:
    raise SystemExit('transition threshold anchor missing')
s=s.replace(old,new,1)

# Once the next real YouTube track is PLAYING, immediately release the helper bridge.
required="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true);syncMediaSession()}"
if required not in s:
    raise SystemExit('new-track bridge stop handler missing')

# Normal playback must never keep the helper stream running for the whole song.
for bad in [
    'function playMusic(){music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive()',
    'music.current=t;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();syncMediaSession();renderPlayer();',
    'music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();'
]:
    if bad in s:
        raise SystemExit('continuous helper audio regression detected')

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
