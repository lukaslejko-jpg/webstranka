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

Pred zmenou obe verejné aplikácie vracali HTTP 200 a rovnaký SHA-256 `tesla-app.js`: `d7d76636cf18486c6a0815d967a158764e81b1ea782b5975457262822d80072d`.

## Technické hranice

- Audio nie je v service-worker shelli; nesťahuje sa pri prvom otvorení ani pri aktualizácii aplikácie.
- Nový modul, informácie o zdrojoch a licencie sú dostupné aj z offline shellu.
- Stabilné ID skladieb, kontrola uloženého Blobu a potvrdenie každej skladby samostatne umožňujú opakovanie po čiastočnom zlyhaní.
- Úspešný stav vyžaduje uloženie audio transakcie aj metadát. Chyba metadát ponechá prípadný Blob k dispozícii na opakovanie.
- Jedno prebiehajúce sťahovanie; ďalšie kliknutie ho nezdvojuje.
- Sťahovanie nevolá `play`, `next`, `computeDurations`, `navTo` ani nevytvára druhý prehrávač.
- Po aktualizácii z Preview 01 môže byť potrebné ďalšie obnovenie otvorenej stránky po oznámení novej verzie. Zvuk sa automatickým reloadom neprerušuje.

## Overenie a nasadenie

Finálne výsledky, presný commit a nasadenie budú doplnené po dokončení overenia tohto preview. Fyzický režim Lietadlo, uzamknutá obrazovka a background pokračovanie na iPhone zostávajú samostatnou používateľskou akceptáciou.
