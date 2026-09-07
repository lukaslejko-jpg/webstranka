from pathlib import Path
p=Path('tesla-waze-preview/app.css')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_ACCOUNT_VISIBLE_V89 */'
block='''\n/* MUSIC_ACCOUNT_VISIBLE_V89 */\n.music-shell:not(.music-maximized)>.music-compact-head{grid-template-rows:auto 15px auto!important}\n.music-shell:not(.music-maximized) #musicCompactAccount{display:block!important;visibility:visible!important;grid-row:2!important;width:100%!important;height:15px!important;min-height:15px!important;line-height:15px!important;padding:0 2px!important;margin:0!important;color:#91a7b6!important;opacity:.72!important;font-size:10px!important;font-weight:400!important;text-align:right!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}\n.music-shell:not(.music-maximized) .music-compact-actions{grid-row:3!important}\n'''
if marker not in s:s+=block
p.write_text(s,encoding='utf-8')
