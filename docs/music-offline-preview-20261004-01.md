# Music Offline — Preview 01

Release: **MUSIC-OFFLINE-PREVIEW-20261004-01**.

Status: **PREVIEW LIVE — technické a cloudové browser overenie prešlo; čaká na akceptáciu na iPhone**.

## Samostatné nasadenie

- Overená adresa: https://music-offline-307.onrender.com/
- Render Static Site: `srv-db1b0lou01pc73dktjcg` (`music-offline-307`).
- Deployment: `dep-db1b0m8u01pc73dktl10`, stav `live` od `2026-10-04T20:01:00.483622Z`.
- Presný runtime commit: `373b60b41afed3609fbf3412734683b14d702e62`.
- Runtime tree: `42c6c1c1895d625cbe23396e92cd2d43d25c21ab`.
- Zdrojová vetva: `feature/music-offline-preview-20261004`.
- Pevný preview checkpoint po doplnení tohto záznamu: `checkpoint/music-offline-preview-20261004-01`.
- Automatické nasadenie je vypnuté; publikuje sa výhradne `music-offline/public`.

Finálny checkpoint obsahuje aj následnú dokumentáciu a snímku overenia. Táto dokumentačná zmena nemení runtime a nevyvoláva nové nasadenie. Existujúce mobilné ani desktop služby sa nepoužili.

## Rozsah a súhlas

Vlastník 2026-10-04 o 21:38 Europe/Bratislava schválil návrh vytvoriť samostatnú skúšobnú kópiu Kasette a po úspešnom teste ju pripojiť odkazom k Music. Schválenie sa týka nového oddeleného preview. Nie je akceptáciou funkčnosti na iPhone ani pokynom upraviť existujúcu mobilnú/desktop produkciu pred touto skúškou.

Vetva: `feature/music-offline-preview-20261004`, vytvorená presne z `ee547488cb1c51845754529d8bdf2d49fbc0b51c` (Music06).

Upstream: `nico-alvz/kasette@ee170285664f14f7e044fd7d0f683c6d0751f469`, verzia 1.4.0, BSD-3-Clause. Pozri `music-offline/README.md` a priloženú pôvodnú licenciu.

## Zachovaný návratový bod Music06

Pred začiatkom práce boli oba nasledujúce deploymenty cez Render overené ako `live`:

| Aplikácia | Service | Deployment | Runtime commit |
| --- | --- | --- | --- |
| Mobil | `srv-datcj8d9fdbs73b7iv3g` | `dep-db1a50rncjis73bsjqug` | `29fe8492df7c79b0b520ddf2924626ef6c85761c` |
| Desktop | `srv-datc4fo93c1s73a1bchg` | `dep-db1a57egekts73ct9j2g` | `941f4bdd9c148d2c7c470e44d02021cd8b336bc3` |

Pred prípravou aj po dokončení offline preview vrátil na oboch produkčných adresách živý `tesla-app.js?v=20261004-6` HTTP 200 a SHA-256 `d7d76636cf18486c6a0815d967a158764e81b1ea782b5975457262822d80072d`.

Pevné checkpoint vetvy `checkpoint/music-stable-20261004-06` a `checkpoint/music-desktop-stable-20261004-06` zostávajú zachované. Žiadny pôvodný runtime súbor sa v offline úlohe nemení.

## Úpravy pre offline preview

- Celá aplikácia je pod `music-offline/`, s vlastným manifestom, úložiskami, service workerom a verziou.
- Slovenčina, tmavý vzhľad, návod na inštaláciu do iPhonu, stav pripravenosti na offline.
- Kompletný offline shell; pri chýbajúcom súbore sa nesmie hlásiť úspešná pripravenosť.
- Aktualizácia vymaže iba staré cache Music Offline, nie cache iných aplikácií.
- Audio sa ukladá ako skutočné Bloby do IndexedDB. Server neprijíma hudbu, nemá účet ani hudobný backend.
- Opravené indexovanie obnovenej/odstránenej fronty a ochrana pred dokončením staršieho výberu skladby.
- Nasledujúci zdroj sa pripravuje vopred. Prehráva jeden audio element; systémový čas vychádza z jeho skutočného času.

## Overenie

**Automatické overenie: 46 testov prešlo, 0 zlyhalo.** Obsahuje 14 testov prekladov, 18 testov audio metadát, 4 testy offline shellu a 10 regresií prehrávania. Regresie prehrávania používajú simulované DOM/audio/úložisko; testy shellu simulujú nedostupnú sieť. Nejde o fyzické zariadenie.

Validator overil syntax 13 JavaScript súborov, všetkých 19 potrebných offline zdrojov, manifest, licenciu a rovnaké číslo verzie v runtime súboroch. Šesť živých súborov (`index.html`, `app.js`, `sw.js`, `offline.js`, `manifest.json`, `release.json`) bolo stiahnutých cez HTTP 200 so správnymi typmi obsahu a presne sa zhodovalo s testovanými bajtmi.

