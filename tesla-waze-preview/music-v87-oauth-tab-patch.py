from pathlib import Path
p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
old="function connectYoutube(){const auth=window.open(PROD_ORIGIN+'/api/music/google/start','tesla-youtube-auth','popup,width=560,height=760');if(!auth&&$('musicAccount'))$('musicAccount').textContent='Povoľte v prehliadači otvorenie novej karty pre prihlásenie'}/* MUSIC_CONNECT_DIRECT_OAUTH_V86 */"
new="function connectYoutube(){const auth=window.open(PROD_ORIGIN+'/api/music/google/start','_blank');if(!auth&&$('musicAccount'))$('musicAccount').textContent='Povoľte v prehliadači otvorenie novej karty pre prihlásenie'}/* MUSIC_CONNECT_OAUTH_TAB_V87 */"
if s.count(old)!=1:
    raise SystemExit(f'expected one V86 connectYoutube, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
