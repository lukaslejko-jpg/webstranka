# SAFE CHECKPOINT — Tesla SK Waze LAB

Aktualizované: 2026-10-19

## SOURCE OF TRUTH

Tento súbor je povinný prvý bod obnovy kontextu pri každom ďalšom zásahu.

Ak sa stratí časť vlákna alebo pracovného kontextu:
1. NErekonštruovať stav zo starých správ.
2. NEvracať sa automaticky na starší deployment.
3. NEopakovať už hotové Git/dokumentačné kroky.
4. Najprv overiť aktuálne aliasy vo Verceli.
5. Porovnať ich s týmto checkpointom.
6. Pokračovať iba z aktuálneho produkčného stavu.

## Aktuálna hlavná produkcia

Alias:
- https://tesla-sk-waze-lab.vercel.app/

Projekt:
- tesla-sk-waze-lab
- project ID: `prj_ehViWi0r8gYe226ofNZqneWzeE32`

Aktuálny production deployment:
- `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`
- URL: `tesla-sk-waze-aorbayvj9-lukaslejko-9932s-projects.vercel.app`
- state: READY
- target: production

## Aktuálny alerts backend

Alias:
- https://tesla-sk-waze-lab-alerts.vercel.app/

Projekt:
- tesla-sk-waze-lab-alerts
- project ID: `prj_VK9QCjWrvsCHo5gAgkZEsZJckfiA`

Aktuálny production deployment:
- `dpl_2tmAnRn8GWe8yBS3ggN1qLXoC7Ra`
- URL: `tesla-sk-waze-lab-alerts-drvbmi9z6-lukaslejko-9932s-projects.vercel.app`
- state: READY
- target: production

## Hotové veci — NEOPAKOVAŤ bez dôvodu

- GPS fresh fix / getCurrentPosition / watchPosition
- maximumAge: 0
- zákaz routovania z mapového stredu
- Waze dense geometria
- alternatívne Trasy
- lane guidance
- closure reroute
- fast reroute
- QR pairing panel
- /phone.html
- mobilný relay
- app ikona
- odstránenie Vercel Toolbaru
- production target na hlavnom LAB
- live POLICE / ROAD_CLOSED klientská logika
- alerts backend samostatný projekt
- Git dokumentačná vetva
- Git dokumentácia CURRENT_STATE / ALERTS_STATUS / manifest

Tieto kroky sa nesmú znovu robiť len preto, že sa stratila časť vlákna.

## Povinné pravidlo pred deployom

Pred KAŽDÝM ďalším deployom:
1. zapísať aktuálny production deployment ako rollback,
2. meniť iba presne zadanú časť,
3. preview,
4. test endpointov,
5. test prihláseného klienta,
6. až potom production,
7. po production overiť alias,
8. aktualizovať tento checkpoint iba ak sa production ID zmení.

## Zakázané postupy

- žiadne slepé wrapper reťazenie,
- žiadne návraty na staré deploymenty bez porovnania,
- žiadne opakované nasadenie Git/docs, ak už je zapísané,
- žiadne „opravy“ funkčných častí mimo zadania,
- žiadne prepísanie GPS/Waze/QR pri nesúvisiacej zmene,
- žiadne tvrdenie „hotovo“ bez kontroly aktuálneho aliasu.

## Ak sa kontext stratí

Stačí obnoviť:
- tento SAFE_CHECKPOINT,
- CURRENT_STATE.md,
- ALERTS_STATUS.md,
- VERCEL_SOURCE_MANIFEST.md.

A pokračovať z aktuálnych aliasov.



## CLEAN ARCHITECTURE CHECKPOINT — 2026-10-18 večer

Od tohto bodu je zakázané obnoviť starý runtime proxy reťazec:
`gps-fix → gp8xt426q → lab-page → lbvp4ivdx`.

Aktuálny root:
`/` → `/api/lab-main`.

