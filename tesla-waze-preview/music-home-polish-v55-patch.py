from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
MARK='/* MUSIC_HOME_POLISH_V55 */'
if MARK in s:
    raise SystemExit(0)
if '/* MUSIC_YOUTUBE_HOME_V54 */' not in s:
    raise SystemExit('V54 missing')

# 10 quick picks instead of 7.
old=".slice(0,7);\n  const liked="
new=".slice(0,10);\n  const liked="
if old not in s:
    raise SystemExit('quick-pick anchor missing')
s=s.replace(old,new,1)

# Safe display-only cleanup for unsupported metadata characters in Tesla fonts.
anchor="function canPlayInApp(t){return !!(t?.streamUrl||t?.youtubeId||String(t?.id||'').startsWith('youtube:'))}"
addition=r'''
function musicDisplayText(v,fallback=''){
  let x=String(v??'');
  x=x.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ue000-\uf8ff\ufffd]/g,'');
  try{x=x.replace(/[\p{Extended_Pictographic}\p{Emoji_Presentation}]/gu,'')}catch{}
  x=x.replace(/[□■▪▫◻◼◽◾▢▣▤▥▦▧▨▩]+/g,'');
  x=x.replace(/\s+/g,' ').trim();
  return x||fallback;
}
'''
if anchor not in s:
    raise SystemExit('canPlayInApp anchor missing')
s=s.replace(anchor,anchor+addition,1)

repls={
"${esc(t.title||'Bez názvu')}":"${esc(musicDisplayText(t.title,'Bez názvu'))}",
"${esc(t.artist||'')} · ${esc(t.source||'')}":"${esc(musicDisplayText(t.artist))} · ${esc(musicDisplayText(t.source))}",
"${esc(t.title||s.title||'Bez názvu')}</b><small>${esc(t.artist||s.artist||'')}":"${esc(musicDisplayText(t.title||s.title,'Bez názvu'))}</b><small>${esc(musicDisplayText(t.artist||s.artist))}",
"${esc(music.current.title)}":"${esc(musicDisplayText(music.current.title,'Bez názvu'))}",
"${esc(music.current.artist||'')} · ${esc(music.current.source||'')}":"${esc(musicDisplayText(music.current.artist))} · ${esc(musicDisplayText(music.current.source))}"
}
for old,new in repls.items():
    if old in s:
        s=s.replace(old,new)

# Explicitly require home cards to use cleanup.
if 'musicDisplayText(t.title||s.title' not in s or 'musicDisplayText(t.artist||s.artist)' not in s:
    raise SystemExit('home metadata cleanup not applied')

s+='\n'+MARK+'\n'
p.write_text(s,encoding='utf-8')
