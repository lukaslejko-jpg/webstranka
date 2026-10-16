# Tesla SK – HIT Waze hliadky + doprava

Dátum: 2026-10-16
Stav: **funkčná referenčná verzia**

## Produkcia
- Tesla SK: https://tesla-sk.vercel.app
- Tesla SK deployment: `dpl_5cyaX5DAYUkwnpqUiFGXLwKUKpUp`
- Waze alerts: https://tesla-waze-alerts.vercel.app
- Waze alerts deployment: `dpl_3BVewzGxtMhbGU7PuM33N2vC47b3`
- Waze traffic: https://tesla-waze-traffic.vercel.app
- Waze traffic deployment: `dpl_Aknj4udmNYemnSLJHzZENWMeyf2T`

## Hliadky / incidenty – oprava regiónu
Pôvodný Waze alerts backend používal príliš veľkú cache dlaždicu (0.25° a zber ±0.35°), takže požiadavka na Prešov mohla dostať prvé výsledky z Košíc.

Oprava:
- cache dlaždica 0.10°,
- rozsah zberu odvodený od požadovaného bboxu,
- alerty a jams filtrované na regionálny zber,
- live odpoveď aj fallback snapshot filtrované na požadovaný bbox ±0.035°.

Overenie:
- Prešov bbox: 20 alertov,
- všetkých 20 v správnej oblasti,
- prítomný typ POLICE,
- výsledky sú z Prešova.

## Doprava – Waze route traffic
Stará Tesla Waze čerpala farebnú premávku hlavne z `route.trafficJams`.
Priamy serverový Waze RoutingManager dnes vracia 403, preto nový backend používa:
- Python,
- `pywaze 1.2.4`,
- `curl_cffi` a Chrome TLS impersonáciu,
- výpočet spomalenia z `crossTime / crossTimeWithoutRealTime`.

Úrovne:
- level 2: žltá/oranžová,
- level 3: oranžovo-červená,
- level 4: červená.

Tesla SK používa Waze traffic iba ako overlay. Routing zostáva OSRM.

## Overenie Prešov → Demjata
- Waze traffic endpoint HTTP 200,
- pri finálnom teste 4 spomalené úseky,
- Waze incidents: 20 Prešovských udalostí vrátane POLICE,
- traffic vrstva je nad modrou trasou,
- MapLibre aj Leaflet vetva podporujú overlay.

## Nedotknuté
- OSRM routing,
- OpenFreeMap/OSM mapa,
- slovenský hlas + hlasitosť + WebAudio fix,
- live nabíjačky,
- Domov / Práca,
- mobilné párovanie,
- Music overlay,
- trip progress a cieľ.

## Predchádzajúca bezpečnostná záloha
- vetva: `HIT-tesla-sk-before-waze-overlay-2026-10-16`
- priečinok: `tesla-sk/HIT-2026-10-16-before-waze-overlay`
