from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

marker='/* MUSIC_MINI_QUEUE_V1 */'
if marker not in js:
    helper=r'''/* MUSIC_MINI_QUEUE_V1 */
function fmtMusicClock(seconds){const s=Math.max(0,Math.floor(Number(seconds)||0)),m=Math.floor(s/60),r=s%60;return `${m}:${String(r).padStart(2,'0')}`}
function musicCurrentTime(){try{if(music.audio)return Number(music.audio.currentTime||0);if(music.ytPlayer)return Number(music.ytPlayer.getCurrentTime?.()||0)}catch{}return 0}
function musicDuration(){try{if(music.audio)return Number(music.audio.duration||0);if(music.ytPlayer)return Number(music.ytPlayer.getDuration?.()||0)}catch{}return 0}
function seekMusicTo(seconds){try{const d=musicDuration(),v=Math.max(0,Math.min(d||Infinity,Number(seconds)||0));if(music.audio){music.audio.currentTime=v;return}if(music.ytPlayer)music.ytPlayer.seekTo(v,true)}catch{}}
function updateMiniSeek(){const seek=$('musicMiniSeek'),now=$('musicMiniNow'),total=$('musicMiniTotal');if(!seek)return;const d=musicDuration(),p=musicCurrentTime();if(now)now.textContent=fmtMusicClock(p);if(total)total.textContent=d>0?fmtMusicClock(d):'--:--';seek.disabled=!(d>0);if(d>0&&document.activeElement!==seek)seek.value=String(Math.max(0,Math.min(1000,Math.round(p/d*1000))))}
function miniQueueMarkup(q,currentId){return q.slice(0,40).map((t,i)=>{const s=mt(t),active=s.id===currentId;return `<button type="button" class="music-mini-track ${active?'active':''}" data-mini-play="${esc(s.id)}"><span class="music-mini-index">${i+1}</span><img class="music-mini-art" src="${esc(t.artwork||s.artwork||'')}" onerror="this.style.visibility='hidden'"><span class="music-mini-meta"><b>${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}</small></span>${active?'<span class="music-mini-playing">▶</span>':''}</button>`}).join('')}
'''
    js=js.replace('function renderPlayer(){',helper+'\nfunction renderPlayer(){',1)
    start=js.find('function renderPlayer(){')
    end=js.find('\nlet mediaSessionRefreshTimer=null;',start)
    if start<0 or end<0:
        raise SystemExit('renderPlayer block not found')
    new_render=r'''function renderPlayer(){const r=$('musicPlayer');if(!music.current){r.innerHTML='<div class="music-empty">Vyber skladbu.</div>';music.audio=null;music.ytPlayer=null;stopMediaSessionRefresh();return}const s=mt(music.current),yt=music.current.youtubeId||s.youtubeId||(String(music.current.id||'').startsWith('youtube:')?String(music.current.id).slice(8):''),q=ensureMusicQueue(),curId=s.id;const media=yt?`<div id="ytPlayerHost" class="yt-player"></div>`:'<audio controls></audio>';r.innerHTML=`<div class="music-now"><img class="music-art" src="${esc(music.current.artwork||'')}"><div><div class="music-title">${esc(music.current.title)}</div><div class="music-sub">${esc(music.current.artist||'')} · ${esc(music.current.source||'')}</div></div></div>${media}<div class="music-controls music-controls-6"><button class="btn" data-ma="prev" title="Predchádzajúca skladba">Späť</button><button class="btn primary" data-ma="toggle">Prehrať</button><button class="btn" data-ma="next" title="Ďalšia skladba">Ďalšia</button><button class="btn ${music.shuffle?'primary':''}" data-ma="shuffle">Náhodne</button><button class="btn ${music.autoNext?'primary':''}" data-ma="auto">Auto</button><button class="btn ${s.liked?'primary':''}" data-ma="like">Obľúbiť</button></div><div class="music-mini-panel"><div class="music-mini-seekrow"><span id="musicMiniNow">0:00</span><input id="musicMiniSeek" type="range" min="0" max="1000" value="0" step="1" aria-label="Pozícia skladby"><span id="musicMiniTotal">--:--</span></div><div class="music-mini-queue">${miniQueueMarkup(q,curId)}</div></div>`;music.audio=r.querySelector('audio');music.ytPlayer=null;if(music.audio){music.audio.src=music.current.streamUrl||'';wireAudio()}else if(yt){setupYoutubePlayer(yt)}r.querySelector('[data-ma=toggle]').onclick=toggleMusicPlayback;r.querySelector('[data-ma=prev]').onclick=mprev;r.querySelector('[data-ma=next]').onclick=mnext;r.querySelector('[data-ma=shuffle]').onclick=()=>{music.shuffle=!music.shuffle;save('teslaWaze:musicShuffle:v1',music.shuffle);renderPlayer()};r.querySelector('[data-ma=auto]').onclick=()=>{music.autoNext=!music.autoNext;save('teslaWaze:musicAutoNext:v1',music.autoNext);renderPlayer()};r.querySelector('[data-ma=like]').onclick=()=>{mev('like',music.current);renderMusicList();renderPlayer()};const byId=new Map(q.map(t=>[mt(t).id,t]));r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});const seek=$('musicMiniSeek');if(seek){seek.oninput=()=>{const d=musicDuration(),now=$('musicMiniNow');if(d>0&&now)now.textContent=fmtMusicClock(d*(Number(seek.value)||0)/1000)};seek.onchange=()=>{const d=musicDuration();if(d>0)seekMusicTo(d*(Number(seek.value)||0)/1000);updateMiniSeek()}}syncMediaSession();setTimeout(updateMiniSeek,250)}'''
    js=js[:start]+new_render+js[end:]
    old_sync="function syncMediaSession(){if(!('mediaSession' in navigator)||!music.current)return;"
    new_sync="function syncMediaSession(){updateMiniSeek();if(!('mediaSession' in navigator)||!music.current)return;"
    if old_sync not in js:
        raise SystemExit('syncMediaSession anchor not found')
    js=js.replace(old_sync,new_sync,1)
    old_time="music.audio.ontimeupdate=()=>{if(!('mediaSession' in navigator)||!music.audio?.duration||!Number.isFinite(music.audio.duration))return;"
    new_time="music.audio.ontimeupdate=()=>{updateMiniSeek();if(!('mediaSession' in navigator)||!music.audio?.duration||!Number.isFinite(music.audio.duration))return;"
    if old_time not in js:
        raise SystemExit('audio timeupdate anchor not found')
    js=js.replace(old_time,new_time,1)
    old_height="shell.style.height=cfg.minimized?'220px':`${Math.max(360,Math.min(maxH,cfg.height||Math.min(window.innerHeight,760)))}px`;"
    new_height="shell.style.height=cfg.minimized?`${Math.min(520,Math.max(360,window.innerHeight-40))}px`:`${Math.max(360,Math.min(maxH,cfg.height||Math.min(window.innerHeight,760)))}px`;"
    if old_height not in js:
        raise SystemExit('music minimized height anchor not found')
    js=js.replace(old_height,new_height,1)
    js_path.write_text(js,encoding='utf-8')

