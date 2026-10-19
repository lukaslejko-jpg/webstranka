> Povinný recovery bod: [SAFE_CHECKPOINT.md](SAFE_CHECKPOINT.md)

# CURRENT STATE — 2026-10-18

## Aktuálny LAB

- Alias: `tesla-sk-waze-lab.vercel.app`
- Aktuálny deployment: `dpl_EBFzNLmryk9vGohQwELE8BLMZqVT`
- Deployment URL: `tesla-sk-waze-hykt6l3wk-lukaslejko-9932s-projects.vercel.app`

Tento deployment bol nasadený po regressnom teste root/phone/Waze route/TTS.

## Posledný overený audit klienta

Pri prihlásenom klientovi bolo overené:

- `getFreshBrowserLocation` ✅
- `navigator.geolocation.getCurrentPosition` ✅
- `navigator.geolocation.watchPosition` ✅
- `maximumAge: 0` ✅
- `/api/waze-data-dense` ✅
- alternatívne `Trasy` ✅
- lane guidance ✅
- closure reroute ✅
- žiadny fallback `pos || M.center()` ✅
- pair panel/QR mechanizmus ✅

## GPS pravidlá

GPS nesmie routovať z mapového stredu.

Po štarte:
- vyžiadať fresh fix cez `getCurrentPosition`,
- high accuracy,
- `maximumAge: 0`,
- potom `watchPosition`,
- ak GPS chýba, novú trasu nezačínať z centra mapy.

Off-route logika má smerovať k správaniu:
- 2 spoľahlivé fixy mimo trasy,
- tolerancia približne 30–45 m podľa accuracy,
- výrazný odklon môže spustiť prepočet skôr,
- nový výpočet vždy Waze z aktuálnej GPS do pôvodného cieľa.

## Waze — zdroj pravdy

Waze je routing brain. Nepoužívať OSRM na rozhodovanie trasy.

Priamo z Waze:
- primárna trasa,
- alternatívne trasy,
- ETA,
- vzdialenosť,
- routeName/shortRouteName,
- free-flow čas,
- traffic delay,
- dense raw `coords`,
- manévre,
- roadType/segmentId,
- lane guidance/clientLaneSet,
- live alerts,
- jams,
- ROAD_CLOSED.

Mapový podklad je OpenFreeMap/OpenMapTiles/OSM, ale nemá určovať trasu.

Speed limit zatiaľ nezobrazovať: testované Waze segmenty vracali `speedLimit: 0`.

## Dense Waze geometria

Kľúčové endpointy:
- `/api/waze-route-dense`
- `/api/waze-data-dense`

Test Demjata 307 → Prešov, Vranovská 41:
- Waze route približne `545; 18`
- dense geometry z raw Waze coords
- trasa sa má vykresľovať po cestách bez OSM/OSRM dopočtu.

## Alternatívne trasy

- po štarte môžu byť zobrazené krátko,
- po skrytí nesmie zostať samostatné tlačidlo na mape,
- opätovné otvorenie cez `••• → Trasy`,
- prepnutie je manuálne,
- žiadny automatický switch.

## Lane guidance

Používať iba Waze lane údaje:
- `clientLaneSet.clientLane[]`
- `laneIndex`
- `angleObject[]`
- `selected`
- `instruction.laneGuidance`

Nevymýšľať lane selection z geometrie.

## Alerty / closure

Alerty:
- polícia,
- radar,
- nehoda,
- hazard,
- closure.

Aplikácia premieta alert na aktívnu Waze trasu, filtruje udalosti za autom a mimo koridoru a slovenský TTS upozornenie vysloví.

ROAD_CLOSED:
- nevymýšľať obchádzku,
- pri relevantnej uzávierke požiadať Waze o nový výpočet,
- chrániť proti opakovanému reroute na ten istý alert.

## QR / Prepojiť mobil

Pôvodný mechanizmus:
- Tesla vytvorí 8-znakový pair code,
- QR smeruje na `/phone.html?room=XXXXXXXX`,
- relay: `wss://tesla-hotspotnav-relay-test.onrender.com/ws`,
- Tesla nav socket používa `role=nav`,
- mobil používa `role=phone`,
- mobil posiela:
  `{type:'dest', lat, lng, name, source:'HotspotNav'}`.

