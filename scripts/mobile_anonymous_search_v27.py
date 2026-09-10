from pathlib import Path

p = Path('tesla-music-v7-preview/app-v7.js')
s = p.read_text()
old = 'https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twyoutubesearch?q='
new = '/api/youtube-search?q='
count = s.count(old)
if count < 2:
    raise SystemExit(f'expected at least 2 legacy search URLs, found {count}')
s = s.replace(old, new)
marker = "const PK='teslaMusic:brain:v1'"
if "const SEARCH_API='/api/youtube-search?q=';" not in s:
    s = s.replace(marker, "const SEARCH_API='/api/youtube-search?q=';\n" + marker, 1)
s = s.replace("fetch('/api/youtube-search?q='+encodeURIComponent(q)", "fetch(SEARCH_API+encodeURIComponent(q)")
p.write_text(s)
