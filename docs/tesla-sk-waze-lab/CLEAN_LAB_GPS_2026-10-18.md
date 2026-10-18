# CLEAN LAB GPS — 2026-10-18

## Rozsah
Táto oprava sa týka výhradne projektu `tesla-sk-waze-lab`.
Produkcia `tesla-sk` bola použitá iba ako read-only referencia a nebola menená ani redeployovaná.

## Dôvod opravy
LAB mal historicky viacvrstvový runtime reťazec:

`LAB /` → `/api/gps-fix` → preview `gp8xt426q` → `/api/lab-page` → starší základ `lbvp4ivdx`.

GPS logika sa tým prepisovala vo viacerých vrstvách. To bolo rizikové pre `watchPosition`, `onFix`, animáciu markeru a ďalšie opravy.

## Nová architektúra
Aktuálny LAB je jeden samostatný deployment bez starého proxy reťazca.

Root:
`/` → `/api/lab-main`

Lokálne LAB súbory:
- `api/lab-main.js`
- `api/lab_login.js`
- `api/app.py`
- `api/events.js`
- `api/traffic.js`
- `api/chargers.js`
- `api/availability.js`
- `api/tts.js`
- `api/phone.js`
- `api/send-destination.js`
- `api/nav-icon-v8.js`

Odstránené z aktuálneho deploymentu:
- `gps-fix.js`
- `lab-page.js`
- `route-fallback.js`
- `waze-route-dense.js`
- `waze-data.js`
- `waze-data-dense.js`

## GPS
GPS mechanizmus bol prevzatý zo snapshotu aktuálnej produkcie `tesla-sk`:

`navigator.geolocation.watchPosition`
→ `onFix()`
→ `animateTo()`
→ `M.setCar(shown, shownHeading)`
→ `followCar()`.

Parametre:
- `enableHighAccuracy: true`
- `maximumAge: 1000`
- `timeout: 20000`
- bez paralelného `getCurrentPosition` pollingu
- animácia polohy približne 900 ms cez `requestAnimationFrame`.

Dôležité: produkcia sa pri vytvorení snapshotu iba čítala. LAB už za behu neproxyuje produkčnú stránku ani staré preview deploymenty.

## Waze routing
LAB routovanie ostáva Waze-based cez lokálny Python backend `/api/waze_route`.

Overený test:
- from: `49.100790, 21.310636`
- to: `49.022334, 21.278079`
- HTTP: `200 OK`
- odpoveď: `code: Ok`
- platná route geometry a navigačné kroky.

LAB klient podporuje viac Waze alternatív a manuálne prepnutie medzi nimi.

## Prihlasovanie
Prihlasovanie je lokálne v aktuálnom LAB deploymente:
- `LAB_ACCESS_CODE`
- `LAB_DEVICE_TOKEN`
- cookie `lab_device`.

Login už nevolá starý deployment `lbvp4ivdx`.

## Aktuálny checkpoint
- alias: https://tesla-sk-waze-lab.vercel.app/
- project ID: `prj_ehViWi0r8gYe226ofNZqneWzeE32`
- deployment: `dpl_75KudV7ypV5rohArwwMiWB6Z4RU9`
- deployment URL: `tesla-sk-waze-64rq0ob1y-lukaslejko-9932s-projects.vercel.app`
- state: `READY`
- target: `production`

## Produkcia — chránený referenčný bod
Produkčný projekt:
- `tesla-sk`
- project ID: `prj_RPdIhyouxvZWbPb7nqiQRAwsSMM0`
- deployment pri tejto oprave: `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

Tento deployment sa počas LAB opravy nezmenil.

## Rollback
Bezprostredný rollback bod pred clean rebuild:
- `dpl_75PStRH3V6kMuBCnJiXZMeDQA9s4`

Historické proxy deploymenty sa nemajú používať ako nový základ bez explicitnej analýzy.

## Povinné pravidlo
Pri ďalšej práci:
1. `tesla-sk` iba čítať, pokiaľ používateľ výslovne nepovolí zásah do produkcie.
2. LAB meniť iba z aktuálneho clean single-deployment základu.
3. Neobnovovať `gp8xt...` / `lbvp...` runtime proxy reťazec.
4. GPS zmeny porovnávať s produkciou, ale nepridávať paralelný polling bez preukázanej potreby.
5. Pred release overiť root, login, GPS klientsky blok, Waze route, events, traffic, chargers, TTS a phone.
