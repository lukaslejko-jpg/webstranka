# NAVIGATION REGRESSION RELEASE — 2026-10-19

## Scope
Release iba pre `tesla-sk-waze-lab`.

Produkcia `tesla-sk` bola počas celej analýzy a nasadenia read-only:
- deployment `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Aktuálny LAB production
- deployment: `dpl_HoBiGtoSipY7PUJJ9ziXJspoGnKb`
- URL: `tesla-sk-waze-7k4sp2wcq-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

## Rollback body
Immediate rollback pred maneuver latch:
- `dpl_D7gQPdESJBUyAPi6v7JsnHE1fXpj`

Úplný rollback pred dnešným navigačným balíkom:
- `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`

## Zdroj release
Production oproti `dpl_D7g...`:
- zmenený iba `api/lab-main.js`
- production SHA: `9de6566d7efcc56db1cb58e4f37eef77b0ef1dc4`
- tento SHA je presne z testovaného latch preview `dpl_URvYbpPaiPTa3WNuyBaRxSB6gZ2P`
- production neobsahuje žiadne testovacie/diagnostické endpointy

Backend `waze-route-dense` ostal:
- SHA `a1f8757ed4a8c7acf76e8bd273cbe10b84ebc5c0`

---

## 1. Off-route bez modrej gumy
Pri prvom spoľahlivom odklone:
- route sa označí ako detached,
- auto sa už nespája modrou čiarou späť na starú trasu,
- stará trasa môže zostať zobrazená iba od projektovaného SNAP bodu dopredu.

Normálny odklon:
- reroute po 2 spoľahlivých fixoch.

Výrazný odklon:
- reroute môže začať po prvom spoľahlivom fixe.

GPS s accuracy > 60 m:
- sama o sebe nespustí off-route stav.

Globálny off-route throttle:
- min. 6000 ms medzi off-route reroute požiadavkami,
- timestamp prežíva výmenu route objektu a bráni request stormu.

Pri zlyhanom reroute:
- stav je `reroute-failed`,
- stará route zostáva od auta odpojená,
- po návrate na starú trasu sa vie stav vrátiť na `on-route`.

## 2. Parallel-road / route snap ochrana
`locate()` už nesmie akceptovať vzdialený skok na inú paralelnú alebo križujúcu časť tej istej route iba preto, že je geometricky bližšie.

Kontrola používa:
- predchádzajúci route progress,
- čas medzi GPS fixmi,
- rýchlosť,
- max. plausibilný forward progress,
- tolerovaný malý backward snap.

## 3. Arrival guard
Staré správanie mohlo pri chybném route snap vyhlásiť príchod stovky metrov pred cieľom.

Aktuálne:
- fyzický príchod: GPS do 35 m od cieľa,
- route-end príchod: cieľ do 80 m + remain do 160 m + loc.d do 80 m + arrive/near-end condition.

Test explicitne blokuje:
- `650 m` predčasný arrival.

Pri `arrive()`:
- modrá route sa vyčistí,
- banner = `Teraz / Dorazili ste do cieľa`,
- `Potom` sa okamžite skryje,
- lane guidance sa vyčistí.

## 4. Slovenské navigačné texty
Odstránené testované anglické pokyny:
- Keep left/right at the fork
- Merge
- Take the ramp
- Take the exit
- At the end of the road
- Continue
- arrive side `on the left/right`

Použité slovenské varianty:
- `Držte sa vľavo/vpravo`
- `Zaraďte sa`
- `Použite nájazd`
- `Použite výjazd`
- `Na konci cesty ...`
- `Pokračujte`
- `Dorazili ste do cieľa vľavo/vpravo`

## 5. Maneuver latch — návesť pred odbočením
Pôvodná logika v LAB aj `tesla-sk` prepínala pokyn hneď, keď route snap matematicky prekročil `step.start`.

To mohlo spôsobiť:
- zmiznutie pokynu pred fyzickým prejdením križovatky,
- zobrazenie ďalšieho manévru príliš skoro.

Aktuálne:
- banner má samostatný `bannerJ`,
- sleduje fyzickú vzdialenosť GPS od manévrového bodu,
- route snap sám o sebe banner neprepne,
- manéver sa uvoľní až po fyzickom prejdení bodu,
- prejdenie = min. fyzická vzdialenosť <= 30 m, následné vzdialenie aspoň o 8 m a route progress aspoň 5 m za bodom,
- fail-safe po 100 m za manévrom zabráni zaseknutiu banneru,
- do 15 m sa na banneri zobrazuje `Teraz`,
- dočasný backward snap neposúva banner späť,
- nový reroute/reset route resetuje latch.

---

## 6. Automatické testy
Navigation regression:
- **20/20 PASS**

Maneuver latch:
- **6/6 PASS**

Testované scenáre zahŕňajú:
- on-route,
- prvý off-route fix,
- GPS noise recovery,
- druhý off-route fix,
- strong deviation,
- 6 s throttle,
- bad accuracy,
- failed reroute,
- return-to-route recovery,
- attached route begins at CAR,
- detached route begins at SNAP, nie CAR,
- 650 m premature arrival blocked,
- physical arrival,
- route-end arrival,
- no `Potom` at arrival,
- parallel-road far jump rejected,
- normal progress,
- small backward snap,
- Slovak maneuver phrases,
- banner hold before junction,
- premature snap beyond junction,
- closest-point hold,
- physical pass release,
- 100 m fail-safe,
- backward snap banner protection.

## 7. Browser client audit
Embedded browser JavaScript:
- syntax compile: PASS
- client length: 125702
- audited SHA256: `8333fae2ccca7d629c06ffa129e804278fa7716a747cfd3c8a84f5fd78722605`

Preserved:
- production GPS `watchPosition`
- `maximumAge: 1000`
- music URL `https://music-p45f.onrender.com/`
- QR/phone pairing
- websocket relay
- alternatives 60 s
- Waze alerts
- lane guidance

Forbidden tested English maneuver strings:
- 0 hits

## 8. Route/backend production regression
Po production deployi:

Demjata 307 → Vranovská:
- HTTP 200
- source `waze-pywaze-live-dense-stable`
- 2 routes

Vranovská → Demjata:
- HTTP 200
- 2 routes

Košice sample:
- HTTP 200
- 3 routes
- lane guidance prítomná

Services:
- root 200
- waze-drive 200 / ok:true / degraded:false
- events 200 / degraded:false
- traffic 200
- phone 200 + relay + role=phone + dest
- TTS 200 audio/mpeg
- chargers 200 / 328 total / 69 live
- availability 200 / 2 of 2 available
- nav icon 200 image/png

Live Waze kontrola počas release:
- 19 alerts
- 2 POLICE
- 12 ROAD_CLOSED

## 9. Staré obrázky
Fotografie s:
- `Keep left at the fork`,
- predčasným `Dorazili ste do cieľa`,
- zvyškovým `Potom`,
- deformovanou modrou route

pochádzali zo starej verzie.

Release bol napriek tomu explicitne testovaný tak, aby sa tieto chyby v aktuálnom klientovi neopakovali.

## 10. Runtime
Jediná evidovaná runtime error group:
- Node `DEP0169 url.parse()` deprecation warning

Testované endpointy kvôli nemu nepadajú. Nový funkčný exception typ po release nebol zistený.
