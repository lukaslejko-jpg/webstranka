from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

MARK='MUSIC_COMPACT_HEADER_V74'
if MARK in js or MARK in css:
    raise SystemExit('V74 already applied')

anchor='function ensureMusicWindowControls(){'
if anchor not in js:
    raise SystemExit('ensureMusicWindowControls anchor missing')

helper=r'''
function ensureMusicCompactHeader(){
  const shell=document.querySelector('.music-shell');if(!shell)return;
  let head=$('musicCompactHead');
  if(!head){
    head=document.createElement('div');head.id='musicCompactHead';head.className='music-compact-head';
    head.innerHTML='<div class="music-compact-top"><div class="music-compact-brand"><span class="music-compact-icon">♫</span><div><b>Smart Music</b><small id="musicCompactStatus">Hudba</small></div></div><button id="musicCompactSync" type="button" class="btn primary">Prepojiť / synchronizovať YouTube</button></div><div class="music-compact-actions"><button id="musicCompactMax" type="button" class="btn">Maximalizovať</button><button id="musicCompactMin" type="button" class="btn">Minimalizovať</button><button id="musicCompactBack" type="button" class="btn">Späť na plochu</button></div>';
    shell.insertBefore(head,shell.firstChild);
    $('musicCompactSync').onclick=()=>syncYoutube();
    $('musicCompactMax').onclick=()=>saveMusicWindow({maximized:true,minimized:false});
    $('musicCompactMin').onclick=()=>{const cfg=musicWindowState();saveMusicWindow({minimized:!cfg.minimized,maximized:false});updateMiniSeek()};
    $('musicCompactBack').onclick=()=>setMusicWindowOpen(false);
  }
  syncMusicCompactHeader();
}
function syncMusicCompactHeader(){
  const shell=document.querySelector('.music-shell'),head=$('musicCompactHead');if(!shell||!head)return;
  const cfg=musicWindowState(),small=!shell.classList.contains('music-maximized');
  head.classList.toggle('music-compact-active',small);
  const st=$('musicCompactStatus'),src=$('musicStatus');if(st)st.textContent=src?.textContent||'Smart Music';
  const min=$('musicCompactMin');if(min)min.textContent=cfg.minimized?'Rozbaliť':'Minimalizovať';
}
/* MUSIC_COMPACT_HEADER_V74 */

'''
js=js.replace(anchor,helper+anchor,1)

bind_anchor='function bind(){ensureTeslaNavUI();ensureMusicWindowControls();'
if bind_anchor not in js:
    raise SystemExit('bind anchor missing')
js=js.replace(bind_anchor,'function bind(){ensureTeslaNavUI();ensureMusicWindowControls();ensureMusicCompactHeader();',1)

# Refresh compact header whenever window state changes.
apply_tail='if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch();syncMusicMinimizedHeader()}/* MUSIC_MINI_RESIZE_V4 */'
if apply_tail not in js:
    raise SystemExit('applyMusicWindow tail missing')
js=js.replace(apply_tail,'if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch();syncMusicMinimizedHeader();syncMusicCompactHeader()}/* MUSIC_MINI_RESIZE_V4 */',1)

css += r'''

/* MUSIC_COMPACT_HEADER_V74 */
.music-compact-head{display:none;background:rgba(19,32,43,.96);border-bottom:1px solid rgba(148,184,201,.22);padding:10px 12px 11px;gap:9px}
.music-shell:not(.music-maximized)>.music-compact-head{display:grid!important;grid-template-rows:auto auto;gap:9px!important}
.music-shell:not(.music-maximized)>.music-head{display:none!important}
.music-shell:not(.music-maximized) .music-body #youtubeSync{display:none!important}
.music-compact-top{display:grid;grid-template-columns:minmax(130px,.85fr) minmax(210px,1.55fr);gap:10px;align-items:center;min-width:0}
.music-compact-brand{display:flex;align-items:center;gap:9px;min-width:0}
.music-compact-brand>div{min-width:0;display:flex;flex-direction:column}
.music-compact-brand b{font-size:18px;line-height:1.05;white-space:nowrap}
.music-compact-brand small{font-size:10px;color:#91a7b6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:3px}
.music-compact-icon{width:32px;height:32px;flex:0 0 32px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:rgba(34,211,238,.11);border:1px solid rgba(103,232,249,.24);color:#67e8f9;font-size:18px}
.music-compact-top #musicCompactSync{width:100%!important;min-width:0!important;max-width:none!important;height:46px!important;min-height:46px!important;margin:0!important;padding:0 10px!important;font-size:13px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
.music-compact-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;width:100%!important}
.music-compact-actions .btn{display:block!important;visibility:visible!important;width:100%!important;min-width:0!important;max-width:none!important;height:44px!important;min-height:44px!important;margin:0!important;padding:0 7px!important;font-size:12px!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
@media(max-width:520px){
  .music-compact-head{padding:8px!important;gap:7px!important}
  .music-compact-top{grid-template-columns:minmax(108px,.78fr) minmax(170px,1.35fr)!important;gap:7px!important}
  .music-compact-brand{gap:7px!important}.music-compact-icon{width:28px;height:28px;flex-basis:28px;font-size:16px}.music-compact-brand b{font-size:16px}.music-compact-brand small{font-size:9px}
  .music-compact-top #musicCompactSync{height:44px!important;min-height:44px!important;font-size:11px!important;padding:0 7px!important}
  .music-compact-actions{gap:6px!important}.music-compact-actions .btn{height:42px!important;min-height:42px!important;font-size:10px!important;padding:0 4px!important}
}
'''

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
print('V74 patch applied')
