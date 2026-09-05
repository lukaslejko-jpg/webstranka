from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* NAV_HEADING_DIRECTION_V19 */'
if marker in s:
    raise SystemExit(0)

old_v18 = "state.map.setHeading(state.heading,{ease:1,deadzone:0});/* NAV_HEADING_UP_FIX_V18 */"
old_base = "state.map.setHeading(state.heading,{ease:0,deadzone:0});"
new = "state.map.setHeading((state.heading+180)%360,{ease:1,deadzone:0});" + marker

if old_v18 in s:
    s = s.replace(old_v18, new, 1)
elif old_base in s:
    s = s.replace(old_base, new, 1)
else:
    raise SystemExit('heading direction anchor missing')

p.write_text(s, encoding='utf-8')
