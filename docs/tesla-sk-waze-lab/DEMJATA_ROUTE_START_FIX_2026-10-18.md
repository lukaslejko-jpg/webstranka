# Demjata 307 route start fix — 2026-10-18

## Problém
Na trase Demjata 307 → Vranovská 41, Prešov bol úvod modrej trasy vykreslený šikmo.

Príčina nebola v GPS ani v UI. Raw Waze feed pri štarte z Demjata 307 preskočil prvý lokálny Waze segment:
- zadaný štart: `21.310617 / 49.100883`
- prvý Waze segment končí v bode `21.312126230018 / 49.101897252003`
- pôvodný raw feed tento segment pri full-route odpovedi neobsahoval.

Klient preto dostal hustú geometriu až od neskoršieho bodu a úvod vizuálne skrátil.

## Oprava
Lokálny `/api/waze-route-dense` teraz pri zistení chýbajúceho štartového segmentu vykoná Waze-only start repair:

1. vypočíta normalizovanú Waze trasu,
2. identifikuje prvý Waze anchor z prvého segmentu,
3. samostatne načíta raw Waze connector:
   `start → first anchor`,
4. samostatne načíta raw Waze tail:
   `first anchor → destination`,
5. spojí connector + tail,
6. až potom rozdelí hustú geometriu na navigačné kroky.

Nepoužíva OSRM ani mapový center fallback.

## Overenie presnej trasy
Test:
- From: Demjata 307 / `49.100883, 21.310617`
- To: Vranovská 41, Prešov / `49.022334, 21.278079`

Výsledok:
- HTTP 200
- `code: Ok`
- `source: waze-pywaze-live-dense-stable`
- `geometry.source: waze-routing-coords`
- `geometry.startRepair: true`

Prvé body po oprave:
- `21.310617, 49.100883` — presný štart
- `21.31075909989058, 49.100699470958844`
- `21.31203131442721, 49.10175995422689`
- `21.312126230018, 49.101897252003` — prvý Waze anchor
- následne Waze tail späť na hlavnú trasu

Hlavná trasa po oprave:
- routeName: `545; 18`
- rawCoordCount: 134
- total dense step coordinates: 139
- startRepair: true

Alternatíva:
- routeName: `3431`
- rawCoordCount: 274
- startRepair: true

Opačný smer Prešov → Demjata:
- `startRepair:false`
- teda sa neopravuje nič, ak raw Waze štartový segment nechýba
- lane guidance ostala zachovaná.

## Regresný audit
Preview po oprave:
- `dpl_F259eNqB4GmudK113QcbQQWk6cve`

Production LAB:
- `dpl_2FT7pyPFTHy9cHmExEgYq95AewGY`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Rollback:
- `dpl_79yKXi6QWM5x1xgUyDMMLyyE2LhX`

Po oprave prešlo:
- dense route 200
- reverse dense route 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- live POLICE prítomné
- ROAD_CLOSED prítomné
- traffic 200
- phone/QR 200
- TTS 200 audio/mpeg
- chargers 200
- availability 200
- icon 200

## Chránená produkcia
`tesla-sk` ostala počas opravy nezmenená:
- deployment `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