GPS:
`watchPosition → onFix → animateTo → M.setCar → followCar`.

Produkcia `tesla-sk` je iba read-only referencia. Pri tejto oprave ostala na:
`dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`.

Rollback bezprostredne pred clean rebuild:
`dpl_75PStRH3V6kMuBCnJiXZMeDQA9s4`.

Podrobnosti: [CLEAN_LAB_GPS_2026-10-18.md](CLEAN_LAB_GPS_2026-10-18.md)


## FULL AUDIT SAFE POINT — 2026-10-18 večer

Aktuálny povinný recovery bod:
- main LAB: `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`
- tested preview: `dpl_41S9ENJffykDfRVipeyUoKnSBjFe`
- preview vs production source: 16/16 zhodných
- raw Waze helper: `tesla-sk-waze-lab-raw` / `dpl_DGUF8GaKECvNK5bVJ9vfN1SzfhBy`
- rollback pred release: `dpl_75KudV7ypV5rohArwwMiWB6Z4RU9`

Neodstraňovať ani neobchádzať raw helper, pokiaľ nová implementácia nepreukáže rovnakú hustú Waze geometriu a lane dáta.

Produkcia `tesla-sk` je stále read-only referencia a pri tomto release ostala:
`dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`.

Audit report:
[FULL_AUDIT_CLEAN_LAB_2026-10-18.md](FULL_AUDIT_CLEAN_LAB_2026-10-18.md)


## ROUTE UI SAFE POINT — 2026-10-18

Aktuálny route UI checkpoint:
- main LAB: `dpl_79yKXi6QWM5x1xgUyDMMLyyE2LhX`
- tested preview: `dpl_Gp4mwm4cG6dLXh4XEauvLyiYCdTu`
- preview vs production: 16/16 source files zhodných
- rollback: `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`

Povinné UI pravidlo pre alternatívne trasy:
- iba samostatné tlačidlá,
- dole nad trip/ETA panelom,
- bez spoločného čierneho panelu,
- auto-hide 60000 ms,
- po manuálnom prepnutí reset na 60000 ms,
- po skrytí znovu otvoriť iba cez `••• → Trasy`.

Detail:
[ROUTE_ALTERNATIVES_UI_FIX_2026-10-18.md](ROUTE_ALTERNATIVES_UI_FIX_2026-10-18.md)


## DEMJATA START SAFE POINT — 2026-10-18

Aktuálny recovery bod:
- main LAB: `dpl_2FT7pyPFTHy9cHmExEgYq95AewGY`
- tested preview: `dpl_F259eNqB4GmudK113QcbQQWk6cve`
- rollback: `dpl_79yKXi6QWM5x1xgUyDMMLyyE2LhX`

Povinné pravidlo pre dense route štart:
- ak raw Waze full-route feed vynechá prvý segment,
- použiť Waze-only connector `start → first anchor`,
- potom Waze-only tail `first anchor → destination`,
- bez OSRM,
- bez routovania z mapového stredu.

Konkrétny test:
Demjata 307 → Vranovská 41, Prešov
- `geometry.startRepair:true`
- prvý dense bod = presný štart `21.310617,49.100883`

Detail:
[DEMJATA_ROUTE_START_FIX_2026-10-18.md](DEMJATA_ROUTE_START_FIX_2026-10-18.md)


## FIRST-STEP PARITY SAFE POINT — 2026-10-18

Aktuálny recovery bod:
- main LAB: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- tested preview: `dpl_DRRt8WZG1BGVsuFkqf8bPeXwV3h8`
- rollback: `dpl_2FT7pyPFTHy9cHmExEgYq95AewGY`

Pravidlo:
- renderer kopíruje princíp `tesla-sk`: krok sa kreslí z kompletnej step geometry,
- Waze ostáva routing brain,
- OSRM sa smie použiť iba ako vizuálna výplň prvého kroku pri chýbajúcej raw Waze geometrii,
- žiadne start connector slučky.

