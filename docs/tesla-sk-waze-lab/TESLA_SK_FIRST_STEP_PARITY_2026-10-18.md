# Tesla SK first-step parity — 2026-10-18

## Dôvod
Na trase Demjata 307 → Vranovská 41, Prešov vznikla po pokuse o Waze start repair slučka/trojuholník.

Porovnanie s produkciou `tesla-sk` ukázalo:
- `tesla-sk` používa OSRM route geometry pre jednotlivé navigačné kroky,
- renderer `buildRoute → M.setRoute` je jednoduchý a geometriu ďalej nevymýšľa,
- problém LAB teda nebol v rendereri, ale v neúplnej raw Waze geometrii prvého kroku.

## Finálne riešenie
Waze ostáva routing brain pre:
- výber trasy,
- ETA,
- alternatívy,
- reroute,
- traffic,
- alerty,
- lane guidance,
- ďalšie kroky.

Iba ak má prvý Waze dense krok veľkú dieru (> 180 m), jeho vizuálna geometria sa doplní rovnakým typom OSRM step geometry, aký používa `tesla-sk`.

Rozsah OSRM fallbacku:
- iba presný štart → prvý Waze manéver,
- neovplyvňuje Waze výber trasy,
- neovplyvňuje Waze ETA,
- neovplyvňuje alternatívy,
- neovplyvňuje ďalšie Waze dense kroky.

## Overenie
Trasa:
- From: Demjata 307 / `49.100883, 21.310617`
- To: Vranovská 41, Prešov / `49.022334, 21.278079`

Aktuálny výsledok:
- HTTP 200
- routeName: `545; 18`
- `firstStepGeometry: tesla-sk-osrm-step`
- `osrmFirstStepPoints: 72`
- prvý krok začína presne na zadanom štarte
- prvý krok končí na prvom Waze manévri
- odstránená trojuholníková slučka zo start-connector opravy

Opačný smer Prešov → Demjata:
- ak raw Waze prvý krok nemá problematickú dieru, ostáva `waze-raw`
- lane guidance ostáva zachovaná

## Release
Testovaný preview:
- `dpl_DRRt8WZG1BGVsuFkqf8bPeXwV3h8`

Production LAB:
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- URL: `tesla-sk-waze-51jw8u27h-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Rollback:
- `dpl_2FT7pyPFTHy9cHmExEgYq95AewGY`

Po production nasadení:
- dense route 200
- `firstStepGeometry: tesla-sk-osrm-step`
- `waze-drive` 200 / degraded:false
- events 200 / degraded:false
- live POLICE prítomné
- phone/QR 200

## Chránená produkcia
`tesla-sk` bola počas porovnania iba čítaná a ostala:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
