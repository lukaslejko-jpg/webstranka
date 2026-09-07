from pathlib import Path
import re

js_path = Path('tesla-waze-preview/app.js')
css_path = Path('tesla-waze-preview/app.css')
js = js_path.read_text(encoding='utf-8')
css = css_path.read_text(encoding='utf-8')

MARK='MUSIC_MIN_HEADER_V72'
if MARK in js or MARK in css:
    raise SystemExit('V72 marker already present')

# 1) Keep YouTube sync logic intact, only move the existing button while minimized.
anchor = "function saveMusicWindow(patch){const cfg={...musicWindowState(),...patch};save(MUSIC_WIN_KEY,cfg);applyMusicWindow()}"
if anchor not in js:
    raise SystemExit('saveMusicWindow anchor not found')
helper = r'''
let musicSyncHome=null;
function syncMusicMinimizedHeader(){
  const shell=document.querySelector('.music-shell'),btn=$('youtubeSync'),slot=$('musicHeaderSyncSlot'),close=$('closeMusic');
  if(!shell||!btn||!slot)return;
  if(!musicSyncHome)musicSyncHome={parent:btn.parentNode,next:btn.nextSibling};
  const minimized=shell.classList.contains('music-minimized');
  if(minimized){
    if(btn.parentNode!==slot)slot.appendChild(btn);
    btn.classList.remove('wide');btn.classList.add('music-head-sync-btn');
    if(close)close.textContent='Späť na plochu';
  }else{
    const home=musicSyncHome;
    if(home?.parent&&btn.parentNode!==home.parent){
      if(home.next&&home.next.parentNode===home.parent)home.parent.insertBefore(btn,home.next);else home.parent.appendChild(btn);
    }
    btn.classList.add('wide');btn.classList.remove('music-head-sync-btn');
    if(close)close.textContent='Späť na mapu';
  }
}
/* MUSIC_MIN_HEADER_V72 */
'''
js = js.replace(anchor, anchor + helper, 1)

# 2) After applyMusicWindow changes minimized/maximized classes, synchronize header placement.
old_tail = "if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch()}/* MUSIC_MINI_RESIZE_V4 */"
new_tail = "if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch();syncMusicMinimizedHeader()}/* MUSIC_MINI_RESIZE_V4 */"
if old_tail not in js:
    raise SystemExit('applyMusicWindow tail anchor not found')
js = js.replace(old_tail, new_tail, 1)

# 3) Rebuild only the header DOM grouping. Existing buttons keep their IDs and onclick behavior.
pat = re.compile(r"function ensureMusicWindowControls\(\)\{.*?\n\s*size\.onclick=\(\)=>\{const cfg=musicWindowState\(\);saveMusicWindow\(\{maximized:!cfg\.maximized\}\)\};", re.S)
m = pat.search(js)
if not m:
    raise SystemExit('ensureMusicWindowControls block not found')
replacement = r'''function ensureMusicWindowControls(){
  const shell=document.querySelector('.music-shell'),head=document.querySelector('.music-head');if(!shell||!head||$('musicMinimize'))return;
  const icon=head.querySelector('.music-icon'),title=icon?.nextElementSibling;
  const brand=document.createElement('div');brand.className='music-head-brand';
  if(icon)brand.appendChild(icon);if(title)brand.appendChild(title);head.insertBefore(brand,head.firstChild);
  const syncSlot=document.createElement('div');syncSlot.id='musicHeaderSyncSlot';syncSlot.className='music-head-sync';head.insertBefore(syncSlot,head.querySelector('.spacer'));
  const actions=document.createElement('div');actions.className='music-head-actions';head.insertBefore(actions,$('closeMusic'));
  const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Rozmer';actions.appendChild(size);
  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';actions.appendChild(min);
  const close=$('closeMusic');if(close)actions.appendChild(close);
  const left=document.createElement('div');left.className='music-resize music-resize-left';left.setAttribute('aria-hidden','true');shell.appendChild(left);
  const top=document.createElement('div');top.className='music-resize music-resize-top';top.setAttribute('aria-hidden','true');shell.appendChild(top);
  const corner=document.createElement('div');corner.className='music-resize music-resize-corner';corner.setAttribute('aria-label','Zmeniť veľkosť hudobného okna');shell.appendChild(corner);
  min.onclick=()=>{saveMusicWindow({minimized:!musicWindowState().minimized});updateMiniSeek()};/* MUSIC_LAYOUT_NO_RESTART_V5 */
  size.onclick=()=>{const cfg=musicWindowState();saveMusicWindow({maximized:!cfg.maximized})};
  syncMusicMinimizedHeader();'''
js = js[:m.start()] + replacement + js[m.end():]

css_block = r'''

/* MUSIC_MIN_HEADER_V72 */
.music-head-brand{display:flex;align-items:center;gap:10px;min-width:0}
.music-head-brand>div:last-child{min-width:0}
.music-head-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}
.music-head-sync{display:none;min-width:0}
.music-shell.music-minimized .music-head{
  display:grid!important;
  grid-template-columns:minmax(150px,.85fr) minmax(220px,1.55fr)!important;
  grid-template-areas:'brand sync' 'actions actions'!important;
  align-items:center!important;
  gap:9px 12px!important;
  padding:10px 12px 11px!important;
  border-bottom:1px solid #334155!important;
}
.music-shell.music-minimized .music-head-brand{grid-area:brand;align-self:stretch}
.music-shell.music-minimized .music-head-brand .music-icon{font-size:30px!important;flex:0 0 auto}
.music-shell.music-minimized .music-head-brand h2{font-size:20px!important;line-height:1.05!important;margin:0!important}
.music-shell.music-minimized .music-head-brand small{font-size:10px!important;line-height:1.15!important;display:block;margin-top:3px;white-space:normal}
.music-shell.music-minimized .music-head-sync{grid-area:sync;display:block!important;min-width:0}
.music-shell.music-minimized .music-head-sync .music-head-sync-btn{
  width:100%!important;max-width:none!important;min-width:0!important;min-height:48px!important;height:48px!important;
  margin:0!important;padding:0 12px!important;border-radius:12px!important;font-size:14px!important;font-weight:900!important;
  white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
}
.music-shell.music-minimized .music-head-actions{
  grid-area:actions;display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;
  gap:8px!important;width:100%!important;
}
.music-shell.music-minimized .music-head-actions .btn{
  width:100%!important;min-width:0!important;max-width:none!important;min-height:44px!important;height:44px!important;
  padding:0 8px!important;font-size:13px!important;border-radius:11px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;
}
.music-shell.music-minimized .music-head>.spacer{display:none!important}
.music-shell.music-minimized #musicHeaderSearch{display:none!important}
@media(max-width:520px){
  .music-shell.music-minimized .music-head{grid-template-columns:minmax(118px,.8fr) minmax(170px,1.4fr)!important;gap:7px 8px!important;padding:8px!important}
  .music-shell.music-minimized .music-head-brand h2{font-size:17px!important}
  .music-shell.music-minimized .music-head-brand .music-icon{font-size:26px!important}
  .music-shell.music-minimized .music-head-sync .music-head-sync-btn{font-size:12px!important;padding:0 8px!important}
  .music-shell.music-minimized .music-head-actions{gap:6px!important}
  .music-shell.music-minimized .music-head-actions .btn{font-size:11px!important;padding:0 5px!important}
}
'''
css += css_block

js_path.write_text(js, encoding='utf-8')
css_path.write_text(css, encoding='utf-8')
print('V72 patch applied')
