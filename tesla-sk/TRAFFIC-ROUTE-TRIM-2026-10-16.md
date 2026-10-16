# Tesla SK – Waze traffic prichytený na aktívnu trasu

Dátum: 2026-10-16
Produkcia: https://tesla-sk.vercel.app
Deployment: `dpl_Bqh7nBbqZH29Kj6mjd39o8doZyZy`

## Problém
Waze traffic geometria sa mohla zobraziť vedľa modrej OSRM trasy a zostávala viditeľná aj po prejdení vozidlom.

## Oprava
Zmenené bolo iba vykreslenie Waze dopravy:
- každý Waze traffic segment sa pred vykreslením premietne na aktuálnu OSRM trasu,
- segment sa zobrazí iba ak oba jeho konce ležia do 75 m od aktívnej trasy,
- samotná farebná čiara sa kreslí po bodoch našej OSRM trasy, nie po paralelnej Waze geometrii,
- aplikácia sleduje `loc.along` – prejdenú vzdialenosť po trase,
- časť traffic segmentu za vozidlom sa priebežne orezuje,
- po prejdení celého úseku sa segment odstráni,
- doprava sa mimo aktívnej trasy nezobrazuje.

## Nedotknuté časti
- OSRM routing,
- mapa,
- Waze hliadky/incidenty,
- Waze traffic backend,
- hlas,
- nabíjačky,
- Domov/Práca,
- mobilné párovanie,
- Music overlay.

## Overenie
- produkcia READY,
- stránka HTTP 200,
- Waze traffic API HTTP 200,
- aktívne route snapping funkcie,
- aktívne trimovanie za vozidlom,
- routing zostáva OSRM.

Predchádzajúci HIT:
`tesla-sk/HIT-2026-10-16-waze-traffic-fixed`
