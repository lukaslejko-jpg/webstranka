# Music Offline — Preview 02: skladby dostupné priamo na skúšku

Status: **preview; čaká na fyzickú skúšku na iPhone**. Toto nie je nový GOLDEN bod pôvodnej Music.

## Dôvod a rozsah

Používateľ nemal žiadne hudobné súbory ani tlačidlo na ich získanie. Preview 01 umožňoval iba import, takže požadovanú skúšku nevedel vykonať. Preview 02 dopĺňa priamo v Music Offline tlačidlo „Stiahnuť 3 skladby na skúšku“. Celé MP3 nahrávky sa stiahnu z rovnakého servera, overia, uložia v zariadení a sprístupnia v samostatnom zozname.

Balík: Bach — Inventions č. 8 (61,806 s), 10 (70,740 s), 14 (112,405 s), spolu 2 451 989 bajtov. Údaj dĺžky je z MP3 kontajnera; prehrávač naďalej používa skutočný čas audio elementu. Presné zdroje, práva k nahrávkam, prevod aj hashe sú v `music-offline/public/LICENSE-audio.txt`.

Sťahujú sa iba tieto tri pomenované nahrávky. Základná online Music používa YouTube prehrávač, nie knižnicu vlastných audio súborov. Táto úprava nezavádza sťahovanie ľubovoľnej skladby z jej online obľúbených ani nový serverový download endpoint.

## Overený východiskový stav a návrat

- Repo: `lukaslejko-jpg/webstranka`.
- Pracovná vetva: `feature/music-offline-preview-20261004`.
- Presný východiskový commit: `30f7192226dfc6db0b88ad5b1bd7c74983ad905c`.
- Pevný predchádzajúci checkpoint: `checkpoint/music-offline-preview-20261004-01`.
- Predchádzajúci offline runtime: `373b60b41afed3609fbf3412734683b14d702e62`.
- Predchádzajúci live deploy: `dep-db1b0m8u01pc73dktl10`.
- Samostatná služba: `srv-db1b0lou01pc73dktjcg`, static site `music-offline-307`.
- Adresa: https://music-offline-307.onrender.com/.
- Auto-deploy pri overení pred zmenou: vypnutý.

Pred úpravou bol cez Render aj HTTP potvrdený Preview 01. Návrat je opätovné nasadenie jeho runtime na tej istej offline službe. Origin, meno IndexedDB, object stores aj localStorage kľúče sa zachovávajú. Preview 01 vie už uložené skúšobné MP3 čítať ako ostatné lokálne skladby; návrat nevyžaduje vymazanie knižnice.

## Ochrana existujúcej Music

Zmena je obmedzená na `music-offline/**` a tento dokument. Mobilná a desktopová Music06 sa neupravujú.

| Cieľ | Existujúci deploy | Existujúci runtime commit |
| --- | --- | --- |
| Music mobil | `dep-db1a50rncjis73bsjqug` | `29fe8492df7c79b0b520ddf2924626ef6c85761c` |
| Music desktop | `dep-db1a57egekts73ct9j2g` | `941f4bdd9c148d2c7c470e44d02021cd8b336bc3` |

Pred zmenou aj po nasadení Preview 02 obe verejné aplikácie vracali HTTP 200 a rovnaký SHA-256 `tesla-app.js`: `d7d76636cf18486c6a0815d967a158764e81b1ea782b5975457262822d80072d`.

## Technické hranice

- Audio nie je v service-worker shelli; nesťahuje sa pri prvom otvorení ani pri aktualizácii aplikácie.
- Nový modul, informácie o zdrojoch a licencie sú dostupné aj z offline shellu.
- Stabilné ID skladieb, kontrola uloženého Blobu a potvrdenie každej skladby samostatne umožňujú opakovanie po čiastočnom zlyhaní.
- Úspešný stav vyžaduje uloženie audio transakcie aj metadát. Chyba metadát ponechá prípadný Blob k dispozícii na opakovanie.
- Jedno prebiehajúce sťahovanie; ďalšie kliknutie ho nezdvojuje.
- Sťahovanie nevolá `play`, `next`, `computeDurations`, `navTo` ani nevytvára druhý prehrávač.
- Po aktualizácii z Preview 01 môže byť potrebné ďalšie obnovenie otvorenej stránky po oznámení novej verzie. Zvuk sa automatickým reloadom neprerušuje.

## Overenie a nasadenie

### Automatizované overenie

