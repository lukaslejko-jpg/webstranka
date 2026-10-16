# Tesla SK – HIT 2026-10-16

Stav: **HIT / funkčná produkčná záloha**

Produkcia: https://tesla-sk.vercel.app  
Vercel project: `prj_RPdIhyouxvZWbPb7nqiQRAwsSMM0`  
Deployment: `dpl_EZmk6tnXnCWK4ekryk95vzjNjHvA`

## Obsah tejto HIT verzie
- funkčná navigácia a vyhľadávanie,
- vektorová aj klasická mapa,
- live nabíjačky + realtime dostupnosť,
- výkon priamo v markerov nabíjačiek,
- scroll panelu nabíjačiek,
- Music overlay,
- slovenský navigačný hlas cez MP3 TTS fallback,
- samostatná hlasitosť navigácie,
- pôvodný rozpracovaný iPhone mirror + prijímanie cieľov cez relay.

## Súbory
- `index.html` – kompletný frontend produkcie,
- `api/chargers.js`,
- `api/availability.js`,
- `api/tts.js`.

## Obnova
V prípade regresie sa majú na Vercel nasadiť presne tieto súbory bez ďalších zmien. Ikony zostávajú:
- apple-touch-icon.png SHA `8628be7cca8906cd639e47cc07c110e454eef2b9`
- favicon-32.png SHA `3df633e322b6ca6677d4fb6af9e675fdc3fa59a8`

Táto verzia je referenčný bod pred zmenou iPhone tlačidla na párovanie mobilu a pridaním Domov/Práca k vyhľadávaniu.
