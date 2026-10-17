# Tesla SK Waze LAB — full production audit 2026-10-18

## Production deployments

Main LAB:
- alias: https://tesla-sk-waze-lab.vercel.app/
- deployment: `dpl_EBFzNLmryk9vGohQwELE8BLMZqVT`
- target: production

Alerts backend:
- alias: https://tesla-sk-waze-lab-alerts.vercel.app/
- deployment: `dpl_2tmAnRn8GWe8yBS3ggN1qLXoC7Ra`
- target: production

## Alerts backend repair

Pôvodný `events.js` bol závislý na Apify/Blob konfigurácii a health hlásil `configured:false`.

Oprava:
- `/api/events` používa funkčný `/api/events-rt`,
- zdroj: `waze-rt`,
- health endpoint kontroluje reálny Waze RT backend,
- `/api/health` teraz vracia `ok:true`, `configured:true`, `degraded:false`.

Pri audite:
- live alerts: 18,
- POLICE: 1–2 podľa okamihu kontroly,
- ROAD_CLOSED: 16,
- route bundle obsahuje live alerts priamo v `events`.

## End-to-end production test

### Login / shell
- root HTTP 200
- login page dostupná
- Vercel Toolbar: neprítomný
- project feedback toolbar vypnutý pre production aj preview

### GPS
- `getFreshBrowserLocation`: OK
- `getCurrentPosition`: OK
- `watchPosition`: OK
- `maximumAge: 0`: OK
- žiadny fallback z `M.center()`: OK

### Waze routing
Test route: Demjata → Prešov, Vranovská.
- dense route HTTP 200
- 2 Waze routes
- geometrySource: `waze-routing-coords`
- rawCoordCount: 129
- traffic delay: vracia sa
- Trasy menu: OK
- route alternatives: OK
- fast reroute: OK

### Lane guidance
- klientská lane guidance logika: prítomná
- testovaná route aktuálne mala `laneSteps: 0`, teda Waze pre túto konkrétnu trasu neposkytol lane dáta
- funkcia sa nevymýšľa z geometrie

### Police / alerts
- `/api/events`: HTTP 200
- `degraded:false`
- source: `waze-rt`
- live `POLICE` eventy reálne prítomné
- klient mapuje `POLICE` na `🚓 Policajná hliadka`
- police/camera ahead threshold: 1500 m
- alert corridor filtering a deduplikácia: prítomné
- `waze-data-dense` obsahuje `events` priamo v bundle

### Closure reroute
- `ROAD_CLOSED` live alerty prítomné
- klientská closure reroute logika prítomná
- nevymýšľa obchádzku, žiada nový Waze výpočet

### Traffic
- `/api/traffic`: HTTP 200
- source: `pywaze`

### Chargers
- `/api/chargers`: HTTP 200
- source: hybrid
- liveCount pri teste: 60
- count pri teste: 319
- detail availability na stationId `2625023`: HTTP 200, 5/5 available

### TTS / voice
- `/api/tts`: HTTP 200
- Content-Type: `audio/mpeg`
- iOS persistent audio branch: prítomný
- WebAudio branch: prítomný

### Mobile pairing
- pair panel: prítomný
- pôvodný `openMobilePair`: prítomný
- nezávislý capture fallback: prítomný
- `/phone.html`: HTTP 200
- relay: `wss://tesla-hotspotnav-relay-test.onrender.com/ws`
- `role=nav`: prítomné
- mobilné odoslanie cieľa: prítomné

### Icon
- `/nav-icon-v8.png`: HTTP 200
- SHA-256: `71782f254469bfd01a8b0c37404e1b9a5b18dce9b334cbffe0e5d5b30383f233`

## Runtime errors

V oboch projektoch sa pri audite neobjavila funkčná runtime chyba aplikácie.

Vercel hlási iba Node deprecation warning:
`DEP0169 url.parse()`

Je to warning v runtime/dependency vrstve, nie zlyhanie funkcie. Neovplyvňuje HTTP výsledky ani aktuálne testované funkcie.

## Záver

Produkčný LAB je po oprave alerts backendu funkčný v testovaných kritických oblastiach:
GPS, Waze routing, dense geometry, alternatívne trasy, fast reroute, lane support, police/live alerts, closure reroute, traffic, chargers, TTS, QR pairing, ikona a toolbar removal.
