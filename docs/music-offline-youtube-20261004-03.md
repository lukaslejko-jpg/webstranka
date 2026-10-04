# Music Offline — Preview 03: sťahovanie z odkazu YouTube

Status: **implementácia pripravená, prvý skutočný Render pokus zablokoval zdroj; frontend sa nezverejňuje ako funkčná verzia**.

## Požiadavka

Používateľ potvrdil fungovanie Preview 02 a požaduje priamo implementované sťahovanie z odkazu podobne ako na stránke TurboScribe YouTube → MP3. Cieľový postup je vložiť odkaz, stiahnuť MP3 a uložiť ho priamo do existujúcej offline knižnice. Samotné skúšobné nahrávky ani presmerovanie na externý sťahovač túto požiadavku nenahrádzajú.

TurboScribe podľa verejnej podpory neposkytuje API ani automatizovaný prístup. Nová implementácia používa samostatný yt-dlp + FFmpeg proces v oddelenej službe Music. Nepoužíva súkromné rozhrania TurboScribe, TinyFish, cookies, používateľské prihlásenia, platené proxy ani iný projekt ako technický most.

## Presný východiskový stav a návrat

- Repozitár: `lukaslejko-jpg/webstranka`.
- Nová izolovaná vetva: `feature/music-offline-youtube-20261004`.
- Východiskový commit: `a27dfa0e17d4043f50ad1e23470c1d7c63e9f06c`.
- Zachovaný pevný bod: `checkpoint/music-offline-preview-20261004-02` → tento commit.
- Doterajší offline runtime: `67e77c78c161518e071fe25f7c5c35d2eb559490`.
- Doterajší offline deploy: `dep-db1bkb8u01pc73dn86qg`.
- Offline static site: `srv-db1b0lou01pc73dktjcg`, https://music-offline-307.onrender.com/.
- Vetva služby pred zmenou: `feature/music-offline-preview-20261004`; auto-deploy vypnutý, stav opätovne overený cez Render.

Pevný bod Preview 02 sa neposúva. Existujúca offline adresa, IndexedDB `music-offline` aj localStorage kľúče sa zachovávajú, aby ostali všetky uložené skladby a nastavenia. Návrat na predchádzajúci runtime nevyžaduje vymazanie knižnice. Nový server je samostatná služba; jeho vypnutie nemení lokálne uložené audio.

| Chránená aplikácia | Existujúci deploy | Runtime commit |
| --- | --- | --- |
| Music mobil 06 | `dep-db1a50rncjis73bsjqug` | `29fe8492df7c79b0b520ddf2924626ef6c85761c` |
| Music desktop 06 | `dep-db1a57egekts73ct9j2g` | `941f4bdd9c148d2c7c470e44d02021cd8b336bc3` |

Zmeny sú obmedzené na nový `music-offline-downloader/**`, offline rozhranie `music-offline/**` a dokumentáciu. Online prehrávače Music 06 sa nemenia.

## Server a hranice

Server používa FastAPI 0.142.2, uvicorn 0.54.0, yt-dlp 2026.8.19, yt-dlp-ejs 0.8.0, systémový FFmpeg a Node 22 alebo novší. Beží ako jeden proces s jednou aktívnou konverziou a najviac dvoma čakajúcimi úlohami.

- Prijíma iba jeden kanonizovaný verejný YouTube odkaz s platným 11-znakovým ID.
- Nepovoľuje ľubovoľné zdrojové URL, argumenty nástrojov, playlisty ani dodané metadátové súbory.
- Limit zdroja je 20 minút a 80 MB; výsledné MP3 najviac 30 MB, 128 kb/s.
- Časový limit úlohy je 240 sekúnd, konverzie 180 sekúnd. Zrušenie ukončuje celú skupinu procesu.
- Dočasné súbory majú 15-minútovú platnosť. Po potvrdenom lokálnom uložení môže klient úlohu zmazať.
- Najviac 12 evidovaných úloh; ohraničené telo JSON, výstupy procesov a spotreba disku.
- CORS povoľuje presný origin Music Offline. Neprenášajú sa prihlasovacie údaje.
- Kontrola TLS zostáva zapnutá. Vo vývojovom prostredí bolo potrebné použiť systémovú dôveru CA namiesto certifi (`--compat-options no-certifi`).
- Ochranu alebo nedostupnosť zdroja API oznámi stavom chyby; nepokúša sa ju obchádzať.

