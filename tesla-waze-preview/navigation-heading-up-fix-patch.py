from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* NAV_HEADING_UP_FIX_V18 */'
if marker in s:
    raise SystemExit(0)

old = "state.map.setHeading(state.heading,{ease:0,deadzone:0});"
new = "state.map.setHeading(state.heading,{ease:1,deadzone:0});" + marker
if old not in s:
    raise SystemExit('heading-up ease anchor missing')
s = s.replace(old, new, 1)

p.write_text(s, encoding='utf-8')
