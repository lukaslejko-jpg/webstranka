from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

if 'MUSIC_COMPACT_HEADER_V73' in js or 'MUSIC_COMPACT_HEADER_V73' in css:
    raise SystemExit('V73 already applied')

old="const minimized=shell.classList.contains('music-minimized');\n  if(minimized){"
new="const compact=!shell.classList.contains('music-maximized');\n  if(compact){"
if old not in js: raise SystemExit('V72 compact condition anchor missing')
js=js.replace(old,new,1)

# In compact/non-maximized window the close button wording matches requested UI.
js=js.replace("if(close)close.textContent='Späť na plochu';","if(close)close.textContent='Späť na plochu';",1)

# Promote all V72 header-only selectors from internal minimized class to any non-maximized small window.
repls=[
('.music-shell.music-minimized .music-head{','.music-shell:not(.music-maximized) .music-head{'),
('.music-shell.music-minimized .music-head-brand{','.music-shell:not(.music-maximized) .music-head-brand{'),
('.music-shell.music-minimized .music-head-brand .music-icon{','.music-shell:not(.music-maximized) .music-head-brand .music-icon{'),
('.music-shell.music-minimized .music-head-brand h2{','.music-shell:not(.music-maximized) .music-head-brand h2{'),
('.music-shell.music-minimized .music-head-brand small{','.music-shell:not(.music-maximized) .music-head-brand small{'),
('.music-shell.music-minimized .music-head-sync{','.music-shell:not(.music-maximized) .music-head-sync{'),
('.music-shell.music-minimized .music-head-sync .music-head-sync-btn{','.music-shell:not(.music-maximized) .music-head-sync .music-head-sync-btn{'),
('.music-shell.music-minimized .music-head-actions{','.music-shell:not(.music-maximized) .music-head-actions{'),
('.music-shell.music-minimized .music-head-actions .btn{','.music-shell:not(.music-maximized) .music-head-actions .btn{'),
('.music-shell.music-minimized .music-head>.spacer{','.music-shell:not(.music-maximized) .music-head>.spacer{'),
('.music-shell.music-minimized #musicHeaderSearch{','.music-shell:not(.music-maximized) #musicHeaderSearch{'),
]
for a,b in repls:
    if a not in css: raise SystemExit(f'CSS selector missing: {a}')
    css=css.replace(a,b)

# Make requested three-button row visually robust even at the current ~350px window width.
css += r'''

/* MUSIC_COMPACT_HEADER_V73 */
.music-shell:not(.music-maximized) .music-head{
  grid-template-columns:minmax(112px,.78fr) minmax(178px,1.35fr)!important;
  grid-template-areas:'brand sync' 'actions actions'!important;
}
.music-shell:not(.music-maximized) .music-head-actions{
  grid-template-columns:repeat(3,minmax(0,1fr))!important;
}
.music-shell:not(.music-maximized) .music-head-actions #musicSize,
.music-shell:not(.music-maximized) .music-head-actions #musicMinimize,
.music-shell:not(.music-maximized) .music-head-actions #closeMusic{
  display:block!important;
  visibility:visible!important;
}
.music-shell:not(.music-maximized) .music-head-sync #youtubeSync{
  display:block!important;
  visibility:visible!important;
}
@media(max-width:430px){
  .music-shell:not(.music-maximized) .music-head{grid-template-columns:minmax(104px,.75fr) minmax(164px,1.25fr)!important;padding:8px!important;gap:7px 8px!important}
  .music-shell:not(.music-maximized) .music-head-brand h2{font-size:16px!important}
  .music-shell:not(.music-maximized) .music-head-brand small{font-size:9px!important}
  .music-shell:not(.music-maximized) .music-head-sync .music-head-sync-btn{font-size:11px!important;padding:0 7px!important;min-height:44px!important;height:44px!important}
  .music-shell:not(.music-maximized) .music-head-actions .btn{font-size:10px!important;padding:0 4px!important;min-height:42px!important;height:42px!important}
}
'''
js=js.replace('/* MUSIC_MIN_HEADER_V72 */','/* MUSIC_MIN_HEADER_V72 */\n/* MUSIC_COMPACT_HEADER_V73 */',1)
js_path.write_text(js,encoding='utf-8')
css_path.write_text(css,encoding='utf-8')
print('V73 patch applied')
