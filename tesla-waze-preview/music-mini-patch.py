from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

for need in ['/* MUSIC_MINI_QUEUE_V1 */','/* MUSIC_MINI_QUEUE_V3 */','/* MUSIC_MINI_RESIZE_V4 */','/* TMY_VIEWPORT_V1 */']:
    if need not in js:
        raise SystemExit(f'missing JS marker: {need}')

marker='/* MUSIC_LAYOUT_NO_RESTART_V5 */'
if marker not in js:
    # Do not rebuild the media player when toggling minimized/expanded mode.
    old_min="min.onclick=()=>{saveMusicWindow({minimized:!musicWindowState().minimized});renderPlayer()};"
    new_min="min.onclick=()=>{saveMusicWindow({minimized:!musicWindowState().minimized});updateMiniSeek()};/* MUSIC_LAYOUT_NO_RESTART_V5 */"
    if old_min not in js:
        raise SystemExit('minimize handler anchor not found')
    js=js.replace(old_min,new_min,1)

    # Better label.
    js=js.replace("size.textContent='Veľkosť';","size.textContent='Rozmer';",1)

    # Cycle window size but preserve current mini/full mode and its own height.
    old_size="size.onclick=()=>{const w=shell.getBoundingClientRect().width,maxW=Math.min(window.innerWidth-20,760),maxH=window.innerHeight-20;if(w<500)saveMusicWindow({width:560,height:Math.min(maxH,700),minimized:false});else if(w<680)saveMusicWindow({width:maxW,height:maxH,minimized:false});else saveMusicWindow({width:420,height:Math.min(maxH,520),minimized:false})};"
    new_size="size.onclick=()=>{const cfg=musicWindowState(),mini=!!cfg.minimized,w=shell.getBoundingClientRect().width,maxW=Math.min(window.innerWidth-20,760),maxH=window.innerHeight-20,nextW=w<500?560:w<680?maxW:420,nextH=w<500?Math.min(maxH,700):w<680?maxH:Math.min(maxH,520);saveMusicWindow(mini?{width:nextW,miniHeight:Math.max(360,nextH),minimized:true}:{width:nextW,height:Math.max(360,nextH),minimized:false})};"
    if old_size not in js:
        raise SystemExit('size handler anchor not found')
    js=js.replace(old_size,new_size,1)

    # Keep one stable player DOM across mini/full layout changes.
    start=js.find('function renderPlayer(){')
    end=js.find('\nlet mediaSessionRefreshTimer=null;',start)
    if start<0 or end<0:
        raise SystemExit('renderPlayer block not found')

    render=r'''function renderPlayer(){
  const r=$('musicPlayer');
  if(!music.current){
    const q=musicItems();music.queue=q;save(LS.queue,music.queue);
    r.innerHTML=`<div class="music-empty music-mini-empty">Vyber skladbu.</div><div class="music-mini-panel"><div class="music-mini-queue" style="flex:1;min-height:0;overflow-y:auto">${miniQueueMarkup(q,'')}</div></div>`;
    music.audio=null;music.ytPlayer=null;stopMediaSessionRefresh();
    const byId=new Map(q.map(t=>[mt(t).id,t]));
    r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});
    return;
  }
  const s=mt(music.current),yt=music.current.youtubeId||s.youtubeId||(String(music.current.id||'').startsWith('youtube:')?String(music.current.id).slice(8):''),q=ensureMusicQueue(),curId=s.id;
  const media=yt?`<div id="ytPlayerHost" class="yt-player"></div>`:'<audio controls></audio>';
  const controls=`<div class="music-controls music-controls-6"><button class="btn" data-ma="prev" title="Predchádzajúca skladba">Späť</button><button class="btn primary" data-ma="toggle">Prehrať</button><button class="btn" data-ma="next" title="Ďalšia skladba">Ďalšia</button><button class="btn ${music.shuffle?'primary':''}" data-ma="shuffle">Náhodne</button><button class="btn ${music.autoNext?'primary':''}" data-ma="auto">Auto</button><button class="btn ${s.liked?'primary':''}" data-ma="like">Obľúbiť</button></div>`;
  r.innerHTML=`<div class="music-now"><img class="music-art" src="${esc(music.current.artwork||'')}"><div><div class="music-title">${esc(music.current.title)}</div><div class="music-sub">${esc(music.current.artist||'')} · ${esc(music.current.source||'')}</div></div></div>${media}${controls}<div class="music-mini-panel"><div class="music-mini-seekrow"><span id="musicMiniNow">0:00</span><input id="musicMiniSeek" type="range" min="0" max="1000" value="0" step="1" aria-label="Pozícia skladby"><span id="musicMiniTotal">--:--</span></div><div class="music-mini-queue" style="flex:1;min-height:0;overflow-y:auto">${miniQueueMarkup(q,curId)}</div></div>`;
  music.audio=r.querySelector('audio');music.ytPlayer=null;
  if(music.audio){music.audio.src=music.current.streamUrl||'';wireAudio()}else if(yt){setupYoutubePlayer(yt)}
  r.querySelector('[data-ma=toggle]').onclick=toggleMusicPlayback;
  r.querySelector('[data-ma=prev]').onclick=mprev;
  r.querySelector('[data-ma=next]').onclick=mnext;
  r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;save('teslaWaze:musicShuffle:v1',music.shuffle);r.querySelector('[data-ma=shuffle]').classList.toggle('primary',music.shuffle)};
  r.querySelector('[data-ma=auto]').onclick=()=>{music.autoNext=!music.autoNext;save('teslaWaze:musicAutoNext:v1',music.autoNext);r.querySelector('[data-ma=auto]').classList.toggle('primary',music.autoNext)};
  r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();r.querySelector('[data-ma=like]').classList.toggle('primary',mt(music.current).liked)};
  const byId=new Map(q.map(t=>[mt(t).id,t]));
  r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});
  const seek=$('musicMiniSeek');if(seek){seek.oninput=()=>{const d=musicDuration(),now=$('musicMiniNow');if(d>0&&now)now.textContent=fmtMusicClock(d*(Number(seek.value)||0)/1000)};seek.onchange=()=>{const d=musicDuration();if(d>0)seekMusicTo(d*(Number(seek.value)||0)/1000);updateMiniSeek()}}
  syncMediaSession();setTimeout(updateMiniSeek,250);
}'''
    js=js[:start]+render+js[end:]

for needle in ['MUSIC_LAYOUT_NO_RESTART_V5','MUSIC_MINI_RESIZE_V4','musicMiniSeek','TMY_VIEWPORT_V1']:
    if needle not in js:
        raise SystemExit(f'missing required JS marker: {needle}')

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
