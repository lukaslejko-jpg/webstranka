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
