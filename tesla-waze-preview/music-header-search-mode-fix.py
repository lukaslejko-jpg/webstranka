from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
marker='/* MUSIC_MAX_SEARCH_MODE_V61 */'
if marker in js and marker in css:
    raise SystemExit(0)

old_html="hs.innerHTML='<input id=\"musicHeaderSearchInput\" type=\"search\" autocomplete=\"off\" placeholder=\"Hľadať hudbu…\" aria-label=\"Hľadať hudbu\"><button id=\"musicHeaderSearchBtn\" type=\"button\" class=\"music-header-search-btn\" aria-label=\"Hľadať\">Hľadať</button>';"
new_html="hs.innerHTML='<input id=\"musicHeaderSearchInput\" type=\"search\" autocomplete=\"off\" placeholder=\"Hľadať hudbu…\" aria-label=\"Hľadať hudbu\"><button id=\"musicHeaderSearchBtn\" type=\"button\" class=\"music-header-search-btn\" aria-label=\"Hľadať\">Hľadať</button><button id=\"musicHeaderSearchClose\" type=\"button\" class=\"music-header-search-close\">Späť</button>';"
if old_html not in js:
    raise SystemExit('header search html anchor missing')
js=js.replace(old_html,new_html,1)

old_handlers="""  const runHeaderSearch=()=>{const input=$('musicHeaderSearchInput'),full=$('musicSearch');if(!input||!full)return;full.value=input.value.trim();musicSearch()};
  $('musicHeaderSearchBtn').onclick=runHeaderSearch;
  $('musicHeaderSearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runHeaderSearch()}};
  $('musicHeaderSearchInput').oninput=e=>{const full=$('musicSearch');if(full)full.value=e.target.value;if(!e.target.value.trim()){setMusicSearchMode(false);if(document.querySelector('.music-shell')?.classList.contains('music-maximized'))renderMusicMaxHome()}};"""
new_handlers="""  const runHeaderSearch=()=>{const shell=document.querySelector('.music-shell'),input=$('musicHeaderSearchInput'),full=$('musicSearch');if(!shell?.classList.contains('music-maximized')||!input||!full)return;full.value=input.value.trim();musicSearch()};
  const closeHeaderSearch=()=>{const input=$('musicHeaderSearchInput'),full=$('musicSearch');if(input)input.value='';if(full)full.value='';setMusicSearchMode(false);const shell=document.querySelector('.music-shell');shell?.classList.remove('music-searching');if(shell?.classList.contains('music-maximized'))renderMusicMaxHome()};
  $('musicHeaderSearchBtn').onclick=runHeaderSearch;
  $('musicHeaderSearchClose').onclick=closeHeaderSearch;
  $('musicHeaderSearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runHeaderSearch()}else if(e.key==='Escape'){e.preventDefault();closeHeaderSearch()}};
  $('musicHeaderSearchInput').oninput=e=>{const full=$('musicSearch');if(full)full.value=e.target.value;if(!e.target.value.trim())closeHeaderSearch()};"""
if old_handlers not in js:
    raise SystemExit('header handlers anchor missing')
js=js.replace(old_handlers,new_handlers,1)

old_apply="shell.classList.toggle('music-minimized',!!cfg.minimized);shell.classList.toggle('music-maximized',isMax);const b=$('musicMinimize');"
new_apply="shell.classList.toggle('music-minimized',!!cfg.minimized);shell.classList.toggle('music-maximized',isMax);if(!isMax&&shell.classList.contains('music-searching')){const full=$('musicSearch'),hi=$('musicHeaderSearchInput');if(full)full.value='';if(hi)hi.value='';setMusicSearchMode(false);shell.classList.remove('music-searching')}const b=$('musicMinimize');"
if old_apply not in js:
    raise SystemExit('applyMusicWindow class anchor missing')
js=js.replace(old_apply,new_apply,1)

css += r'''

/* MUSIC_MAX_SEARCH_MODE_V61 */
/* Keep the original compact/minimized Smart Music header completely unchanged. */
.music-header-search{display:none!important}
.music-header-search-close{display:none!important;height:40px;min-width:62px;border:1px solid #334556;border-radius:10px;background:#1b2a35;color:#f8fafc;font-size:12px;font-weight:800;padding:0 10px}
@media (min-width:901px){
  .music-shell.music-maximized .music-header-search{display:flex!important;width:min(520px,46vw)!important;min-width:300px!important}
  .music-shell.music-maximized.music-searching .music-header-search-close{display:block!important}
  .music-shell.music-maximized.music-searching>.music-body>#musicSearchCard{display:block!important}
  .music-shell.music-maximized.music-searching>.music-body>#musicSearchCard>.row{display:none!important}
  .music-shell.music-maximized.music-searching>.music-body>#musicSearchCard>#musicSearchResults{display:block!important}
  .music-shell.music-maximized:not(.music-searching)>.music-body>#musicSearchCard{display:none!important}
}
'''

js += '\n'+marker+'\n'
js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
print('Applied MUSIC_MAX_SEARCH_MODE_V61')