Aktuálne:
- QR panel funguje,
- `/phone.html` musí vracať 200,
- mobilná stránka musí vedieť vyhľadať/označiť cieľ a odoslať ho do Tesly.

## Ikona aplikácie

Použiť iba schválenú modrú navigačnú ikonu s cestou/krajinou.
Aktuálna unikátna route:
- `/nav-icon-v8.png`

Staré icon URL majú smerovať na ten istý zdroj, aby Safari nedostávalo rozdielne ikony.

## Voice

Nerozbiť existujúce vetvenie:
- Tesla/browser: WebAudio,
- iPhone/iOS: persistent HTMLAudioElement.

TTS endpoint:
- `/api/tts`
- očakávaný Content-Type: `audio/mpeg`.

## Rollback / stabilné body

- pôvodný stabilný základ: `dpl_CpkSevLkXLPvUGtuJX2JCiyHakRW`
- unified GPS/dense/lane kandidát: `dpl_CuaFQJzSZ7TVsucNrQ4Bpqv7cstK`
- verzia s Trasy menu pred ďalšími zásahmi: `dpl_ADYgBxsTwanZKW4Xnnu6yFvwww3s`
- aktuálny LAB: `dpl_Bh5CcyMWYsPsg8XzrFc1bJYBmAH3`

Poznámka: staršie wrappery môžu pri opätovnom proxy vrstvení vytvoriť 508 loop. Nevrstviť ich mechanicky.

## Git stav

GitHub bol prehľadaný podľa:
- `tesla-sk-waze-lab`
- `getFreshBrowserLocation`
- `waze-data-dense`
- `tesla-hotspotnav-relay-test.onrender.com/ws`
- `HotspotNav`

V dostupných repozitároch `lukaslejko-jpg` sa zdroj LAB aplikácie nenašiel. Preto sa táto dokumentácia uchováva v samostatnej docs vetve bez zásahu do nasadeného kódu.


## QR fallback oprava 2026-10-18

Po zistení, že pôvodný `pairBtn.onclick = openMobilePair` bol síce v HTML prítomný, ale na zariadení nereagoval, bol doplnený nezávislý capture-phase fallback handler `pair-click-fallback-v3`.

Overené po prihlásení:
- klient 200,
- GPS fresh fix zachovaný,
- dense Waze zachovaný,
- Trasy zachované,
- lane guidance zachované,
- closure reroute zachované,
- fast reroute zachovaný,
- pair panel prítomný,
- QR generator prítomný,
- fallback handler prítomný.

Nasadenie po oprave: `dpl_BJh31WGiGLWvGH5fMVA1fHicEgpA`.


## Production / Vercel Toolbar

Aktuálny LAB alias je nasadený ako Vercel Production:
- deployment: `dpl_DePck6EKL4qJawCHt5ep6PRjb669`
- target: `production`
- alias: `https://tesla-sk-waze-lab.vercel.app/`

Toolbar problém vznikal tým, že proxied HTML zo staršieho Preview deploymentu už obsahovalo Vercel feedback script `https://vercel.live/_next-live/feedback/feedback.js`.

Oprava V4:
- serverová vrstva pred odoslaním HTML odstráni iba Vercel feedback script,
- GPS/Waze/Trasy/lane/closure/QR logika sa nemení,
- Production už nepridáva Preview toolbar znova.

Po nasadení overené na hlavnom alias-e:
- root 200,
- `vercel.live` v HTML: nie,
- `/phone.html?room=TEST1234` 200,
- Waze dense route 200 + `geometrySource=waze-routing-coords`,
- TTS 200 `audio/mpeg`.


## Live Waze polícia / hliadky

Klient podporuje `POLICE` alerty a zobrazuje ich ako `🚓 Policajná hliadka` s vlastnou ikonou a ahead warning logikou. Aktuálne však live alert backend nedodáva dáta:
- `tesla-waze-alerts.vercel.app/api/events` → HTTP 500,
- produkčný `/api/events` → HTTP 502 `degraded:true`,
- samostatný `tesla-sk-waze-lab-alerts` → HTTP 200, ale `degraded:true`, 0 alerts/0 jams.

