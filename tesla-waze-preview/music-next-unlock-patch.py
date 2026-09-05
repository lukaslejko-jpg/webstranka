from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_MANUAL_DIRECT_NAV_V39 */'
if marker in s:
    raise SystemExit(0)

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
s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
