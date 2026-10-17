# CURRENT STATE — 2026-10-18

## Aktuálny LAB

- Alias: `tesla-sk-waze-lab.vercel.app`
- Aktuálny deployment: `dpl_DePck6EKL4qJawCHt5ep6PRjb669`
- Deployment URL: `tesla-sk-waze-lwrc4jh94-lukaslejko-9932s-projects.vercel.app`

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
