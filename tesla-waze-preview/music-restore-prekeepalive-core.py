from pathlib import Path
import subprocess

APP=Path('tesla-waze-preview/app.js')
BASE_REF='0a6d13493edd1e93b89d832cb4fc3cc01ddaffd5'
PATH='tesla-waze-preview/app.js'
MARKER='/* MUSIC_PREGAPLESS_CORE_V42 */'

s=APP.read_text(encoding='utf-8')
if MARKER in s: raise SystemExit(0)
base=subprocess.check_output(['git','show',f'{BASE_REF}:{PATH}'],text=True,encoding='utf-8')

def core_bounds(text):
    a=text.find('const music={'); b=text.find('async function resolveMusic(q){',a)
    if a<0 or b<0: raise SystemExit('music core boundaries not found')
    return a,b

bs,be=core_bounds(base); cs,ce=core_bounds(s)
core=base[bs:be]
core=core.replace('return a.slice(0,40)}','return a}').replace('return q.slice(0,40).map(','return q.map(')

old_state='fallbackTimer:null};'
if old_state not in core: raise SystemExit('pre-gapless state anchor missing')
core=core.replace(old_state,'fallbackTimer:null,shuffleRecent:[],shuffleBack:[]};',1)

old_queue="function ensureMusicQueue(){const items=musicItems();if(music.queue.length<2||!music.current||!music.queue.some(x=>mt(x).id===mt(music.current).id)){music.queue=items;save(LS.queue,music.queue)}return music.queue}"
new_queue="""function ensureMusicQueue(){
  const items=Object.values(music.profile.tracks).filter(x=>!x.disliked).sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));
  const ids=items.map(x=>mt(x).id),qids=(music.queue||[]).map(x=>mt(x).id);
  const same=ids.length===qids.length&&ids.every(id=>qids.includes(id));
  if(!same){music.queue=items;save(LS.queue,music.queue)}
  return music.queue;
}"""
if old_queue not in core: raise SystemExit('pre-gapless queue anchor missing')
core=core.replace(old_queue,new_queue,1)

# Replace the original Next/Previous block by POSITION, not formatting.
nav_start=core.find('function mnext(){')
nav_end=core.find('let ytApiPromise=null;',nav_start)
if nav_start<0 or nav_end<0: raise SystemExit('pre-gapless mnext/mprev block missing')
new_nav="""function mnext(){
  const q=ensureMusicQueue();if(!q.length)return false;
  let n=null;
  if(music.shuffle&&q.length>1){
    const cur=music.current?mt(music.current).id:'';
    if(cur){music.shuffleBack.push(cur);music.shuffleBack=music.shuffleBack.slice(-50)}
    const recentLimit=Math.min(12,Math.max(1,q.length-1));
    const blocked=new Set([cur,...music.shuffleRecent.slice(-recentLimit)]);
    let candidates=q.filter(x=>!blocked.has(mt(x).id));
    if(!candidates.length)candidates=q.filter(x=>mt(x).id!==cur);
    n=candidates[Math.floor(Math.random()*candidates.length)]||null;
    if(n){music.shuffleRecent.push(mt(n).id);music.shuffleRecent=music.shuffleRecent.slice(-recentLimit)}
  }else{
    const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);
    n=q[(i+1+q.length)%q.length]||null;
  }
  if(!n)return false;
  mplay(n);
  return true;
}
function mprev(){
  const q=ensureMusicQueue();if(!q.length)return false;
  let p=null;
  if(music.shuffle){
    const cur=music.current?mt(music.current).id:'';
    while(music.shuffleBack.length){
      const id=music.shuffleBack.pop();
      if(id&&id!==cur){p=q.find(x=>mt(x).id===id)||null;if(p)break}
    }
  }
  if(!p){
    const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);
    p=q[(i-1+q.length)%q.length]||null;
  }
  if(!p)return false;
  mplay(p);
  return true;
}
"""
core=core[:nav_start]+new_nav+core[nav_end:]

old_like="r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();r.querySelector('[data-ma=like]').classList.toggle('primary',mt(music.current).liked)};"
new_like="""r.querySelector('[data-ma=like]').onclick=()=>{
  const st=mt(music.current);
  if(st.liked){st.liked=false;st.score-=5;music.profile.events.push({type:'unlike',id:st.id,at:new Date().toISOString()});music.profile.events=music.profile.events.slice(-500);save(LS.music,music.profile);renderMusicStatus()}else{mev('like',music.current)}
  renderMusicList();const btn=r.querySelector('[data-ma=like]');if(btn)btn.classList.toggle('primary',!!mt(music.current).liked);
};"""
if old_like not in core: raise SystemExit('pre-gapless like anchor missing')
core=core.replace(old_like,new_like,1)

