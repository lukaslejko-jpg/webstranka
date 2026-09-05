from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker39='/* MUSIC_MANUAL_DIRECT_NAV_V39 */'
marker40='/* MUSIC_SINGLE_PLAYER_STABLE_NAV_V40 */'
if marker40 in s:
    raise SystemExit(0)

# Install V39 first if an older rebuilt source is encountered.
if marker39 not in s:
    if '/* MUSIC_NEXT_UNLOCK_V38 */' not in s:
        raise SystemExit('V38 base missing')
    start=s.find('function drainMusicNav(){')
    end=s.find('let ytApiPromise=null;', start)
    if start<0 or end<0:
        raise SystemExit('manual navigation block not found')
    new=r'''function resetManualMusicTransition(){
  try{if(music.handoffWatchdog)clearTimeout(music.handoffWatchdog)}catch{}
  music.handoffWatchdog=null;
  music.navPending=0;
  music.navPreparing=false;
  music.gaplessBusy=false;
  music.ytStandbyStarting=false;
  try{clearYoutubeStandby()}catch{}
}
function directYoutubeTrack(track,reason='next'){
  if(!track||!music.ytPlayer)return false;
  const id=youtubeIdForTrack(track);if(!id)return false;
  const prev=music.current;
  resetManualMusicTransition();
  music.current=track;
  music.userPaused=false;
  music.wantsPlayback=true;
  music.started=Date.now();
  if(prev&&mt(prev).id!==mt(track).id)mev(reason==='auto'?'complete':'skip',prev);
  mev('play',track);
  refreshCurrentMusicUi();
  setMusicPlaying(true);
  syncMediaSession();
  try{
    music.ytPlayer.loadVideoById(id,0,'default');
    music.ytPlayer.playVideo?.();
    return true;
  }catch{
    return false;
  }
}
function mnext(reason='next'){
  const n=nextMusicTrack();
  if(!n)return false;
  if(music.ytPlayer&&youtubeIdForTrack(n))return directYoutubeTrack(n,reason);
  mplay(n);
  return true;
}
function mprev(){
  const p=prevMusicTrack();
  if(!p)return false;
  if(music.ytPlayer&&youtubeIdForTrack(p))return directYoutubeTrack(p,'prev');
  mplay(p);
  return true;
}
'''
    s=s[:start]+new+s[end:]
    s+='\n'+marker39+'\n'

# V40: remove dual-player/standby behavior from all track navigation.
# Every manual Next/Previous and ENDED auto-next uses the known-stable mplay()/renderPlayer() path.
start=s.find('function resetManualMusicTransition(){')
end=s.find('let ytApiPromise=null;', start)
if start<0 or end<0:
    raise SystemExit('V39 navigation block missing')
new_nav=r'''function resetManualMusicTransition(){
  try{if(music.handoffWatchdog)clearTimeout(music.handoffWatchdog)}catch{}
  music.handoffWatchdog=null;
  music.navPending=0;
  music.navPreparing=false;
  music.gaplessBusy=false;
  music.ytStandbyStarting=false;
  try{clearYoutubeStandby()}catch{}
}
function mnext(reason='next'){
  const n=nextMusicTrack();
  if(!n)return false;
  resetManualMusicTransition();
  mplay(n);
  return true;
}
function mprev(){
  const p=prevMusicTrack();
  if(!p)return false;
  resetManualMusicTransition();
  mplay(p);
  return true;
}
'''
s=s[:start]+new_nav+s[end:]

old_timer="setInterval(()=>{if(!music.autoNext||music.userPaused||!music.wantsPlayback||!music.ytPlayer)return;try{const st=music.ytPlayer.getPlayerState?.(),d=Number(music.ytPlayer.getDuration?.()||0),t=Number(music.ytPlayer.getCurrentTime?.()||0),left=d-t;if(st!==YT.PlayerState.PLAYING||d<=2||left<=0)return;const n=nextMusicTrack();if(left<=5.0&&n&&!music.ytStandby&&!music.ytStandbyStarting)prepareYoutubeStandby(n);if(left<=1.2&&n&&!music.gaplessBusy&&!music.ytStandbyStarting){if(!handoffYoutubeTrack(n,'auto'))prepareYoutubeStandby(n)}}catch{}},100);"
if old_timer in s:
    s=s.replace(old_timer,"/* dual-player preroll disabled by V40; ENDED handler performs auto-next through mplay() */",1)

if 'function mnext(reason=' not in s or 'mplay(n);' not in s:
    raise SystemExit('V40 next control missing')
if 'function mprev()' not in s or 'mplay(p);' not in s:
    raise SystemExit('V40 previous control missing')
if 'left<=5.0&&n&&!music.ytStandby' in s:
    raise SystemExit('dual-player preroll still active')

s+='\n'+marker40+'\n'
p.write_text(s,encoding='utf-8')
