from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_TRANSITION_BRIDGE_2S_V29 */'
if marker in s:
    raise SystemExit(0)

old_start='function startMusicKeepalive(){return false}'
new_start="""function startMusicKeepalive(){
  if(music.userPaused||!music.wantsPlayback)return;
  const a=ensureMusicKeepalive();if(!a)return;
  try{if(a.paused)a.play().catch(()=>{})}catch{}
}"""
if old_start not in s:
    raise SystemExit('disabled keepalive anchor missing')
s=s.replace(old_start,new_start,1)

old='if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=1.2)startMusicKeepalive();'
new='if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=2.2)startMusicKeepalive();'
if old not in s:
    raise SystemExit('transition threshold anchor missing')
s=s.replace(old,new,1)

# The normal PLAYING handler must immediately release the bridge once the new track owns audio.
required="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();setMusicPlaying(true);syncMediaSession()}"
if required not in s:
    raise SystemExit('new-track stop bridge handler missing')

# Do not allow normal play/start paths to run helper audio throughout a song.
for bad in [
    'function playMusic(){music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive()',
    'music.current=t;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();syncMediaSession();renderPlayer();'
]:
    if bad in s:
        raise SystemExit('continuous helper audio regression detected')

s += '\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