Podrobný stav: [ALERTS_STATUS.md](ALERTS_STATUS.md).


## Kompletný audit 2026-10-18

Po oprave Waze RT alert backendu a V5 klienta bol vykonaný end-to-end production audit. Výsledok: [FULL_AUDIT_2026-10-18.md](FULL_AUDIT_2026-10-18.md).


## Kompletný regresný audit po oprave alerts

Dátum: 2026-10-18

Backend:
- alerts: 200, `degraded:false`, `source:waze-rt`
- POLICE live dáta potvrdené
- Waze route: 200
- 2 alternatívne trasy
- dense geometry: `waze-routing-coords`
- traffic delay dostupný
- TTS: 200 `audio/mpeg`
- phone: 200 + relay + send destination
- icon: 200

Release integrita:
- production `dpl_74HTaXu9d7qnswzpwf2yNijY2vLp`
- preview `dpl_4rh5scUTBLMY9YSfyayZksqsNk4R`
- rozdiely v deploynutých súboroch: 0

Tým je potvrdené, že produkcia je presne tá istá verzia, ktorá prešla preview testom.


## CLEAN SINGLE-DEPLOYMENT LAB — GPS oprava 2026-10-18 večer

Táto časť **nahrádza staršie GPS/proxy architektonické poznámky ako aktuálny source of truth**.

Aktuálny LAB:
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- deployment: `dpl_75KudV7ypV5rohArwwMiWB6Z4RU9`
- deployment URL: `tesla-sk-waze-64rq0ob1y-lukaslejko-9932s-projects.vercel.app`
- state: READY
- target: production

Aktuálna architektúra:
- `/` → lokálny `/api/lab-main`
- lokálny login `/api/lab_login`
- Waze routing cez lokálny `/api/waze_route` / Python backend
- bez runtime proxy reťazca cez `gp8xt426q` a `lbvp4ivdx`

Odstránené staré proxy vrstvy:
- `gps-fix.js`
- `lab-page.js`
- `route-fallback.js`
- `waze-route-dense.js`
- `waze-data.js`
- `waze-data-dense.js`

GPS source of truth je aktuálna produkčná logika `tesla-sk`:
`watchPosition → onFix → animateTo → M.setCar → followCar`

GPS parametre:
- `enableHighAccuracy: true`
- `maximumAge: 1000`
- `timeout: 20000`
- bez paralelného `getCurrentPosition` pollingu
- približne 900 ms animácia cez `requestAnimationFrame`

Produkcia `tesla-sk` bola pri oprave iba čítaná a ostala na deploymente:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Bezprostredný rollback bod pred clean rebuild:
- `dpl_75PStRH3V6kMuBCnJiXZMeDQA9s4`

Detail: [CLEAN_LAB_GPS_2026-10-18.md](CLEAN_LAB_GPS_2026-10-18.md)


## FULL AUDIT RELEASE — 2026-10-18 večer

Táto sekcia je aktuálny source of truth po kompletnom audite.

Hlavný LAB production:
- deployment: `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`
- URL: `tesla-sk-waze-a23b6g8nj-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY
- target: production

Testovaný preview:
- `dpl_41S9ENJffykDfRVipeyUoKnSBjFe`
- preview/production source rozdiely: **0 z 16 súborov**

Stabilný raw Waze helper:
- project: `tesla-sk-waze-lab-raw`
- project ID: `prj_XG565Yr7EZfez0xC63sBwfB5rXYZ`
- deployment: `dpl_DGUF8GaKECvNK5bVJ9vfN1SzfhBy`
- alias: `https://tesla-sk-waze-lab-raw.vercel.app/`
- state: READY

Opravené:
- dense Waze geometry z raw coords,
- 2 Waze alternatívne trasy,
- `••• → Trasy`,
- no-GPS no-center routing,
- 2-fix accuracy-aware reroute,
- lane guidance,
- POLICE/camera/hazard ahead warning,
- ROAD_CLOSED reroute,
- `/api/waze-drive` 200,
- QR/phone relay,
- traffic, TTS, chargers, availability.

Production `tesla-sk` ostala počas auditu nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Rollback pred release:
- `dpl_75KudV7ypV5rohArwwMiWB6Z4RU9`

