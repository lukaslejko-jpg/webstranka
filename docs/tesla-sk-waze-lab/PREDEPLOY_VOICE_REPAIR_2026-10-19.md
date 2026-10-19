# PRE-DEPLOY VOICE REPAIR CHECKPOINT — 2026-10-19

## Aktuálny production pred hlasovou opravou
- project: `tesla-sk-waze-lab`
- deployment: `dpl_78MAGdYSkmdQPCmj8dmMGGhy845y`
- URL: `tesla-sk-waze-ksbobqnt2-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Toto je immediate rollback point pre hlasovú opravu.

## Zistenie
Voice engine aktuálneho LAB, predchádzajúceho LAB a `tesla-sk` má rovnaký SHA:
- `100e9196a486c18521685d10022a3482ae3246aa35bf4e5b85133d73ead6e148`

TTS backend je funkčný:
- `/api/tts` → 200
- `audio/mpeg`

Po route requestoch z aktuálnej jazdy neboli navigačné TTS requesty.
Aktuálna logika má:
- `voiceOn = store.get('voice', true)`
- `say()` okamžite končí pri `voiceOn === false`
- `Test hlasu` mal async race: po spustení `say()` vrátil `voiceOn` späť na false skôr, než sa audio stiahlo/dekódovalo.

## Preview
- deployment: `dpl_DRpdPfjx1Dvz8tmwBq7QzaUrZJba`
- full-regression wrapper: `dpl_Ga5R9L7xee8btRKceeYXeycZ8gdL`

Voice fix:
1. jednorazová migrácia starého/stale `voice=false` na `true`,
2. migrácia sa vykoná iba raz,
3. ďalšie explicitné ručné vypnutie sa rešpektuje,
4. `say(text,{force:true})` pre test/potvrdenie,
5. `Test hlasu` funguje aj keď je normálny hlas vypnutý,
6. test hlasitosti používa force režim,
7. po ručnom zapnutí sa ozve `Hlas navigácie zapnutý`.

## Testy pred production
- voice regression: 7/7 PASS
- full navigation regression: 16/16 PASS
- browser JS compile: PASS
- normalized diff mimo voice sekcie: IDENTICAL
- Demjata route: 200, firstStepRatio 0.973
- Reverse route: 200, firstStepRatio 0.986
- Košice route: 200, firstStepRatio 0.831
- waze-drive: 200 / degraded:false
- events: 200 / degraded:false / live POLICE
- traffic: 200
- phone/QR: 200 + relay + role=phone + dest
- TTS: 200 audio/mpeg
- chargers: 328 / 69 live
- availability: 2/2
- icon: 200

## Zachované bez zmeny
- route geometry
- arrow follow parity
- off-route no-rubber-band
- global reroute throttle
- maneuver latch
- arrival guard
- Slovak maneuver texts
- GPS watchPosition / maximumAge 1000
- production music URL
- QR/phone relay
- Waze alerts
- lane guidance
- alternatives 60 s

## Read-only referencia
`tesla-sk` ostáva nezmenený:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
