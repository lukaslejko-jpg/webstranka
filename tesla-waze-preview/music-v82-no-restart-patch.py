from pathlib import Path
p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
old="saveMusicWindow({minimized:true,maximized:false,height:h});$('musicMaxHome')?.remove();renderMusicList();renderPlayer();updateMiniSeek()"
new="saveMusicWindow({minimized:true,maximized:false,height:h});$('musicMaxHome')?.remove();updateMiniSeek()"
count=s.count(old)
if count!=2:
    raise SystemExit(f'expected 2 minimize handlers, found {count}')
s=s.replace(old,new)
s=s.replace('/* MUSIC_MINIMIZED_RESTORE_V81 */','/* MUSIC_MINIMIZED_RESTORE_V81 */\n/* MUSIC_NO_RESTART_ON_MINIMIZE_V82 */',1)
p.write_text(s,encoding='utf-8')
