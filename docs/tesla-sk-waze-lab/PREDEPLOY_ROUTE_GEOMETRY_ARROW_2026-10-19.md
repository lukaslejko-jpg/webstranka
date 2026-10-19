# PRE-DEPLOY ROUTE GEOMETRY + ARROW FOLLOW — 2026-10-19

## Aktuálny rollback point
Pred nasadením tejto opravy je aktuálny LAB production:
- deployment: `dpl_HoBiGtoSipY7PUJJ9ziXJspoGnKb`
- URL: `tesla-sk-waze-7k4sp2wcq-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Toto je immediate rollback point.

## Zistená chyba geometrie
Trasa Demjata 307 → Vranovská:
- Waze distance: 12 952 m
- production polyline pred opravou: 14 830 m
- rozdiel: +1 878 m
- prvý Waze step distance: 1 131 m
- production OSRM first-step polyline: 2 768 m

To spôsobovalo slučku a nesúlad 13 km v route alternatíve vs 15 km v trip paneli.

## Preview oprava
Preview:
- `dpl_E19YhpX6cDqDmV2SK6juBh742VY1`

Pravidlo:
- raw Waze zostáva prvá voľba,
- OSRM first-step fallback sa smie použiť iba ak jeho dĺžka sedí na Waze step distance v intervale 0.65–1.35,
- ak OSRM vytvorí neprimeranú obchádzku, odmietne sa,
- ak raw Waze step sedí na Waze distance, použije sa `waze-raw-sane`.

Demjata preview:
- Waze distance: 12 952 m
- polyline: 13 161 m
- ratio: 1.016
- delta: +209 m
- first step: 1 100 m vs Waze 1 131 m
- firstStepRatio: 0.973
- firstStepGeometry: `waze-raw-sane`
- self intersections: 0

Reverse:
- ratio 1.016
- firstStepRatio 0.986

Košice:
- ratio 1.036
- firstStepRatio 0.831

## Arrow/follow bez cieľa
Pred opravou:
- s route: heading-up, pitch 45°, ahead 0.22
- bez route pri pohybe: pitch 0°, ahead 0.12
- bez route pri nízkej rýchlosti: obyčajné centrovanie

Po preview oprave:
- heading-up vector: route aj no-route = bearing podľa auta, pitch 45°, ahead 0.22
- north-up: route aj no-route = jumpAhead 0.22
- classic: route aj no-route = jumpAhead 0.22
- samotné `M.setCar(shown, shownHeading)` zostáva bez zmeny

Test:
- arrow follow 4/4 PASS
- client normalized diff: všetko mimo `followCar()` identické s production
- browser JS compile PASS

## Preserved
Bez zmeny:
- off-route logic
- global reroute throttle
- maneuver latch
- arrival guard
- Slovak maneuver texts
- GPS watchPosition / maximumAge 1000
- music `https://music-p45f.onrender.com/`
- QR/phone relay
- route alternatives 60 s
- Waze alerts
- lane guidance

## Services on preview
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone/QR 200
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200

## Read-only production reference
`tesla-sk` remains read-only:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
