from pathlib import Path
import re

p=Path('tesla-waze-preview/app.js')
c=Path('tesla-waze-preview/app.css')
s=p.read_text(encoding='utf-8')
css=c.read_text(encoding='utf-8')
marker='/* MUSIC_MAX_SEARCH_HISTORY_V62 */'
if marker in s and marker in css:
    raise SystemExit(0)

# 1) Restore the classic/minimized header DOM to the exact pre-V59 structure.
pat=re.compile(r"function ensureMusicWindowControls\(\)\{\n  const shell=document\.querySelector\('\.music-shell'\),head=document\.querySelector\('\.music-head'\);if\(!shell\|\|!head\|\|\$\('musicMinimize'\)\)return;\n  const hs=document\.createElement\('div'\);.*?\n  const size=document\.createElement\('button'\);",re.S)
repl="function ensureMusicWindowControls(){\n  const shell=document.querySelector('.music-shell'),head=document.querySelector('.music-head');if(!shell||!head||$('musicMinimize'))return;\n  const size=document.createElement('button');"
s,n=pat.subn(repl,s,count=1)
if n!=1:
    raise SystemExit('current V59/V61 header block not found')

# 2) Add maximized-only header search, back button and persistent history.
anchor="function saveMusicWindow(patch){const cfg={...musicWindowState(),...patch};save(MUSIC_WIN_KEY,cfg);applyMusicWindow()}"
addition=r'''
const MUSIC_SEARCH_HISTORY_KEY='teslaWaze:musicSearchHistory:v1';
function musicSearchHistory(){const a=load(MUSIC_SEARCH_HISTORY_KEY,[]);return Array.isArray(a)?a.filter(x=>typeof x==='string'&&x.trim()).slice(0,10):[]}
function rememberMusicSearch(q){q=String(q||'').trim();if(!q)return;const a=[q,...musicSearchHistory().filter(x=>x.toLowerCase()!==q.toLowerCase())].slice(0,10);save(MUSIC_SEARCH_HISTORY_KEY,a)}
function closeMaxMusicSearch(){
  setMusicSearchMode(false);
  const shell=document.querySelector('.music-shell');
  shell?.classList.remove('music-searching');
  if(shell?.classList.contains('music-maximized'))renderMusicMaxHome();
  const back=$('musicHeaderBackBtn');if(back)back.classList.add('hidden');
}
function renderMusicHeaderHistory(){
  const host=$('musicHeaderHistory');if(!host)return;
  const rows=musicSearchHistory();
  host.innerHTML=rows.length?rows.map(q=>`<button type="button" data-music-history="${esc(q)}">${esc(q)}</button>`).join(''):'';
  host.classList.toggle('hidden',!rows.length);
  host.querySelectorAll('[data-music-history]').forEach(b=>b.onclick=()=>{
    const q=b.dataset.musicHistory||'',input=$('musicHeaderSearchInput'),full=$('musicSearch');
    if(input)input.value=q;if(full)full.value=q;host.classList.add('hidden');musicSearch();
  });
}
function ensureMaxMusicHeaderSearch(){
  const shell=document.querySelector('.music-shell'),head=document.querySelector('.music-head');
  if(!shell?.classList.contains('music-maximized')||!head)return;
  let hs=$('musicHeaderSearch');
  if(!hs){
    hs=document.createElement('div');hs.id='musicHeaderSearch';hs.className='music-header-search';
    hs.innerHTML='<button id="musicHeaderBackBtn" type="button" class="music-header-back hidden">Späť</button><div class="music-header-search-field"><input id="musicHeaderSearchInput" type="search" autocomplete="off" placeholder="Hľadať hudbu…" aria-label="Hľadať hudbu"><div id="musicHeaderHistory" class="music-header-history hidden"></div></div><button id="musicHeaderSearchBtn" type="button" class="music-header-search-btn">Hľadať</button>';
    head.insertBefore(hs,head.querySelector('.spacer'));
    const input=$('musicHeaderSearchInput'),full=$('musicSearch'),run=()=>{if(!input||!full)return;full.value=input.value.trim();musicSearch()};
    if(input&&full)input.value=full.value||'';
    $('musicHeaderSearchBtn').onclick=run;
    $('musicHeaderBackBtn').onclick=()=>closeMaxMusicSearch();
    input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();run()}else if(e.key==='Escape'){e.preventDefault();closeMaxMusicSearch()}};
    input.oninput=()=>{if(full)full.value=input.value;if(!input.value.trim())closeMaxMusicSearch()};
    input.onfocus=()=>renderMusicHeaderHistory();
    input.onblur=()=>setTimeout(()=>$('musicHeaderHistory')?.classList.add('hidden'),180);
  }
  const back=$('musicHeaderBackBtn');if(back)back.classList.toggle('hidden',!shell.classList.contains('music-searching'));
}
function removeMaxMusicHeaderSearch(){const hs=$('musicHeaderSearch');if(hs)hs.remove()}
'''
if anchor not in s:
    raise SystemExit('saveMusicWindow anchor missing')
s=s.replace(anchor,anchor+'\n'+addition,1)

