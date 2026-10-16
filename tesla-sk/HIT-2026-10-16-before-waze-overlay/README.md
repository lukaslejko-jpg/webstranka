# Tesla SK – HIT pred Waze traffic/event overlay

Stav: **funkčná produkčná záloha**

Produkcia: https://tesla-sk.vercel.app  
Vercel deployment: `dpl_8GfVz9KLumNN6xwxN2sqtxA7TfMC`

Táto záloha vznikla bezprostredne pred prenosom Waze traffic/event vrstvy z Tesla Waze.

## Funkčné časti v tejto HIT verzii
- navigácia a routing,
- OpenFreeMap/OSM + klasická mapa,
- live nabíjačky + realtime dostupnosť,
- slovenský TTS cez Web AudioContext,
- samostatná hlasitosť navigácie,
- Domov / Práca,
- mobilné párovanie a odoslanie cieľa,
- cieľ + progress v spodnom navigačnom paneli,
- Music overlay.

## Zásada ďalšej zmeny
Preniesť iba Waze traffic/event modul a jeho API ako samostatnú overlay vrstvu.
Nemení sa mapový podklad, routing ani ostatné funkčné časti.
