from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
marker='/* MUSIC_HEADER_SEARCH_V59 */'
if marker in js and marker in css:
    raise SystemExit(0)

old="""  const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Rozmer';head.insertBefore(size,$('closeMusic'));
  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';head.insertBefore(min,$('closeMusic'));"""
new="""  const hs=document.createElement('div');hs.id='musicHeaderSearch';hs.className='music-header-search';hs.innerHTML='<input id="musicHeaderSearchInput" type="search" autocomplete="off" placeholder="Hľadať hudbu…" aria-label="Hľadať hudbu"><button id="musicHeaderSearchBtn" type="button" class="music-header-search-btn" aria-label="Hľadať">⌕</button>';head.insertBefore(hs,head.querySelector('.spacer'));
  const runHeaderSearch=()=>{const input=$('musicHeaderSearchInput'),full=$('musicSearch');if(!input||!full)return;full.value=input.value.trim();musicSearch()};
  $('musicHeaderSearchBtn').onclick=runHeaderSearch;
  $('musicHeaderSearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runHeaderSearch()}};
  const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Rozmer';head.insertBefore(size,$('closeMusic'));
  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';head.insertBefore(min,$('closeMusic'));"""
if old not in js:
    raise SystemExit('music header controls anchor missing')
js=js.replace(old,new,1)

# Keep header field synchronized when opening the window.
old_open="function openMusicWindow(){ensureMusicWindowControls();setMusicWindowOpen(true);applyMusicWindow();if($('musicSearch'))$('musicSearch').placeholder='Video, rozprávka, skladba alebo interpret';renderMusicStatus();renderMusicList();"
new_open="function openMusicWindow(){ensureMusicWindowControls();setMusicWindowOpen(true);applyMusicWindow();if($('musicSearch'))$('musicSearch').placeholder='Video, rozprávka, skladba alebo interpret';if($('musicHeaderSearchInput')&&$('musicSearch'))$('musicHeaderSearchInput').value=$('musicSearch').value||'';renderMusicStatus();renderMusicList();"
if old_open not in js:
    raise SystemExit('openMusicWindow anchor missing')
js=js.replace(old_open,new_open,1)

css += r'''

/* MUSIC_HEADER_SEARCH_V59 */
.music-header-search{display:flex;align-items:center;gap:5px;min-width:180px;width:min(360px,34vw);margin-left:6px}
.music-header-search input{width:100%;height:40px;min-height:40px;border:1px solid #334556;border-radius:10px;background:#0b141d;color:#fff;padding:0 11px;font-size:13px;outline:none}
.music-header-search input:focus{border-color:#22d3ee;box-shadow:0 0 0 2px rgba(34,211,238,.14)}
.music-header-search-btn{width:40px;height:40px;min-width:40px;border:1px solid #334556;border-radius:10px;background:#1b2a35;color:#67e8f9;font-size:25px;line-height:1;font-weight:800;padding:0;display:flex;align-items:center;justify-content:center}
.music-header-search-btn:active{transform:scale(.97)}
.music-shell.music-maximized .music-header-search{width:min(440px,42vw)}
@media(max-width:900px){.music-header-search{display:none!important}}
'''

js += '\n'+marker+'\n'
js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
