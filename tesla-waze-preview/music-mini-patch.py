from pathlib import Path
import re

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

for need in ['/* MUSIC_MINI_QUEUE_V1 */','/* MUSIC_MINI_QUEUE_V2 */','/* TMY_VIEWPORT_V1 */']:
    if need not in js:
        raise SystemExit(f'missing JS marker: {need}')
if '/* MUSIC_MINI_QUEUE_V1 */' not in css:
    raise SystemExit('MUSIC_MINI_QUEUE_V1 missing from app.css')

# Preserve minimized state during manual resize.
old_resize="saveMusicWindow({width:Math.round(shell.getBoundingClientRect().width),height:Math.round(shell.getBoundingClientRect().height),minimized:false})"
new_resize="saveMusicWindow({width:Math.round(shell.getBoundingClientRect().width),height:Math.round(shell.getBoundingClientRect().height),minimized:musicWindowState().minimized})"
if old_resize in js:
    js=js.replace(old_resize,new_resize,1)

# Re-render immediately when minimize / expand is toggled.
old_min="min.onclick=()=>saveMusicWindow({minimized:!musicWindowState().minimized});"
new_min="min.onclick=()=>{saveMusicWindow({minimized:!musicWindowState().minimized});renderPlayer()};"
if old_min in js:
    js=js.replace(old_min,new_min,1)

# V3: render mini UI explicitly based on saved minimized state, with inline display forcing.
marker='/* MUSIC_MINI_QUEUE_V3 */'
if marker not in js:
    start=js.find('function renderPlayer(){')
    end=js.find('\nlet mediaSessionRefreshTimer=null;',start)
    if start<0 or end<0:
        raise SystemExit('renderPlayer block not found')

    render=r'''function renderPlayer(){
  const r=$('musicPlayer');
  const mini=!!musicWindowState().minimized;
  const miniStyle=mini?' style="display:flex!important;flex:1 1 auto;min-height:0;flex-direction:column"':'';
  /* MUSIC_MINI_QUEUE_V3 */
  if(!music.current){
    const q=musicItems();music.queue=q;save(LS.queue,music.queue);
    r.innerHTML=`<div class="music-empty music-mini-empty">Vyber skladbu.</div><div class="music-mini-panel"${miniStyle}><div class="music-mini-queue" style="display:block;flex:1;min-height:0;overflow-y:auto">${miniQueueMarkup(q,'')}</div></div>`;
    music.audio=null;music.ytPlayer=null;stopMediaSessionRefresh();
    const byId=new Map(q.map(t=>[mt(t).id,t]));
    r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});
    return;
  }
  const s=mt(music.current),yt=music.current.youtubeId||s.youtubeId||(String(music.current.id||'').startsWith('youtube:')?String(music.current.id).slice(8):''),q=ensureMusicQueue(),curId=s.id;
  const media=yt?`<div id="ytPlayerHost" class="yt-player"></div>`:'<audio controls></audio>';
  const controls=mini
    ? `<div class="music-controls music-controls-6"><button class="btn" data-ma="prev">Späť</button><button class="btn primary" data-ma="toggle">Prehrať</button><button class="btn" data-ma="next">Ďalšia</button><button class="btn ${s.liked?'primary':''}" data-ma="like">Obľúbiť</button></div>`
    : `<div class="music-controls music-controls-6"><button class="btn" data-ma="prev" title="Predchádzajúca skladba">Späť</button><button class="btn primary" data-ma="toggle">Prehrať</button><button class="btn" data-ma="next" title="Ďalšia skladba">Ďalšia</button><button class="btn ${music.shuffle?'primary':''}" data-ma="shuffle">Náhodne</button><button class="btn ${music.autoNext?'primary':''}" data-ma="auto">Auto</button><button class="btn ${s.liked?'primary':''}" data-ma="like">Obľúbiť</button></div>`;
  r.innerHTML=`<div class="music-now"><img class="music-art" src="${esc(music.current.artwork||'')}"><div><div class="music-title">${esc(music.current.title)}</div><div class="music-sub">${esc(music.current.artist||'')} · ${esc(music.current.source||'')}</div></div></div>${media}${controls}<div class="music-mini-panel"${miniStyle}><div class="music-mini-seekrow"><span id="musicMiniNow">0:00</span><input id="musicMiniSeek" type="range" min="0" max="1000" value="0" step="1" aria-label="Pozícia skladby"><span id="musicMiniTotal">--:--</span></div><div class="music-mini-queue" style="flex:1;min-height:0;overflow-y:auto">${miniQueueMarkup(q,curId)}</div></div>`;
  music.audio=r.querySelector('audio');music.ytPlayer=null;
  if(music.audio){music.audio.src=music.current.streamUrl||'';wireAudio()}else if(yt){setupYoutubePlayer(yt)}
  r.querySelector('[data-ma=toggle]').onclick=toggleMusicPlayback;
  r.querySelector('[data-ma=prev]').onclick=mprev;
  r.querySelector('[data-ma=next]').onclick=mnext;
  const sh=r.querySelector('[data-ma=shuffle]');if(sh)sh.onclick=()=>{music.shuffle=!music.shuffle;save('teslaWaze:musicShuffle:v1',music.shuffle);renderPlayer()};
  const au=r.querySelector('[data-ma=auto]');if(au)au.onclick=()=>{music.autoNext=!music.autoNext;save('teslaWaze:musicAutoNext:v1',music.autoNext);renderPlayer()};
  r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();renderPlayer()};
  const byId=new Map(q.map(t=>[mt(t).id,t]));
  r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});
  const seek=$('musicMiniSeek');if(seek){seek.oninput=()=>{const d=musicDuration(),now=$('musicMiniNow');if(d>0&&now)now.textContent=fmtMusicClock(d*(Number(seek.value)||0)/1000)};seek.onchange=()=>{const d=musicDuration();if(d>0)seekMusicTo(d*(Number(seek.value)||0)/1000);updateMiniSeek()}}
  syncMediaSession();setTimeout(updateMiniSeek,250);
}'''
    js=js[:start]+render+js[end:]

