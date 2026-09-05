from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_NEXT_UNLOCK_V38 */'
if marker in s:
    raise SystemExit(0)

if '/* MUSIC_SHUFFLE_NAV_FIX_V37 */' not in s:
    raise SystemExit('V37 base missing')

old='shuffleRecent:[],shuffleBack:[]};'
new='shuffleRecent:[],shuffleBack:[],navPreparing:false,handoffWatchdog:null};'
if old not in s:
    raise SystemExit('V38 music state anchor missing')
s=s.replace(old,new,1)

old="""function handoffYoutubeTrack(next,reason='next'){
  if(!next||music.gaplessBusy||!music.ytPlayer)return false;
  const id=youtubeIdForTrack(next);if(!id)return false;
  music.gaplessBusy=true;
  const startStandby=()=>{
    if(!music.ytStandby||!music.ytStandbyTrack||youtubeIdForTrack(music.ytStandbyTrack)!==id)return false;
    try{music.ytStandbyStarting=true;music.ytStandby.mute?.();music.ytStandby.seekTo?.(0,true);music.ytStandby.playVideo?.();return true}catch{music.ytStandbyStarting=false;return false}
  };
  if(startStandby())return true;
  // Keep the live main player running while the standby player is created.
  // Return true immediately so mnext() cannot fall through to mplay()/renderPlayer().
  prepareYoutubeStandby(next).then(ok=>{
    if(!ok||music.userPaused||!music.wantsPlayback){music.gaplessBusy=false;drainMusicNav();return}
    if(!startStandby()){music.gaplessBusy=false;drainMusicNav()}
  }).catch(()=>{music.gaplessBusy=false;drainMusicNav()});
  return true;
}"""
new="""function handoffYoutubeTrack(next,reason='next'){
  if(!next||music.gaplessBusy||music.ytStandbyStarting||music.navPreparing||!music.ytPlayer)return false;
  const id=youtubeIdForTrack(next);if(!id)return false;

  const startReadyStandby=()=>{
    if(!music.ytStandby||!music.ytStandbyTrack||youtubeIdForTrack(music.ytStandbyTrack)!==id||!music.ytStandbyReady)return false;
    try{
      music.navPreparing=false;
      music.gaplessBusy=true;
      music.ytStandbyStarting=true;
      music.ytStandby.mute?.();
      music.ytStandby.seekTo?.(0,true);
      music.ytStandby.playVideo?.();
      if(music.handoffWatchdog)clearTimeout(music.handoffWatchdog);
      music.handoffWatchdog=setTimeout(()=>{
        music.handoffWatchdog=null;
        if(!music.gaplessBusy&&!music.ytStandbyStarting)return;
        music.gaplessBusy=false;
        music.ytStandbyStarting=false;
        music.navPreparing=false;
        clearYoutubeStandby();
        drainMusicNav();
      },4500);
      return true;
    }catch{
      music.gaplessBusy=false;
      music.ytStandbyStarting=false;
      music.navPreparing=false;
      return false;
    }
  };

  if(startReadyStandby())return true;
  music.navPreparing=true;
  prepareYoutubeStandby(next).then(ok=>{
    if(!ok||music.userPaused||!music.wantsPlayback){
      music.navPreparing=false;
      clearYoutubeStandby();
      drainMusicNav();
      return;
    }
    let tries=0;
    const waitReady=()=>{
      if(music.userPaused||!music.wantsPlayback){music.navPreparing=false;clearYoutubeStandby();drainMusicNav();return}
      if(startReadyStandby())return;
      if(++tries<50){setTimeout(waitReady,80);return}
      music.navPreparing=false;
      clearYoutubeStandby();
      drainMusicNav();
    };
    waitReady();
  }).catch(()=>{music.navPreparing=false;clearYoutubeStandby();drainMusicNav()});
  return true;
}"""
if old not in s:
    raise SystemExit('V38 handoff anchor missing')
s=s.replace(old,new,1)

old="function mnext(reason='next'){if(music.gaplessBusy||music.ytStandbyStarting){music.navPending+=1;return true}return performMusicNext(reason)}\nfunction mprev(){if(music.gaplessBusy||music.ytStandbyStarting){music.navPending-=1;return true}return performMusicPrev()}"
new="function mnext(reason='next'){if(music.gaplessBusy||music.ytStandbyStarting||music.navPreparing){music.navPending+=1;return true}return performMusicNext(reason)}\nfunction mprev(){if(music.gaplessBusy||music.ytStandbyStarting||music.navPreparing){music.navPending-=1;return true}return performMusicPrev()}"
if old not in s:
    raise SystemExit('V38 mnext/mprev anchor missing')
s=s.replace(old,new,1)

old='if(music.gaplessBusy||music.ytStandbyStarting||!music.navPending)return;'
new='if(music.gaplessBusy||music.ytStandbyStarting||music.navPreparing||!music.navPending)return;'
if old not in s:
    raise SystemExit('V38 drain anchor missing')
s=s.replace(old,new,1)

old='music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession();drainMusicNav();'
new='music.gaplessBusy=false;music.navPreparing=false;if(music.handoffWatchdog){clearTimeout(music.handoffWatchdog);music.handoffWatchdog=null}stopMusicKeepalive();syncMediaSession();drainMusicNav();'
if old not in s:
    raise SystemExit('V38 completion anchor missing')
s=s.replace(old,new,1)

s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
