from pathlib import Path
import re

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

if 'MUSIC_COMPACT_HEADER_V76' in js or 'MUSIC_COMPACT_HEADER_V76' in css:
    raise SystemExit('V76 already applied')

old="const min=$('musicCompactMin');if(min)min.textContent=cfg.minimized?'Rozbaliť':'Minimalizovať';"
new="const min=$('musicCompactMin');if(min)min.textContent='Minimalizovať';"
if old not in js:
    raise SystemExit('compact min label anchor not found')
js=js.replace(old,new,1)
js=js.replace('/* MUSIC_COMPACT_HEADER_V74 */','/* MUSIC_COMPACT_HEADER_V74 */\n/* MUSIC_COMPACT_HEADER_V76 */',1)

css += r'''

/* MUSIC_COMPACT_HEADER_V76 */
.music-shell:not(.music-maximized) .music-compact-head{
  padding:10px 12px!important;
  gap:10px!important;
}
.music-shell:not(.music-maximized) .music-compact-top{
  display:grid!important;
  grid-template-columns:minmax(132px,.95fr) minmax(0,1.45fr)!important;
  gap:10px!important;
  align-items:center!important;
  width:100%!important;
}
.music-shell:not(.music-maximized) .music-compact-brand{
  min-width:0!important;
  overflow:visible!important;
}
.music-shell:not(.music-maximized) .music-compact-brand b{
  font-size:18px!important;
  line-height:1.05!important;
  white-space:normal!important;
}
.music-shell:not(.music-maximized) .music-compact-brand small{
  font-size:9px!important;
  line-height:1.1!important;
  white-space:normal!important;
}
.music-shell:not(.music-maximized) .music-compact-top #musicCompactSync{
  width:100%!important;
  min-width:0!important;
  height:46px!important;
  min-height:46px!important;
  padding:0 10px!important;
  font-size:12px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.music-shell:not(.music-maximized) .music-compact-actions{
  display:grid!important;
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
  grid-template-rows:46px!important;
  gap:8px!important;
  width:100%!important;
}
.music-shell:not(.music-maximized) .music-compact-actions .btn{
  width:100%!important;
  min-width:0!important;
  height:46px!important;
  min-height:46px!important;
  padding:0 6px!important;
  font-size:12px!important;
  white-space:nowrap!important;
  overflow:hidden!important;
  text-overflow:ellipsis!important;
}
.music-shell:not(.music-maximized) #musicCompactBack{font-size:11px!important}
@media(max-width:390px){
  .music-shell:not(.music-maximized) .music-compact-top{
    grid-template-columns:minmax(118px,.9fr) minmax(0,1.5fr)!important;
    gap:8px!important;
  }
  .music-shell:not(.music-maximized) .music-compact-top #musicCompactSync{font-size:11px!important;padding:0 7px!important}
  .music-shell:not(.music-maximized) .music-compact-actions{gap:6px!important}
  .music-shell:not(.music-maximized) .music-compact-actions .btn{font-size:11px!important;padding:0 4px!important}
  .music-shell:not(.music-maximized) #musicCompactBack{font-size:10px!important}
}
'''

js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
print('V76 patch applied')
