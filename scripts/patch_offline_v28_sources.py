from pathlib import Path

p = Path('tesla-music-v7-preview/offline-v20.js')
s = p.read_text()

# Version bump.
s = s.replace("if(window.__TESLA_OFFLINE_V26__)return;window.__TESLA_OFFLINE_V26__=true;", "if(window.__TESLA_OFFLINE_V28__)return;window.__TESLA_OFFLINE_V28__=true;", 1)

# Openverse: use all query variants and a wider result page.
s = s.replace("for(const q of queryVariants(title,artist).slice(0,3)){let j;try{j=await fetchJson(`https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&page_size=30`)", "for(const q of queryVariants(title,artist).slice(0,4)){let j;try{j=await fetchJson(`https://api.openverse.org/v1/audio/?q=${encodeURIComponent(q)}&page_size=80`)", 1)

# Add fetchText helper for RSS/XML catalogues.
anchor = "async function fetchJson(url,timeout=REQUEST_TIMEOUT){const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',signal:c.signal,mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(tm)}}"
insert = anchor + "\nasync function fetchText(url,timeout=REQUEST_TIMEOUT){const c=new AbortController(),tm=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(url,{cache:'no-store',signal:c.signal,mode:'cors'});if(!r.ok)throw new Error('HTTP '+r.status);return await r.text()}finally{clearTimeout(tm)}}"
if anchor not in s:
    raise SystemExit('fetchJson anchor not found')
s = s.replace(anchor, insert, 1)

# Strengthen Internet Archive with Netlabels/Open Source Audio first.
old = "const queries=[[`title:(\\\"${escQ(title)}\\\")`,artist?`creator:(\\\"${escQ(artist)}\\\")`:'','mediatype:(audio)'].filter(Boolean).join(' AND '),[`title:(\\\"${escQ(title)}\\\")`,'mediatype:(audio)'].join(' AND ')];"
new = "const queries=[[`title:(\\\"${escQ(title)}\\\")`,artist?`creator:(\\\"${escQ(artist)}\\\")`:'','mediatype:(audio)','collection:(netlabels)'].filter(Boolean).join(' AND '),[`title:(\\\"${escQ(title)}\\\")`,'mediatype:(audio)','collection:(opensource_audio)'].join(' AND '),[`title:(\\\"${escQ(title)}\\\")`,artist?`creator:(\\\"${escQ(artist)}\\\")`:'','mediatype:(audio)'].filter(Boolean).join(' AND '),[`title:(\\\"${escQ(title)}\\\")`,'mediatype:(audio)'].join(' AND ')];"
if old not in s:
    raise SystemExit('archive queries anchor not found')
s = s.replace(old, new, 1)

# Add ccMixter connector using its public RSS pool API; only full enclosure URLs with a CC license pass.
anchor2 = "async function findJamendo(title,artist){"
cc = r'''function xmlChildText(el,local){for(const n of el?.children||[])if(String(n.localName||'').toLowerCase()===local)return String(n.textContent||'').trim();return''}
function xmlLicense(el){for(const n of el?.getElementsByTagName('*')||[]){if(String(n.localName||'').toLowerCase()!=='license')continue;for(const a of n.attributes||[]){if(/resource|href/i.test(a.name)&&a.value)return String(a.value)}const t=String(n.textContent||'').trim();if(t)return t}return''}
async function findCcMixter(title,artist){const out=[];try{for(const q of queryVariants(title,artist).slice(0,4)){let text;try{text=await fetchText(`https://ccmixter.org/api/pool/search?query=${encodeURIComponent(q)}&type=all&limit=20`,10000)}catch{continue}let doc;try{doc=new DOMParser().parseFromString(text,'application/xml')}catch{continue}for(const it of [...doc.getElementsByTagName('item')]){const ct=String(it.getElementsByTagName('title')?.[0]?.textContent||'').trim(),creator=xmlChildText(it,'creator'),enc=it.getElementsByTagName('enclosure')?.[0],url=String(enc?.getAttribute('url')||''),mime=String(enc?.getAttribute('type')||''),lic=xmlLicense(it),page=String(it.getElementsByTagName('link')?.[0]?.textContent||'').trim();if(!ct||!url||(!mime.startsWith('audio/')&&!isAudioName(url))||!allowedLicense(lic)||badName(ct)||!versionOk(title,ct))continue;const score=candidateScore(title,artist,ct,creator);if(score<.62)continue;out.push({kind:'cm',title:ct,artist:creator||artist,audioUrl:url,license:lic,source:'ccMixter',sourcePage:page,score})}if(out.some(x=>x.score>=.93))break}}catch{}return out.sort((a,b)=>b.score-a.score).slice(0,5)}

'''
if anchor2 not in s:
    raise SystemExit('Jamendo anchor not found')
s = s.replace(anchor2, cc + anchor2, 1)

# Include ccMixter in candidate resolution and scoring.
old3 = "Promise.allSettled([findJamendo(qt,qa),findOpenverse(qt,qa),findArchive(qt,qa),findCommons(qt,qa)])"
new3 = "Promise.allSettled([findJamendo(qt,qa),findCcMixter(qt,qa),findOpenverse(qt,qa),findArchive(qt,qa),findCommons(qt,qa)])"
if old3 not in s:
    raise SystemExit('resolver batches anchor not found')
s = s.replace(old3, new3, 1)
s = s.replace("const bonus={jm:.03,ov:.02,wm:.01,ia:0};", "const bonus={jm:.03,cm:.025,ov:.02,wm:.01,ia:0};", 1)

p.write_text(s)

# Update single source of truth.
d = Path('docs/TESLA_MUSIC_MOBILE_SINGLE_SOURCE_OF_TRUTH.md')
text = d.read_text()
section = '''\n\n## 8. Offline V28 – maximalizácia bezplatných zdrojov\n\nResolver bol rozšírený bez platených služieb a bez závislosti od Synology/Supabase queue. Aktívne zdroje sú:\n\n- Jamendo – iba výsledky s explicitne povoleným downloadom a CC licenciou,\n- ccMixter – verejné RSS/Pool API, iba plné audio enclosure s Creative Commons licenciou,\n- Openverse Audio – širšie vyhľadávanie cez všetky query varianty a väčší počet kandidátov,\n- Internet Archive – prioritne Netlabels a Open Source Audio, potom všeobecné audio,\n- Wikimedia Commons – exact fallback + fulltext fallback,\n- MusicBrainz – iba identifikácia/metadáta, nie zdroj audio súboru.\n\nFree Music Archive sa nepripája priamo: verejné API bolo ukončené a FMA nepovoľuje hotlinking bez osobitného súhlasu. Freesound sa nepripája ako automatický full-download zdroj: originálny download cez API vyžaduje OAuth používateľa; preview súbory sa v Tesla Music nepovažujú za plnohodnotný offline zdroj.\n\nPravidlo ostáva nezmenené: kandidát sa uloží do IndexedDB iPhonu iba po úspešnom Rights Gate a po stiahnutí reálneho audio súboru väčšieho než minimálny limit.\n'''
if '## 8. Offline V28' not in text:
    text += section
d.write_text(text)
