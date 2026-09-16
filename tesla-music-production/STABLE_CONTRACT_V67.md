# Music Desktop – STABLE CONTRACT V67

## NEMENIŤ pri ďalších zásahoch
1. Referenčný desktop základ: V57.
2. Úspešný playback mechanizmus: V63 HTML5 silence media bridge – zachovať bez zmien pri nesúvisiacich opravách.
3. Logo Music: `desktop-route-v52.js` / `brandIcon()` a `/icons/music-v39-180.png` – povinná regresná kontrola po každom deploymente.
4. Vyhľadávanie: `member-v49-search-layout.js` + `/api/youtube-search` – povinná regresná kontrola po každom deploymente.
5. Malé/minimalizované okno a desktop controls z V57 – nemenia sa bez explicitného zadania.
6. V64, V65 a V66 sú regresné experimenty; nepoužívať ako základ.

## Pravidlo nasadenia
Každá nová zmena musí vychádzať z V57 + úspešného V63 bridge. Logo a vyhľadávanie sú ukotvené funkcie: nový build ich musí explicitne obsahovať a nesmie ich nahrádzať zjednodušenými implementáciami. Pred označením buildu za stabilný skontrolovať prítomnosť logo assetu, search endpointu a príslušných skriptov.