Detail:
[TESLA_SK_FIRST_STEP_PARITY_2026-10-18.md](TESLA_SK_FIRST_STEP_PARITY_2026-10-18.md)

## NAVIGATION GUIDANCE SAFE POINT — 2026-10-19

Aktuálny recovery bod po oprave horného navigačného okna:
- main LAB: `dpl_BkqdtjLCUHttGozS4pYyivFjZ3Q5`
- tested clean preview: `dpl_9une1vS8WzqSo36dTKTYPENxHfvm`
- preview vs production: **16/16 source files zhodných**
- rollback pred release: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

Povinné pravidlá, ktoré sa pri ďalších zmenách nesmú stratiť:
- navigačné pokyny v hornom banneri/TTS sú po slovensky,
- aktuálny manéver sa nesmie prepnúť na ďalší pred fyzickým prejdením uzla,
- prechod nastane až po dvoch spoľahlivých GPS fixoch za adaptívnym pass bufferom,
- do 25 m zobraziť `Teraz`,
- zvýraznenie jazdných pruhov vychádza výlučne z Waze `clientLaneSet`,
- pri reroute sa nesmie kresliť trasa za vozidlom,
- spodný trip progress sa pri reroute/zmene alternatívy nesmie resetovať na nulu,
- pri reroute zachovať zvolený index Waze alternatívy, ak stále existuje,
- WebAudio hlas navigácie používa efektívny gain 1.33× pri UI 100 %,
- backend Waze/GPS/events/traffic/QR/chargers/TTS ostáva mimo tejto UI opravy.

Detail:
[NAV_GUIDANCE_FIX_2026-10-19.md](NAV_GUIDANCE_FIX_2026-10-19.md)



## OFF-ROUTE VISUAL SAFE POINT — 2026-10-19

Aktuálny recovery bod:
- main LAB: `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`
- tested preview: `dpl_BcsXKRmQ9ceigoNjC8kL345T9XK9`
- rollback: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

Povinné správanie:
- prvý spoľahlivý off-route fix → okamžité `M.clearRoute()`,
- počas `offVisual/routing` žiadne `M.setRoute([pos,...oldRoute])`,
- GPS šum môže starú trasu obnoviť,
- potvrdený odklon → Waze reroute,
- novú modrú trasu zobrazí až nový `setRoute()`.

Detail:
[OFF_ROUTE_NO_RUBBER_BAND_2026-10-19.md](OFF_ROUTE_NO_RUBBER_BAND_2026-10-19.md)


## OFF-ROUTE ROLLBACK SAFE POINT — 2026-10-19

Aktuálny recovery bod:
- main LAB: `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`
- source-identical rollback base: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- source differences: 0

Zakázaný recovery bod:
- `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`

Jeho off-route vizuálna zmena bola revertovaná po regresnej analýze.

Detail:
[ROLLBACK_OFF_ROUTE_2026-10-19.md](ROLLBACK_OFF_ROUTE_2026-10-19.md)


## MUSIC SOURCE PARITY SAFE POINT — 2026-10-19

Aktuálny recovery bod po izolovanej výmene zdroja hudby:
- main LAB: `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`
- tested preview: `dpl_9BdE8squRojdMXNuoozoXURnduUT`
- rollback: `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`
- `api/lab-main.js`: `ec3c480d9667e3c183434ab9e777a90268494eb2`
- ostatných 15/16 source SHA bez zmeny

Hudba:
- produkčný zdroj: `https://music-p45f.onrender.com/`
- starý zdroj `music-mobile-307.onrender.com/?mobile=1` sa už nepoužíva.

Povinné pravidlo:
- zachovať existujúci `musicOverlay`, `musicGrab`, iframe lifecycle a zatváranie/minimalizáciu,
- pri hudobnej zmene nemeníť GPS/Waze/reroute/TTS/QR/traffic/chargers ani navigačný renderer.