API: `POST /api/jobs`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/audio`, `DELETE /api/jobs/{id}`, `GET /health`. Úspešná úloha vráti overenú veľkosť, SHA-256, trvanie a cestu k MP3.

## Klient a prehrávač

Požadované správanie: karta „Stiahnuť z YouTube“, odkaz, priebeh, zrušenie a opakovanie. Po stiahnutí sa overuje celé audio. Najprv sa potvrdí uloženie Blobu v IndexedDB, až potom sa zapíše kópia metadát a zverejní skladba v knižnici. Stabilné ID `youtube-{videoId}` bráni duplicitám. Dokončenie nemení aktuálny pohľad, rozpracované vyhľadávanie, prehrávanú skladbu ani front.

Výsledok sa prehráva cez existujúci jediný audio element zo zdroja `blob:`. Nový modul sa nesmie stať druhým vlastníkom prehrávania. Skúšobné skladby aj import súborov zostávajú dostupné.

## Skúška uskutočniteľnosti

Skutočný verejný zdroj pre skúšku: Blender, **Big Buck Bunny**, YouTube ID `YE7VzlLtp-4`, 597 sekúnd. Licencia projektu: CC BY 3.0, `(c) copyright 2008, Blender Foundation / www.bigbuckbunny.org`. Ide o zdroj z YouTube, nie o náhradný súbor z iného servera.

Prvá lokálna kontrola po oprave CA dôvery získala cez yt-dlp skutočný titul, autora, verejnú dostupnosť a 30 formátov. To samo osebe ešte nepotvrdzuje stiahnutie MP3 ani správanie na Renderi. Stav reálneho prevodu, nasadenia a klientského overenia sa doplní podľa výsledkov; mock testy sa neoznačujú za dôkaz dostupnosti YouTube na hostingu.

Úplný lokálny pokus namiesto očakávaného Opus súboru (9 730 538 bajtov) dostal 195-bajtovú HTML odpoveď „Site Unavailable“. FFprobe ju odmietol; nevzniklo úspešné MP3 ani stav `ready`. Táto sieťová prekážka sa neobchádzala ďalšou lokálnou prístupovou cestou. Dostupnosť v zamýšľanej Render službe sa musí zmerať samostatne.

Pred prvým serverovým nasadením prešlo 14/14 backend testov a kontrola reálne nainštalovaných runtime závislostí. Testy zahŕňajú aj konkrétnu opravenú chybu, pri ktorej potomok procesu mohol po odchode rodiča držať rúry otvorené a zablokovať časový limit. Kontrola zachováva časový limit až po skončenie procesu aj čítačiek a ukončuje celú skupinu.

Kvóta 6 úloh/hodinu sa viaže na pozorovanú IP spojenia; za Render proxy ju môžu používatelia zdieľať. Nie je označená za spoľahlivú kvótu na každé zariadenie. Celkový limit je 30/hodinu.

## Nasadenie servera a prvý výsledok

- Samostatná služba: `srv-db1c2ilg1s2s739gbntg`, názov `music-offline-downloader-307`.
- Adresa: https://music-offline-downloader-307.onrender.com.
- Plán: `free`, región `frankfurt`, runtime `python`, auto-deploy vypnutý.
- Prvý runtime commit: `7dfaeecc2871fcd0f352ae31f963f2d560bb8176`.
- Prvý deploy: `dep-db1c2jlg1s2s739gbr60`, `live` od `2026-10-04T21:13:43.653099Z`.
- `/health` vrátil HTTP 200 a správnu službu/verziu.
- Skutočný `POST /api/jobs` s vyššie uvedeným verejným videom vrátil HTTP 202. Úloha následne skončila `state: failed`, `error: source_blocked`; MP3 nevzniklo.

Prvý kontrakt nerozlišoval presnú príčinu odmietnutia. Pridali sa preto len pevne určené diagnostické kategórie `reason` a fáza `stage` (`probe`/`download`). Surová správa zdroja, adresy a tokeny sa nezverejňujú. Druhý kontrolný pokus má určiť presnú kategóriu, nie skúšať obchádzanie zdrojovej kontroly.

## Dokončená implementácia klienta

Prešlo 135/135 frontendových testov; validátor skontroloval 16 JS súborov a všetkých 24 offline shell assetov. Backend po doplnení diagnostiky má 15/15 testov. Pokryté sú zápis audia pred metadátami, obnovenie rozpracovanej úlohy, zrušenie aj počas zápisu, kvóta úložiska, poškodené audio, identita videa a zachovanie rozpracovaného vyhľadávania/prehrávania.

Konfigurácia klienta obsahuje presnú adresu vytvorenej služby. `connect-src` povoľuje len vlastný origin a tento server. Nový frontend ostáva iba na izolovanej vývojovej vetve, kým nie je potvrdené skutočné získanie MP3. Verzia v `release.json` má stav `draft-source-verification-blocked`, nie úspešný checkpoint.

Po prvom pokuse sa nezmenil offline deploy `dep-db1bkb8u01pc73dn86qg`: verejný `release.json` stále vracia `20261004-02`. Obe online Music06 vracajú HTTP 200 a pôvodný SHA-256 `tesla-app.js` `d7d76636cf18486c6a0815d967a158764e81b1ea782b5975457262822d80072d`. Cloudový prehliadač ďalej ukazuje pôvodný zoznam troch Bachových skladieb.

## Primárne zdroje

- TurboScribe podpora, sekcia API: https://turboscribe.ai/support
- Referenčné ovládanie: https://turboscribe.ai/sk/downloader/youtube/mp3/free
- yt-dlp: https://github.com/yt-dlp/yt-dlp
- JavaScript runtime a EJS: https://github.com/yt-dlp/yt-dlp/wiki/EJS
- Render native runtimes (FFmpeg a Node v build aj runtime prostredí): https://render.com/docs/native-runtimes
- Zdroj a licencia skúšobného filmu: https://peach.blender.org/about/
