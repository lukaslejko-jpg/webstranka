from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker35='/* MUSIC_STABLE_CONTROLS_FULL_QUEUE_V35 */'
marker36='/* MUSIC_LIKE_TOGGLE_V36 */'
marker37='/* MUSIC_SHUFFLE_NAV_FIX_V37 */'
if marker37 in s:
    raise SystemExit(0)

if marker35 not in s:
    old="function musicItems(){let a=Object.values(music.profile.tracks).filter(x=>!x.disliked);if(music.tab==='likes')a=a.filter(x=>x.liked);if(music.tab==='recent')a=a.filter(x=>x.lastPlayed).sort((x,y)=>Date.parse(y.lastPlayed)-Date.parse(x.lastPlayed));else a.sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));return a.slice(0,40)}"
    new="function musicItems(){let a=Object.values(music.profile.tracks).filter(x=>!x.disliked);if(music.tab==='likes')a=a.filter(x=>x.liked);if(music.tab==='recent')a=a.filter(x=>x.lastPlayed).sort((x,y)=>Date.parse(y.lastPlayed)-Date.parse(x.lastPlayed));else a.sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));return a}"
    if old not in s: raise SystemExit('musicItems 40-track cap anchor missing')
    s=s.replace(old,new,1)

    old="function miniQueueMarkup(q,currentId){return q.slice(0,40).map((t,i)=>{const s=mt(t),active=s.id===currentId;return `<button type=\"button\" class=\"music-mini-track ${active?'active':''}\" data-mini-play=\"${esc(s.id)}\"><span class=\"music-mini-index\">${i+1}</span><img class=\"music-mini-art\" src=\"${esc(t.artwork||s.artwork||'')}\" onerror=\"this.style.visibility='hidden'\"><span class=\"music-mini-meta\"><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></span>${active?'<span class=\"music-mini-playing\">▶</span>':''}</button>`}).join('')}"
    new="function miniQueueMarkup(q,currentId){return q.map((t,i)=>{const s=mt(t),active=s.id===currentId;return `<button type=\"button\" class=\"music-mini-track ${active?'active':''}\" data-mini-play=\"${esc(s.id)}\"><span class=\"music-mini-index\">${i+1}</span><img class=\"music-mini-art\" src=\"${esc(t.artwork||s.artwork||'')}\" onerror=\"this.style.visibility='hidden'\"><span class=\"music-mini-meta\"><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></span>${active?'<span class=\"music-mini-playing\">▶</span>':''}</button>`}).join('')}"
    if old not in s: raise SystemExit('miniQueueMarkup 40-track cap anchor missing')
    s=s.replace(old,new,1)

    old="function mnext(reason='next'){const n=nextMusicTrack();if(!n)return false;if(handoffYoutubeTrack(n,reason))return true;mplay(n);return true}function mprev(){const p=prevMusicTrack();if(!p)return false;if(handoffYoutubeTrack(p,'prev'))return true;mplay(p);return true}"
    new="function mnext(reason='next'){const n=nextMusicTrack();if(!n)return false;if(music.ytPlayer&&youtubeIdForTrack(n)){handoffYoutubeTrack(n,reason);return true}mplay(n);return true}function mprev(){const p=prevMusicTrack();if(!p)return false;if(music.ytPlayer&&youtubeIdForTrack(p)){handoffYoutubeTrack(p,'prev');return true}mplay(p);return true}"
    if old not in s: raise SystemExit('manual next/prev anchor missing')
    s=s.replace(old,new,1)

    old="""        try{newPlayer.unMute?.();newPlayer.setVolume?.(100)}catch{}
        try{oldPlayer?.pauseVideo?.()}catch{}
        music.ytPlayer=newPlayer;music.ytStandby=null;music.ytStandbyTrack=null;music.ytStandbyReady=false;music.ytStandbyStarting=false;
        music.current=nextTrack;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();
        if(prev)mev('complete',prev);mev('play',nextTrack);refreshCurrentMusicUi();setMusicPlaying(true);syncMediaSession();
        try{const main=document.getElementById('ytPlayerHost'),iframe=newPlayer.getIframe?.();if(main&&iframe){main.innerHTML='';main.appendChild(iframe)}}catch{}
        setTimeout(()=>{try{oldPlayer?.destroy?.()}catch{};music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession()},350);"""
    new="""        try{newPlayer.unMute?.();newPlayer.setVolume?.(100)}catch{}
        music.ytPlayer=newPlayer;music.ytStandby=null;music.ytStandbyTrack=null;music.ytStandbyReady=false;music.ytStandbyStarting=false;
        music.current=nextTrack;music.userPaused=false;music.wantsPlayback=true;music.started=Date.now();
        if(prev)mev('complete',prev);mev('play',nextTrack);refreshCurrentMusicUi();setMusicPlaying(true);syncMediaSession();
        setTimeout(()=>{try{oldPlayer?.pauseVideo?.()}catch{}},650);
        setTimeout(()=>{
          try{const main=document.getElementById('ytPlayerHost'),iframe=newPlayer.getIframe?.();if(main&&iframe&&!main.contains(iframe)){main.innerHTML='';main.appendChild(iframe)}}catch{}
          try{oldPlayer?.destroy?.()}catch{};
          music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession();
        },900);"""
    if old not in s: raise SystemExit('dual-player overlap anchor missing')
    s=s.replace(old,new,1)
    s+='\n'+marker35+'\n'