Detail:
[MUSIC_SOURCE_PARITY_2026-10-19.md](MUSIC_SOURCE_PARITY_2026-10-19.md)


## NAVIGATION REGRESSION SAFE POINT — 2026-10-19

Aktuálny recovery bod:
- main LAB: `dpl_D7gQPdESJBUyAPi6v7JsnHE1fXpj`
- clean RC: `dpl_CtvxtxFyAquvrQ9a99UfsvSMiCtt`
- production vs RC source differences: 0

Povinný rollback pred týmto release:
- `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`

Pred production prešlo:
- 20/20 navigation regression tests,
- browser JS compile,
- normalized full-client integrity audit,
- music/GPS/QR exact preservation,
- dense/drive/events/traffic/phone/TTS/chargers/availability/icon regression.

Chránené pravidlá:
- žiadne modré spojenie auta späť na starú route počas off-route,
- stará route môže zostať zobrazená iba od projected snap pointu dopredu,
- 2 reliable fixes alebo strong deviation → reroute,
- 6 s global reroute throttle,
- parallel-road snap musí byť progress-plausible,
- arrival iba pri fyzickej blízkosti cieľa,
- arrive nesmie zobrazovať `Potom`,
- navigačné pokyny fork/merge/ramp/continue/end-of-road musia byť slovenské.

Zachovať bez zásahu:
- `MUSIC_URL=https://music-p45f.onrender.com/`
- GPS `watchPosition`,
- QR/pair relay,
- 60 s alternatívne Trasy,
- Waze alerts/lane/traffic.

Produkcia `tesla-sk` je read-only referencia a ostáva:
`dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`.

Detail:
[NAV_REGRESSION_RELEASE_2026-10-19.md](NAV_REGRESSION_RELEASE_2026-10-19.md)


## TESTED NAVIGATION SAFE POINT — 2026-10-19

Aktuálny checkpoint:
- main LAB: `dpl_HoBiGtoSipY7PUJJ9ziXJspoGnKb`
- tested latch preview: `dpl_URvYbpPaiPTa3WNuyBaRxSB6gZ2P`
- production lab-main SHA = preview lab-main SHA:
  `9de6566d7efcc56db1cb58e4f37eef77b0ef1dc4`

Rollback úrovne:
1. immediate rollback pred maneuver latch:
   `dpl_D7gQPdESJBUyAPi6v7JsnHE1fXpj`
2. full rollback pred dnešným navigation regression balíkom:
   `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`

Povinné zachovať:
- GPS `watchPosition`, `maximumAge:1000`
- music `https://music-p45f.onrender.com/`
- QR/phone relay
- alternatives 60000 ms
- Waze alerts / lane guidance
- off-route detached route nesmie začínať v CAR
- arrival musí byť potvrdený fyzickou vzdialenosťou
- `arrive` nesmie zobrazovať `Potom`
- banner nesmie preskočiť na ďalší manéver iba kvôli route snapu
- maneuver latch sa uvoľní až po fyzickom prejdení alebo 100 m fail-safe.

Detail:
[NAVIGATION_REGRESSION_RELEASE_2026-10-19.md](NAVIGATION_REGRESSION_RELEASE_2026-10-19.md)


## ROUTE GEOMETRY + ARROW FOLLOW SAFE POINT — 2026-10-19

Aktuálny recovery bod:
- main LAB: `dpl_78MAGdYSkmdQPCmj8dmMGGhy845y`
- tested preview: `dpl_E19YhpX6cDqDmV2SK6juBh742VY1`
- immediate rollback: `dpl_HoBiGtoSipY7PUJJ9ziXJspoGnKb`

Povinné pravidlá:
- OSRM first-step fallback sa nesmie akceptovať, ak dĺžkou výrazne nesedí na Waze step distance.
- Demjata regression target: total polyline ratio približne 1.0, bez slučky.
- followCar sa nesmie vetviť podľa existencie `route`.
- arrow/map follow s cieľom aj bez cieľa musí používať rovnaký heading-up/north-up behavior.
- maneuver latch, off-route, arrival guard, hudba, QR, Waze alerts a lane guidance sa pri tejto oprave nemenia.

