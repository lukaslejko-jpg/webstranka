from pathlib import Path
js=Path('tesla-waze-preview/app.js')
css=Path('tesla-waze-preview/app.css')
s=js.read_text(encoding='utf-8')
old_html='''    head.innerHTML='<div class="music-compact-top"><div class="music-compact-brand"><span class="music-compact-icon">♫</span><div><b>Smart Music</b><small id="musicCompactStatus">Hudba</small></div></div><button id="musicCompactSync" type="button" class="btn primary">Prepojiť / synchronizovať YouTube</button></div><div class="music-compact-actions"><button id="musicCompactMax" type="button" class="btn">Maximalizovať</button><button id="musicCompactMin" type="button" class="btn">Minimalizovať</button><button id="musicCompactBack" type="button" class="btn">Späť na plochu</button></div>';'''
new_html='''    head.innerHTML='<div class="music-compact-top"><div class="music-compact-brand"><span class="music-compact-icon">♫</span><div><b>Smart Music</b><small id="musicCompactStatus">Hudba</small></div></div><button id="musicCompactSync" type="button" class="btn primary">Prepojiť / synchronizovať YouTube</button></div><div id="musicCompactAccount" class="music-compact-account">YouTube nepripojený</div><div class="music-compact-actions"><button id="musicCompactMax" type="button" class="btn">Maximalizovať</button><button id="musicCompactMin" type="button" class="btn">Minimalizovať</button><button id="musicCompactBack" type="button" class="btn">Späť na plochu</button></div>';'''
if s.count(old_html)!=1: raise SystemExit('compact header target not found exactly once')
s=s.replace(old_html,new_html,1)
old_sync="""  const st=$('musicCompactStatus'),src=$('musicStatus');if(st)st.textContent=src?.textContent||'Smart Music';
  const min=$('musicCompactMin');if(min)min.textContent='Minimalizovať';"""
new_sync="""  const st=$('musicCompactStatus'),src=$('musicStatus');if(st)st.textContent=src?.textContent||'Smart Music';
  const acct=$('musicCompactAccount'),y=music?.profile?.youtube||{};if(acct)acct.textContent=y.connected&&y.email?`${y.email} · synchronizované`:'YouTube nepripojený';
  const min=$('musicCompactMin');if(min)min.textContent='Minimalizovať';"""
if s.count(old_sync)!=1: raise SystemExit('compact sync target not found exactly once')
s=s.replace(old_sync,new_sync,1)
old_status="function renderMusicStatus(){const n=Object.values(music.profile.tracks).filter(isEligibleMusic).length,y=music.profile.youtube;$('musicStatus').textContent=`${n} naučených skladieb`;$('musicAccount').textContent=y.connected?`${y.email||'lukaslejko@gmail.com'} · synchronizované`:'lukaslejko@gmail.com · YouTube nepripojený';$('musicMiniStatus').textContent=$('musicAccount').textContent}"
new_status="function renderMusicStatus(){const n=Object.values(music.profile.tracks).filter(isEligibleMusic).length,y=music.profile.youtube;$('musicStatus').textContent=`${n} naučených skladieb`;$('musicAccount').textContent=y.connected?`${y.email||''} · synchronizované`:'YouTube nepripojený';$('musicMiniStatus').textContent=$('musicAccount').textContent;syncMusicCompactHeader()}/* MUSIC_ACCOUNT_LINE_V88 */"
if s.count(old_status)!=1: raise SystemExit('renderMusicStatus target not found exactly once')
s=s.replace(old_status,new_status,1)
js.write_text(s,encoding='utf-8')
c=css.read_text(encoding='utf-8')
marker='/* MUSIC_ACCOUNT_LINE_V88 */'
if marker not in c:
    c += '\n'+marker+'\n.music-compact-account{width:100%;box-sizing:border-box;padding:0 4px 2px;font-size:11px;line-height:15px;font-weight:400;opacity:.62;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n'
css.write_text(c,encoding='utf-8')
