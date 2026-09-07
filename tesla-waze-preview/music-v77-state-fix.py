from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')

repls=[
("$('musicCompactMin').onclick=()=>{const cfg=musicWindowState();saveMusicWindow({minimized:!cfg.minimized,maximized:false});updateMiniSeek()};",
 "$('musicCompactMin').onclick=()=>{saveMusicWindow({minimized:false,maximized:false});updateMiniSeek()};"),
("shell.style.height=`${cfg.minimized?miniH:fullH}px`",
 "shell.style.height=`${miniH}px`"),
("shell.classList.toggle('music-minimized',!!cfg.minimized);",
 "shell.classList.remove('music-minimized');"),
("const b=$('musicMinimize');if(b)b.textContent=cfg.minimized?'Rozbaliť':'Minimalizovať';",
 "const b=$('musicMinimize');if(b)b.textContent='Minimalizovať';"),
("min.onclick=()=>{saveMusicWindow({minimized:!musicWindowState().minimized});updateMiniSeek()};",
 "min.onclick=()=>{saveMusicWindow({minimized:false,maximized:false});updateMiniSeek()};")
]
for old,new in repls:
    if old not in s:
        raise SystemExit('anchor not found: '+old[:80])
    s=s.replace(old,new,1)
if 'MUSIC_STATE_V77' not in s:
    s=s.replace('/* MUSIC_COMPACT_HEADER_V76 */','/* MUSIC_COMPACT_HEADER_V76 */\n/* MUSIC_STATE_V77 */',1)
p.write_text(s,encoding='utf-8')
print('V77 state fix applied')