- 59/59 testov prešlo: pôvodné prehrávanie, obnova, service worker a lokalizácie plus 13 nových testov sťahovania.
- Nové testy overujú dokončenie audio transakcie pred metadátami, čiastočný výpadok a opakovanie, súbežné kliknutia, oba typy nedostatku úložiska, chýbajúci/neúplný Blob a zachovanie prehrávania aj rozpracovaného vyhľadávania.
- Skutočný downloader sa testuje na priloženom MP3 súbore vrátane správneho hashu a odmietnutia HTTP/HTML odpovede, nesprávnej veľkosti a nezhodného hashu.
- Validator: syntax 14 JavaScript súborov, všetkých 22 shell assetov, manifest, verzie, veľkosť a SHA-256 všetkých troch MP3; audio je mimo shellu.
- Samostatná kontrola patchu nenašla blokujúcu chybu v overovaných scenároch.

### Nasadenie

- Runtime commit: `67e77c78c161518e071fe25f7c5c35d2eb559490`.
- Runtime tree: `e5df0c560cec0f2526f130cce8fde42b31709f72`.
- Nový deploy: `dep-db1bkb8u01pc73dn86qg`.
- Stav Render: `live` od `2026-10-04T20:42:35.927248Z`.
- Adresa: https://music-offline-307.onrender.com/.
- HTTP 200 a presná zhoda s runtime commitom overená pre release.json, app.js, sw.js, samples.js a všetky tri MP3. Audio odpovede majú Content-Type audio/mpeg.
- Auto-deploy zostáva vypnutý. Finálny záznam overenia je samostatný dokumentačný commit; nevyžaduje ďalší runtime build.

### Reálny cloudový prehliadač

- Aktualizácia existujúcej Preview 01 inštancie: prvé obnovenie zobrazilo oznámenie novej verzie, ďalšie načítalo TEST 02. Pôvodné tri testovacie importy ostali v knižnici.
- Tlačidlo „Stiahnuť 3 skladby na skúšku“ stiahlo a uložilo tri nové skladby; aplikácia potvrdila Uložené 3/3 a počet knižnice vzrástol z 3 na 6.
- Počas sťahovania bolo otvorené Vyhľadávanie a dokončenie ho nepreplo na inú obrazovku.
- Výslovné otvorenie skúšobného zoznamu zobrazilo iba tri hudobné vzorky v poradí 8 → 10 → 14.
- Prvá skladba sa prehrávala zo zdroja blob: na origine offline aplikácie, paused=false, muted=false, skutočná dĺžka 61,779592 sekundy a rastúci audio.currentTime.
- Bez ďalšieho kliknutia prirodzene prešla z Invention 8 na Invention 10; druhá mala paused=false, dĺžku 70,704739 sekundy a nový lokálny blob: zdroj.
- Posun druhej skladby na 850/1000 sa prejavil aj na skutočnom audio.currentTime (60,223 s), nielen na grafickom ukazovateli.
- Po dohraní zvyšku druhej skladby nasledovala tretia Invention 14, paused=false, dĺžka 112,361361 sekundy; žiadne ďalšie kliknutie na Next.
- Tretia skladba bola pozastavená na 37,200448 s. Po obnovení ostali všetky skladby a ten istý výber; nový blob: zdroj sa pripravil pozastavený na presne 37,200448 s.
- Po obnovení sa skúšobný zoznam otvoril s tromi skladbami a stavom uloženia.
- Zachytené chybové záznamy pochádzali z cloudového rozšírenia prehliadača; žiadny z nich z kódu offline aplikácie.

Fyzický režim Lietadlo, uzamknutá obrazovka a background pokračovanie na iPhone zostávajú samostatnou používateľskou akceptáciou. Stav prehrávača v Chromium nie je dôkaz zvukového výstupu telefónu ani jeho chovania pri zamknutí.

Snímka tlačidla pred stiahnutím: `../music-offline/docs/music-offline-preview-02-download.jpg`.

Pôvodné pevné referencie boli po nasadení overené cez git ls-remote: Preview 01 → `30f7192226dfc6db0b88ad5b1bd7c74983ad905c`, Music06 mobil → `ee547488cb1c51845754529d8bdf2d49fbc0b51c`, Music06 desktop → `23a57397addfacdbc91eeab9abf0839412e0e2f4`.

Finálny pevný Git checkpoint: `checkpoint/music-offline-preview-20261004-02` (vetva, nie Git tag; ponechať bez ďalších posunov). Zahŕňa runtime vyššie aj finálnu dokumentáciu a snímky.

Snímka skúšobného zoznamu po stiahnutí a obnovení: `../music-offline/docs/music-offline-preview-02-saved.jpg`.
