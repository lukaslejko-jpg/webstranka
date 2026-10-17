# Tesla SK – Waze overlay + jednorazové overenie zariadenia

Dátum: 2026-10-17

## Produkcia
- URL: https://tesla-sk.vercel.app/
- Deployment: `dpl_9J1VfB4knedHdKBy8RwrfHJAw5df`
- Stav: READY

## Waze overlay
- Nová ikona CarPlay/Waze je pod ikonou Music.
- Po kliknutí sa otvorí `https://tesla-waze.vercel.app/` vo full-screen overlay nad existujúcou navigáciou.
- Existujúca Tesla SK navigácia pod overlayom ostáva bežať.
- Overlay sa zavrie potiahnutím nadol, rovnako ako Music.
- Waze iframe sa po skrytí neruší ani nenačítava nanovo; ostáva v pamäti.
- Smart Life nebolo pridané.

## Ochrana aplikácie
- Hlavná aplikácia už nie je priamo verejne servovaná ako statický `index.html`.
- Root `/` a `/index.html` smerujú na serverový gate `/api/app`.
- Neoverené zariadenie je presmerované na `/auth.html`.
- Overenie prebieha cez serverový endpoint `/api/auth-login`.
- Prístupový kód ani device token nie sú uložené v klientskom JavaScripte.
- Tajomstvá sú uložené ako Vercel Sensitive Environment Variables:
  - `TESLA_APP_ACCESS_CODE`
  - `TESLA_APP_DEVICE_TOKEN`
- Po úspešnom overení sa nastaví:
  - cookie `tesla_device`
  - HttpOnly
  - Secure
  - SameSite=Lax
  - Path=/
  - Max-Age=34560000 (~400 dní)
- Ak používateľ vymaže údaje prehliadača/cookies, musí zariadenie overiť znova.

## Nedotknuté
- OSRM routing
- Waze traffic/incident vrstvy v Tesla SK
- nabíjačky
- navigačný hlas/WebAudio
- Music overlay
- Domov/Práca
- mobilné párovanie
- existujúce API dát

## Predchádzajúci produkčný bod pred ochranou
- `dpl_FW3fdgE9Lu17CgtugcpEirETkxJF`
