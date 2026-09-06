from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
marker='/* MUSIC_HEADER_SEARCH_RESULTS_V60 */'
if marker in js and marker in css:
    raise SystemExit(0)

old_btn="hs.innerHTML='<input id=\"musicHeaderSearchInput\" type=\"search\" autocomplete=\"off\" placeholder=\"Hľadať hudbu…\" aria-label=\"Hľadať hudbu\"><button id=\"musicHeaderSearchBtn\" type=\"button\" class=\"music-header-search-btn\" aria-label=\"Hľadať\">⌕</button>'"
new_btn="hs.innerHTML='<input id=\"musicHeaderSearchInput\" type=\"search\" autocomplete=\"off\" placeholder=\"Hľadať hudbu…\" aria-label=\"Hľadať hudbu\"><button id=\"musicHeaderSearchBtn\" type=\"button\" class=\"music-header-search-btn\" aria-label=\"Hľadať\">Hľadať</button>'"
if old_btn not in js:
    raise SystemExit('header button anchor missing')
js=js.replace(old_btn,new_btn,1)

old_run="  const runHeaderSearch=()=>{const input=$('musicHeaderSearchInput'),full=$('musicSearch');if(!input||!full)return;full.value=input.value.trim();musicSearch()};\n  $('musicHeaderSearchBtn').onclick=runHeaderSearch;\n  $('musicHeaderSearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runHeaderSearch()}};"
new_run="  const runHeaderSearch=()=>{const input=$('musicHeaderSearchInput'),full=$('musicSearch');if(!input||!full)return;full.value=input.value.trim();musicSearch()};\n  $('musicHeaderSearchBtn').onclick=runHeaderSearch;\n  $('musicHeaderSearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();runHeaderSearch()}};\n  $('musicHeaderSearchInput').oninput=e=>{const full=$('musicSearch');if(full)full.value=e.target.value;if(!e.target.value.trim()){setMusicSearchMode(false);if(document.querySelector('.music-shell')?.classList.contains('music-maximized'))renderMusicMaxHome()}};"
if old_run not in js:
    raise SystemExit('header search handlers anchor missing')
js=js.replace(old_run,new_run,1)

old_mode="function setMusicSearchMode(active){document.querySelector('.music-tabs')?.classList.toggle('hidden',active);$('musicList')?.classList.toggle('hidden',active);if(!active)$('musicSearchResults').innerHTML=''}"
new_mode="function setMusicSearchMode(active){document.querySelector('.music-tabs')?.classList.toggle('hidden',active);$('musicList')?.classList.toggle('hidden',active);const shell=document.querySelector('.music-shell'),results=$('musicSearchResults'),card=results?.closest('.music-card');if(card&&!card.id)card.id='musicSearchCard';shell?.classList.toggle('music-searching',!!active);if(!active&&results)results.innerHTML='';if(shell?.classList.contains('music-maximized')){const home=$('musicMaxHome');if(home)home.classList.toggle('hidden',!!active)}}"
if old_mode not in js:
    raise SystemExit('setMusicSearchMode anchor missing')
js=js.replace(old_mode,new_mode,1)

# In maximized mode, keep header field synchronized with searches launched elsewhere too.
old_search="async function musicSearch(){const q=$('musicSearch').value.trim(),o=$('musicSearchResults');if(!q){setMusicSearchMode(false);return}"
new_search="async function musicSearch(){const q=$('musicSearch').value.trim(),o=$('musicSearchResults');if($('musicHeaderSearchInput')&&$('musicHeaderSearchInput').value!==q)$('musicHeaderSearchInput').value=q;if(!q){setMusicSearchMode(false);return}"
if old_search not in js:
    raise SystemExit('musicSearch anchor missing')
js=js.replace(old_search,new_search,1)

css += r'''

/* MUSIC_HEADER_SEARCH_RESULTS_V60 */
.music-header-search-btn{width:auto!important;min-width:76px!important;padding:0 12px!important;font-size:12px!important;letter-spacing:0!important}
@media (min-width:901px){
  .music-shell.music-maximized.music-searching>.music-body>#musicMaxHome{display:none!important}
  .music-shell.music-maximized.music-searching>.music-body>#musicSearchCard{display:block!important;background:transparent!important;border:0!important;padding:0!important;margin:0!important}
  .music-shell.music-maximized.music-searching>.music-body>#musicSearchCard>.row{display:none!important}
  .music-shell.music-maximized.music-searching>.music-body>#musicSearchCard>#musicSearchResults{display:block!important}
  .music-shell.music-maximized.music-searching #musicSearchResults .music-group-title{font-size:20px!important;margin:18px 0 8px!important}
  .music-shell.music-maximized.music-searching #musicSearchResults .music-track{display:grid!important;grid-template-columns:56px minmax(0,1fr) 92px!important;min-height:68px!important;margin:6px 0!important}
}
'''

js += '\n'+marker+'\n'
js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
