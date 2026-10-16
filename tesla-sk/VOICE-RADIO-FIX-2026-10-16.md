# Tesla SK – hlas navigácie / rádio

Dátum: 2026-10-16  
Produkcia: https://tesla-sk.vercel.app  
Vercel deployment: `dpl_8GfVz9KLumNN6xwxN2sqtxA7TfMC`

## Problém
Pri zapnutom navigačnom hlase sa v Tesle spolu s hlasom aktivovalo/obnovovalo rádio, hoci hudba išla z vlastného Music prehrávača.

## Príčina
Navigačný hlas používal samostatný `HTMLAudioElement` a pri prvom dotyku aj prázdny `speechSynthesis` warm-up. Tesla Chromium tým mohlo zobrať a následne uvoľniť mediálny audio-focus, po čom vozidlo obnovilo predchádzajúci zdroj – rádio.

## Oprava
Zmenený bol **iba spôsob prehrávania hlasu**:
- TTS endpoint `/api/tts` ostal nezmenený,
- slovenský MP3 hlas ostal nezmenený,
- hlasitosť navigácie ostala nezmenená,
- `HTMLAudioElement` bol odstránený,
- prázdny `speechSynthesis` warm-up bol odstránený,
- hlas sa prehráva cez trvalý `AudioContext`,
- pri zapnutom hlase beží tichý keep-alive source, aby browser audio cesta zostala aktívna medzi hláškami,
- pri vypnutí hlasu sa `AudioContext` suspenduje,
- `speechSynthesis` zostáva iba fallback pre prehliadače bez Web Audio.

## Nedotknuté časti
Navigácia, routing, mapy, live nabíjačky, Domov/Práca, mobilné párovanie, Music overlay, trip progress a cieľ v spodnom paneli neboli menené.

## Záloha pred opravou
Referenčný stav pred touto opravou:
- Vercel: `dpl_CNdqpHP6XaKPxttjd47BsczNobSu`
- Git: `tesla-sk/HIT-2026-10-16-trip-ui`
