# PRE-DEPLOY MANEUVER LATCH CHECKPOINT — 2026-10-19

## Stav pred nasadením návesti
Aktuálny production obsah bez maneuver latchu:
- deployment: `dpl_D7gQPdESJBUyAPi6v7JsnHE1fXpj`
- URL: `tesla-sk-waze-237e9vz92-lukaslejko-9932s-projects.vercel.app`
- target: production
- immediate rollback point pre latch

Tento deployment je source-identical s otestovaným preview navigačnej opravy okrem testovacích endpointov.

## Úplný rollback pred dnešným navigačným balíkom
- deployment: `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`
- URL: `tesla-sk-waze-eg42b9324-lukaslejko-9932s-projects.vercel.app`

## Testovaný latch preview
- deployment: `dpl_URvYbpPaiPTa3WNuyBaRxSB6gZ2P`
- URL: `tesla-sk-waze-1rlikd644-lukaslejko-9932s-projects.vercel.app`

Výsledky:
- navigation regression: 20/20 PASS
- maneuver latch: 6/6 PASS
- embedded browser JavaScript compile: PASS
- GPS watchPosition/maxAge 1000 preserved
- music production URL preserved: `https://music-p45f.onrender.com/`
- QR/phone relay preserved
- route alternatives 60 s preserved
- Waze alerts/lane guidance preserved
- forbidden English maneuver strings: 0

## Maneuver latch pravidlo
Aktuálna návesť sa nesmie prepnúť iba preto, že route snap preskočil cez bod odbočenia.

Pokyn zostáva zobrazený, kým:
- vozidlo neprejde fyzicky okolo bodu manévru,
- alebo fail-safe nepotvrdí, že je už aspoň 100 m za manévrom.

Pri prejazde križovatkou:
- do 15 m sa zobrazuje `Teraz`,
- banner sa drží cez križovatku,
- až po fyzickom prejdení sa prepne na ďalší manéver.

Pri reroute sa latch resetuje spolu s novou trasou.

## Read-only referencia
`tesla-sk` ostáva read-only:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
