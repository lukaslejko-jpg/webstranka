from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

for need in ['/* MUSIC_MINI_QUEUE_V1 */','/* MUSIC_MINI_RESIZE_V4 */','/* MUSIC_LAYOUT_NO_RESTART_V5 */','/* TMY_VIEWPORT_V1 */']:
    if need not in js:
        raise SystemExit(f'missing JS marker: {need}')

marker='/* MUSIC_MINI_SEARCH_V6 */'
if marker not in js:
    helper=r'''/* MUSIC_MINI_SEARCH_V6 */
function wireMiniQueue(container,q,currentId){if(!container)return;container.innerHTML=miniQueueMarkup(q,currentId||'');const byId=new Map(q.map(t=>[mt(t).id,t]));container.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)})}
function wireMiniSearch(root){
  const input=root?.querySelector?.('#musicMiniSearch'),btn=root?.querySelector?.('#musicMiniSearchBtn');if(!input||!btn)return;
  const run=async()=>{const q=input.value.trim();if(!q)return;const full=$('musicSearch');if(full)full.value=q;btn.disabled=true;btn.textContent='Hľadám…';try{await musicSearch();const box=root.querySelector('.music-mini-queue'),cur=music.current?mt(music.current).id:'';wireMiniQueue(box,Array.isArray(music.queue)?music.queue:[],cur)}finally{btn.disabled=false;btn.textContent='Hľadať'}};
  btn.onclick=run;input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}};
}
'''
    idx=js.find('function renderPlayer(){')
    if idx<0:
        raise SystemExit('renderPlayer insertion point not found')
    js=js[:idx]+helper+js[idx:]

    # Add the compact search row to both empty and active player states.
    search_html='<div class="music-mini-search"><input id="musicMiniSearch" type="search" placeholder="Hľadať skladbu…" autocomplete="off"><button id="musicMiniSearchBtn" type="button" class="btn primary">Hľadať</button></div>'
    old_empty='r.innerHTML=`<div class="music-empty music-mini-empty">Vyber skladbu.</div><div class="music-mini-panel">'
    new_empty='r.innerHTML=`'+search_html+'<div class="music-empty music-mini-empty">Vyber skladbu.</div><div class="music-mini-panel">'
    if old_empty not in js:
        raise SystemExit('empty player template anchor not found')
    js=js.replace(old_empty,new_empty,1)

    old_active='r.innerHTML=`<div class="music-now"><img class="music-art"'
    new_active='r.innerHTML=`'+search_html+'<div class="music-now"><img class="music-art"'
    if old_active not in js:
        raise SystemExit('active player template anchor not found')
    js=js.replace(old_active,new_active,1)

    # Wire the search row in both branches without rebuilding media.
    old_empty_return="r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});\n    return;"
    new_empty_return="r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});\n    wireMiniSearch(r);\n    return;"
    if old_empty_return not in js:
        raise SystemExit('empty branch wiring anchor not found')
    js=js.replace(old_empty_return,new_empty_return,1)

    old_active_wire="r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});\n  const seek=$('musicMiniSeek');"
    new_active_wire="r.querySelectorAll('[data-mini-play]').forEach(b=>b.onclick=()=>{const t=byId.get(b.dataset.miniPlay);if(t)mplay(t)});\n  wireMiniSearch(r);\n  const seek=$('musicMiniSeek');"
    if old_active_wire not in js:
        raise SystemExit('active branch wiring anchor not found')
    js=js.replace(old_active_wire,new_active_wire,1)

    css += r'''

/* MUSIC_MINI_SEARCH_V6 */
.music-mini-search{display:none}
.music-shell.music-minimized .music-mini-search{display:grid;grid-template-columns:minmax(0,1fr) 82px;gap:7px;margin:0 0 7px;flex:0 0 auto}
.music-shell.music-minimized .music-mini-search input{width:100%;min-width:0;height:38px;border-radius:9px;border:1px solid #334556;background:#0f1720;color:#fff;padding:0 10px;font-size:13px}
.music-shell.music-minimized .music-mini-search .btn{min-height:38px!important;height:38px;padding:0 9px!important;font-size:11px!important}
'''

for needle in ['MUSIC_MINI_SEARCH_V6','MUSIC_LAYOUT_NO_RESTART_V5','MUSIC_MINI_RESIZE_V4','TMY_VIEWPORT_V1']:
    if needle not in js and needle not in css:
        raise SystemExit(f'missing required marker: {needle}')

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
