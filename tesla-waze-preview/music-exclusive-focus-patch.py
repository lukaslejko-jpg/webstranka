from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_TRANSITION_BRIDGE_V31 */'
if marker in s:
    raise SystemExit(0)

# Start helper bridge 5.0 s before the current YouTube track ends.
old="if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=3.0)startMusicKeepalive();"
new="if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=5.0)startMusicKeepalive();"
if old not in s:
    raise SystemExit('3.0s bridge threshold anchor missing')
s=s.replace(old,new,1)

# Keep the bridge for 2.0 s after the next real track reports PLAYING,
# giving Tesla enough time to settle the browser stream before releasing helper audio.
old_play="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();setTimeout(()=>{if(music.wantsPlayback&&!music.userPaused){stopMusicKeepalive();syncMediaSession()}},1200)}"
new_play="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();setTimeout(()=>{if(music.wantsPlayback&&!music.userPaused){stopMusicKeepalive();syncMediaSession()}},2000)}"
if old_play not in s:
    raise SystemExit('1.2s PLAYING bridge release anchor missing')
s=s.replace(old_play,new_play,1)

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
