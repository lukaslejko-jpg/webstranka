# VOICE REPAIR RELEASE — 2026-10-19

## Scope
Release iba pre `tesla-sk-waze-lab`.

Produkcia `tesla-sk` ostala read-only:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Aktuálny LAB production
- deployment: `dpl_F3AYtpP4EVsggkFmDjDBtAT6mJ4E`
- URL: `tesla-sk-waze-ktywbwuhq-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Immediate rollback:
- `dpl_78MAGdYSkmdQPCmj8dmMGGhy845y`

## Diagnóza
Voice engine aktuálneho LAB, predchádzajúceho LAB aj `tesla-sk` bol byte-for-byte rovnaký:
- voice SHA `100e9196a486c18521685d10022a3482ae3246aa35bf4e5b85133d73ead6e148`

TTS backend bol funkčný:
- `/api/tts` → 200
- `audio/mpeg`

Po route requestoch z aktuálnej jazdy neboli navigačné TTS requesty.

Príčina:
1. hlas sa inicializoval z trvalého nastavenia:
   `voiceOn = store.get('voice', true)`
2. pri uloženom `voice=false` `say()` končil pred TTS requestom,
3. `Test hlasu` mal async race:
   - dočasne nastavil `voiceOn=true`,
   - zavolal async `say()`,
   - okamžite vrátil `voiceOn=false`,
   - po stiahnutí audia ho `say()` zahodil.

## Oprava
Zmenený iba `api/lab-main.js`.

### Jednorazová migrácia
Kľúč:
- `voiceRepair20261019v1`

Pri prvom načítaní po release:
- staré/stale `voice=false` sa jednorazovo prepne na `true`,
- migrácia sa označí ako vykonaná,
- neskoršie explicitné ručné vypnutie hlasu sa už rešpektuje.

### Force test mode
`say(text,{force:true})`:
- používa sa iba na test/potvrdenie,
- funguje aj keď je normálny hlas vypnutý,
- mirror mode zostáva tichý.

Použitie:
- Test hlasu,
- test hlasitosti,
- potvrdenie po ručnom zapnutí:
  `Hlas navigácie zapnutý`.

## Testy pred production
Preview:
- `dpl_DRpdPfjx1Dvz8tmwBq7QzaUrZJba`
- full regression wrapper:
  `dpl_Ga5R9L7xee8btRKceeYXeycZ8gdL`

Výsledky:
- voice regression: 7/7 PASS
- full navigation regression: 16/16 PASS
- browser JS compile: PASS
- normalized diff mimo voice sekcie: IDENTICAL
- TTS: 200 audio/mpeg
- Demjata route: 200 / firstStepRatio 0.973
- Reverse route: 200 / firstStepRatio 0.986
- Košice route: 200 / firstStepRatio 0.831
- waze-drive: 200 / degraded:false
- events: 200 / degraded:false / live POLICE
- traffic: 200
- phone/QR: 200 + relay
- chargers: 328 / 69 live
- availability: 2/2
- icon: 200

## Production source integrity
Oproti rollback `dpl_78MAG...` sa zmenil iba:
- `api/lab-main.js`
- old SHA: `7a3e6ccc41a35f635d7064822f9be1852da7393d`
- new SHA: `1f3d4f91140ede90dfc9729f8aa12b1fe1d793d9`

`api/waze-route-dense.js` ostal:
- `5cb25a987ff7e293564d50aef53908c638352aa3`

Production:
- 16 source files
- 0 test/diagnostic endpointov

## Production smoke after deploy
- Demjata 200
- Reverse 200
- Košice 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false / 2 POLICE
- traffic 200
- phone 200
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200

Runtime:
- iba známy Node DEP0169 `url.parse()` warning
- žiadny nový funkčný exception typ

## Použitie po release
Aktívna stránka v Tesla browseri musí byť raz obnovená, aby sa načítal nový klient a vykonala jednorazová voice migrácia.
