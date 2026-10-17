# Tesla SK — STABLE HIT 2026-10-17

Status: **STABLE / READY**

Production URL: https://tesla-sk.vercel.app/
Production deployment: `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
Project: `tesla-sk`
Project ID: `prj_RPdIhyouxvZWbPb7nqiQRAwsSMM0`

## Stabilný stav

Tento HIT zachytáva hlavnú Tesla SK po odstránení chybnej ikony CarPlay/Waze pod Music.

Zmena oproti predchádzajúcej stabilnej verzii:
- odstránený iba HTML prvok `#wazeBtn` pod tlačidlom Music,
- Music zostalo bez zmeny,
- Waze overlay kód zostal v zdroji neaktívny a nedotknutý,
- routing ostáva OSRM,
- Waze traffic/incident overlay ostáva zachovaný,
- ochrana aplikácie ostáva zachovaná,
- ostatné API a funkcie ostávajú bez zmeny.

## Overenie pred označením HIT

- preview deployment: `dpl_DVHnFpGU5BWXNqXyEF8uPrwprvmW` — READY
- production deployment: `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma` — READY
- `#wazeBtn`: neprítomný
- `#musicBtn`: prítomný
- OSRM routing: prítomný
- Waze overlay kód: prítomný, ale bez spúšťacieho tlačidla

## Immutable Vercel file SHAs

- api/app.js: `2f9d89f6beadcf0f89a01f91c61c1259b35c7ca1`
- api/auth-login.js: `4eb0e1f27432a4262dc0a92460b383acebc530a4`
- api/availability.js: `8c4a57a818f4f233782d2eabca4eb7be90bf93f5`
- api/chargers.js: `f414515d86284be67295b389da5627566f908c33`
- api/events.js: `64ecf3c1b351b0952d1050fcddc6c6f95e59d765`
- api/send-destination.js: `194d174b95ee7362cad39eb243f5f470eabd6c18`
- api/traffic.js: `38316d02e5c7d590e7aa3dd5d79acfe552b178a5`
- api/tts.js: `82122fa66e44bbb5297413b8335e3abf1538ba05`
- auth.html: `d1ed5c32b6469907a2f86169fa1f9b3f577b2ef2`
- phone.html: `8848aca078519d70518352bd5063f10e35e95923`
- vercel.json: `6009d2df6634ff769e2d3dcbf7fc39b938dbc051`

## Restore rule

Pri obnove sa má použiť presne uvedený production deployment alebo tieto exact file SHA. Nevykonávať broad replacement identifikátorov ani meniť routing, Music, Waze traffic, ochranu alebo mobilné párovanie.
