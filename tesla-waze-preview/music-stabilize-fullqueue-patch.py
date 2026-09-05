from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker35='/* MUSIC_STABLE_CONTROLS_FULL_QUEUE_V35 */'
marker36='/* MUSIC_LIKE_TOGGLE_V36 */'
if marker36 in s:
    raise SystemExit(0)

if marker35 not in s:
    # 1) Never truncate the learned/profile library to 40 tracks.
    old="function musicItems(){let a=Object.values(music.profile.tracks).filter(x=>!x.disliked);if(music.tab==='likes')a=a.filter(x=>x.liked);if(music.tab==='recent')a=a.filter(x=>x.lastPlayed).sort((x,y)=>Date.parse(y.lastPlayed)-Date.parse(x.lastPlayed));else a.sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));return a.slice(0,40)}"
    new="function musicItems(){let a=Object.values(music.profile.tracks).filter(x=>!x.disliked);if(music.tab==='likes')a=a.filter(x=>x.liked);if(music.tab==='recent')a=a.filter(x=>x.lastPlayed).sort((x,y)=>Date.parse(y.lastPlayed)-Date.parse(x.lastPlayed));else a.sort((x,y)=>(y.score+(isYoutubePreference(y)?3:0))-(x.score+(isYoutubePreference(x)?3:0)));return a}"
    if old not in s:
        raise SystemExit('musicItems 40-track cap anchor missing')
    s=s.replace(old,new,1)

    old="function miniQueueMarkup(q,currentId){return q.slice(0,40).map((t,i)=>{const s=mt(t),active=s.id===currentId;return `<button type=\"button\" class=\"music-mini-track ${active?'active':''}\" data-mini-play=\"${esc(s.id)}\"><span class=\"music-mini-index\">${i+1}</span><img class=\"music-mini-art\" src=\"${esc(t.artwork||s.artwork||'')}\" onerror=\"this.style.visibility='hidden'\"><span class=\"music-mini-meta\"><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></span>${active?'<span class=\"music-mini-playing\">▶</span>':''}</button>`}).join('')}"
    new="function miniQueueMarkup(q,currentId){return q.map((t,i)=>{const s=mt(t),active=s.id===currentId;return `<button type=\"button\" class=\"music-mini-track ${active?'active':''}\" data-mini-play=\"${esc(s.id)}\"><span class=\"music-mini-index\">${i+1}</span><img class=\"music-mini-art\" src=\"${esc(t.artwork||s.artwork||'')}\" onerror=\"this.style.visibility='hidden'\"><span class=\"music-mini-meta\"><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></span>${active?'<span class=\"music-mini-playing\">▶</span>':''}</button>`}).join('')}"
    if old not in s:
        raise SystemExit('miniQueueMarkup 40-track cap anchor missing')
    s=s.replace(old,new,1)

    # 2) Manual Next/Previous must never fall back to mplay/renderPlayer for YouTube tracks.
    old="function mnext(reason='next'){const n=nextMusicTrack();if(!n)return false;if(handoffYoutubeTrack(n,reason))return true;mplay(n);return true}function mprev(){const p=prevMusicTrack();if(!p)return false;if(handoffYoutubeTrack(p,'prev'))return true;mplay(p);return true}"
    new="function mnext(reason='next'){const n=nextMusicTrack();if(!n)return false;if(music.ytPlayer&&youtubeIdForTrack(n)){handoffYoutubeTrack(n,reason);return true}mplay(n);return true}function mprev(){const p=prevMusicTrack();if(!p)return false;if(music.ytPlayer&&youtubeIdForTrack(p)){handoffYoutubeTrack(p,'prev');return true}mplay(p);return true}"
    if old not in s:
        raise SystemExit('manual next/prev anchor missing')
    s=s.replace(old,new,1)

    # 3) Real overlap: after standby reports PLAYING, unmute it first and keep old player alive briefly.
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
        // Keep old real YouTube audio alive for a short overlap so Tesla never sees an audio gap.
        setTimeout(()=>{try{oldPlayer?.pauseVideo?.()}catch{}},650);
        setTimeout(()=>{
          try{const main=document.getElementById('ytPlayerHost'),iframe=newPlayer.getIframe?.();if(main&&iframe&&!main.contains(iframe)){main.innerHTML='';main.appendChild(iframe)}}catch{}
          try{oldPlayer?.destroy?.()}catch{};
          music.gaplessBusy=false;stopMusicKeepalive();syncMediaSession();
        },900);"""
    if old not in s:
        raise SystemExit('dual-player overlap anchor missing')
    s=s.replace(old,new,1)

    # Guard against regressions.
    if 'return a.slice(0,40)' in s or 'q.slice(0,40).map' in s:
        raise SystemExit('40-track cap still present')
    if "if(handoffYoutubeTrack(n,reason))return true;mplay(n)" in s:
        raise SystemExit('manual next can still fall through to mplay')

    s+='\n'+marker35+'\n'

# 4) Favorite button must be reversible: Like -> Unlike -> Like.
old="r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();r.querySelector('[data-ma=like]').classList.toggle('primary',mt(music.current).liked)};"
new="""r.querySelector('[data-ma=like]').onclick=()=>{
  const st=mt(music.current);
  if(st.liked){
    st.liked=false;
    st.score-=5;
    music.profile.events.push({type:'unlike',id:st.id,at:new Date().toISOString()});
    music.profile.events=music.profile.events.slice(-500);
    save(LS.music,music.profile);
    renderMusicStatus();
  }else{
    mev('like',music.current);
  }
  renderMusicList();
  const btn=r.querySelector('[data-ma=like]');
  if(btn)btn.classList.toggle('primary',!!mt(music.current).liked);
};"""
if old not in s:
    raise SystemExit('like button anchor missing')
s=s.replace(old,new,1)

s+='\n'+marker36+'\n'
p.write_text(s,encoding='utf-8')
