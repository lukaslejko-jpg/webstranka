from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
if 'MUSIC_DIRECT_MINIMIZE_V78' in s:
    raise SystemExit('V78 already applied')
old1="$('musicCompactMin').onclick=()=>{saveMusicWindow({minimized:false,maximized:false});updateMiniSeek()};"
new1="$('musicCompactMin').onclick=()=>{const cfg=musicWindowState();const h=Math.max(360,Math.min(window.innerHeight-20,cfg.miniHeight||520));saveMusicWindow({minimized:false,maximized:false,height:h});$('musicMaxHome')?.remove();renderMusicList();renderPlayer();updateMiniSeek()};"
if old1 not in s: raise SystemExit('compact handler anchor not found')
s=s.replace(old1,new1,1)
old2="min.onclick=()=>{saveMusicWindow({minimized:false,maximized:false});updateMiniSeek()};/* MUSIC_LAYOUT_NO_RESTART_V5 */"
new2="min.onclick=()=>{const cfg=musicWindowState();const h=Math.max(360,Math.min(window.innerHeight-20,cfg.miniHeight||520));saveMusicWindow({minimized:false,maximized:false,height:h});$('musicMaxHome')?.remove();renderMusicList();renderPlayer();updateMiniSeek()};/* MUSIC_LAYOUT_NO_RESTART_V5 */\n/* MUSIC_DIRECT_MINIMIZE_V78 */"
if old2 not in s: raise SystemExit('main minimize anchor not found')
s=s.replace(old2,new2,1)
p.write_text(s,encoding='utf-8')
print('V78 patch applied')