Kompletný report:
[FULL_AUDIT_CLEAN_LAB_2026-10-18.md](FULL_AUDIT_CLEAN_LAB_2026-10-18.md)


## ROUTE ALTERNATIVES UI RESTORE — 2026-10-18

Aktuálny LAB production:
- deployment: `dpl_79yKXi6QWM5x1xgUyDMMLyyE2LhX`
- URL: `tesla-sk-waze-86zla04xy-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY

Zmena oproti predchádzajúcemu release:
- menil sa iba `api/lab-main.js`,
- alternatívne trasy sú znovu samostatné tlačidlá dole nad trip/ETA panelom,
- odstránený spoločný čierny route panel,
- automatické skrytie ostáva **60 sekúnd**,
- po manuálnom prepnutí sa 60 s timer reštartuje,
- `••• → Trasy` ich znovu otvorí na 60 s.

Testovaný preview:
- `dpl_Gp4mwm4cG6dLXh4XEauvLyiYCdTu`
- preview vs production source: 16/16 zhodných, rozdiely 0.

Rollback:
- `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`

Produkcia `tesla-sk` ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Detail:
[ROUTE_ALTERNATIVES_UI_FIX_2026-10-18.md](ROUTE_ALTERNATIVES_UI_FIX_2026-10-18.md)


## DEMJATA ROUTE START REPAIR — 2026-10-18 21:xx

Aktuálny LAB production:
- deployment: `dpl_2FT7pyPFTHy9cHmExEgYq95AewGY`
- URL: `tesla-sk-waze-d8grm0h2u-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY

Opravený konkrétny problém:
- Demjata 307 → Vranovská 41, Prešov mala šikmo skrátený úvod trasy,
- raw Waze full-route feed vynechával prvý lokálny segment,
- `/api/waze-route-dense` teraz skladá Waze connector + Waze tail,
- `geometry.startRepair:true` iba tam, kde prvý segment chýba.

Preview:
- `dpl_F259eNqB4GmudK113QcbQQWk6cve`

Rollback:
- `dpl_79yKXi6QWM5x1xgUyDMMLyyE2LhX`

Regresia po oprave:
- dense 200,
- reverse dense 200,
- waze-drive 200,
- events 200 / live POLICE + ROAD_CLOSED,
- traffic 200,
- QR/phone 200,
- TTS 200,
- chargers + availability 200.

Produkcia `tesla-sk` ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Detail:
[DEMJATA_ROUTE_START_FIX_2026-10-18.md](DEMJATA_ROUTE_START_FIX_2026-10-18.md)


## TESLA-SK FIRST-STEP PARITY — 2026-10-18

Aktuálny LAB production:
- deployment: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- URL: `tesla-sk-waze-51jw8u27h-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY

Oprava po porovnaní s `tesla-sk`:
- renderer bol už správny,
- problém bol v neúplnom raw Waze prvom kroku,
- ak prvý dense Waze krok obsahuje dieru > 180 m, iba jeho vizuálna geometria používa OSRM step geometry rovnakého typu ako `tesla-sk`,
- Waze stále rozhoduje trasu, ETA, alternatívy, reroute, alerty a ďalšie kroky.

Test Demjata 307 → Vranovská 41:
- routeName `545; 18`
- `firstStepGeometry: tesla-sk-osrm-step`
- `osrmFirstStepPoints: 72`
- odstránená slučka z predchádzajúceho start connector pokusu.

Testovaný preview:
- `dpl_DRRt8WZG1BGVsuFkqf8bPeXwV3h8`

Rollback:
- `dpl_2FT7pyPFTHy9cHmExEgYq95AewGY`

Produkcia `tesla-sk` ostala read-only a nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Detail:
[TESLA_SK_FIRST_STEP_PARITY_2026-10-18.md](TESLA_SK_FIRST_STEP_PARITY_2026-10-18.md)


## OFF-ROUTE NO-RUBBER-BAND — 2026-10-19

Aktuálny LAB production:
- deployment: `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`
- URL: `tesla-sk-waze-hvixu0fta-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY

