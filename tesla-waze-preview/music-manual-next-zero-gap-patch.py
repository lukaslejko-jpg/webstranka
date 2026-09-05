from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_MANUAL_NEXT_ZERO_GAP_V34 */'
if marker in s:
    raise SystemExit(0)

old="""function handoffYoutubeTrack(next,reason='next'){
  if(!next||music.gaplessBusy||!music.ytPlayer)return false;
  const id=youtubeIdForTrack(next);if(!id)return false;
  if(!music.ytStandby||!music.ytStandbyTrack||youtubeIdForTrack(music.ytStandbyTrack)!==id){prepareYoutubeStandby(next);return false}
  try{music.ytStandbyStarting=true;music.ytStandby.mute?.();music.ytStandby.seekTo?.(0,true);music.ytStandby.playVideo?.();return true}catch{music.ytStandbyStarting=false;return false}
}"""
new="""function handoffYoutubeTrack(next,reason='next'){
  if(!next||music.gaplessBusy||!music.ytPlayer)return false;
  const id=youtubeIdForTrack(next);if(!id)return false;
  const startStandby=()=>{
    if(!music.ytStandby||!music.ytStandbyTrack||youtubeIdForTrack(music.ytStandbyTrack)!==id)return false;
    try{music.ytStandbyStarting=true;music.ytStandby.mute?.();music.ytStandby.seekTo?.(0,true);music.ytStandby.playVideo?.();return true}catch{music.ytStandbyStarting=false;return false}
  };
  if(startStandby())return true;
  // Important for manual Next: keep the current real player running while standby is created.
  // Return true immediately so mnext() never falls back to mplay(), which would destroy/re-render the live player.
  prepareYoutubeStandby(next).then(ok=>{
    if(!ok||music.userPaused||!music.wantsPlayback)return;
    startStandby();
  }).catch(()=>{});
  return true;
}"""
if old not in s:
    raise SystemExit('dual-player handoff anchor missing')
s=s.replace(old,new,1)

# Self-check: manual next must not be able to fall through because missing standby returns false.
if "prepareYoutubeStandby(next);return false" in s:
    raise SystemExit('manual next can still fall through to mplay')

s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
