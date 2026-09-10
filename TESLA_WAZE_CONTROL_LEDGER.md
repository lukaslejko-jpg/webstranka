# Tesla Waze – CONTROL LEDGER / ZÁSAHOVÝ REGISTER

**Dátum založenia:** 2026-09-10
**Účel:** Trvalý zdroj pravdy pre všetky ďalšie zásahy do Tesla Waze / Tesla Music. Tento súbor je uložený na samostatnej dokumentačnej vetve `tesla-waze-control-ledger-20260910`, aby ho rollback produkčného runtime nezmazal.

## Povinné pravidlá pred každým ďalším zásahom

1. Najprv načítať tento register.
2. Overiť aktuálny HEAD dotknutej vetvy.
3. Identifikovať posledný fyzicky potvrdený funkčný stav používateľom.
4. Vytvoriť novú backup vetvu ešte pred zápisom.
5. Meniť iba jeden subsystém naraz.
6. Po zápise spraviť `compare_commits` proti backup vetve.
7. Ak diff obsahuje iný subsystém než plánovaný zásah, zmenu okamžite odmietnuť/rollbacknúť.
8. Po fyzickom teste používateľom zapísať výsledok sem ako `FUNGŠUJE`, `NEFUNGUJE`, `NEOVERENÉ` alebo `ROLLBACK`.
9. Nikdy neprepisovať funkčný mapový, hlasový alebo hudobný stav „navrch“ bez samostatného návratového bodu.
10. Zásah do Tesla Waze mapy nesmie byť súčasťou opravy hudby. Zásah do hudby nesmie byť súčasťou opravy mapy.

---

# A. PRODUKČNÉ PROJEKTY

## Tesla Waze
- Produkcia: `https://tesla-waze.vercel.app/`
- Vercel project ID: `prj_P6y4zgYs9VVXgv9Go6Z7q6Z2t3sE`
- Vercel project: `tesla-waze`
- Produkčný shell: `/shell-v144.js`
- Mapový iframe: `/tesla-waze-preview/live3.html`
- Vercel projekt nie je GitHub auto-deploy; je to samostatný bundle uploadnutý cez Vercel/CLI/API.

## Tesla Music
- Produkcia: `https://tesla-waze-piped.vercel.app/`
- Vercel project ID: `prj_3UUsvRZV5rzNI7Qdkt4LzBYWEPwe`
- Projekt: `tesla-waze-piped`
- Hudobný iframe: `/embed.html?map=1&embed=1&v=17`
- Ani Tesla Music nie je GitHub auto-deploy; GitHub commit sám o sebe nemení produkčný Vercel bundle.

## Izolovaný Tesla backend
- Produkcia: `https://europrojekty-app.vercel.app/`
- Search: `/api/tesla/search`
- Route: `/api/tesla/route`
- TTS: `/api/tesla/tts`

---

# B. POSLEDNÝ FYZICKY POTVRDENÝ FUNKČNÝ TESLA WAZE STAV

## Runtime commit
- `6c67918821a6c1c29bb7a790c9608054463d34c9`

Používateľ fyzicky potvrdil v tomto stave:
- mapa sa zobrazovala,
- vyhľadávanie fungovalo,
- routing fungoval,
- modrá trasa fungovala,
- hlas navigácie fungoval cez serverový TTS.

Tento commit je hlavný runtime rollback bod pre Waze, kým používateľ nepotvrdí novší kompletný stav.

## Funkčný hlas
- TTS endpoint: `https://europrojekty-app.vercel.app/api/tesla/tts`
- backend TTS commit: `3fc3839a9fe31e7fd101bbbc6a1c01b275534b32`
- diagnostický commit: `2ff369e87aabbbab80b1da6a75b3421db21102b7`
- overený test: HTTP 200, `audio/mpeg`, 22 080 B pre „O 300 metrov odbočte doprava.“
- klientský Waze commit: `6c67918821a6c1c29bb7a790c9608054463d34c9`
- stav: **FUNGŠUJE – fyzicky potvrdené používateľom**

## Chránený mapový baseline
- vetva: `tesla-waze-map-baseline-20260910-v154`
- commit: `37aafdd59eaf1a4d6486291ef1be29b5af8b946f`
- stav: **NEPOHYBOVAŤ / NEMENIŤ**

---

# C. DÔLEŽITÉ MAPOVÉ ZÁSAHY

## V155 – passive tile prefetch
- súbor: `tesla-waze-preview/media-session-v112.js`
- commit: `b42a7fbd0f39ea08ece722e6cf0874c9d32b7f69`
- backup: `tesla-waze-backup-before-buffer-v155-20260910`
- stav: nasadené v historickej vetve, fyzická účinnosť nebola samostatne potvrdená.

