from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

if 'MUSIC_TWO_STATE_VIDEO_V79' in js or 'MUSIC_TWO_STATE_VIDEO_V79' in css:
    raise SystemExit('V79 already applied')

old="const b=$('musicMinimize');if(b)b.textContent='Minimalizovať';const s=$('musicSize');if(s)s.textContent=isMax?'Pôvodný rozmer':'Maximalizovať';if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch();syncMusicMinimizedHeader();syncMusicCompactHeader()}"
new="const b=$('musicMinimize');if(b){b.textContent='Minimalizovať';b.style.display=isMax?'none':''}const s=$('musicSize');if(s)s.textContent=isMax?'Minimalizovať':'Maximalizovať';const v=$('musicVideo');if(v){v.style.display=isMax?'':'none';if(!isMax)v.textContent='Video'}if(!isMax)shell.classList.remove('music-video-open');if(isMax){ensureMaxMusicHeaderSearch();renderMusicMaxHome()}else removeMaxMusicHeaderSearch();syncMusicMinimizedHeader();syncMusicCompactHeader()}"
if old not in js:
    raise SystemExit('applyMusicWindow anchor not found')
js=js.replace(old,new,1)

anchor="function saveMusicWindow(patch){const cfg={...musicWindowState(),...patch};save(MUSIC_WIN_KEY,cfg);applyMusicWindow()}"
helper="""function saveMusicWindow(patch){const cfg={...musicWindowState(),...patch};save(MUSIC_WIN_KEY,cfg);applyMusicWindow()}\nfunction minimizeMusicWindow(){\n  const shell=document.querySelector('.music-shell'),cfg=musicWindowState(),maxH=Math.max(360,window.innerHeight-20),h=Math.max(360,Math.min(maxH,cfg.miniHeight||520));\n  shell?.classList.remove('music-video-open');\n  $('musicMaxHome')?.remove();\n  save(MUSIC_WIN_KEY,{...cfg,maximized:false,minimized:false,height:h,miniHeight:h});\n  applyMusicWindow();\n  renderMusicList();renderPlayer();updateMiniSeek();\n}\n"""
if anchor not in js:
    raise SystemExit('saveMusicWindow anchor not found')
js=js.replace(anchor,helper,1)

old_compact="$('musicCompactMax').onclick=()=>saveMusicWindow({maximized:true,minimized:false});\n    $('musicCompactMin').onclick=()=>{const cfg=musicWindowState();const h=Math.max(360,Math.min(window.innerHeight-20,cfg.miniHeight||520));saveMusicWindow({minimized:false,maximized:false,height:h});$('musicMaxHome')?.remove();renderMusicList();renderPlayer();updateMiniSeek()};"
new_compact="$('musicCompactMax').onclick=()=>saveMusicWindow({maximized:true,minimized:false});\n    $('musicCompactMin').onclick=()=>minimizeMusicWindow();"
if old_compact not in js:
    raise SystemExit('compact handlers anchor not found')
js=js.replace(old_compact,new_compact,1)

old_controls="const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Rozmer';actions.appendChild(size);\n  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';actions.appendChild(min);"
new_controls="const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Maximalizovať';actions.appendChild(size);\n  const video=document.createElement('button');video.id='musicVideo';video.className='btn music-video-btn';video.textContent='Video';actions.appendChild(video);\n  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';actions.appendChild(min);"
if old_controls not in js:
    raise SystemExit('control creation anchor not found')
js=js.replace(old_controls,new_controls,1)

old_handlers="min.onclick=()=>{const cfg=musicWindowState();const h=Math.max(360,Math.min(window.innerHeight-20,cfg.miniHeight||520));saveMusicWindow({minimized:false,maximized:false,height:h});$('musicMaxHome')?.remove();renderMusicList();renderPlayer();updateMiniSeek()};/* MUSIC_LAYOUT_NO_RESTART_V5 */\n/* MUSIC_DIRECT_MINIMIZE_V78 */\n  size.onclick=()=>{const cfg=musicWindowState();saveMusicWindow({maximized:!cfg.maximized})};"
new_handlers="min.onclick=()=>minimizeMusicWindow();/* MUSIC_LAYOUT_NO_RESTART_V5 */\n/* MUSIC_DIRECT_MINIMIZE_V78 */\n  size.onclick=()=>{musicWindowState().maximized?minimizeMusicWindow():saveMusicWindow({maximized:true,minimized:false})};\n  video.onclick=()=>{const shell=document.querySelector('.music-shell');if(!shell?.classList.contains('music-maximized'))return;const yt=currentYoutubeId();if(!yt)return;const open=!shell.classList.contains('music-video-open');shell.classList.toggle('music-video-open',open);video.textContent=open?'Skryť video':'Video';if(open){try{music.ytPlayer?.playVideo?.()}catch{}}};\n/* MUSIC_TWO_STATE_VIDEO_V79 */"
if old_handlers not in js:
    raise SystemExit('control handlers anchor not found')
js=js.replace(old_handlers,new_handlers,1)

css += r'''\n\n/* MUSIC_TWO_STATE_VIDEO_V79 */\n#musicVideo{display:none}\n.music-shell.music-maximized #musicVideo{display:block!important}\n.music-shell.music-maximized #musicMinimize{display:none!important}\n.music-shell.music-maximized.music-video-open::before{\n  content:'';position:fixed;inset:58px 18px 92px;background:rgba(0,0,0,.82);z-index:6100;pointer-events:none;border-radius:14px;\n}\n.music-shell.music-maximized.music-video-open .music-player .yt-player{\n  position:fixed!important;left:50%!important;top:74px!important;bottom:auto!important;transform:translateX(-50%)!important;\n  width:min(1100px,calc(100vw - 70px))!important;height:auto!important;min-width:0!important;min-height:0!important;max-width:none!important;max-height:calc(100vh - 190px)!important;\n  aspect-ratio:16/9!important;opacity:1!important;pointer-events:auto!important;overflow:visible!important;margin:0!important;z-index:6200!important;\n  border-radius:14px!important;background:#000!important;box-shadow:0 14px 40px rgba(0,0,0,.65)!important;\n}\n@media(max-width:900px){\n  .music-shell.music-maximized.music-video-open .music-player .yt-player{top:70px!important;width:calc(100vw - 24px)!important;max-height:calc(100vh - 170px)!important}\n}\n'''

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
print('V79 patch applied')
