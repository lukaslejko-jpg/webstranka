from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')

helper = r'''function ensureMobileMaxSearch(){
  const shell=document.querySelector('.music-shell'),head=document.querySelector('.music-head');
  if(!shell||!head)return;
  const mobile=window.matchMedia?.('(max-width:900px)')?.matches;
  let box=$('musicMobileMaxSearch');
  if(!shell.classList.contains('music-maximized')||!mobile){if(box)box.remove();return}
  if(box)return;
  box=document.createElement('div');box.id='musicMobileMaxSearch';box.className='music-mobile-max-search';
  box.innerHTML='<input id="musicMobileMaxSearchInput" type="search" autocomplete="off" placeholder="Hľadať hudbu…" aria-label="Hľadať hudbu"><button id="musicMobileMaxSearchBtn" type="button" class="btn primary">Hľadať</button>';
  head.appendChild(box);
  const input=$('musicMobileMaxSearchInput'),full=$('musicSearch'),run=()=>{if(!input||!full)return;full.value=input.value.trim();musicSearch()};
  if(input&&full)input.value=full.value||'';
  $('musicMobileMaxSearchBtn').onclick=run;
  input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}};
  input.oninput=()=>{if(full)full.value=input.value};
}/* MUSIC_MOBILE_SEARCH_V103 */
'''

anchor = 'function ensureMaxMusicHeaderSearch(){'
assert anchor in s and 'MUSIC_MOBILE_SEARCH_V103' not in s
s = s.replace(anchor, helper + anchor, 1)
old = "if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch();"
new = "if(isMax){ensureMaxMusicHeaderSearch();ensureMobileMaxSearch();renderMusicMaxHome()}else{removeMaxMusicHeaderSearch();ensureMobileMaxSearch()}"
assert old in s
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')

css = Path('tesla-waze-preview/mobile-v102.css')
c = css.read_text(encoding='utf-8')
assert 'MUSIC_MOBILE_SEARCH_V103' not in c
c += r'''

/* MUSIC_MOBILE_SEARCH_V103 */
@media(max-width:900px){
  .music-shell.music-maximized #musicHeaderSearch{display:none!important}
  .music-shell.music-maximized #musicMobileMaxSearch{display:grid!important;grid-template-columns:minmax(0,1fr) auto!important;gap:6px!important;width:100%!important;order:3!important}
  .music-shell.music-maximized #musicMobileMaxSearch input{width:100%!important;min-width:0!important;height:44px!important;border:1px solid #334556!important;border-radius:10px!important;background:#0b141d!important;color:#fff!important;padding:0 11px!important;font-size:14px!important}
  .music-shell.music-maximized #musicMobileMaxSearch .btn{height:44px!important;min-height:44px!important;min-width:84px!important;padding:0 12px!important}
}
'''
css.write_text(c, encoding='utf-8')