Detail:
[ROUTE_GEOMETRY_ARROW_RELEASE_2026-10-19.md](ROUTE_GEOMETRY_ARROW_RELEASE_2026-10-19.md)


## VOICE REPAIR SAFE POINT — 2026-10-19

Aktuálny recovery bod:
- main LAB: `dpl_F3AYtpP4EVsggkFmDjDBtAT6mJ4E`
- tested voice preview: `dpl_DRpdPfjx1Dvz8tmwBq7QzaUrZJba`
- immediate rollback: `dpl_78MAGdYSkmdQPCmj8dmMGGhy845y`

Povinné pravidlá:
- voice repair migration iba raz,
- neskoršie explicitné vypnutie hlasu sa rešpektuje,
- test/potvrdenie hlasu používa force mode,
- mirror ostáva bez navigačného hlasu,
- všetko mimo voice sekcie musí zostať identické.

Detail:
[VOICE_REPAIR_RELEASE_2026-10-19.md](VOICE_REPAIR_RELEASE_2026-10-19.md)


## ROBUST VOICE SAFE POINT — 2026-10-19

Aktuálny recovery bod:
- main LAB: `dpl_92bcPeKpMLuXXAYSbsq4ACC7Yi9z`
- tested preview: `dpl_8CHythJdAckfH5U5p7jU1dw8JqSs`
- immediate rollback: `dpl_F3AYtpP4EVsggkFmDjDBtAT6mJ4E`

Playback order:
1. WebAudio
2. persistent HTMLAudio fallback
3. speechSynthesis fallback

Voice diagnostics:
- `/api/voice-diag`
- no GPS/destination/spoken text logged.

Detail:
[ROBUST_VOICE_RELEASE_2026-10-19.md](ROBUST_VOICE_RELEASE_2026-10-19.md)


## LAST DRIVE NAVIGATION SAFE POINT — 2026-10-19

Aktuálny recovery bod:
- main LAB: `dpl_Do9x8bnASfyGaGWHQbZqwmxcbtzp`
- tested preview: `dpl_5hUeoqRpGVYGDt1zZSPPcwFVSxSu`
- immediate rollback: `dpl_92bcPeKpMLuXXAYSbsq4ACC7Yi9z`

Povinné pravidlá:
- voice/music/GPS sections musia zostať identické pri ďalších navigation zásahoch,
- raw Waze geometry sa delí podľa Waze step distance,
- zero-distance step nesmie pridávať route geometry,
- displayed route nesmie začínať umelou spojnicou z CAR,
- committed turn first-fix reroute pravidlá sa nesmú odstrániť bez field-test dôvodu,
- `Dorazili ste do cieľa` patrí iba skutočnému arrive().

Detail:
[LAST_DRIVE_NAV_FIX_RELEASE_2026-10-19.md](LAST_DRIVE_NAV_FIX_RELEASE_2026-10-19.md)


## TODAY REROUTE HYSTERESIS SAFE POINT — 2026-10-20

Aktuálny recovery bod:
- main LAB: `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`
- tested preview: `dpl_GJgPrDMiyVcbGv4616E5TMYAUinB`
- immediate rollback: `dpl_Do9x8bnASfyGaGWHQbZqwmxcbtzp`

Povinné zachovať:
- voice/music/GPS byte-identical pri ďalších navigation zásahoch,
- no CAR → stale-route connector,
- arrival safety,
- maneuver latch,
- first immediate reroute,
- post-reroute stabilization/hysteresis,
- emergency >250 m bypass.

Detail:
[TODAY_REROUTE_HYSTERESIS_RELEASE_2026-10-20.md](TODAY_REROUTE_HYSTERESIS_RELEASE_2026-10-20.md)