Izolovaná zmena:
- menil sa iba `api/lab-main.js`,
- pri prvom spoľahlivom odklone sa stará modrá trasa okamžite skryje,
- počas reroute sa už nesmie kresliť spojenie `pos → oldRoute`,
- pri GPS šume sa stará trasa môže obnoviť,
- po úspešnom Waze reroute nová trasa nahradí starú atomicky.

Testovaný preview:
- `dpl_BcsXKRmQ9ceigoNjC8kL345T9XK9`

Rollback:
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

Produkcia `tesla-sk` ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Detail:
[OFF_ROUTE_NO_RUBBER_BAND_2026-10-19.md](OFF_ROUTE_NO_RUBBER_BAND_2026-10-19.md)


## ROLLBACK OFF-ROUTE RELEASE — 2026-10-19

Aktuálny LAB production:
- deployment: `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`
- URL: `tesla-sk-waze-d8e6cklzt-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY
- source: redeploy

Aktuálny obsah je **byte-for-byte zhodný** s rollback zdrojom:
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- source differences: 0

Revertovaný release:
- `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`
- nepoužívať ako recovery checkpoint.

Po rollbaku:
- root 200
- dense route 200
- waze-drive 200

Produkcia `tesla-sk` ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Detail:
[ROLLBACK_OFF_ROUTE_2026-10-19.md](ROLLBACK_OFF_ROUTE_2026-10-19.md)


## ROLLBACK OFF-ROUTE RELEASE — 2026-10-19

Aktuálny LAB production:
- deployment: `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`
- URL: `tesla-sk-waze-d8e6cklzt-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY
- source: redeploy

Aktuálny obsah je byte-for-byte zhodný s rollback zdrojom:
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- source differences: 0

Revertovaný release:
- `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`
- nepoužívať ako recovery checkpoint.

Po rollbaku:
- root 200
- dense route 200
- waze-drive 200

Produkcia `tesla-sk` ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Detail:
[ROLLBACK_OFF_ROUTE_2026-10-19.md](ROLLBACK_OFF_ROUTE_2026-10-19.md)


## NAVIGATION REGRESSION HARDENED RELEASE — 2026-10-19

Táto sekcia je aktuálny source of truth pre navigačný klient.

Aktuálny LAB production:
- deployment: `dpl_D7gQPdESJBUyAPi6v7JsnHE1fXpj`
- URL: `tesla-sk-waze-237e9vz92-lukaslejko-9932s-projects.vercel.app`
- alias: `https://tesla-sk-waze-lab.vercel.app/`
- state: READY
- target: production

Povinný rollback:
- `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`

Testovací preview:
- logic tests: `dpl_6kMy1Z9FRuNFb2xBcFecZXp5dBEM`
- client integrity audit: `dpl_37PfEiU4xgsARxVuZ1h9beNVui6w`
- clean RC: `dpl_CtvxtxFyAquvrQ9a99UfsvSMiCtt`

Výsledky:
- nav regression: **20/20 PASS**
- browser JS compile: PASS
- normalized client diff mimo povolených navigačných blokov: IDENTICKÝ
- music/GPS/QR preserved: PASS
- RC → production source differences: **0**
- backend production regression: PASS

Aktuálne správanie:
- off-route route sa od auta odpojí bez modrej gumy,
- 2 spoľahlivé fixy / strong deviation spustia reroute,
- global 6 s reroute throttle,
- parallel-road progress plausibility guard,
- rerouting banner bez starého manévru,
- failed reroute ostáva detached,
- arrival vyžaduje fyzickú blízkosť cieľa,
- pri arrival žiadne `Potom` ani lane guidance,
- fork/merge/ramp/continue/end-of-road/arrival-side navigácia po slovensky.

Zachované bez zmeny:
- GPS `watchPosition` s produkčnou logikou,
- hudba `https://music-p45f.onrender.com/`,
- QR/pair relay,
- 60 s alternatívne Trasy,
- Waze dense backend,
- POLICE / ROAD_CLOSED,
- traffic, TTS, chargers, availability.

Produkcia `tesla-sk` ostala nezmenená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Detail:
[NAV_REGRESSION_RELEASE_2026-10-19.md](NAV_REGRESSION_RELEASE_2026-10-19.md)
