# ROUTE GEOMETRY + ARROW FOLLOW RELEASE — 2026-10-19

## Scope
Release iba pre `tesla-sk-waze-lab`.

Produkcia `tesla-sk` bola použitá iba read-only a ostala:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Aktuálny LAB production
- deployment: `dpl_78MAGdYSkmdQPCmj8dmMGGhy845y`
- URL: `tesla-sk-waze-ksbobqnt2-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Immediate rollback:
- `dpl_HoBiGtoSipY7PUJJ9ziXJspoGnKb`

## 1. Route geometry regression

### Problem
Na trase Demjata 307 → Vranovská:
- Waze distance: 12 952 m
- production polyline pred opravou: 14 830 m
- rozdiel: +1 878 m

Prvý Waze step:
- Waze step distance: 1 131 m
- OSRM fallback polyline: 2 768 m

To spôsobovalo:
- slučku v Demjate,
- vizuálne kreslenie po nesprávnej vetve,
- route alternative cca 13 km,
- trip panel cca 15 km.

### Fix
`api/waze-route-dense.js` teraz pri first-step repair používa dĺžkovú sanity kontrolu.

OSRM first-step fallback sa akceptuje iba ak:
- `repairLength / WazeStepDistance` je v intervale 0.65–1.35.

Ak OSRM vytvorí neprimeranú obchádzku:
- odmietne sa,
- ak raw Waze step sedí na Waze distance, použije sa `waze-raw-sane`,
- inak ostáva normalizovaný Waze fallback.

### Demjata výsledok
Po oprave:
- Waze distance: 12 952 m
- polyline: 13 161 m
- ratio: 1.016
- delta: +209 m
- first step: 1 100 m
- Waze first step: 1 131 m
- firstStepRatio: 0.973
- firstStepGeometry: `waze-raw-sane`
- self intersections: 0

Reverse:
- total ratio 1.016
- firstStepRatio 0.986

Košice:
- total ratio 1.036
- firstStepRatio 0.831

## 2. Arrow/follow parity bez cieľa

### Pred opravou
`followCar()` sa správal podľa existencie route:

S route:
- heading-up vector
- bearing podľa auta
- pitch 45°
- ahead 0.22

Bez route pri pohybe:
- bearing podľa auta
- pitch 0°
- ahead 0.12

Bez route pri nízkej rýchlosti:
- obyčajný `M.jump(shown)`

Samotné `M.setCar(shown, shownHeading)` bolo vždy rovnaké.

### Po oprave
Follow správanie už nezávisí od toho, či je cieľ/route zadaný.

Heading-up vector:
- route aj no-route:
  - bearing = shownHeading
  - pitch = 45°
  - ahead = 0.22

North-up:
- route aj no-route:
  - `M.jumpAhead(..., 0.22)`

Classic:
- route aj no-route:
  - `M.jumpAhead(..., 0.22)`

## 3. Testy pred production

Preview:
- `dpl_E19YhpX6cDqDmV2SK6juBh742VY1`

Arrow follow:
- 4/4 PASS

Client normalized diff:
- všetko mimo `followCar()` identické s predošlým production
- browser JS compile PASS
- preserved:
  - GPS watchPosition
  - maximumAge 1000
  - music `https://music-p45f.onrender.com/`
  - QR/phone
  - Waze alerts
  - maneuver latch
  - off-route no-rubber-band

Geometry:
- Demjata PASS
- Reverse PASS
- Košice PASS
- loop inflation removed PASS

Services preview:
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone 200
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200

## 4. Production source integrity
Oproti rollback deploymentu `dpl_HoBi...` sa zmenili iba:

- `api/lab-main.js`
  - old SHA: `9de6566d7efcc56db1cb58e4f37eef77b0ef1dc4`
  - new SHA: `7a3e6ccc41a35f635d7064822f9be1852da7393d`

- `api/waze-route-dense.js`
  - old SHA: `a1f8757ed4a8c7acf76e8bd273cbe10b84ebc5c0`
  - new SHA: `5cb25a987ff7e293564d50aef53908c638352aa3`

Production source count:
- 16 files

Test/diagnostic endpointy:
- 0

## 5. Production regression after deploy
Demjata:
- 200
- Waze distance 12 952 m
- polyline 13 161 m
- ratio 1.016
- firstStepGeometry `waze-raw-sane`
- firstStepRatio 0.973

Services:
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone 200
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200

Runtime:
- iba známy Node DEP0169 `url.parse()` warning
- žiadny nový funkčný exception typ
