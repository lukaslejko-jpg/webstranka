# NAVIGATION REGRESSION HARDENING — 2026-10-19

## Rozsah

Zmena bola vykonaná iba na `tesla-sk-waze-lab`.

Produkcia `tesla-sk` bola počas celej analýzy použitá iba ako read-only referencia a ostala nezmenená na:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Bezpečný rollback pred deployom

Pred akoukoľvek production zmenou bol explicitne uzamknutý checkpoint:
- production pred zásahom: `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`
- URL: `tesla-sk-waze-eg42b9324-lukaslejko-9932s-projects.vercel.app`
- tento deployment je povinný rollback bod.

Pre-deploy checkpoint:
[PREDEPLOY_NAV_SAFE_2026-10-19.md](PREDEPLOY_NAV_SAFE_2026-10-19.md)

## Porovnanie s tesla-sk

Read-only `tesla-sk` potvrdil stabilný GPS/rendering základ:
- browser `watchPosition`,
- `onFix → animateTo → M.setCar → followCar`,
- route drawing z krokovej geometrie.

Zároveň sa potvrdilo, že `tesla-sk` nie je vhodné slepo kopírovať pre tieto časti:
- off-route používa konzervatívnejšie 3 fixy / 8 s,
- počas off-route kreslí `[pos, ...oldRoute]`,
- arrival kontrola je založená príliš na route snap,
- niektoré manévre sú po anglicky.

Preto boli tieto chyby riešené iba v LAB a ostatné stabilné časti ostali zachované.

## Chyby kontrolované podľa jazdy a starých fotografií

Fotografie boli zo staršej chybnej verzie, ale audit ukázal, že niektoré riziká boli stále možné aj v aktuálnom klientovi pred opravou:

1. `Keep left at the fork na 545` — current klient stále obsahoval anglické fork/merge/ramp/continue texty.
2. predčasné `Dorazili ste do cieľa` — arrival sa mohol rozhodnúť podľa chybného route snapu.
3. `Potom` po príchode — renderBanner nemal arrive guard.
4. modrá „guma“ — off-route stále kreslil auto priamo k starej route.
5. opakované reroute requesty — v poslednej jazde boli pozorované requesty v krátkom slede.
6. parallel-road snap — locate mohol prijať vzdialený bod tej istej trasy.

## Finálna klientská logika

### Off-route bez modrej gumy

Stavy:
- `on-route`
- `off-route`
- `rerouting`
- `reroute-failed`

Prvý spoľahlivý off-route fix:
- route sa označí ako detached,
- auto sa už NEspája modrou čiarou so starou trasou,
- stará cesta pred autom môže zostať zobrazená od projected snap pointu.

Ak ďalší fix ukáže GPS šum:
- klient sa vráti do `on-route`,
- normálne kreslenie sa obnoví.

Potvrdený odklon:
- normálne po 2 spoľahlivých fixoch,
- pri výraznom odklone už po prvom fix-e.

Počas reroute:
- banner: `Prepočítavam trasu…`,
- starý navigačný pokyn sa nevyslovuje,
- stará route zostáva od auta odpojená.

Pri zlyhaní reroute:
- stav `reroute-failed`,
- route ostáva detached,
- banner informuje `Mimo trasy · hľadám novú trasu`.

### Reroute throttle

Pridaný globálny timestamp:
- `lastOffRouteRerouteAt`

Dôvod:
- ochrana pretrvá aj po `setRoute()`,
- nový route object už nevynuluje ochranný interval.

Interval:
- 6000 ms.

### Parallel-road / crossing snap ochrana

`locate()` teraz vyhodnocuje aj plausibility route progress:
- predchádzajúci `along`,
- GPS timestamp,
- speed,
- maximálny realistický forward progress,
- tolerancia malého backward snapu.

Celoroute fallback sa prijme iba ak:
- je významne bližší,
- a súčasne progress ostáva plausibilný.

### Arrival

Príchod už nie je založený iba na route end/snap.

Akceptovaný je:
- fyzická GPS vzdialenosť do cieľa <= 35 m,
alebo
- destDist <= 80 m,
- remain <= 160 m,
- loc.d <= 80 m,
- a arrive/near-final-step condition.

Test:
- 650 m pred cieľom → arrival FALSE.

Pri reálnom arrive:
- route sa okamžite vyčistí,
- banner: `Teraz / Dorazili ste do cieľa`,
- `Potom` sa okamžite skryje,
- lane guidance sa vyčistí.

