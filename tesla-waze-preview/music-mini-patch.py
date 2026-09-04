from pathlib import Path

js_path=Path('tesla-waze-preview/app.js')
css_path=Path('tesla-waze-preview/app.css')
js=js_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')

if '/* MUSIC_MINI_QUEUE_V1 */' not in js:
    raise SystemExit('MUSIC_MINI_QUEUE_V1 missing from app.js')
if '/* MUSIC_MINI_QUEUE_V1 */' not in css:
    raise SystemExit('MUSIC_MINI_QUEUE_V1 missing from app.css')

old="saveMusicWindow({width:Math.round(shell.getBoundingClientRect().width),height:Math.round(shell.getBoundingClientRect().height),minimized:false})"
new="saveMusicWindow({width:Math.round(shell.getBoundingClientRect().width),height:Math.round(shell.getBoundingClientRect().height),minimized:musicWindowState().minimized})"

if old in js:
    js=js.replace(old,new,1)
elif new not in js:
    raise SystemExit('music resize anchor not found')

# Verify the minimized UI still contains seek + queue code and that navigation marker survives.
for needle in ['musicMiniSeek','music-mini-queue','TMY_VIEWPORT_V1']:
    if needle not in js and needle not in css:
        raise SystemExit(f'missing required marker: {needle}')

js_path.write_text(js,encoding='utf-8')
