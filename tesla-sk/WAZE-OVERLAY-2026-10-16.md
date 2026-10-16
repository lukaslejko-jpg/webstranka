# Tesla SK – Waze traffic/event overlay

Dátum: 2026-10-16  
Produkcia: https://tesla-sk.vercel.app  
Vercel deployment: `dpl_FUYqiX1yETkL2Uxycua2rN3mGPff`

## Čo bolo prenesené z Tesla Waze
Iba samostatná Waze overlay vrstva a event API:
- POLICE – policajné hliadky,
- JAM – kolóny/doprava,
- ACCIDENT – nehody,
- ROAD_CLOSED/CLOSURE – uzávierky,
- CAMERA – radary, ak ich zdroj vráti,
- HAZARD / CONSTRUCTION – nebezpečenstvá a práce na ceste,
- jams line geometry – farebná premávka po cestách, ak ju upstream vráti.

## Čo sa nemenilo
- OpenFreeMap/OSM mapový podklad,
- routing,
- navigačná logika,
- hlas,
- live nabíjačky,
- Domov/Práca,
- mobilné párovanie,
- Music overlay.

## Architektúra
`/api/events` je same-origin proxy na existujúci Waze event zdroj:
`https://tesla-waze-alerts.vercel.app/api/events`

Dotaz používa bounds:
`top / bottom / left / right`

Frontend načítava overlay:
- po otvorení,
- po presune mapy s debounce,
- každých 60 sekúnd.

## Overenie produkcie
Pri kontrole produkcie:
- HTTP 200,
- 25 alertov v testovanej oblasti,
- typy: JAM, ROAD_CLOSED, ACCIDENT, POLICE, HAZARD,
- POLICE prítomné,
- JAM alerty prítomné.

## HIT pred zmenou
- Git vetva: `HIT-tesla-sk-before-waze-overlay-2026-10-16`
- Git priečinok: `tesla-sk/HIT-2026-10-16-before-waze-overlay`
- predchádzajúci deployment: `dpl_8GfVz9KLumNN6xwxN2sqtxA7TfMC`