## V156 – zoom hysteresis
- súbor: `tesla-waze-preview/live3.html`
- commit: `dbd8ccd367a5deafb827fa313af8d15d8f2f807c`
- backup: `tesla-waze-backup-before-zoom-hysteresis-v156-20260910`
- stav: nasadené, samostatne fyzicky neoverené.

## V157 – keepBuffer 3 → 5
- commit: `3a3e9551338087f7771120c6e7ca3ac0fa87b80e`
- backup: `tesla-waze-backup-before-keepbuffer-v157-20260910`
- stav: súčasť neskoršieho funkčného Waze stavu.

## V158 – reroute bez okamžitého zmazania starej trasy
- commit: `f8858a8ff020e4ba2ecf2b4135d888dc6a1a6ac1`
- backup: `tesla-waze-backup-before-reroute-swap-v158-20260910`
- stav: samostatne neoverené.

## V159 – forward tile prefetch
- commit: `dfbb83d8db973e47dbf26a0977d4387ef4fdeba8`
- backup: `tesla-waze-backup-before-forward-prefetch-v159-20260910`
- stav: helper chain neskôr spôsobil riziko kvôli relatívnym 404; nezapínať celý chain naslepo.

## V160/V161 – transition/manual zoom helpery
- V160 commit: `9b13a73923e009e5e336654d4fe5bae9a09847fa`
- V161 commit: `630f80073a1efa550a885981ad27382085296af9`
- stav: NEPONOVOVAŤ automaticky; relatívne helper loading v produkčnom wrapperi je rizikový.

## Zakázaná regresia V152
- commit: `bf70c0b8ad73b42fcdc696ce3992e1a005105e93`
- dôsledok: fyzicky spôsoboval katastrofické rozbitie/rozblikanie otočených tiles.
- nikdy nezapínať `zoomAnimation:true`, `fadeAnimation:true`, `markerZoomAnimation:true` bez úplne nového testu mimo produkcie.

---

# D. HLAS – ZÁZNAM POKUSOV

## Browser SpeechSynthesis
- stav: **NEPOUŽÍVAŤ ako primárny hlas v Tesle**.
- dôvod: opakovane nevydával spoľahlivý zvuk.

## Pôvodný `/api/tts`
- `https://tesla-waze.vercel.app/api/tts`
- stav: **NEFUNGUJE – 404**.

## Serverový MP3 TTS
- `https://europrojekty-app.vercel.app/api/tesla/tts`
- stav: **FUNGŠUJE – fyzicky potvrdené**.
- nesmie sa nahradiť browser SpeechSynthesis experimentom bez výslovného dôvodu.

---

# E. HUDOBNÝ SUBSYSTÉM – AKTUÁLNE PROBLÉMY

Používateľ fyzicky hlási 3 samostatné chyby:

1. Natívny Tesla panel zobrazuje skladbu, ale `Späť / Ďalšia` sú sivé/neaktívne.
2. Pri prechode medzi skladbami Tesla na približne sekundu pustí rádio.
3. Po otvorení hudobného okna `Play` nespustí skladbu; až `Ďalšia` vyberie skladbu a prehrávanie začne.

Tieto tri chyby sa musia riešiť **samostatne, po jednej**.

---

# F. DIAGNÓZA HUDOBY

## Aktuálny produkčný hudobný kód
- produkčný `app-v7.js` obsahuje `playTrack`, `next`, `prev`, `toggle`, MediaSession handlery.
- `mode-v9.js` obsahuje V17 playback context a bridge správ do parentu.

## Problém Play po otvorení
- `current=null` po čerstvom otvorení iframe.
- `toggle()` iba volá `player.playVideo()`/`pauseVideo()`.
- keď nie je `current`, nie je načítaná skladba.
- `next()` vyberie skladbu z queue a cez `playTrack()` ju načíta, preto funguje.

### Pripravený fix
- branch: `tesla-music-v6-preview`
- backup: `tesla-music-backup-before-play-fix-v18-20260910`
- commit: `f5607fafc26f5fd0ca6cbf88e4dc87fe6742c373`
- súbor: `tesla-music-v7-preview/mode-v9.js`
- diff: iba tento súbor, +20/-1
- stav: **PRIPRAVENÉ V GITHUBE, ALE NIE JE NASADENÉ NA PRODUKČNÝ VERCEL BUNDLE**.

Tento fix sa nesmie považovať za produkčný ani funkčný, kým sa samostatne nedeployne a používateľ ho fyzicky nepotvrdí.

