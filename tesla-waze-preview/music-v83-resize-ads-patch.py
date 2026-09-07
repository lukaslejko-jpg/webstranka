from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

old_resize="const rect=shell.getBoundingClientRect(),mini=musicWindowState().minimized;saveMusicWindow(mini?{width:Math.round(rect.width),miniHeight:Math.round(rect.height),minimized:true}:{width:Math.round(rect.width),height:Math.round(rect.height),minimized:false})"
new_resize="const rect=shell.getBoundingClientRect(),small=!musicWindowState().maximized;saveMusicWindow(small?{width:Math.round(rect.width),miniHeight:Math.round(rect.height),minimized:false,maximized:false}:{width:Math.round(rect.width),height:Math.round(rect.height),minimized:false,maximized:true})"
if old_resize not in js:
    raise SystemExit('resize handler pattern not found')
js=js.replace(old_resize,new_resize,1)

old_buttons="const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Rozmer';actions.appendChild(size);\n  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';actions.appendChild(min);"
new_buttons="const size=document.createElement('button');size.id='musicSize';size.className='btn music-size-btn';size.textContent='Rozmer';actions.appendChild(size);\n  const ads=document.createElement('button');ads.id='musicAds';ads.className='btn music-ads-btn';ads.textContent='S reklamami';actions.appendChild(ads);\n  const min=document.createElement('button');min.id='musicMinimize';min.className='btn music-min-btn';min.textContent='Minimalizovať';actions.appendChild(min);"
if old_buttons not in js:
    raise SystemExit('header button pattern not found')
js=js.replace(old_buttons,new_buttons,1)

old_handler="size.onclick=()=>{const cfg=musicWindowState();if(!cfg.maximized){saveMusicWindow({maximized:true,minimized:false});return}const sh=document.querySelector('.music-shell');if(!sh||!currentYoutubeId())return;sh.classList.toggle('music-video-open')};/* MUSIC_V80_RESTORE_MINIMIZED_MAX_VIDEO */"
new_handler="size.onclick=()=>{const cfg=musicWindowState();if(!cfg.maximized){saveMusicWindow({maximized:true,minimized:false});return}const sh=document.querySelector('.music-shell');if(!sh||!currentYoutubeId())return;sh.classList.toggle('music-video-open')};ads.onclick=()=>{const cfg=musicWindowState(),yt=currentYoutubeId();if(cfg.maximized&&yt)switchYoutubeToFree(yt,true)};/* MUSIC_V80_RESTORE_MINIMIZED_MAX_VIDEO */\n/* MUSIC_V83_RESIZE_AND_ADS */"
if old_handler not in js:
    raise SystemExit('size handler pattern not found')
js=js.replace(old_handler,new_handler,1)

css_marker='''\n\n/* MUSIC_V83_RESIZE_AND_ADS */\n.music-shell:not(.music-maximized) #musicAds{display:none!important}\n.music-shell.music-maximized #musicAds{display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important}\n'''
if 'MUSIC_V83_RESIZE_AND_ADS' not in css:
    css += css_marker

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