Lokálne Chromium nemožno spustiť: vykonávacie prostredie odmietlo vytvorenie lokálneho socketu. Z tejto cesty nevznikol žiadny úspešný browser test. Následne bol použitý podporovaný cloudový prehliadač na samostatnom nasadenom preview.

### Skutočný cloudový browser smoke test

- Prvé otvorenie načítalo slovenské rozhranie a dokončilo stav „Pripravené na offline“; tento stav vracia worker až po kontrole kompletnosti svojho shellu.
- Cez skutočný file chooser boli importované tri vlastné vygenerované WAV súbory s dĺžkami 22, 24 a 26 sekúnd. Testovacie audio nie je pribalené k aplikácii ani uložené v serverovej knižnici.
- Prvá skladba sa spustila z lokálneho Blob URL; reálny audio element mal `paused=false`, `muted=false`, dĺžku 22 sekúnd a postupujúci čas.
- Prirodzený koniec skladby 1 automaticky prešiel na skladbu 2 (24 sekúnd); prehrávač zobrazoval symbol Pause.
- Pause zastavil druhú skladbu na 20.648846 sekundy a tlačidlo zobrazilo symbol Play.
- Nastavenie posúvača na 625/1000 pri dĺžke 24 sekúnd zmenilo skutočný `audio.currentTime` na **15.000 s**; UI zobrazilo **0:15**.
- Po reload zostali všetky tri skladby, aktuálna skladba 2 a fronta zachované. Audio sa načítalo z nového Blob URL pozastavené na **15 s**.
- Next po reload prešiel presne zo skladby 2 na skladbu 3; Previous pri začiatku skladby 3 sa vrátil na skladbu 2.
- Vyhľadanie `Test skladba 2` vrátilo príslušnú importovanú skladbu. Prepnutie na Domov, Nastavenia a Knižnicu zostalo na zvolenej sekcii.
- Nastavenia ukázali tri uložené skladby, slovenčinu a lokálne využité úložisko. Knižnica po reload zobrazila všetky tri položky.
- V zaznamenaných logoch nebola chyba ani upozornenie z aplikácie. Hlásenia rozšírenia cloudového prehliadača boli oddelené od chýb aplikácie.
- Snímka výsledku: `music-offline/docs/music-offline-preview-01-browser-20261004.jpg`.

Tento test dokladá skutočný import, dekódovanie a stav prehrávača v cloudovom Chromium. Nie je potvrdením počuteľného výstupu na fyzickom reproduktore, ani zamknutej obrazovky na iPhone. Cloudové rozhranie neposkytlo prepnutie siete offline; fyzický režim Lietadlo a offline nové otvorenie zostávajú v používateľskej akceptácii.

**Fyzický iPhone, režim Lietadlo, prvé prehrávanie MP3/M4A a zamknutá obrazovka: čaká na vlastníka.**

### Zhoda publikovaných súborov (SHA-256)

| Súbor | SHA-256 |
| --- | --- |
| `index.html` | `36fc497512df21d74dbcb80578c4bc38c6961cbba3d31f609cb0403ac4b9f816` |
| `app.js` | `9cedf2f7b4e19f79f67c8dfda69a07d2f8b6f7bd2822f3387171be78c8076354` |
| `sw.js` | `9a57fc8f8d182962aaa520fcca34640e3eb0b8710e2e0823794b642a74b27fbd` |
| `offline.js` | `c6c9b98f75f53cf8c940811a27fe392a167358abb516aef073c6cf76ad203504` |
| `manifest.json` | `59ea1f66a8ec6c8015a2f6a6e49e0c21fa1ca06e60573d4f496c4ec5997777f7` |
| `release.json` | `39c4b10c09f776b85a9fa3cb76b5d59789c29ff2536d33f245e5f27c326aa56c` |

## Akceptácia pred prepojením do Music

1. Pridať aplikáciu na plochu v Safari, otvoriť ju ikonou a počkať na zelenú pripravenosť.
2. Importovať niekoľko vlastných MP3/M4A; po importe spustiť prvú skladbu.
3. Zapnúť režim Lietadlo, vypnúť aj Wi-Fi a odskúšať Play/Pause, Next/Previous, posun času a viac prirodzených prechodov.
4. Rovnaké ovládanie a pokračovanie odskúšať pri zamknutej obrazovke; zobrazený čas musí zodpovedať zvuku.
5. Znova otvoriť aplikáciu bez siete; skontrolovať knižnicu, frontu a obnovenie skladby/pozície po stlačení Prehrať.
6. Až po potvrdení môže ďalšia izolovaná zmena pridať tlačidlo Offline do Music06.

Toto preview nie je nový GOLDEN ani náhrada Music06. Pevný checkpoint ukladá konkrétnu skúšobnú verziu a jej overenia; stabilnou offline verziou sa stane až po akceptácii na zariadení. Pri ukončení experimentu stačí prestať používať novú adresu; online Music nevyžaduje rollback, keďže sa nemenila.
