from pathlib import Path
p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
old="function connectYoutube(){const u=PROD_ORIGIN+'/api/music/google/start',auth=window.open(u,'tesla-youtube-auth','popup,width=560,height=760');if(!auth){if($('musicAccount'))$('musicAccount').textContent='Povoľte v prehliadači vyskakovacie okno pre prihlásenie';return}if($('musicAccount'))$('musicAccount').textContent='Dokončite prihlásenie v otvorenom okne'}/* MUSIC_CONNECT_BUTTON_V86 */"
new="function connectYoutube(){const u=PROD_ORIGIN+'/api/music/google/start',auth=window.open(u,'_blank');if(!auth){if($('musicAccount'))$('musicAccount').textContent='Povoľte v prehliadači otvorenie novej karty pre prihlásenie';return}if($('musicAccount'))$('musicAccount').textContent='Dokončite prihlásenie v otvorenej karte'}/* MUSIC_CONNECT_OAUTH_TAB_V87 */"
if s.count(old)!=1:
    raise SystemExit(f'expected one V86 connectYoutube, found {s.count(old)}')
s=s.replace(old,new,1)
p.write_text(s,encoding='utf-8')
