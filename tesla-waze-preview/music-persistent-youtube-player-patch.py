from pathlib import Path

APP=Path('tesla-waze-preview/app.js')
MARKER='/* MUSIC_PERSISTENT_YT_V44 */'
s=APP.read_text(encoding='utf-8')
if MARKER in s: raise SystemExit(0)
if '/* MUSIC_SESSION_HOLD_V43 */' not in s: raise SystemExit('V43 base missing')

old="function mplay(t){const st=mt(t),yt=t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'');if(!t.streamUrl&&!yt)return musicSources(t);if(music.current&&music.started&&Date.now()-music.started<15000)mev('skip',music.current);const replay=music.current&&mt(music.current).id===mt(t).id;music.current=t;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();renderPlayer();music.started=Date.now();mev(replay?'replay':'play',t);if(music.audio)music.audio.play().catch(()=>{})}"
new="""function refreshPersistentYoutubeUi(){
  const r=$('musicPlayer');if(!r||!music.current)return;
  const s=mt(music.current),now=r.querySelector('.music-now');
  if(now){const img=now.querySelector('.music-art'),title=now.querySelector('.music-title'),sub=now.querySelector('.music-sub');if(img)img.src=music.current.artwork||s.artwork||'';if(title)title.textContent=music.current.title||s.title||'Bez názvu';if(sub)sub.textContent=`${music.current.artist||s.artist||''} · ${music.current.source||s.source||''}`}
  const like=r.querySelector('[data-ma=like]');if(like)like.classList.toggle('primary',!!s.liked);
  const q=ensureMusicQueue(),box=r.querySelector('.music-mini-queue');if(box)wireMiniQueue(box,q,s.id);
  updateMiniSeek();syncMediaSession();renderMusicStatus();renderMusicList();
}
function mplay(t){
  const st=mt(t),yt=t.youtubeId||st.youtubeId||(String(t.id||'').startsWith('youtube:')?String(t.id).slice(8):'');
  if(!t.streamUrl&&!yt)return musicSources(t);
  if(music.current&&music.started&&Date.now()-music.started<15000)mev('skip',music.current);
  const replay=music.current&&mt(music.current).id===mt(t).id;
  const canReuseYoutube=!!(yt&&music.ytPlayer&&typeof music.ytPlayer.loadVideoById==='function'&&!music.audio);
  music.current=t;music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);syncMediaSession();music.started=Date.now();mev(replay?'replay':'play',t);
  if(canReuseYoutube){
    refreshPersistentYoutubeUi();
    try{music.ytPlayer.loadVideoById({videoId:yt,startSeconds:0})}catch{try{music.ytPlayer.loadVideoById(yt)}catch{renderPlayer()}}
    return;
  }
  renderPlayer();
  if(music.audio)music.audio.play().catch(()=>{});
}"""
if old not in s: raise SystemExit('V43 mplay anchor missing')
s=s.replace(old,new,1)

# If renderPlayer is called while a current YouTube player is alive, keep it only for explicit mplay reuse.
# setupYoutubePlayer may still destroy/recreate when account mode changes, which is intentional.
if 'const canReuseYoutube=!!(yt&&music.ytPlayer&&typeof music.ytPlayer.loadVideoById' not in s: raise SystemExit('persistent YouTube reuse missing')
if 'refreshPersistentYoutubeUi();' not in s: raise SystemExit('persistent UI refresh missing')

s+='\n'+MARKER+'\n'
APP.write_text(s,encoding='utf-8')
