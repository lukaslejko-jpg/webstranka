# Music Offline — samostatná skúšobná aplikácia

**MUSIC-OFFLINE-PREVIEW-20261004-01 — čaká na skúšku na iPhone.**

Samostatná PWA založená na Kasette 1.4.0. Importuje vlastné hudobné súbory do zariadenia. Webový server poskytuje iba aplikáciu; importovaná hudba sa na server neposiela.

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
4. Pridaj 3–5 vlastných MP3/M4A zo Súborov. Súbory uložené len v iCloude najprv stiahni do telefónu.
5. Spusti skladbu, zapni režim Lietadlo a odskúšaj pokračovanie, posun, zamknutie aj nové otvorenie aplikácie.

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

Presný stav nasadenia a overení: `../docs/music-offline-preview-20261004-01.md`.
