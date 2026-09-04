from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

if '/* MUSIC_MINI_QUEUE_V1 */' not in js:
    raise SystemExit('MUSIC_MINI_QUEUE_V1 missing from app.js')
if '/* MUSIC_MINI_QUEUE_V1 */' not in css:
    raise SystemExit('MUSIC_MINI_QUEUE_V1 missing from app.css')

old_resize="saveMusicWindow({width:Math.round(shell.getBoundingClientRect().width),height:Math.round(shell.getBoundingClientRect().height),minimized:false})"
new_resize="saveMusicWindow({width:Math.round(shell.getBoundingClientRect().width),height:Math.round(shell.getBoundingClientRect().height),minimized:musicWindowState().minimized})"
if old_resize in js:
    js=js.replace(old_resize,new_resize,1)
elif new_resize not in js:
    raise SystemExit('music resize anchor not found')

marker='/* MUSIC_MINI_QUEUE_V2 */'
if marker not in js:
    old_empty="function renderPlayer(){const r=$('musicPlayer');if(!music.current){r.innerHTML='<div class=\"music-empty\">Vyber skladbu.</div>';music.audio=null;music.ytPlayer=null;stopMediaSessionRefresh();return}"
    new_empty='''function renderPlayer(){const r=$('musicPlayer');/* MUSIC_MINI_QUEUE_V2 */if(!music.current){const q=musicItems();music.queue=q;save(LS.queue,music.queue);r.innerHTML=`<div class="music-empty music-mini-empty">Vyber skladbu.</div><div class="music-mini-panel"><div class="music-mini-queue">${miniQueueMarkup(q,'')}</div></div>`;music.audio=null;music.ytPlayer=null;stopMediaSessionRefresh();const byId=new Map(q.map(t=>[mt(t).id,t]));r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});return}'''
    if old_empty not in js:
        raise SystemExit('renderPlayer empty-state anchor not found')
    js=js.replace(old_empty,new_empty,1)

    old_min="min.onclick=()=>saveMusicWindow({minimized:!musicWindowState().minimized});"
    new_min="min.onclick=()=>{saveMusicWindow({minimized:!musicWindowState().minimized});renderPlayer()};"
    if old_min not in js:
        raise SystemExit('music minimize button anchor not found')
    js=js.replace(old_min,new_min,1)

css_marker='/* MUSIC_MINI_QUEUE_V2 */'
if css_marker not in css:
    css += '''

/* MUSIC_MINI_QUEUE_V2 */
.music-shell.music-minimized .music-mini-empty{flex:0 0 auto;margin:2px 0 6px;color:#a8bac7}
.music-shell.music-minimized .music-mini-panel>.music-mini-queue{flex:1;min-height:0}
'''

for needle in ['MUSIC_MINI_QUEUE_V2','musicMiniSeek','music-mini-queue','TMY_VIEWPORT_V1']:
    if needle not in js and needle not in css:
        raise SystemExit(f'missing required marker: {needle}')

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
