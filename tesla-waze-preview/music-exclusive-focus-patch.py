from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_TRANSITION_BRIDGE_V30 */'
if marker in s:
    raise SystemExit(0)

# Start helper bridge earlier: 3.0 s before the current YouTube track ends.
old="if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=2.2)startMusicKeepalive();"
new="if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=3.0)startMusicKeepalive();"
if old not in s:
    raise SystemExit('2.2s bridge threshold anchor missing')
s=s.replace(old,new,1)

# Do not release the bridge on the first PLAYING event. Tesla needs a short settling window
# before the new real track is treated as the stable audio source.
old_play="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true);syncMediaSession()}"
new_play="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();setTimeout(()=>{if(music.wantsPlayback&&!music.userPaused){stopMusicKeepalive();syncMediaSession()}},1200)}"
if old_play not in s:
    raise SystemExit('immediate PLAYING bridge release anchor missing')
s=s.replace(old_play,new_play,1)

# Keep normal playback free of helper audio; the bridge is only primed by the end-of-track timer/handoff.
for bad in [
    'function playMusic(){music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive()',
    'music.current=t;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();syncMediaSession();renderPlayer();',
    'music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();'
]:
    if bad in s:
        raise SystemExit('continuous helper audio regression detected')

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
