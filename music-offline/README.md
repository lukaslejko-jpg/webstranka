# Music Offline — samostatná skúšobná aplikácia

**MUSIC-OFFLINE-PREVIEW-20261004-02 — čaká na skúšku na iPhone.**

Samostatná PWA založená na Kasette 1.4.0. Vie priamo stiahnuť tri skúšobné skladby do zariadenia aj importovať vlastné hudobné súbory. Webový server poskytuje aplikáciu a tento konkrétny balík hudby; importovaná hudba sa na server neposiela.

## Pôvod a licencia

- Upstream: https://github.com/nico-alvz/kasette
- Presná prevzatá revízia: `ee170285664f14f7e044fd7d0f683c6d0751f469`.
- Prevzatý webový priečinok: `www` → `music-offline/public`.
- Pôvodná licencia BSD-3-Clause: `public/LICENSE-kasette.txt`; autorské oznámenie sa musí zachovať.
- Pôvodný README a changelog sú uložené vedľa tohto dokumentu.
- Základ existujúceho projektu: Music06 `ee547488cb1c51845754529d8bdf2d49fbc0b51c`.

## Použitie na iPhone

1. Prvé otvorenie vykonaj v Safari s internetom.
2. Zdieľať → Pridať na plochu. Otvor Music Offline vlastnou ikonou ešte pred vytváraním knižnice.
3. Počkaj na zelený stav „Pripravené na offline“.
4. Stlač „Stiahnuť 3 skladby na skúšku“ a počkaj na „Uložené 3/3 skladby“. Balík má 2 451 989 bajtov, približne 2,5 MB. Vlastné MP3/M4A možno naďalej pridať cez Súbory.
5. Otvor skúšobné skladby, spusti prvú, zapni režim Lietadlo a vypni aj Wi-Fi. Odskúšaj pokračovanie, posun, zamknutie aj nové otvorenie aplikácie.

Preview 02 je na https://music-offline-307.onrender.com/. Pri aktualizácii existujúcej ikony môže byť najprv zobrazený TEST 01. Po hlásení o novšej verzii aplikáciu obnov s internetom; cieľový údaj je TEST 02. Aplikáciu ani jej dáta nemaž.

## Skúšobné skladby na stiahnutie

Tlačidlo je na Domov aj v Knižnici; v menu + je dostupné aj opakované stiahnutie. Obsahuje celé Bachove Inventions č. 8, 10 a 14. Audio sa prenáša až po stlačení tlačidla a ukladá do toho istého IndexedDB ako importované súbory. Najprv sa overí HTTP odpoveď, presná veľkosť a SHA-256; za uložené sa označí až po úspešnom uložení zvuku aj metadát. Pri chybe zostávajú dokončené skladby uložené a opakovanie doplní chýbajúce bez duplicít. Dokončenie sťahovania neprepína zobrazenie ani prehrávanú skladbu.

Nahrávka č. 8 je CC0 1.0, nahrávky Jasona M. C., Hana č. 10 a 14 zostávajú CC BY-SA 4.0. Zdrojové odkazy, autorstvo a údaje o prevode sú v `public/LICENSE-audio.txt`, na stránke `public/sample-credits.html` a v MP3 metadátach. Ide o konkrétny testovací balík; offline stiahnutie ľubovoľných online obľúbených skladieb týmto nie je implementované.

Uloženie do aplikácie nie je nezničiteľná záloha. Vymazanie dát prehliadača/aplikácie môže odstrániť aj hudbu. Zachovaj pôvodné súbory alebo vytvor export knižnice cez Nastavenia. Povolenie trvalého úložiska závisí od prehliadača.

## Oddelenie od Music06

- Táto aplikácia musí byť nasadená na vlastnom HTTPS origine/subdoméne.
- Publikuje sa výhradne `music-offline/public`; zvyšok repozitára sa týmto nasadením neservíruje.
- IndexedDB používa meno `music-offline`; localStorage kľúče majú prefix `music-offline:`.
- Service worker spravuje iba cache s prefixom `music-offline-shell-` a registruje sa iba v samostatnej offline aplikácii.
- Automatické nasadenie novej služby je vypnuté.
- Existujúca online Music, jej prehrávač, API, mobilná aj desktop produkcia sa v tejto vetve nemenia.
- Online YouTube ID nie je offline audio. Obľúbené online skladby sa automaticky nestiahnu ani neprepoja s importovanými súbormi.

Po akceptácii na iPhone možno do Music pridať odkaz „Offline“. Spoločný prehrávač a spoločné playlisty sú ďalšia samostatná úloha. Pri budúcich zmenách zachovať origin aj názvy dátových úložísk, aby používateľ neprišiel o prístup ku svojej knižnici.

## Lokálne úpravy oproti Kasette

- Slovenčina vrátane množných tvarov; predvolený tmavý vzhľad a samostatné označenie Music Offline.
- Manifest, návod pre iPhone, číslo preview, preukázateľný stav úplnosti offline shellu.
- Žiadosť o uchovanie lokálnych dát pri importe; odmietnutie žiadosti neblokuje prehrávanie.
- Izolácia úložísk a oprava service workera, ktorý pôvodne mazal všetky cudzie cache rovnakého originu.
- Ochrana súbežných výberov skladieb, čistenie a preindexovanie fronty, príprava nasledujúceho lokálneho zdroja.
- Obnova poslednej skladby, fronty a skutočného času; zvuk po tvrdom obnovení vyžaduje povolenie prehliadača alebo stlačenie Prehrať.
- Jeden skutočný audio element a jeden vlastník MediaSession. Žiadne pomocné tiché audio ani náhradné časovače prehrávania.

## Overenie a build

```sh
node music-offline/scripts/validate.mjs
node --test music-offline/tests/*.test.mjs
```

Web nevyžaduje balíky ani build framework. Render Static Site:

- branch: `feature/music-offline-preview-20261004`
- build command: `node music-offline/scripts/validate.mjs && node --test music-offline/tests/*.test.mjs`
- publish path: `music-offline/public`
- environment: `SKIP_INSTALL_DEPS=true`, `NODE_VERSION=22`
- auto-deploy: `no`

Súbor `public/release.json` a rovnaké číslo v HTML, offline module a service workeri identifikujú runtime. Validator overuje ich zhodu, syntax a dostupnosť všetkých modulov v offline shelli.

Node testy service workera simulujú nedostupnú sieť; nie sú náhradou za fyzický test režimu Lietadlo na iPhone. Cloudový Chromium takisto nepreukazuje funkčnosť zamknutej obrazovky v iOS. Verejné hlásenie Kasette #5 o automatickom pokračovaní pri zamknutí zostáva dôvodom na túto akceptáciu: https://github.com/nico-alvz/kasette/issues/5.

Presný stav nasadenia a overení: `../docs/music-offline-preview-20261004-02.md`. Predchádzajúci záznam Preview 01 a jeho pevný checkpoint zostávajú zachované.
