# MUSIC SOURCE PARITY — 2026-10-19

## Rozsah zmeny

Izolovaná zmena iba zdroja hudby v Tesla SK Waze LAB.

Pôvodný zdroj hudby:
- `https://music-mobile-307.onrender.com/?mobile=1`

Nový produkčný zdroj hudby:
- `https://music-p45f.onrender.com/`

## Čo ostalo nezmenené

- navigačná logika,
- GPS,
- Waze routing,
- alternatívne trasy,
- lane guidance,
- reroute,
- eventy/traffic,
- TTS,
- QR/phone pairing,
- nabíjačky/availability,
- hudobný overlay,
- `musicGrab` a gesture na zatvorenie/minimalizáciu,
- spôsob načítania iframe a jeho životný cyklus.

Zmena v `api/lab-main.js` je iba jedna URL konštanta `MUSIC_URL`.

## Release

Rollback pred zmenou:
- `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`

Testovaný preview:
- `dpl_9BdE8squRojdMXNuoozoXURnduUT`

Production:
- `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`

Nový SHA `api/lab-main.js`:
- `ec3c480d9667e3c183434ab9e777a90268494eb2`

Ostatných 15 zo 16 zdrojových súborov má rovnaké SHA ako rollback produkcia.

## Overenie

Preview:
- root 200,
- `/phone.html?room=TEST1234` 200,
- TTS 200 `audio/mpeg`,
- chargers 200.

Production alias:
- `https://tesla-sk-waze-lab.vercel.app/`
- deployment `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`
- state READY.

## Povinné pravidlo pre ďalšie zásahy

Hudobná časť je samostatná. Pri ďalších úpravách hudby sa nesmie meniť navigačný renderer, GPS/Waze/reroute logika ani backend endpointy.
