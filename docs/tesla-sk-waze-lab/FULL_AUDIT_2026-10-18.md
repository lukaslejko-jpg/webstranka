# Kompletný audit Tesla SK – Waze LAB
Dátum: 2026-10-18

## Produkčné deploymenty

Hlavná aplikácia:
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- deployment: `dpl_EBFzNLmryk9vGohQwELE8BLMZqVT`
- target: `production`

Alerts backend:
- alias: `https://tesla-sk-waze-lab-alerts.vercel.app/`
- deployment: `dpl_2tmAnRn8GWe8yBS3ggN1qLXoC7Ra`
- target: `production`

## Alerts backend — oprava

Pôvodný `api/events.js` používal Apify + Blob snapshot a projekt nemal potrebné tokeny:
- `configured:false`
- výsledok: degraded/0 alerts

Existujúci `/api/events-rt` používa priamo Waze RT a funguje.

Oprava:
- `/api/events` bol prepojený na funkčný Waze RT zdroj,
- hlavná aplikácia `api/events.js` bola prepojená na `tesla-sk-waze-lab-alerts.vercel.app/api/events`.

Po oprave:
- HTTP 200
- `degraded:false`
- `source:waze-rt`
- počas auditu 17–18 živých alertov v oblasti Prešova
- reálne `POLICE` eventy prítomné

Príklady počas auditu:
- POLICE — Levočská, Prešov
- POLICE — Petrovianska, Prešov

## Produkčný klient

Klientsky build po oprave alertov je identický s posledným auditovaným unified klientom vo všetkých hlavných súboroch okrem `events.js`.

Zachované:
- fresh GPS
- `getCurrentPosition`
- `watchPosition`
- `maximumAge:0`
- zákaz routovania z mapového stredu
- Waze dense route
- alternatívne Trasy
- lane guidance
- closure reroute
- fast reroute
- QR/pairing
- phone relay
- TTS
- ikona
- odstránený Vercel Toolbar

## Endpoint audit

### /api/events
- 200
- degraded:false
- source:waze-rt
- počas posledného testu: 17 alerts
- typy: 16 ROAD_CLOSED, 1 POLICE

### /api/waze-route-dense
- 200
- 2 Waze trasy
- `geometrySource=waze-routing-coords`
- traffic delay sa vracia

### /api/waze-data
- 200
- traffic live data sa vracajú
- Waze jam segmenty prítomné

### /api/waze-drive
- 200
- degraded:false
- ETA/distance/free-flow/delay
- alternatives
- closures/alertsAhead štruktúra prítomná

### /api/traffic
- 200
- Waze live jam segmenty prítomné

### /api/tts
- 200
- `audio/mpeg`

### /phone.html
- 200
- relay URL prítomná
- odoslanie cieľa do Tesly prítomné

### /api/chargers
- 200
- live + statické nabíjačky
- audit: liveCount 62, total count 322

### /api/availability
Test `stationId=1785387`:
- 200
- Greenway
- available 1 / total 1
- EVSE status AVAILABLE

### /nav-icon-v8.png
- 200
- image/png
- SHA-256 `71782f254469bfd01a8b0c37404e1b9a5b18dce9b334cbffe0e5d5b30383f233`

## Polícia / hliadky

Klient:
- `POLICE` → `🚓 Policajná hliadka`
- modrá mapová ikona
- popup s názvom Policajná hliadka
- route projection
- lateral filter približne 180 m
- ahead window približne 25–1800 m
- police/camera warning threshold 1500 m
- deduplikácia už zahlásených alertov

Backend po oprave reálne vracia POLICE eventy.

## Vercel Toolbar

Na produkčnom root HTML:
- `vercel.live` sa nenachádza
- toolbar sa nemá zobrazovať

## Runtime chyby

Hlavná aplikácia:
- bez funkčných exception skupín
- evidovaný iba Node warning:
  `[DEP0169] url.parse() behavior is not standardized`

Alerts backend:
- rovnaký Node deprecation warning
- bez funkčného pádu endpointov po oprave

Tento warning nie je aktuálne funkčná chyba, ale technický dlh na neskoršie odstránenie.

## Vyhodnotenie

Aktuálne kritické funkčné celky prešli:
- login
- GPS
- Waze routing
- dense geometria
- alternatívne trasy
- traffic
- polícia/hliadky
- closure
- TTS
- QR/pairing
- mobilná stránka
- nabíjačky
- dostupnosť nabíjačiek
- ikona
- odstránenie Vercel Toolbar

Pri ďalších zmenách zachovať pravidlo: preview → regresný audit → production.


## Delta kontrola po audite

Namiesto opakovania celého auditu boli porovnané aktuálne deploymenty s poslednými auditovanými.

Aktuálne aliasy:
- main: `dpl_EBFzNLmryk9vGohQwELE8BLMZqVT`
- alerts: `dpl_2tmAnRn8GWe8yBS3ggN1qLXoC7Ra`

Rozdiely oproti staršiemu auditovanému buildu boli iba v:
- `api/events.js` — proxy na Waze RT alerts backend,
- `api/waze-data-dense.js` — live alerts v route bundle,
- `api/lab-page.js` + `api/lab_login.js` — unified V5 klient/login,
- alerts `api/health.js` — Waze RT healthcheck.

Delta kontrola aktuálnej produkcie:
- root 200, Vercel Toolbar neprítomný,
- `/api/events` 200, `degraded:false`, live POLICE prítomný,
- `/api/waze-data-dense` 200, 2 Waze trasy, `geometrySource=waze-routing-coords`, live alerty vložené do bundle,
- alerts `/api/health` 200, `ok:true`, `mode:waze-rt`, `degraded:false`.

Celý audit nebol opakovaný, pretože ostatné súbory ostali identické podľa SHA.
