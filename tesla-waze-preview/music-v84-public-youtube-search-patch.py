from pathlib import Path
p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
old="async function searchYoutube(q){const r=await fetch(PROD_ORIGIN+'/api/music/youtube/search?q='+encodeURIComponent(q),{cache:'no-store',credentials:'include'});if(r.status===401)return [];if(!r.ok)throw new Error('youtube search '+r.status);const d=await r.json();return Array.isArray(d.items)?d.items:[]}"
new="async function searchYoutube(q){const r=await fetch('https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twyoutubesearch?q='+encodeURIComponent(q),{cache:'no-store'});if(!r.ok)throw new Error('youtube search '+r.status);const d=await r.json();return Array.isArray(d.items)?d.items:[]}/* MUSIC_PUBLIC_YOUTUBE_SEARCH_V84 */"
if s.count(old)!=1:
    raise SystemExit(f'expected one searchYoutube implementation, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