# 3) Update applyMusicWindow: create max-only search or remove it outside max.
old="const s=$('musicSize');if(s)s.textContent=isMax?'Pôvodný rozmer':'Maximalizovať';if(isMax)renderMusicMaxHome()}/* MUSIC_MINI_RESIZE_V4 */"
new="const s=$('musicSize');if(s)s.textContent=isMax?'Pôvodný rozmer':'Maximalizovať';if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch()}/* MUSIC_MINI_RESIZE_V4 */"
if old not in s:
    raise SystemExit('applyMusicWindow tail missing')
s=s.replace(old,new,1)

# 4) Do not reference removed header search in openMusicWindow.
s=s.replace(";if($('musicHeaderSearchInput')&&$('musicSearch'))$('musicHeaderSearchInput').value=$('musicSearch').value||'';renderMusicStatus();",";renderMusicStatus();",1)

# 5) Search mode controls Back visibility in maximized mode.
old_mode="function setMusicSearchMode(active){document.querySelector('.music-tabs')?.classList.toggle('hidden',active);$('musicList')?.classList.toggle('hidden',active);const shell=document.querySelector('.music-shell'),results=$('musicSearchResults'),card=results?.closest('.music-card');if(card&&!card.id)card.id='musicSearchCard';shell?.classList.toggle('music-searching',!!active);if(!active&&results)results.innerHTML='';if(shell?.classList.contains('music-maximized')){const home=$('musicMaxHome');if(home)home.classList.toggle('hidden',!!active)}}"
new_mode="function setMusicSearchMode(active){document.querySelector('.music-tabs')?.classList.toggle('hidden',active);$('musicList')?.classList.toggle('hidden',active);const shell=document.querySelector('.music-shell'),results=$('musicSearchResults'),card=results?.closest('.music-card');if(card&&!card.id)card.id='musicSearchCard';shell?.classList.toggle('music-searching',!!active);if(!active&&results)results.innerHTML='';if(shell?.classList.contains('music-maximized')){const home=$('musicMaxHome');if(home)home.classList.toggle('hidden',!!active);ensureMaxMusicHeaderSearch();const back=$('musicHeaderBackBtn');if(back)back.classList.toggle('hidden',!active)}}"
if old_mode not in s:
    raise SystemExit('setMusicSearchMode V60 anchor missing')
s=s.replace(old_mode,new_mode,1)

# 6) Save successful search terms and synchronize max header field if present.
old_search="async function musicSearch(){const q=$('musicSearch').value.trim(),o=$('musicSearchResults');if($('musicHeaderSearchInput')&&$('musicHeaderSearchInput').value!==q)$('musicHeaderSearchInput').value=q;if(!q){setMusicSearchMode(false);return}setMusicSearchMode(true);"
new_search="async function musicSearch(){const q=$('musicSearch').value.trim(),o=$('musicSearchResults');if($('musicHeaderSearchInput')&&$('musicHeaderSearchInput').value!==q)$('musicHeaderSearchInput').value=q;if(!q){setMusicSearchMode(false);return}rememberMusicSearch(q);setMusicSearchMode(true);"
if old_search not in s:
    raise SystemExit('musicSearch V60 anchor missing')
s=s.replace(old_search,new_search,1)

# CSS override: classic header exactly unaffected; max-only search with history + Back.
css += r'''

/* MUSIC_MAX_SEARCH_HISTORY_V62 */
.music-shell:not(.music-maximized) #musicHeaderSearch{display:none!important}
@media (min-width:901px){
  .music-shell.music-maximized #musicHeaderSearch{display:flex!important;position:relative;align-items:center;gap:6px;min-width:0;width:min(620px,52vw);margin-left:10px}
  .music-shell.music-maximized .music-header-search-field{position:relative;flex:1;min-width:150px}
  .music-shell.music-maximized .music-header-search-field input{width:100%;height:40px;min-height:40px;border:1px solid #334556;border-radius:10px;background:#0b141d;color:#fff;padding:0 11px;font-size:13px;outline:none}
  .music-shell.music-maximized .music-header-search-btn,.music-shell.music-maximized .music-header-back{height:40px;min-height:40px;border:1px solid #334556;border-radius:10px;background:#1b2a35;color:#f8fafc;font-weight:800;padding:0 12px;white-space:nowrap}
  .music-shell.music-maximized .music-header-search-btn{background:#16b8b4;border-color:#16b8b4;color:#031b1b}
  .music-shell.music-maximized .music-header-history{position:absolute;left:0;right:0;top:44px;z-index:50;background:#101b25;border:1px solid #334556;border-radius:10px;padding:5px;box-shadow:0 8px 24px #0008;max-height:240px;overflow:auto}
  .music-shell.music-maximized .music-header-history button{display:block;width:100%;min-height:38px;border:0;border-bottom:1px solid #263442;background:transparent;color:#e6f0f5;text-align:left;padding:7px 9px;font-size:12px}
  .music-shell.music-maximized .music-header-history button:last-child{border-bottom:0}
}
'''

# Assertions
if "const hs=document.createElement('div');hs.id='musicHeaderSearch'" in s.split('function ensureMusicWindowControls(){',1)[1].split('function syncMusicFab',1)[0]:
    raise SystemExit('classic controls still create header search')
for needle in ['MUSIC_SEARCH_HISTORY_KEY','ensureMaxMusicHeaderSearch','musicHeaderBackBtn','rememberMusicSearch(q)']:
    if needle not in s: raise SystemExit('missing '+needle)

s+='\n'+marker+'\n'
css+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
c.write_text(css,encoding='utf-8')
