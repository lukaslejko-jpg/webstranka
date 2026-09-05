from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_TRANSITION_KEEPALIVE_V18 */'
if marker in s:
    raise SystemExit(0)

# Make the keepalive a barely non-zero PCM signal so the car audio stack sees an active browser stream.
old="w(0,'RIFF');v.setUint32(4,36+samples*2,true);w(8,'WAVE');w(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,'data');v.setUint32(40,samples*2,true);"
new=old+"for(let i=0;i<samples;i++)v.setInt16(44+i*2,(i&1)?1:-1,true);"
if old not in s:
    raise SystemExit('silent wav anchor missing')
s=s.replace(old,new,1)

# Do not keep the helper audio running during the whole song; YouTube should own normal media focus.
s=s.replace("function playMusic(){music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();if(music.audio)","function playMusic(){music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();if(music.audio)",1)
s=s.replace("music.current=t;music.userPaused=false;music.wantsPlayback=true;startMusicKeepalive();renderPlayer();","music.current=t;music.userPaused=false;music.wantsPlayback=true;stopMusicKeepalive();syncMediaSession();renderPlayer();",1)

# During same-player handoff keep it alive and refresh metadata before loadVideoById.
s=s.replace("music.gaplessBusy=true;const prev=music.current;music.current=next;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();","music.gaplessBusy=true;startMusicKeepalive();const prev=music.current;music.current=next;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();",1)

# When the new YT track is actually playing, give focus back to YouTube and refresh Tesla media metadata.
old_play="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;setMusicPlaying(true)}"
new_play="if(e.data===YT.PlayerState.PLAYING){music.gaplessBusy=false;music.fallbackAttempts=0;setMusicPlaying(true);syncMediaSession();setTimeout(()=>{stopMusicKeepalive();syncMediaSession()},450)}"
if old_play not in s:
    raise SystemExit('YT PLAYING anchor missing')
s=s.replace(old_play,new_play,1)

# Prime the keepalive shortly before the gap can happen; actual handoff still happens at 0.38s.
old_timer="setInterval(()=>{if(!music.autoNext||music.userPaused||!music.wantsPlayback||music.gaplessBusy||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.(),d=Number(music.ytPlayer.getDuration?.()||0),t=Number(music.ytPlayer.getCurrentTime?.()||0);if(st===YT.PlayerState.PLAYING&&d>2&&d-t>0&&d-t<=0.38){const n=nextMusicTrack();if(n)handoffYoutubeTrack(n,'auto')}}catch{}},120);"
new_timer="setInterval(()=>{if(!music.autoNext||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.(),d=Number(music.ytPlayer.getDuration?.()||0),t=Number(music.ytPlayer.getCurrentTime?.()||0),left=d-t;if(st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=1.2)startMusicKeepalive();if(!music.gaplessBusy&&st===YT.PlayerState.PLAYING&&d>2&&left>0&&left<=0.38){const n=nextMusicTrack();if(n)handoffYoutubeTrack(n,'auto')}}catch{}},120);"
if old_timer not in s:
    raise SystemExit('gapless timer anchor missing')
s=s.replace(old_timer,new_timer,1)

# Ensure manual pause/final stop still releases helper focus.
# Existing pauseMusic/final-end paths already call stopMusicKeepalive().

s=s.replace("/* MUSIC_GAPLESS_HANDOFF_V16 */",marker+"/* MUSIC_GAPLESS_HANDOFF_V16 */",1)
p.write_text(s,encoding='utf-8')
