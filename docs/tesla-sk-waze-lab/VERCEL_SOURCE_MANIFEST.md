# Vercel source manifest

Backend/source súbory používané pri aktuálnej vetve aplikácie.

| Súbor | SHA |
|---|---|
| api/app.py | d0e46b558522efe8833124489a9c531fbd5a686b |
| api/availability.js | 8c4a57a818f4f233782d2eabca4eb7be90bf93f5 |
| api/chargers.js | f414515d86284be67295b389da5627566f908c33 |
| api/events.js | 64ecf3c1b351b0952d1050fcddc6c6f95e59d765 |
| api/send-destination.js | 194d174b95ee7362cad39eb243f5f470eabd6c18 |
| api/traffic.js | 38316d02e5c7d590e7aa3dd5d79acfe552b178a5 |
| api/tts.js | 82122fa66e44bbb5297413b8335e3abf1538ba05 |
| api/waze-data-dense.js | 8511a3eea916f8c6d6f96f084d295d0a921b381f |
| api/waze-data.js | 2f3e0528c1e64c3cc5dc9e0d162b91aeaec4fc33 |
| api/waze-drive.js | 6c2c81fc0e54f9a4c64e79d8ebc4b6dc8fc89aad |
| api/waze-route-dense.js | f56505dee6dde919ebe3b8be72f2441b68cea956 |
| pyproject.toml | 62a769eaaaff00770fad6ffbe3061c9e7b895c20 |
| requirements.txt | e360767e5bc1819b03aa3e99ae756f93a65b1263 |

Python dependencies:
- `pywaze==1.2.4`
- `curl_cffi>=0.13.0`

## Povinný release audit

Pred prepnutím aliasu na nový deployment:

1. GET `/` → 200 login page.
2. Prihlásený klient → 200, nie 508.
3. Skontrolovať GPS markery.
4. GET `/api/waze-route-dense` → 200 a `geometrySource=waze-routing-coords`.
5. GET `/api/tts?text=Test` → 200 audio/mpeg.
6. GET `/phone.html?room=TEST1234` → 200.
7. QR panel musí vyskočiť po kliknutí na Prepojiť mobil.
8. Overiť `••• → Trasy`.
9. Až potom priradiť alias `tesla-sk-waze-lab.vercel.app`.