css_marker='/* MUSIC_MINI_QUEUE_V1 */'
if css_marker not in css:
    css += r'''

/* MUSIC_MINI_QUEUE_V1 */
.music-mini-panel{display:none}
.music-shell.music-minimized{min-height:360px!important}
.music-shell.music-minimized .music-player{overflow:hidden!important;padding:8px 10px 10px!important}
.music-shell.music-minimized .music-now{flex:0 0 auto;margin-bottom:6px!important}
.music-shell.music-minimized .music-controls{grid-template-columns:repeat(4,minmax(0,1fr))!important;flex:0 0 auto}
.music-shell.music-minimized .music-controls [data-ma="shuffle"],.music-shell.music-minimized .music-controls [data-ma="auto"]{display:none!important}
.music-shell.music-minimized .music-mini-panel{display:flex;flex:1;min-height:0;flex-direction:column;gap:7px;margin-top:7px}
.music-mini-seekrow{display:grid;grid-template-columns:44px minmax(0,1fr) 44px;gap:8px;align-items:center;color:#b8c8d4;font-size:11px;font-weight:800}
.music-mini-seekrow input[type=range]{width:100%;height:30px;margin:0;cursor:pointer;touch-action:pan-x}
.music-mini-seekrow span:last-child{text-align:right}
.music-mini-queue{min-height:0;overflow-y:auto;overscroll-behavior:contain;border-top:1px solid #263746;padding-top:5px}
.music-mini-track{width:100%;display:grid;grid-template-columns:24px 38px minmax(0,1fr) 24px;gap:8px;align-items:center;border:0;border-bottom:1px solid #21313e;background:transparent;color:#eef6fb;padding:6px 4px;text-align:left;min-height:50px;border-radius:7px}
.music-mini-track:hover,.music-mini-track.active{background:#17313c}
.music-mini-index{font-size:11px;color:#7f9baa;text-align:center}
.music-mini-art{width:38px;height:38px;object-fit:cover;border-radius:7px;background:#1e293b}
.music-mini-meta{display:flex;min-width:0;flex-direction:column;gap:2px}
.music-mini-meta b{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.music-mini-meta small{font-size:10px;color:#91a8b6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.music-mini-playing{color:#22d3ee;font-size:15px;text-align:center}
@media(max-width:650px){.music-shell.music-minimized{min-height:340px!important}.music-mini-track{grid-template-columns:20px 34px minmax(0,1fr) 20px}.music-mini-art{width:34px;height:34px}.music-mini-seekrow{grid-template-columns:40px minmax(0,1fr) 40px}}
'''
    css_path.write_text(css,encoding='utf-8')
