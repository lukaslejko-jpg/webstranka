# Waze live alerts / polícia — stav 2026-10-18

## Stav po oprave

Alerts backend je opravený a používa priamo Waze RT.

Production:
- project: `tesla-sk-waze-lab-alerts`
- deployment: `dpl_2tmAnRn8GWe8yBS3ggN1qLXoC7Ra`
- alias: https://tesla-sk-waze-lab-alerts.vercel.app/

Health:
- HTTP 200
- `ok:true`
- `configured:true`
- `mode:waze-rt`
- `source:waze-rt`
- `degraded:false`

Pri kontrole v oblasti Prešova:
- 18 live alertov,
- 1–2 × `POLICE` podľa okamihu,
- približne 16 × `ROAD_CLOSED`,
- live policajné alerty boli potvrdené napr. v Prešove.

## Main LAB integration

Main LAB production:
- deployment: `dpl_EBFzNLmryk9vGohQwELE8BLMZqVT`

`/api/events` proxyuje funkčný LAB alerts backend.

`/api/waze-data-dense` po oprave:
- vypočíta bounding box z reálnej Waze geometrie,
- načíta live events pre koridor trasy,
- deduplikuje alerty,
- vloží ich do `bundle.events`.

Klient:
- `POLICE` → `🚓 Policajná hliadka`,
- police/camera warning threshold 1500 m,
- relevantný koridor do približne 180 m od trasy,
- deduplikácia už zahlásených alertov,
- closure reroute ostáva aktívny.


## Oprava backendu — 2026-10-18

Príčina:
- starý `events.js` používal Apify + Vercel Blob,
- projekt nemal nakonfigurované potrebné tokeny,
- výsledok bol `configured:false`, `degraded:true`, 0 alertov.

Oprava:
- `/api/events` bol prepnutý na funkčný interný endpoint `/api/events-rt`,
- zdroj je priamy Waze RT feed,
- nový produkčný alerts deployment: `dpl_8XGsPiG5ntyRJdUhYEGL56HvRWsi`,
- alerts alias: `https://tesla-sk-waze-lab-alerts.vercel.app`.

Overenie po oprave:
- HTTP 200,
- `degraded:false`,
- `source:waze-rt`,
- počas testu 18 alertov,
- z toho 2× `POLICE`,
- viacero `ROAD_CLOSED`.

Hlavná navigácia bola následne prepnutá na tento nový alerts backend.
Aktuálny hlavný produkčný deployment:
- `dpl_74HTaXu9d7qnswzpwf2yNijY2vLp`

Produkčný test po nasadení:
- events 200, `degraded:false`,
- počas kontroly 17 alertov,
- z toho 1× `POLICE`,
- Waze route 200,
- 2 alternatívne trasy,
- dense geometry `waze-routing-coords`,
- TTS 200 `audio/mpeg`,
- `/phone.html` 200,
- ikona 200.

Produkčný deployment je byte-for-byte totožný s preview `dpl_4rh5scUTBLMY9YSfyayZksqsNk4R`, ktorý prešiel regresným testom.
