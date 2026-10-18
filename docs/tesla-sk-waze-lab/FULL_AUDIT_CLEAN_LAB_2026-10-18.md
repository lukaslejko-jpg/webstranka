# FULL AUDIT — CLEAN Tesla SK Waze LAB — 2026-10-18 večer

## Výsledok

Kompletný audit a opravy boli vykonané iba na `tesla-sk-waze-lab`.
Produkcia `tesla-sk` bola použitá iba ako read-only referencia a nebola menená.

### Aktuálny LAB production
- alias: https://tesla-sk-waze-lab.vercel.app/
- project: `tesla-sk-waze-lab`
- project ID: `prj_ehViWi0r8gYe226ofNZqneWzeE32`
- deployment: `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`
- URL: `tesla-sk-waze-a23b6g8nj-lukaslejko-9932s-projects.vercel.app`
- state: READY
- target: production

Testovaný preview:
- `dpl_41S9ENJffykDfRVipeyUoKnSBjFe`
- source files preview vs production: **16/16 zhodných, rozdiely 0**

Rollback pred audit release:
- `dpl_75KudV7ypV5rohArwwMiWB6Z4RU9`

### Read-only referencia tesla-sk
- project: `tesla-sk`
- project ID: `prj_RPdIhyouxvZWbPb7nqiQRAwsSMM0`
- deployment počas auditu: `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
- počas LAB auditu nezmenený

---

## 1. GPS / pohyb šípky

GPS klient zostáva fyzicky podľa produkčného mechanizmu:

`navigator.geolocation.watchPosition`
→ `onFix()`
→ `animateTo()`
→ `M.setCar(shown, shownHeading)`
→ `followCar()`

Parametre:
- `enableHighAccuracy: true`
- `maximumAge: 1000`
- `timeout: 20000`
- bez paralelného polling mechanizmu
- animácia približne 900 ms cez `requestAnimationFrame`

LAB routeTo už nesmie začať novú trasu z centra mapy, ak GPS fix ešte nie je dostupný. Cieľ sa uloží a aplikácia čaká na GPS.

---

## 2. Waze routing — oprava nesprávnej geometrie

Audit odhalil, že clean LAB používal síce Waze trasu, ale príliš riedku geometriu:
- test Demjata → Prešov: 58 / 72 bodov na dvoch trasách.

To spôsobovalo viditeľné skracovanie zákrut a trasu kreslenú mimo reálnej cesty.

### Oprava

Bol vytvorený samostatný stabilný LAB raw-Waze helper:
- project: `tesla-sk-waze-lab-raw`
- project ID: `prj_XG565Yr7EZfez0xC63sBwfB5rXYZ`
- alias: https://tesla-sk-waze-lab-raw.vercel.app/
- deployment: `dpl_DGUF8GaKECvNK5bVJ9vfN1SzfhBy`
- state: READY

Helper používa auditovaný raw Waze backend snapshot a vracia:
- raw Waze `coords`,
- segmenty,
- manévre,
- `clientLaneSet`,
- `laneGuidance`.

Hlavný LAB má lokálny `/api/waze-route-dense`, ktorý kombinuje:
- lokálny normalizovaný `/api/waze_route`,
- stabilný raw LAB helper,
- výsledkom je hustá Waze geometria bez historického preview page proxy chainu.

### Overené výsledky

Prešov → Demjata:
- route 1: rawCoordCount **267**
- route 2: rawCoordCount **419**
- lane guidance prítomná na trase, kde ju Waze poskytol

Demjata → Prešov:
- hustá geometria približne 180 / 333 raw bodov v čase auditu

Endpoint:
- `/api/waze-route-dense` → HTTP 200
- `code: Ok`
- `source: waze-pywaze-live-dense-stable`
- `geometry.source: waze-routing-coords`

---

## 3. Alternatívne trasy

- Waze vracia 2 alternatívy v testovaných trasách.
- Panel Trasa 1 / Trasa 2 sa zobrazí po výpočte.
- Po čase sa skryje.
- V menu `•••` je znovu dostupné tlačidlo `Trasy`.
- Prepnutie trasy je manuálne.
- Pri prepočte po odbočení sa načíta nová Waze sada trás od aktuálnej GPS.

---

## 4. Odbočenie mimo trasy / reroute

Pôvodný produkčný základ čakal 3 off-route fixy a 8 sekúnd.

LAB po audite:
- používa 2 spoľahlivé fixy mimo koridoru,
- tolerancia podľa accuracy približne 35–75 m,
- fix s veľmi zlou accuracy sa nepovažuje automaticky za dôkaz zídenia,
- cooldown približne 6 s,
- prepočet ide vždy z aktuálnej GPS do pôvodného cieľa,
- používa Waze dense route, nie OSRM.

---

## 5. Lane guidance

Lane údaje sa nevymýšľajú z geometrie.

Zdroj:
- `clientLaneSet.clientLane[]`
- `angleObject[]`
- `selected`
- `instruction.laneGuidance`

Test Prešov → Demjata:
- Waze raw obsahoval segment s `KEEP_RIGHT`
- 2 lanes
- druhá lane mala vybraný smer 45°
- dense route túto lane informáciu pripojila k navigačnému kroku

Klient zobrazuje lane šípky v manévrovom paneli.

---

## 6. Polícia / radary / hazard / closure

Endpoint:
- `/api/events` → 200
- `source: waze-rt`
- `degraded:false`

Po production deployi v širšej oblasti Prešova:
- 20 live alertov
- **2 × POLICE**
- **13 × ROAD_CLOSED**
- ďalšie hazard typy

Ďalšie kontrolné oblasti počas auditu:
- Košice: 4 × POLICE
- Bardejov: 5 × POLICE

Klient:
- POLICE → `🚓 Policajná hliadka`
- kamera → radar warning
- nehoda / hazard / closure vlastné vizuály
- alert sa premieta na aktívnu trasu
- relevantný koridor približne 180 m
- ahead window 25–1800 m
- polícia/kamera warning do cca 1500 m
- hlasové upozornenie sa deduplikuje
- ROAD_CLOSED na aktívnej trase môže spustiť jeden Waze reroute pre daný alert

Poznámka: live počty sa prirodzene menia podľa aktuálnych Waze hlásení.

---

## 7. Traffic

`/api/traffic`:
- HTTP 200
- `source: pywaze`
- počas production auditu boli prítomné live jam segmenty

Traffic sa premieta na zostávajúcu časť aktívnej trasy.

---

## 8. Waze drive aggregate

Historický `waze-drive.js` bol rozbitý závislosťou na odstránenom `/api/waze-data` a vracal 502.

Bol nahradený lokálnym agregátorom nad:
- dense Waze route,
- traffic,
- live events.

Po oprave:
- `/api/waze-drive` → 200
- `ok:true`
- `degraded:false`
- `source:waze-drive-local`
- 2 alternatives
- ETA / distance / free-flow / delay
- dense geometry metadata
- alertsAhead
- closures
- jams

---

## 9. QR / Prepojiť mobil

Tesla klient:
- generuje 8-znakový pair code
- QR obsahuje:
  `https://tesla-sk-waze-lab.vercel.app/phone.html?room=XXXXXXXX`
