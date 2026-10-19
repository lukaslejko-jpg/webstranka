# Vercel source manifest — current LAB

Aktualizované: 2026-10-19 ráno

Main LAB:
- project: `tesla-sk-waze-lab`
- deployment: `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`
- tested preview: `dpl_BcsXKRmQ9ceigoNjC8kL345T9XK9`
- preview/production source differences: 0

| Súbor | SHA |
|---|---|
| api/app.py | d0e46b558522efe8833124489a9c531fbd5a686b |
| api/availability.js | 8c4a57a818f4f233782d2eabca4eb7be90bf93f5 |
| api/chargers.js | f414515d86284be67295b389da5627566f908c33 |
| api/events.js | 6a2883de808ea81759dc20c870e7f6fbe28f406b |
| api/lab-main.js | c1c90ea0411602d5a737fd7816ba3ca648a6abff |
| api/lab_login.js | 9ee85a2cbb4e1529da75556ad9bb466096b6b10a |
| api/nav-icon-v8.js | b6f926a89dbe8319307747a8905df1d804f99c32 |
| api/phone.js | b665e358b9744e957e17873336eff95f55e71de7 |
| api/send-destination.js | 194d174b95ee7362cad39eb243f5f470eabd6c18 |
| api/traffic.js | 38316d02e5c7d590e7aa3dd5d79acfe552b178a5 |
| api/tts.js | 82122fa66e44bbb5297413b8335e3abf1538ba05 |
| api/waze-drive.js | f2458c596b45df7fd2726a401d15f2d93dbac364 |
| api/waze-route-dense.js | a1f8757ed4a8c7acf76e8bd273cbe10b84ebc5c0 |
| pyproject.toml | 62a769eaaaff00770fad6ffbe3061c9e7b895c20 |
| requirements.txt | e360767e5bc1819b03aa3e99ae756f93a65b1263 |
| vercel.json | 482f189b69a90a400b689661a14ee104ed4074ae |

## Current rollback checkpoint

- previous functional production: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- navigation release details: [NAV_GUIDANCE_FIX_2026-10-19.md](NAV_GUIDANCE_FIX_2026-10-19.md)

## Raw Waze helper

- project: `tesla-sk-waze-lab-raw`
- project ID: `prj_XG565Yr7EZfez0xC63sBwfB5rXYZ`
- deployment: `dpl_DGUF8GaKECvNK5bVJ9vfN1SzfhBy`
- alias: `https://tesla-sk-waze-lab-raw.vercel.app/`
- source app.py snapshot SHA: `074572364dcd7a96af3038fc4a8b3f55d6dee88f`
- pyproject: `62a769eaaaff00770fad6ffbe3061c9e7b895c20`
- requirements: `e360767e5bc1819b03aa3e99ae756f93a65b1263`

## Povinný release audit

Pred ďalším production release:

1. Zapísať aktuálny rollback deployment.
2. Preview build.
3. GET `/` → login 200.
4. Overiť GPS klientsku logiku voči read-only `tesla-sk`.
5. GET `/api/waze-route-dense` → 200, `waze-routing-coords`, hustá geometry.
6. Overiť alternatívy a lane guidance.
7. GET `/api/waze-drive` → 200, `degraded:false`.
8. GET `/api/events` → 200, `degraded:false`.
9. GET `/api/traffic` → 200.
10. GET `/api/tts?text=Test` → 200 audio/mpeg.
11. GET `/phone.html?room=TEST1234` → 200 + relay + role=phone + dest.
12. GET `/api/chargers` a `/api/availability` → 200.
13. GET `/nav-icon-v8.png` → 200 image/png.
14. Porovnať preview vs production source SHA; očakávaný rozdiel 0.
15. Až potom uzavrieť dokumentáciu.

Produkcia `tesla-sk` sa pri tomto procese nesmie meniť bez výslovného povolenia používateľa.