## Problém rádio pri Next/Prev
- `media()` v hudobnom playeri nastavuje `playbackState='paused'` pri každom stave, ktorý nie je `PLAYING`.
- pri prechode YouTube player ide cez `BUFFERING / UNSTARTED / CUED`.
- Tesla môže počas tejto medzery vrátiť audio focus rádiu.
- oprava ešte **NENASADENÁ**.

## Natívne Tesla Späť/Ďalšia
- iframe MediaSession handlery existujú.
- top-level produkčný `shell-v144.js` ich nemá.
- `shell-v144.js` patrí do samostatného Vercel bundle projektu `tesla-waze`, nie do prehľadateľného GitHub zdroja.
- oprava ešte **NENASADENÁ**.
- nesmie sa riešiť znovu cez `media-session-v112.js` v mapovom iframe, kým sa nepreukáže, že Tesla prijíma MediaSession z iframe; predchádzajúci pokus V168 spôsobil regresiu načítania a bol rollbacknutý.

---

# G. ZLYHANÉ / ROLLBACKNUTÉ ZÁSAHY

## V168 – pokus o top-level/native MediaSession cez mapový iframe
- backup: `tesla-waze-backup-before-native-media-v168-20260910`
- commit: `08f64f18535e0e6fadfe9d1663b46d88526314eb`
- zmenený súbor: `tesla-waze-preview/media-session-v112.js`
- dôsledok: po zásahu sa v Tesle aplikácia prestala korektne načítavať / mapa bola čierna a browser sa vracal na domovskú obrazovku.
- stav: **ROLLBACK**.
- tento commit NEPOUŽÍVAŤ a NEOBNOVOVAŤ.

## Rollback po V168
- aktívna Waze vetva bola vrátená na posledný fyzicky potvrdený runtime commit:
  `6c67918821a6c1c29bb7a790c9608054463d34c9`
- Vercel root, `shell-v144.js` a `live3.html` serverovo vracali HTTP 200.

---

# H. OCHRANA PRED ZNIČENÍM FUNKČNÉHO STAVU

## Subsystémové zámky

### MAP LOCK
Ak úloha znie hudba / MediaSession / rádio / Play / Next / Prev:
- nemeniť `app.js.gz.b64`, map camera, Leaflet, GPS, routing ani tile helpery.
- nemeniť `live3.html` mapové runtime patchy.

### VOICE LOCK
Ak úloha nesúvisí s hlasom:
- nemeníť TTS endpoint `https://europrojekty-app.vercel.app/api/tesla/tts`.
- nemeníť voice dedup.

### MUSIC LOCK
Ak úloha nesúvisí s hudbou:
- nemeníť `tesla-music-v7-preview/mode-v9.js`, `app-v7.js`, `embed.html` ani Tesla Music Vercel bundle.

### VERCEL BUNDLE LOCK
Pred zásahom do `tesla-waze` alebo `tesla-waze-piped` produkcie najprv zistiť presný deployment bundle a vytvoriť rollback bod. GitHub commit neznamená automatický Vercel deployment.

---

# I. POVINNÝ FORMÁT NOVÉHO ZÁZNAMU

Po každom zásahu pridať nový blok:

```text
## YYYY-MM-DD HH:MM – názov zásahu
Subsystém: MAP / VOICE / MUSIC / SHELL / BACKEND
Dôvod:
Backup vetva:
Base commit:
Zmenený projekt:
Zmenená vetva:
Zmenený súbor/súbory:
Nový commit:
Vercel deployment:
Diff:
Serverový test:
Fyzický Tesla test:
Stav: FUNGŠUJE / NEFUNGUJE / NEOVERENÉ / ROLLBACK
Poznámka: čo sa nesmie pri ďalšom zásahu prepísať
```

---

# J. AKTUÁLNY ĎALŠÍ POSTUP

1. **NEDOTÝKAŤ SA MAPY.**
2. Bezpečne dostať pripravený Tesla Music Play fix `f5607faf...` do samostatného produkčného `tesla-waze-piped` bundle.
3. Fyzicky otestovať iba `Play` po otvorení hudby.
4. Ak funguje, označiť v tomto registri ako `FUNGŠUJE`.
5. Potom samostatná záloha a oprava audio-focus/radio medzery pri Next/Prev.
6. Až po jej fyzickom potvrdení riešiť top-level Tesla MediaSession v `shell-v144.js`.
7. Natívne Tesla Späť/Ďalšia riešiť ako posledný samostatný zásah do shell bundle, nie cez mapový helper chain.

**Tento register je nadradený improvizovaným spomienkam z chatu. Pri ďalšej práci ho načítať ako prvý.**
