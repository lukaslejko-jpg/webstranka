from pathlib import Path

p=Path('tesla-waze-preview/app.css')
s=p.read_text(encoding='utf-8')
marker='/* TESLA_NAV_FINAL_COMPACT_V51 */'
if marker not in s:
    s += r'''

/* TESLA_NAV_FINAL_COMPACT_V51 */
/* Nothing from the active-navigation HUD may appear before navigation starts. */
body:not(.tesla-navigating) #teslaTripCard,
body:not(.tesla-navigating) #teslaNavManeuver,
body:not(.tesla-navigating) #alertBox{
  display:none!important;
  visibility:hidden!important;
}
@media (min-width:701px){
  body.tesla-navigating #teslaTripCard:not(.hidden){
    height:180px!important;
    min-height:180px!important;
    max-height:180px!important;
  }
}
'''
else:
    s=s.replace('height:185px!important;\n    min-height:185px!important;\n    max-height:185px!important;', 'height:180px!important;\n    min-height:180px!important;\n    max-height:180px!important;')
p.write_text(s,encoding='utf-8')
