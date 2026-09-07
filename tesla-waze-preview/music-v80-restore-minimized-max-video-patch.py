from pathlib import Path

js=Path('tesla-waze-preview/app.js')
css=Path('tesla-waze-preview/app.css')
s=js.read_text(encoding='utf-8')
c=css.read_text(encoding='utf-8')
if 'MUSIC_V80_RESTORE_MINIMIZED_MAX_VIDEO' in s:
    raise SystemExit('V80 already applied')
old="if(s)s.textContent=isMax?'Pôvodný rozmer':'Maximalizovať';"
new="if(s){s.textContent=isMax?'Video':'Maximalizovať';s.classList.toggle('music-video-btn',isMax)};if(!isMax)shell.classList.remove('music-video-open');"
if old not in s: raise SystemExit('size label anchor missing')
s=s.replace(old,new,1)
old="size.onclick=()=>{const cfg=musicWindowState();saveMusicWindow({maximized:!cfg.maximized})};"
new="size.onclick=()=>{const cfg=musicWindowState();if(!cfg.maximized){saveMusicWindow({maximized:true,minimized:false});return}const sh=document.querySelector('.music-shell');if(!sh||!currentYoutubeId())return;sh.classList.toggle('music-video-open')};/* MUSIC_V80_RESTORE_MINIMIZED_MAX_VIDEO */"
if old not in s: raise SystemExit('size onclick anchor missing')
s=s.replace(old,new,1)
js.write_text(s,encoding='utf-8')
marker='/* MUSIC_V80_MAX_VIDEO_ONLY */'
if marker not in c:
    c += "\n\n"+marker+"\n"+r'''
.music-shell.music-maximized.music-video-open .music-player .yt-player{
  position:fixed!important;
  z-index:7005!important;
  left:20px!important;
  top:72px!important;
  width:calc(100vw - 40px)!important;
  height:auto!important;
  min-width:0!important;
  min-height:0!important;
  max-width:none!important;
  max-height:calc(100vh - 170px)!important;
  aspect-ratio:16/9!important;
  opacity:1!important;
  pointer-events:auto!important;
  overflow:hidden!important;
  margin:0!important;
  border-radius:14px!important;
  background:#000!important;
}
@media(max-width:900px){
  .music-shell.music-maximized.music-video-open .music-player .yt-player{
    left:8px!important;top:64px!important;width:calc(100vw - 16px)!important;max-height:calc(100vh - 150px)!important;
  }
}
'''
css.write_text(c,encoding='utf-8')
print('V80 patch applied')
