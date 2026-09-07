from pathlib import Path
p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
old="$ ('musicCompactSync')" # guard unused
needle="$('musicCompactSync').onclick=()=>syncYoutube();"
repl="$('musicCompactSync').onclick=()=>connectYoutube();/* MUSIC_COMPACT_SYNC_V87 */"
if s.count(needle)!=1:
    raise SystemExit(f'expected one compact sync handler, found {s.count(needle)}')
s=s.replace(needle,repl,1)
p.write_text(s,encoding='utf-8')
