# Music Offline — samostatná skúšobná aplikácia

**MUSIC-OFFLINE-PREVIEW-20261004-03 — NEZVEREJNENÁ pracovná verzia. Render test skončil `source_blocked / bot_confirmation / probe`. Aktuálna používateľská aplikácia zostáva TEST 02.**

Samostatná PWA založená na Kasette 1.4.0. Má formulár na uloženie zvuku z YouTube odkazu cez oddelenú konverznú službu, tri skúšobné skladby aj import vlastných hudobných súborov. Uložená hudba zostáva v zariadení. Vlastné importované súbory sa na server neposielajú; pri sťahovaní z YouTube server dostane vložený odkaz a pripraví MP3.

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
4. V overenom Preview 03 vlož YouTube odkaz a stlač „Stiahnuť do mobilu“. Počkaj na „Skladba je uložená offline“. Vlastné MP3/M4A možno naďalej pridať cez Súbory; skúšobný balík sa sťahuje samostatným tlačidlom.
5. Stlač „Otvoriť uloženú skladbu“ a potom Play. Zapni režim Lietadlo a vypni aj Wi-Fi. Odskúšaj pokračovanie, posun, zamknutie aj nové otvorenie aplikácie.

Adresa existujúcej offline aplikácie je https://music-offline-307.onrender.com/. Preview 02 zostáva návratovým bodom. Nasadený stav určuje release dokument, nie samotná prítomnosť nového kódu vo vetve. Po schválenej aktualizácii a hlásení o novšej verzii aplikáciu obnov s internetom. Aplikáciu ani jej dáta nemaž.

## Stiahnutie z YouTube

`public/youtube-download.js` komunikuje iba s izolovanou službou nakonfigurovanou v `public/download-config.js`. Jej presný HTTPS origin musí zodpovedať `connect-src` v HTML a povolenému CORS originu na serveri. Prázdna konfigurácia sa pred zverejnením nahradí overenou adresou služby.

Prevod sa spúšťa jediným explicitným POST na `/api/jobs`. Stav sa zisťuje cez `/api/jobs/{id}`; hotový MP3 sa prenáša z `/api/jobs/{id}/audio`. Klient overuje povolené YouTube URL, identitu úlohy/videa, metadáta, limit 30 MB, MIME, dĺžku aj SHA-256. Celá sieťová operácia má limit päť minút. Zrušenie preruší požiadavky a odošle DELETE známej úlohy.

MP3 sa najprv uloží do existujúceho IndexedDB pod `youtube-{videoId}`, až potom sa zapíšu metadáta knižnice. Chyba úložiska nemôže vyhlásiť skladbu za uloženú. Opakovaná požiadavka overí už uložené bajty a zabráni duplicitám. Rozpracovaná úloha a text URL sa pamätajú oddeleným kľúčom `music-offline:youtube-download`; obnovenie stránky samo nespúšťa sieťové požiadavky. Používateľ môže výslovne pokračovať alebo úlohu zrušiť.

Postup a dokončenie aktualizujú iba stavové prvky karty. Nevyvolávajú prehrávanie, zmenu fronty, navigáciu ani nový render zobrazenia. Otvorenie skladby je samostatné tlačidlo. Dostupnosť závisí od zdroja; aplikácia nezaručuje stiahnutie ľubovoľného videa a nežiada účtové cookies.

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

Presný stav nového nasadenia a overení: `../docs/music-offline-youtube-20261004-03.md`. Predchádzajúce záznamy Preview 01/02 a ich pevné checkpointy zostávajú zachované.

## Incident TEST03 — 6. 10. 2026 / povinný release postup

Pri úpravách TEST03 vznikla regresia, pri ktorej sa načítal iba statický shell a stav „Pripravujem offline aplikáciu…“, ale frontend sa nevykreslil. Následné úspešné Render deploye boli nesprávne komunikované ako funkčné verzie. Render `LIVE` potvrdzuje nasadenie procesu, nie funkčnosť browserovej aplikácie.

Povinný postup pre ďalšie TEST03 zmeny:

1. Zachovať posledný používateľom potvrdený known-good snapshot a jeho presný commit/deployment.
2. Meniť jednu izolovanú vec.
3. Pred deployom skontrolovať frontendový modulový reťazec a syntax/runtime; backend unit testy samy nestačia.
4. Po deployi overiť HTTP, načítanie modulov, štart JS a render hlavného UI.
5. Pri štartovacej chybe zobraziť diagnostiku `window.onerror` a `unhandledrejection` priamo v testovacom UI namiesto hádania cache/SW príčiny.
6. Zmenu označiť za funkčnú až po E2E/device teste relevantnej funkcie. Ak agent nemá možnosť fyzického iPhone/Safari testu, stav je iba **NASADENÉ — ČAKÁ NA DEVICE TEST**.
7. Testovací link používateľovi neposielať ako „funkčný“ pred splnením bodov vyššie.
8. Pri regresii rollbackovať celý snapshot, nie kombináciu jednotlivých súborov.

