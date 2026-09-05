from pathlib import Path

path=Path('tesla-waze-preview/app.js')
s=path.read_text(encoding='utf-8')
marker='/* MOBILE_NATIVE_GPS_V12 */'
if marker not in s:
    anchor="'use strict';\n"
    patch="""'use strict';\n/* MOBILE_NATIVE_GPS_V12 */\n(function restoreNativeGeolocationForDirectBrowser(){\n  try{\n    if(window.top!==window.self)return;\n    const own=Object.getOwnPropertyDescriptor(navigator,'geolocation');\n    if(own&&own.configurable)delete navigator.geolocation;\n  }catch(e){console.warn('Native mobile geolocation restore failed:',e?.message||e)}\n})();\n"""
    if anchor not in s:
        raise SystemExit('use strict anchor not found')
    s=s.replace(anchor,patch,1)

if marker not in s:
    raise SystemExit('MOBILE_NATIVE_GPS_V12 marker missing after patch')
path.write_text(s,encoding='utf-8')