# Force mini panel visibility with !important as a CSS fallback.
css=css.replace('.music-shell.music-minimized .music-mini-panel{display:flex;flex:1;min-height:0;flex-direction:column;gap:7px;margin-top:7px}',
                '.music-shell.music-minimized .music-mini-panel{display:flex!important;flex:1;min-height:0;flex-direction:column;gap:7px;margin-top:7px}')
if '/* MUSIC_MINI_QUEUE_V3 */' not in css:
    css += '\n/* MUSIC_MINI_QUEUE_V3 */\n.music-shell.music-minimized .music-mini-panel{display:flex!important}\n'

# V4: give minimized mode its own persistent height so top-only resizing survives applyMusicWindow().
if '/* MUSIC_MINI_RESIZE_V4 */' not in js:
    old_state="function musicWindowState(){return load(MUSIC_WIN_KEY,{width:520,height:Math.min(window.innerHeight,760),minimized:false})}"
    new_state="function musicWindowState(){return load(MUSIC_WIN_KEY,{width:520,height:Math.min(window.innerHeight,760),miniHeight:520,minimized:false})}"
    if old_state not in js:
        raise SystemExit('musicWindowState anchor not found')
    js=js.replace(old_state,new_state,1)

    old_apply="function applyMusicWindow(){const shell=document.querySelector('.music-shell');if(!shell)return;const cfg=musicWindowState(),maxW=Math.max(340,Math.min(window.innerWidth-20,760)),maxH=Math.max(220,window.innerHeight-20);shell.style.width=`${Math.max(340,Math.min(maxW,cfg.width||520))}px`;shell.style.height=cfg.minimized?`${Math.min(520,Math.max(360,window.innerHeight-40))}px`:`${Math.max(360,Math.min(maxH,cfg.height||Math.min(window.innerHeight,760)))}px`;shell.classList.toggle('music-minimized',!!cfg.minimized);const b=$('musicMinimize');if(b)b.textContent=cfg.minimized?'Rozbaliť':'Minimalizovať'}"
    new_apply="function applyMusicWindow(){const shell=document.querySelector('.music-shell');if(!shell)return;const cfg=musicWindowState(),maxW=Math.max(340,Math.min(window.innerWidth-20,760)),maxH=Math.max(360,window.innerHeight-20);shell.style.width=`${Math.max(340,Math.min(maxW,cfg.width||520))}px`;const miniH=Math.max(360,Math.min(maxH,cfg.miniHeight||520));const fullH=Math.max(360,Math.min(maxH,cfg.height||Math.min(window.innerHeight,760)));shell.style.height=`${cfg.minimized?miniH:fullH}px`;shell.classList.toggle('music-minimized',!!cfg.minimized);const b=$('musicMinimize');if(b)b.textContent=cfg.minimized?'Rozbaliť':'Minimalizovať'}/* MUSIC_MINI_RESIZE_V4 */"
    if old_apply not in js:
        raise SystemExit('applyMusicWindow anchor not found')
    js=js.replace(old_apply,new_apply,1)

    old_up="saveMusicWindow({width:Math.round(shell.getBoundingClientRect().width),height:Math.round(shell.getBoundingClientRect().height),minimized:musicWindowState().minimized})"
    new_up="(()=>{const rect=shell.getBoundingClientRect(),mini=musicWindowState().minimized;saveMusicWindow(mini?{width:Math.round(rect.width),miniHeight:Math.round(rect.height),minimized:true}:{width:Math.round(rect.width),height:Math.round(rect.height),minimized:false})})()"
    if old_up not in js:
        raise SystemExit('resize save anchor not found')
    js=js.replace(old_up,new_up,1)

for needle in ['MUSIC_MINI_QUEUE_V3','MUSIC_MINI_RESIZE_V4','musicMiniSeek','miniQueueMarkup','TMY_VIEWPORT_V1']:
    if needle not in js:
        raise SystemExit(f'missing required JS marker: {needle}')

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