### Stav incidentu

- Akceptované Music a TEST02 zostávajú nedotknuté.
- TEST03 je experimentálna vetva; jej úspešný Render build/deploy sa nesmie zamieňať s používateľsky overenou funkčnosťou.
- Commit `fe6badc16b791f2461ae3398fe381bf186e6dbcc` bol počas incidentu označený ako údajný known-good podľa časovej korelácie, ale následný device test na čistom origine funkčnosť nepotvrdil. Preto sa **nesmie evidovať ako overený known-good** bez nového dôkazu.


## HIT — Palladium → Music Offline import — 6. 10. 2026

**Stav: HOTOVÉ / FYZICKY OVERENÉ NA IPHONE.**

Chránený funkčný tok TEST03:

1. Music TEST03 vyhľadá skladbu a po výbere automaticky priradí YouTube URL.
2. Tlačidlo „Stiahnuť do mobilu“ otvorí Palladium cez `palladium://download?url=...`.
3. Palladium stiahne médiá lokálne na iPhone. Cloudový downloader sa pre tento tok nepoužíva.
4. Používateľ uloží/vyberie hotový súbor cez iOS Súbory / Stiahnuté.
5. Music TEST03 tlačidlom „Importovať zo Stiahnutých“ prevezme súbor do lokálneho IndexedDB.
6. Importovaný MP4 sa prehráva priamo v Music TEST03.

Fyzický device test 6. 10. 2026:
- súbor: `SLOVENSKÁ MEGA DIDŽINA 2026 - Deejay-jany.mp4`
- veľkosť zobrazená v Music: 490,7 MB
- dĺžka zobrazená prehrávačom: 3:12:19
- výsledok: import, lokálne uloženie a prehrávanie v Music na iPhone potvrdené používateľom.

Railway testovací frontend:
- služba: `music-offline-ui-test`
- URL: `https://music-offline-ui-test-test.up.railway.app`
- deployment fyzicky overeného importného stavu: `2bcc067f-7299-499a-82ed-e8dd6a8d6811`

### Ochrana HIT verzie

- Stable Music 06 a akceptovaný TEST02 sa týmto experimentom nemenia.
- Za HIT sa považuje iba vyššie uvedený fyzicky overený tok.
- Dva následné pokusy rozšíriť Railway UI na viacero kompaktných kariet boli bezpečnostnou vrstvou zastavené pred zápisom; **nie sú nasadené a nie sú súčasťou HIT verzie**.
- Pred ďalšou zmenou musí byť možné vrátiť sa na deployment `2bcc067f-7299-499a-82ed-e8dd6a8d6811` alebo na ekvivalentný presný snapshot jeho zdroja.

### SCHVÁLENÝ PLÁN — ďalšia izolovaná zmena

Bez zmeny vyššie uvedeného toku doplniť:
- viacero uložených audio/video súborov namiesto jediného `latest`,
- výber/import viacerých súborov,
- kompaktné karty, na mobile prednostne 2 karty na riadok,
- názov, typ Audio/Video, veľkosť a lokálne prehrávanie každej položky,
- zachovanie už importovaných dát pri migrácii úložiska.

Tento plán **nie je nasadený ani overený**.


## HIT — TEST03 MULTI knižnica — 6. 10. 2026

**Stav: HOTOVÉ / FYZICKY OVERENÉ NA IPHONE.**

Railway služba `music-offline-test03-multi`, deployment `51d2df18-0fe8-41f6-b643-2a9e430f269b`, URL `https://music-offline-test03-multi-test.up.railway.app`.

Používateľ fyzicky potvrdil:
- vyhľadávanie a výber online výsledku,
- otvorenie Palladium,
- multi-import troch MP4,
- súčasné zachovanie troch položiek bez prepisovania,
- kompaktné rozloženie 2 karty na riadok,
- samostatné prehrávanie videí.

Overené položky na obrazovke: 117,8 MB, 1629 MB a 490,7 MB. Náhľady obrázkov nie sú v tomto HIT stave vyriešené; ide o známu UI chybu, ktorá neblokuje prehrávanie.

**Rollback:** deployment `51d2df18-0fe8-41f6-b643-2a9e430f269b`. Ďalšie UI zmeny nesmú byť označené za HIT pred novým device testom.

### SCHVÁLENÝ PLÁN UI
- filter Všetko / Audio / Video a lokálne vyhľadávanie,
- vymazanie jednotlivej položky s potvrdením,
- online výsledky v kompaktnom skrolovateľnom paneli nad obsahom,
- obnovenie náhľadov bez zmeny overeného media storage/playback toku.
