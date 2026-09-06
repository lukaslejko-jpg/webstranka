from pathlib import Path

APP=Path('tesla-waze-preview/app.js')
MARKER='/* MUSIC_SESSION_HOLD_V43 */'
s=APP.read_text(encoding='utf-8')
if MARKER in s: raise SystemExit(0)
if '/* MUSIC_PREGAPLESS_CORE_V42 */' not in s: raise SystemExit('V42 base missing')

old_audio="function wireAudio(){if(!music.audio)return;music.audio.onended=()=>{music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()};music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)};music.audio.onpause=()=>{setMusicPlaying(false);scheduleMusicResume()};music.audio.ontimeupdate=()=>{updateMiniSeek();if(!('mediaSession' in navigator)||!music.audio?.duration||!Number.isFinite(music.audio.duration))return;try{navigator.mediaSession.setPositionState({duration:music.audio.duration,playbackRate:music.audio.playbackRate||1,position:Math.min(music.audio.currentTime,music.audio.duration)})}catch{}}}"
new_audio="function wireAudio(){if(!music.audio)return;music.audio.onended=()=>{if(music.current)mev('complete',music.current);if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext()}else{music.wantsPlayback=false;setMusicPlaying(false)}};music.audio.onplay=()=>{music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true)};music.audio.onpause=()=>{if(music.userPaused||!music.wantsPlayback)setMusicPlaying(false);else{setMusicPlaying(true);scheduleMusicResume()}};music.audio.ontimeupdate=()=>{updateMiniSeek();if(!('mediaSession' in navigator)||!music.audio?.duration||!Number.isFinite(music.audio.duration))return;try{navigator.mediaSession.setPositionState({duration:music.audio.duration,playbackRate:music.audio.playbackRate||1,position:Math.min(music.audio.currentTime,music.audio.duration)})}catch{}}}"
if old_audio not in s: raise SystemExit('wireAudio V42 anchor missing')
s=s.replace(old_audio,new_audio,1)

old_state="onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;setMusicPlaying(true)}else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED||e.data===YT.PlayerState.UNSTARTED){setMusicPlaying(false);scheduleMusicResume();noteYoutubeBlockedState(yt)}else if(e.data===YT.PlayerState.ENDED){music.wantsPlayback=false;setMusicPlaying(false);if(music.current)mev('complete',music.current);if(music.autoNext)mnext()}}"
new_state="onStateChange:e=>{if(e.data===YT.PlayerState.PLAYING){music.fallbackAttempts=0;music.wantsPlayback=true;setMusicPlaying(true)}else if(e.data===YT.PlayerState.PAUSED||e.data===YT.PlayerState.CUED||e.data===YT.PlayerState.UNSTARTED){if(music.userPaused||!music.wantsPlayback)setMusicPlaying(false);else{setMusicPlaying(true);scheduleMusicResume();noteYoutubeBlockedState(yt)}}else if(e.data===YT.PlayerState.ENDED){if(music.current)mev('complete',music.current);if(music.autoNext&&!music.userPaused){music.wantsPlayback=true;setMusicPlaying(true);mnext()}else{music.wantsPlayback=false;setMusicPlaying(false)}}}"
if old_state not in s: raise SystemExit('YouTube state V42 anchor missing')
s=s.replace(old_state,new_state,1)

old_mplay="function mplay(t){const st=mt(t),yt=t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'');if(!t.streamUrl&&!yt)return musicSources(t);if(music.current&&music.started&&Date.now()-music.started<15000)mev('skip',music.current);const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;music.userPaused=false;music.wantsPlayback=true;renderPlayer();music.started=Date.now();mev(replay?'replay':'play',t);if(music.audio)music.audio.play().catch(()=>{})}"
new_mplay="function mplay(t){const st=mt(t),yt=t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'');if(!t.streamUrl&&!yt)return musicSources(t);if(music.current&&music.started&&Date.now()-music.started<15000)mev('skip',music.current);const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();renderPlayer();music.started=Date.now();mev(replay?'replay':'play',t);if(music.audio)music.audio.play().catch(()=>{})}"
if old_mplay not in s: raise SystemExit('mplay V42 anchor missing')
s=s.replace(old_mplay,new_mplay,1)

# Validation: transitions must never publish paused unless playback was really stopped by the user/no-next.
if "e.data===YT.PlayerState.ENDED){music.wantsPlayback=false;setMusicPlaying(false)" in s: raise SystemExit('ENDED still releases Tesla media session')
if "UNSTARTED){setMusicPlaying(false)" in s: raise SystemExit('YouTube startup still releases Tesla media session')
if "music.audio.onended=()=>{music.wantsPlayback=false;setMusicPlaying(false)" in s: raise SystemExit('audio ended still releases Tesla media session')

s+='\n'+MARKER+'\n'
APP.write_text(s,encoding='utf-8')
