from pathlib import Path

p=Path('tesla-waze-preview/app.js')
s=p.read_text(encoding='utf-8')
marker='/* MUSIC_DISPLAY_LATIN_FILTER_V56 */'
if marker in s:
    print('already applied')
    raise SystemExit(0)
old="""function musicDisplayText(v,fallback=''){
  let x=String(v??'');
  x=x.replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\ue000-\\uf8ff\\ufffd]/g,'');
  try{x=x.replace(/[\\p{Extended_Pictographic}\\p{Emoji_Presentation}]/gu,'')}catch{}
  x=x.replace(/[□■▪▫◻◼◽◾▢▣▤▥▦▧▨▩]+/g,'');
  x=x.replace(/\\s+/g,' ').trim();
  return x||fallback;
}"""
new="""function musicDisplayText(v,fallback=''){
  let x=String(v??'').normalize('NFC');
  x=x.replace(/[\\u0000-\\u001f\\u007f-\\u009f\\u200b-\\u200f\\u202a-\\u202e\\u2060-\\u206f\\ue000-\\uf8ff\\ufffd]/g,'');
  // Tesla browser font shows several valid Unicode glyphs as square boxes. For music metadata
  // keep Latin text (incl. SK/CZ diacritics), digits and common punctuation only.
  x=x.replace(/[^A-Za-z0-9\\u00C0-\\u024F\\u1E00-\\u1EFF À-ž'’`´.,:;!?()\\[\\]{}+&@#%°/_\\-–—\\s]/g,' ');
  x=x.replace(/[□■▪▫◻◼◽◾▢▣▤▥▦▧▨▩]+/g,' ');
  x=x.replace(/\\s+/g,' ').replace(/^[·•|\\-–—\\s]+|[·•|\\-–—\\s]+$/g,'').trim();
  return x||fallback;
}"""
if old not in s:
    raise SystemExit('musicDisplayText V55 anchor missing')
s=s.replace(old,new,1)
s+='\n'+marker+'\n'
p.write_text(s,encoding='utf-8')
print('Applied MUSIC_DISPLAY_LATIN_FILTER_V56')