### Slovenské manévre

Odstránené testované anglické navigačné texty:
- Keep left/right at the fork
- Merge
- Take the ramp
- Take the exit
- Continue
- At the end of the road
- arrival `on the left/right`

Používané slovenské texty:
- `Držte sa vľavo/vpravo`
- `Zaraďte sa`
- `Použite nájazd`
- `Použite výjazd`
- `Pokračujte`
- `Na konci cesty ...`
- `Dorazili ste do cieľa vľavo/vpravo`

## Automatické testy

Testovací preview:
- `dpl_6kMy1Z9FRuNFb2xBcFecZXp5dBEM`

`/api/nav-regression`:
- HTTP 200
- `ok:true`
- **20/20 testov PASS**

Testované:
1. on-route ostáva attached
2. prvý off-route fix iba detach
3. GPS noise návrat
4. druhý off-route fix spustí reroute
5. strong deviation immediate reroute
6. global 6 s throttle
7. zlá GPS accuracy ignorovaná
8. failed reroute ostáva detached
9. návrat na starú trasu po failure
10. attached route začína CAR
11. detached route nezačína CAR
12. 650 m premature arrival blocked
13. fyzický arrival accepted
14. route-end arrival iba pri cieli
15. arrive nikdy nezobrazí Potom
16. normálny manéver môže zobrazovať Potom
17. parallel-road far jump rejected
18. normálny forward progress accepted
19. small backward snap tolerated
20. slovenské manévre

## Client integrity audit

Audit preview:
- `dpl_37PfEiU4xgsARxVuZ1h9beNVui6w`

Výsledok:
- browser JS compile: PASS
- normalized full-client diff: PASS
- normalized old/new SHA:
  `f95329efff3a21ca819e5134a552fc4643067ae5b09870e1c6f269cb18caff09`
- mimo povolených navigačných blokov identické.

Explicitne zachované:
- MUSIC section: identická
- GPS section: identická
- QR/pair section: identická
- `MUSIC_URL=https://music-p45f.onrender.com/`
- browser `watchPosition`
- alternatives 60000 ms
- Waze alerts
- phone relay

Forbidden English navigation strings:
- hits: 0

## Route/backend regresia

Preview testované trasy:
- Demjata 307 → Vranovská 41
- Vranovská 41 → Demjata 307
- Košice sample z poslednej jazdy
- airport sample z poslednej jazdy

Všetky:
- HTTP 200
- Waze dense source OK.

Geometry loop audit:
- Demjata → Vranovská: 0 self intersections, 0 strong backtrack triples
- Vranovská → Demjata: 0 / 0
- Košice sample: 0 / 0

Poznámka:
Demjata prvý krok má dlhší cestný detour a path/direct ratio > 1, ale test nepotvrdil trojuholníkovú slučku zo starej chybnej verzie.

## Služby pred production

Čistý release-candidate:
- `dpl_CtvxtxFyAquvrQ9a99UfsvSMiCtt`
- URL: `tesla-sk-waze-58o3wf9ld-lukaslejko-9932s-projects.vercel.app`

RC vs pôvodný production `dpl_Gekt...`:
- 16 súborov vs 16 súborov
- jediný rozdiel: `api/lab-main.js`

RC služby:
- root 200
- dense 200 / 2 routes
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone 200 + relay + dest
- TTS 200 audio/mpeg
- chargers 200
- availability 200
- icon 200

## Production release

Nový LAB production:
- deployment: `dpl_D7gQPdESJBUyAPi6v7JsnHE1fXpj`
- URL: `tesla-sk-waze-237e9vz92-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY
- target: production

Production vs clean RC:
- 16/16 files
- source differences: **0**

Aktuálny `api/lab-main.js` SHA:
- `9f8606f184c77bcd56d5fe5dc82f49a30284def4`

## Production regression po nasadení

- root 200
- dense 200, 2 Waze routes
- drive 200, degraded:false
- events 200, degraded:false
- live POLICE prítomné
- ROAD_CLOSED prítomné
- traffic 200
- phone/QR 200
- TTS 200 audio/mpeg
- chargers 200
- availability 200
- icon 200

## Rollback

Povinný rollback:
- `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`

Ak sa pri reálnej jazde objaví regresia, vrátiť presne tento deployment a nepokúšať sa počas rollbacku opravovať ďalšie veci.