- QR sa generuje cez qrserver

`/phone.html?room=TEST1234`:
- HTTP 200
- relay prítomný:
  `wss://tesla-hotspotnav-relay-test.onrender.com/ws`
- mobil sa pripája ako `role=phone`
- odosiela:
  `{type:'dest', lat, lng, name, source:'HotspotNav'}`

Tesla nav socket používa `role=nav` a prijíma `type:'dest'`.

Statická/integrácia endpoint kontrola prešla. Samotné fyzické naskenovanie QR a websocket handshake dvoch zariadení vyžaduje reálny mobil/Teslu.

---

## 10. TTS

`/api/tts?text=Test navigacie`:
- HTTP 200
- Content-Type: `audio/mpeg`
- platný audio payload

---

## 11. Nabíjačky

`/api/chargers`:
- HTTP 200
- source: `hybrid`
- total: **328**
- liveCount: **69**

`/api/availability?stationId=2813826`:
- HTTP 200
- 2 / 2 available
- 2 EVSE body

---

## 12. Ikona

`/nav-icon-v8.png`:
- HTTP 200
- `image/png`

Staré icon routes v LAB smerujú na rovnaký schválený zdroj.

---

## 13. Login / architektúra

Root:
- HTTP 200 login page pre neautorizovaného klienta
- lokálne `LAB_ACCESS_CODE`
- lokálne `LAB_DEVICE_TOKEN`
- bez runtime page proxy cez staré `gp8xt` / `lbvp`

Aktuálny root:
`/` → `/api/lab-main`

---

## 14. Runtime

Po audite nebola zistená nová funkčná exception skupina.
Zostáva technický warning:
`[DEP0169] url.parse() behavior is not standardized`.

Je evidovaný ako technický dlh; testované endpointy kvôli nemu nepadajú.

---

## 15. Release integrita

Otestovaný preview:
- `dpl_41S9ENJffykDfRVipeyUoKnSBjFe`

Production:
- `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`

Porovnanie deployment source:
- preview: 16 zdrojových súborov
- production: 16 zdrojových súborov
- rozdiely: **0**

---

## Záver

Backend a staticky overiteľné klientské funkcie prešli po oprave.

Najdôležitejšie opravy oproti clean GPS buildu:
1. hustá raw Waze geometria,
2. stabilný raw LAB backend,
3. zákaz routovania z mapového stredu bez GPS,
4. rýchlejší a accuracy-aware reroute po zídení,
5. obnovené manuálne alternatívne Trasy,
6. lane guidance,
7. police/hazard ahead warnings,
8. ROAD_CLOSED reroute,
9. opravený `/api/waze-drive`.

Fyzický test počas jazdy zostáva jediný spôsob, ako definitívne potvrdiť dynamické správanie GPS, reroute a hlasových alertov v konkrétnom Tesla/iPhone browser runtime.
