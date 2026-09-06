from pathlib import Path
p=Path('tesla-waze-preview/app.css')
s=p.read_text(encoding='utf-8')
marker='/* TESLA_TRIP_HEIGHT_190_V50 */'
if marker in s:
    raise SystemExit(0)
s += '\n'+marker+'\n.tesla-trip{height:190px!important;}\n'
p.write_text(s,encoding='utf-8')
