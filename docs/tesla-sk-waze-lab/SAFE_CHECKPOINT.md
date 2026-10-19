# SAFE CHECKPOINT — Tesla SK Waze LAB

Aktualizované: 2026-10-18

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
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- URL: `tesla-sk-waze-51jw8u27h-lukaslejko-9932s-projects.vercel.app`
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

