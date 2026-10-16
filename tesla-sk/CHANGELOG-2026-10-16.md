# Tesla SK – zmeny 2026-10-16

## Referenčná HIT záloha
- Git vetva: `HIT-tesla-sk-2026-10-16`
- Priečinok: `tesla-sk/HIT-2026-10-16`
- Referenčný Vercel deployment pred zmenou párovania: `dpl_EZmk6tnXnCWK4ekryk95vzjNjHvA`

## Aktuálna produkcia po HIT
- URL: https://tesla-sk.vercel.app
- Vercel deployment: `dpl_CGJenq87Q1NP3VBXr8wdE5CR8AYa`
- Stav pri nasadení: READY

## Zmena párovania mobilu
Pôvodné tlačidlo **Obrazovka iPhonu** bolo rozpracované zrkadlenie obrazovky. Hlavné tlačidlo je teraz **Prepojiť mobil**.

Postup:
1. Tesla vygeneruje 8-miestny room kód a QR.
2. QR otvorí `/phone.html?room=...` na mobile.
3. Na mobile je mapa + vyhľadávanie.
4. Mobil odošle cieľ cez `/api/send-destination`.
5. Server pošle cieľ do Render relay `/send?room=...`.
6. Tesla počúva na WebSocket `role=nav` a prijatý cieľ spustí cez existujúcu funkciu `choose()`.

Rozpracovaný mirror kód ostáva v súbore ako neaktívny základ pre budúci CarPlay experiment, ale UI ho automaticky nespúšťa.

## Domov / Práca
Tlačidlá sú priamo súčasťou panelu **Kam chcete ísť?**, takže pri skrytí vyhľadávania počas navigácie zmiznú zároveň s ním.

- prvý klik na nenastavené miesto spustí režim uloženia,
- používateľ vyhľadá adresu a výber sa uloží lokálne,
- ďalší klik spustí navigáciu,
- podržanie tlačidla umožní miesto zmeniť.

## Nedotknuté funkcie
- routing a navigácia,
- live nabíjačky a realtime dostupnosť,
- slovenský MP3 TTS + hlasitosť navigácie,
- Music overlay,
- vektorová/klasická mapa,
- Tesla Waze ikona.