if marker36 not in s:
    old="r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();r.querySelector('[data-ma=like]').classList.toggle('primary',mt(music.current).liked)};"
    new="""r.querySelector('[data-ma=like]').onclick=()=>{
  const st=mt(music.current);
  if(st.liked){
    st.liked=false;st.score-=5;
    music.profile.events.push({type:'unlike',id:st.id,at:new Date().toISOString()});
    music.profile.events=music.profile.events.slice(-500);
    save(LS.music,music.profile);renderMusicStatus();
  }else{mev('like',music.current)}
  renderMusicList();
  const btn=r.querySelector('[data-ma=like]');if(btn)btn.classList.toggle('primary',!!mt(music.current).liked);
};"""
    if old not in s: raise SystemExit('like button anchor missing')
    s=s.replace(old,new,1)
    s+='\n'+marker36+'\n'

# V37: reliable full-library queue, non-repeating shuffle and queued button presses.
old="ytStandby:null,ytStandbyTrack:null,ytStandbyReady:false,ytStandbyStarting:false};"
new="ytStandby:null,ytStandbyTrack:null,ytStandbyReady:false,ytStandbyStarting:false,navPending:0,shuffleRecent:[],shuffleBack:[]};"
if old not in s: raise SystemExit('V37 music state anchor missing')
s=s.replace(old,new,1)

old="function ensureMusicQueue(){const items=musicItems();if(music.queue.length<2||!music.current||!music.queue.some(x=>mt(x).id===mt(music.current).id)){music.queue=items;save(LS.queue,music.queue)}return music.queue}"
new="""function ensureMusicQueue(){
  const items=Object.values(music.profile.tracks).filter(x=>!x.disliked).sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));
  const ids=items.map(x=>mt(x).id),qids=(music.queue||[]).map(x=>mt(x).id),same=ids.length===qids.length&&ids.every(id=>qids.includes(id));
  if(!same){music.queue=items;save(LS.queue,music.queue)}
  return music.queue;
}"""
if old not in s: raise SystemExit('V37 ensureMusicQueue anchor missing')
s=s.replace(old,new,1)

old="function nextMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;if(music.shuffle&&q.length>1){const cur=music.current?mt(music.current).id:'';const candidates=q.filter(x=>mt(x).id!==cur);return candidates[Math.floor(Math.random()*candidates.length)]||null}const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i+1+q.length)%q.length]||null}\nfunction prevMusicTrack(){const q=ensureMusicQueue();if(!q.length)return null;const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i-1+q.length)%q.length]||null}"
new="""function nextMusicTrack(){
  const q=ensureMusicQueue();if(!q.length)return null;
  if(music.shuffle&&q.length>1){
    const cur=music.current?mt(music.current).id:'';
    if(cur){music.shuffleBack.push(cur);music.shuffleBack=music.shuffleBack.slice(-40)}
    const recentLimit=Math.min(12,Math.max(1,q.length-1)),blocked=new Set([cur,...music.shuffleRecent.slice(-recentLimit)]);
    let candidates=q.filter(x=>!blocked.has(mt(x).id));if(!candidates.length)candidates=q.filter(x=>mt(x).id!==cur);
    const pick=candidates[Math.floor(Math.random()*candidates.length)]||null;
    if(pick){music.shuffleRecent.push(mt(pick).id);music.shuffleRecent=music.shuffleRecent.slice(-recentLimit)}
    return pick;
  }
  const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i+1+q.length)%q.length]||null;
}
function prevMusicTrack(){
  const q=ensureMusicQueue();if(!q.length)return null;
  if(music.shuffle){const cur=music.current?mt(music.current).id:'';while(music.shuffleBack.length){const id=music.shuffleBack.pop();if(id&&id!==cur){const t=q.find(x=>mt(x).id===id);if(t)return t}}}
  const i=q.findIndex(x=>music.current&&mt(x).id===mt(music.current).id);return q[(i-1+q.length)%q.length]||null;
}"""
if old not in s: raise SystemExit('V37 next/prev track anchor missing')
s=s.replace(old,new,1)

old="function handoffYoutubeTrack(next,reason='next'){\n  if(!next||music.gaplessBusy||!music.ytPlayer)return false;\n  const id=youtubeIdForTrack(next);if(!id)return false;"
new="function handoffYoutubeTrack(next,reason='next'){\n  if(!next||music.gaplessBusy||!music.ytPlayer)return false;\n  const id=youtubeIdForTrack(next);if(!id)return false;\n  music.gaplessBusy=true;"
if old not in s: raise SystemExit('V37 handoff start anchor missing')
s=s.replace(old,new,1)

old="prepareYoutubeStandby(next).then(ok=>{\n    if(!ok||music.userPaused||!music.wantsPlayback)return;\n    startStandby();\n  }).catch(()=>{});\n  return true;"
new="prepareYoutubeStandby(next).then(ok=>{\n    if(!ok||music.userPaused||!music.wantsPlayback){music.gaplessBusy=false;drainMusicNav();return}\n    if(!startStandby()){music.gaplessBusy=false;drainMusicNav()}\n  }).catch(()=>{music.gaplessBusy=false;drainMusicNav()});\n  return true;"
if old not in s: raise SystemExit('V37 standby promise anchor missing')
s=s.replace(old,new,1)

old="music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession();\n        },900);"
new="music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession();drainMusicNav();\n        },900);"
if old not in s: raise SystemExit('V37 handoff completion anchor missing')
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
function mnext(reason='next'){if(music.gaplessBusy||music.ytStandbyStarting){music.navPending+=1;return true}return performMusicNext(reason)}
function mprev(){if(music.gaplessBusy||music.ytStandbyStarting){music.navPending-=1;return true}return performMusicPrev()}"""
if old not in s: raise SystemExit('V37 mnext/mprev anchor missing')
s=s.replace(old,new,1)

old="r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};"
new="r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;music.shuffleRecent=[];music.shuffleBack=[];save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};"
if old not in s: raise SystemExit('V37 shuffle button anchor missing')
s=s.replace(old,new,1)

s+='\n'+marker37+'\n'
p.write_text(s,encoding='utf-8')
