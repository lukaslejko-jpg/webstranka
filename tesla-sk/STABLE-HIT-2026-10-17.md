# Tesla SK — stabilná produkcia 2026-10-17

## Produkcia
- URL: https://tesla-sk.vercel.app/
- deployment: `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
- stav: READY

## Posledná schválená zmena
Odstránená bola iba ikona/tlačidlo `#wazeBtn` pod Music.

Nebolo menené:
- Music,
- OSRM routing,
- Waze traffic/incident overlay,
- ochrana aplikácie,
- mobilné párovanie,
- hlas/TTS,
- nabíjačky,
- Domov/Práca,
- ostatné API.

## HIT
- branch: `HIT-tesla-sk-stable-2026-10-17-no-waze-icon`
- folder: `tesla-sk/HIT-2026-10-17-stable-no-waze-icon`
- obsahuje README s exact Vercel file SHA a snapshot `api-app.js`.

## LAB
Samostatná testovacia kópia:
- https://tesla-sk-waze-lab.vercel.app/
- z LAB bola takisto odstránená ikona pod Music.
- LAB nie je produkcia a nesmie sa používať ako zdroj na neoverené prepísanie produkcie.

## Pravidlo
Ďalšie experimenty s Waze routingom vykonávať iba v LAB. Produkčnú Tesla SK meniť až po samostatnom schválení.
