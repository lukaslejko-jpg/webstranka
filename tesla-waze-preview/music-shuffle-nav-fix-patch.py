from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_SHUFFLE_NAV_FIX_V37 */'
if marker in s:
    raise SystemExit(0)

# Add navigation/shuffle state without touching playback, navigation or voice settings.
old="ytStandby:null,ytStandbyTrack:null,ytStandbyReady:false,ytStandbyStarting:false};"
new="ytStandby:null,ytStandbyTrack:null,ytStandbyReady:false,ytStandbyStarting:false,navPending:0,shuffleRecent:[],shuffleBack:[]};"
if old not in s:
    raise SystemExit('music state anchor missing')
s=s.replace(old,new,1)

# Always synchronize playback queue to the full learned library (minus disliked tracks).
old="function ensureMusicQueue(){const items=musicItems();if(music.queue.length<2||!music.current||!music.queue.some(x=>mt(x).id===mt(music.current).id)){music.queue=items;save(LS.queue,music.queue)}return music.queue}"
new="""function ensureMusicQueue(){
  const items=Object.values(music.profile.tracks).filter(x=>!x.disliked).sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));
  const ids=items.map(x=>mt(x).id),qids=(music.queue||[]).map(x=>mt(x).id),same=ids.length===qids.length&&ids.every(id=>qids.includes(id));
  if(!same){music.queue=items;save(LS.queue,music.queue)}
  return music.queue;
}"""
if old not in s:
    raise SystemExit('ensureMusicQueue anchor missing')
s=s.replace(old,new,1)

# Shuffle: avoid recently played tracks and keep a real back-stack.
old="function nextMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;if(music.shuffle&&q.length>1){const cur=music.current?mt(music.current).id:'';const candidates=q.filter(x=>mt(x).id!==cur);return candidates[Math.floor(Math.random()*candidates.length)]||null}const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i+1+q.length)%q.length]||null}\nfunction prevMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i-1+q.length)%q.length]||null}"
new="""function nextMusicTrack(){
  const q=ensureMusicQueue();if(!q.length)return null;
  if(music.shuffle&&q.length>1){
    const cur=music.current?mt(music.current).id:'';
    if(cur){music.shuffleBack.push(cur);music.shuffleBack=music.shuffleBack.slice(-40)}
    const recentLimit=Math.min(12,Math.max(1,q.length-1)),blocked=new Set([cur,...music.shuffleRecent.slice(-recentLimit)]);
    let candidates=q.filter(x=>!blocked.has(mt(x).id));
    if(!candidates.length)candidates=q.filter(x=>mt(x).id!==cur);
    const pick=candidates[Math.floor(Math.random()*candidates.length)]||null;
    if(pick){music.shuffleRecent.push(mt(pick).id);music.shuffleRecent=music.shuffleRecent.slice(-recentLimit)}
    return pick;
  }
  const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i+1+q.length)%q.length]||null;
}
function prevMusicTrack(){
  const q=ensureMusicQueue();if(!q.length)return null;
  if(music.shuffle){
    const cur=music.current?mt(music.current).id:'';
    while(music.shuffleBack.length){const id=music.shuffleBack.pop();if(id&&id!==cur){const t=q.find(x=>mt(x).id===id);if(t)return t}}
  }
  const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i-1+q.length)%q.length]||null;
}"""
if old not in s:
    raise SystemExit('next/prev track anchor missing')
s=s.replace(old,new,1)

# Serialize player handoffs. A requested transition owns the lane until the new player is stable.
old="function handoffYoutubeTrack(next,reason='next'){\n  if(!next||music.gaplessBusy||!music.ytPlayer)return false;\n  const id=youtubeIdForTrack(next);if(!id)return false;"
new="function handoffYoutubeTrack(next,reason='next'){\n  if(!next||music.gaplessBusy||!music.ytPlayer)return false;\n  const id=youtubeIdForTrack(next);if(!id)return false;\n  music.gaplessBusy=true;"
if old not in s:
    raise SystemExit('handoff start anchor missing')
s=s.replace(old,new,1)

# If standby creation cannot start, release the lane so queued button presses can continue.
old="prepareYoutubeStandby(next).then(ok=>{\n    if(!ok||music.userPaused||!music.wantsPlayback)return;\n    startStandby();\n  }).catch(()=>{});\n  return true;"
new="prepareYoutubeStandby(next).then(ok=>{\n    if(!ok||music.userPaused||!music.wantsPlayback){music.gaplessBusy=false;drainMusicNav();return}\n    if(!startStandby()){music.gaplessBusy=false;drainMusicNav()}\n  }).catch(()=>{music.gaplessBusy=false;drainMusicNav()});\n  return true;"
if old not in s:
    raise SystemExit('standby promise anchor missing')
s=s.replace(old,new,1)

# Process queued Next/Previous presses after the real A->B overlap is complete.
old="music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession();\n        },900);"
new="music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession();drainMusicNav();\n        },900);"
if old not in s:
    raise SystemExit('handoff completion anchor missing')
s=s.replace(old,new,1)

old="function mnext(reason='next'){const n=nextMusicTrack();if(!n)return false;if(music.ytPlayer&&youtubeIdForTrack(n)){handoffYoutubeTrack(n,reason);return true}mplay(n);return true}function mprev(){const p=prevMusicTrack();if(!p)return false;if(music.ytPlayer&&youtubeIdForTrack(p)){handoffYoutubeTrack(p,'prev');return true}mplay(p);return true}"
new="""function drainMusicNav(){
  if(music.gaplessBusy||music.ytStandbyStarting||!music.navPending)return;
  const dir=music.navPending>0?1:-1;music.navPending-=dir;
  if(dir>0)performMusicNext('next');else performMusicPrev();
}
function performMusicNext(reason='next'){
  const n=nextMusicTrack();if(!n)return false;
  if(music.ytPlayer&&youtubeIdForTrack(n)){if(!handoffYoutubeTrack(n,reason)){music.navPending+=1;setTimeout(drainMusicNav,120)}return true}
  mplay(n);setTimeout(drainMusicNav,0);return true;
}
function performMusicPrev(){
  const p=prevMusicTrack();if(!p)return false;
  if(music.ytPlayer&&youtubeIdForTrack(p)){if(!handoffYoutubeTrack(p,'prev')){music.navPending-=1;setTimeout(drainMusicNav,120)}return true}
  mplay(p);setTimeout(drainMusicNav,0);return true;
}
function mnext(reason='next'){
  if(music.gaplessBusy||music.ytStandbyStarting){music.navPending+=1;return true}
  return performMusicNext(reason);
}
function mprev(){
  if(music.gaplessBusy||music.ytStandbyStarting){music.navPending-=1;return true}
  return performMusicPrev();
}"""
if old not in s:
    raise SystemExit('mnext/mprev anchor missing')
s=s.replace(old,new,1)

# Reset shuffle memory when shuffle is toggled so a new session starts cleanly.
old="r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};"
new="r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;music.shuffleRecent=[];music.shuffleBack=[];save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};"
if old not in s:
    raise SystemExit('shuffle button anchor missing')
s=s.replace(old,new,1)

s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
