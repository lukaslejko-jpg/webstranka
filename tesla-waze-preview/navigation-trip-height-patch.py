from pathlib import Path

p = Path('tesla-waze-preview/app.css')
s = p.read_text(encoding='utf-8')
marker = '/* TESLA_TRIP_HEIGHT_V48 */'
if marker in s:
    print('TESLA_TRIP_HEIGHT_V48 already applied')
    raise SystemExit(0)

css = r'''

/* TESLA_TRIP_HEIGHT_V48 */
body.tesla-navigating .tesla-trip{
  height:170px;
  display:flex;
  flex-direction:column;
}
body.tesla-navigating .tesla-trip-stats{
  flex:1 1 auto;
  align-items:center;
  padding-top:22px;
  padding-bottom:16px;
}
body.tesla-navigating .tesla-progress{
  flex:0 0 auto;
}
body.tesla-navigating .tesla-trip-actions{
  flex:0 0 auto;
  margin-top:auto;
}
'''
s += css
p.write_text(s, encoding='utf-8')
print('Applied TESLA_TRIP_HEIGHT_V48')
