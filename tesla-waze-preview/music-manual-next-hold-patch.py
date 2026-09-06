from pathlib import Path

p = Path('tesla-waze-preview/app.js')
s = p.read_text(encoding='utf-8')
marker = '/* MUSIC_MANUAL_NEXT_HOLD_V46 */'
if marker in s:
    print('MUSIC_MANUAL_NEXT_HOLD_V46 already applied')
    raise SystemExit(0)
old = "function mnext(){\n  const q=ensureMusicQueue();if(!q.length)return false;"
new = "function mnext(){\n  /* MUSIC_MANUAL_NEXT_HOLD_V46 */\n  music.userPaused=false;music.wantsPlayback=true;setMusicPlaying(true);\n  const q=ensureMusicQueue();if(!q.length)return false;"
if old not in s:
    raise SystemExit('mnext anchor not found')
s = s.replace(old, new, 1)
p.write_text(s, encoding='utf-8')
print('Applied MUSIC_MANUAL_NEXT_HOLD_V46')
