# OFF-ROUTE NO-RUBBER-BAND FIX — 2026-10-19

## Rozsah
Izolovaná zmena iba v klientskom `navUpdate/off-route/rerouting` správaní projektu `tesla-sk-waze-lab`.

Produkcia `tesla-sk` bola použitá iba ako read-only referencia a nebola menená.

## Problém
Pri odbočení mimo aktívnej trasy klient ešte počas čakania na reroute kreslil:

`aktuálna poloha auta → najbližší bod starej trasy → zvyšok starej trasy`

To vytváralo modrú „gumu“/spojnicu ťahanú za autom.

## Oprava
Pridaný vizuálny off-route stav na existujúcu route:

- prvý spoľahlivý GPS fix mimo koridoru:
  - `route.offVisual = true`
  - okamžite `M.clearRoute()`
  - stará modrá trasa sa už nepripája k šípke
- ak ďalší fix potvrdí, že išlo iba o GPS šum:
  - `offVisual` sa vypne
  - stará trasa sa obnoví
- normálny odklon:
  - reroute po 2 spoľahlivých fixoch
- výrazný odklon:
  - reroute môže začať už po prvom spoľahlivom fixe
- počas `routing === true` a potvrdeného odklonu:
  - stará trasa zostáva skrytá
- až `setRoute()` novej Waze trasy:
  - resetuje `offVisual`
  - zobrazí novú modrú trasu

Pri zlyhaní reroute requestu sa stará trasa nepripojí falošnou diagonálou k autu.

## Parametre
- tolerance približne 35–75 m podľa GPS accuracy
- spoľahlivý fix: accuracy <= 60 m
- strong off-route: > max(70 m, tolerance + 25 m)
- normálny reroute: 2 spoľahlivé off-route fixy
- reroute cooldown: 6000 ms

## Izolácia zmeny
Preview vs predchádzajúci production:
- menil sa iba `api/lab-main.js`
- backend Waze dense, GPS backend, alerts, traffic, QR/phone, TTS, chargers a availability neboli menené

## Release
Testovaný preview:
- `dpl_BcsXKRmQ9ceigoNjC8kL345T9XK9`

Production LAB:
- `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`
- URL: `tesla-sk-waze-hvixu0fta-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Preview vs production:
- source rozdiely: 0

Rollback:
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

Po production nasadení:
- `/api/waze-route-dense` → 200
- `/api/waze-drive` → 200

## Chránená produkcia
`tesla-sk` ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
