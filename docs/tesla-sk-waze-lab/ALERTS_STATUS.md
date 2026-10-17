# Waze live alerts / polícia — stav 2026-10-18

## Produkčný klient

Produkčný klient má implementované zobrazenie Waze alertov.

Mapovanie:
- `POLICE` → `🚓 Policajná hliadka`
- `ACCIDENT` → nehoda
- `ROAD_CLOSED` / `CLOSURE` → uzávierka
- `CAMERA` → pevný radar
- `JAM` → kolóna
- `CONSTRUCTION` → práce na ceste
- ostatné → nebezpečenstvo

Klient má:
- samostatnú mapovú ikonku pre políciu (`.waze-alert-bubble.police`),
- popup s názvom `Policajná hliadka`,
- filtrovanie alertov na aktívnu trasu,
- relevantný koridor približne do 180 m od trasy,
- alerty pred autom približne 25–1800 m,
- police/camera warning threshold 1500 m,
- deduplikáciu už zahlásených alertov.

## Aktuálny live backend stav

Produkčný proxy endpoint:
- `/api/events?top=...&bottom=...&left=...&right=...`

Aktuálne používaný upstream:
- `https://tesla-waze-alerts.vercel.app/api/events`

Kontrola 2026-10-18:
- upstream odpoveď: HTTP 500
- Vercel: `FUNCTION_INVOCATION_FAILED`
- produkčný `/api/events`: HTTP 502, `degraded:true`
- výsledok: `alerts: []`, `jams: []`

Samostatný LAB alerts projekt:
- projekt: `tesla-sk-waze-lab-alerts`
- project ID: `prj_VK9QCjWrvsCHo5gAgkZEsZJckfiA`
- produkčný deployment: `dpl_Fy91DWS15NPcG2zQhs3gdbnGYEw2`
- doména: `https://tesla-sk-waze-lab-alerts.vercel.app`

Kontrola:
- HTTP 200
- `degraded:true`
- `alerts: []`
- `jams: []`

## Vyhodnotenie

Funkcia POLICE/hliadky je na klientovi nasadená a pripravená správne, ale momentálne nemá živé dáta z backendu.

To znamená:
- UI a route-filtering fungujú,
- živá polícia sa v tomto okamihu nezobrazí, kým alert backend nezačne vracať reálne Waze alerty.

Pri každom release treba overiť nielen existenciu `POLICE` logiky v klientovi, ale aj:
1. `/api/events` musí vracať HTTP 200,
2. `degraded` musí byť false alebo aspoň musia byť reálne alerty,
3. pri dostupnom `POLICE` evente musí klient vytvoriť mapový marker a ahead warning.