old_ms="function syncMediaSession(){updateMiniSeek();if(!('mediaSession' in navigator)||!music.current)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:music.current.title||'Bez názvu',artist:music.current.artist||'',album:'Tesla Maps Smart Music',artwork:music.current.artwork?[{src:music.current.artwork}]:[]})}catch{}const actions={play:playMusic,pause:pauseMusic,previoustrack:mprev,nexttrack:mnext,seekbackward:()=>seekMusic(-15),seekforward:()=>seekMusic(15)};for(const [name,handler] of Object.entries(actions))try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}"
new_ms="function syncMediaSession(){updateMiniSeek();if(!('mediaSession' in navigator)||!music.current)return;try{navigator.mediaSession.metadata=new MediaMetadata({title:music.current.title||'Bez názvu',artist:music.current.artist||'',album:'Tesla Maps Smart Music',artwork:music.current.artwork?[{src:music.current.artwork}]:[]});navigator.mediaSession.playbackState=(music.wantsPlayback&&!music.userPaused)?'playing':'paused'}catch{}const actions={play:playMusic,pause:pauseMusic,stop:pauseMusic,previoustrack:mprev,nexttrack:mnext,seekbackward:()=>seekMusic(-15),seekforward:()=>seekMusic(15)};for(const [name,handler] of Object.entries(actions))try{navigator.mediaSession.setActionHandler(name,handler)}catch{}}"
if old_ms not in core: raise SystemExit('pre-gapless MediaSession anchor missing')
core=core.replace(old_ms,new_ms,1)

# Compatibility only: never create helper audio.
core+='\nfunction startMusicKeepalive(){}\nfunction stopMusicKeepalive(){}\n'
s=s[:cs]+core+s[ce:]

old_shuffle="r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};"
new_shuffle="r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;music.shuffleRecent=[];music.shuffleBack=[];save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};"
if old_shuffle in s: s=s.replace(old_shuffle,new_shuffle,1)

as_,ae=core_bounds(s); active=s[as_:ae]
if 'mplay(n);' not in active or 'mplay(p);' not in active: raise SystemExit('plain mplay navigation missing')
if 'e.data===YT.PlayerState.ENDED' not in active or 'if(music.autoNext)mnext()' not in active: raise SystemExit('original ENDED auto-next missing')
for forbidden in ['handoffYoutubeTrack(','loadVideoById(','d-t<=0.38','gaplessBusy','prepareYoutubeStandby(','ytStandby','navPending','navPreparing','handoffWatchdog','createMusicKeepaliveAudio','ensureMusicKeepalive(','buildSilentWavUrl(']:
    if forbidden in active: raise SystemExit(f'forbidden post-baseline mechanism remains: {forbidden}')
if 'return a.slice(0,40)' in active or 'q.slice(0,40).map' in active: raise SystemExit('40-track cap regressed')

legacy=['MUSIC_GAPLESS_HANDOFF_V16','MUSIC_AUDIO_KEEPALIVE_V17','MUSIC_TRANSITION_KEEPALIVE_V18','MUSIC_CONTINUOUS_SESSION_V24','MUSIC_TESLA_MEDIA_CONTROLS_V26','MUSIC_EXCLUSIVE_FOCUS_V27','MUSIC_TRANSITION_BRIDGE_V31','MUSIC_DUAL_PLAYER_HANDOFF_V33','MUSIC_MANUAL_NEXT_ZERO_GAP_V34','MUSIC_STABLE_CONTROLS_FULL_QUEUE_V35','MUSIC_LIKE_TOGGLE_V36','MUSIC_SHUFFLE_NAV_FIX_V37','MUSIC_NEXT_UNLOCK_V38','MUSIC_MANUAL_DIRECT_NAV_V39','MUSIC_SINGLE_PLAYER_STABLE_NAV_V40','MUSIC_PREKEEPALIVE_CORE_V41']
for name in legacy:
    token=f'/* {name} */'
    if token not in s: s+='\n'+token
s+='\n'+MARKER+'\n'
APP.write_text(s,encoding='utf-8')
