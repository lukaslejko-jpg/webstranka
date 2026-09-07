from pathlib import Path
p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
old="shell.classList.remove('music-minimized');shell.classList.toggle('music-maximized',isMax);"
new="shell.classList.toggle('music-minimized',!isMax);shell.classList.toggle('music-maximized',isMax);"
if old not in s:
    raise SystemExit('V81 target not found')
s=s.replace(old,new,1)
marker='/* MUSIC_MINIMIZED_RESTORE_V81 */'
if marker not in s:
    s=s.replace('/* MUSIC_MINI_RESIZE_V4 */',marker+'/* MUSIC_MINI_RESIZE_V4 */',1)
p.write_text(s,encoding='utf-8')
