# SAFE CHECKPOINT — Tesla SK Waze LAB

Aktualizované: 2026-10-18

## SOURCE OF TRUTH

Tento súbor je povinný prvý bod obnovy kontextu pri každom ďalšom zásahu.

Ak sa stratí časť vlákna alebo pracovného kontextu:
1. NErekonštruovať stav zo starých správ.
2. NEvracať sa automaticky na starší deployment.
3. NEopakovať už hotové Git/dokumentačné kroky.
4. Najprv overiť aktuálne aliasy vo Verceli.
5. Porovnať ich s týmto checkpointom.
6. Pokračovať iba z aktuálneho produkčného stavu.

## Aktuálna hlavná produkcia

Alias:
- https://tesla-sk-waze-lab.vercel.app/

Projekt:
- tesla-sk-waze-lab
- project ID: `prj_ehViWi0r8gYe226ofNZqneWzeE32`

Aktuálny production deployment:
- `dpl_EBFzNLmryk9vGohQwELE8BLMZqVT`
- URL: `tesla-sk-waze-hykt6l3wk-lukaslejko-9932s-projects.vercel.app`
- state: READY
- target: production

## Aktuálny alerts backend

Alias:
- https://tesla-sk-waze-lab-alerts.vercel.app/

Projekt:
- tesla-sk-waze-lab-alerts
- project ID: `prj_VK9QCjWrvsCHo5gAgkZEsZJckfiA`

Aktuálny production deployment:
- `dpl_2tmAnRn8GWe8yBS3ggN1qLXoC7Ra`
- URL: `tesla-sk-waze-lab-alerts-drvbmi9z6-lukaslejko-9932s-projects.vercel.app`
- state: READY
- target: production

## Hotové veci — NEOPAKOVAŤ bez dôvodu

- GPS fresh fix / getCurrentPosition / watchPosition
- maximumAge: 0
- zákaz routovania z mapového stredu
- Waze dense geometria
- alternatívne Trasy
- lane guidance
- closure reroute
- fast reroute
- QR pairing panel
- /phone.html
- mobilný relay
- app ikona
- odstránenie Vercel Toolbaru
- production target na hlavnom LAB
- live POLICE / ROAD_CLOSED klientská logika
- alerts backend samostatný projekt
- Git dokumentačná vetva
- Git dokumentácia CURRENT_STATE / ALERTS_STATUS / manifest

Tieto kroky sa nesmú znovu robiť len preto, že sa stratila časť vlákna.

## Povinné pravidlo pred deployom

Pred KAŽDÝM ďalším deployom:
1. zapísať aktuálny production deployment ako rollback,
2. meniť iba presne zadanú časť,
3. preview,
4. test endpointov,
5. test prihláseného klienta,
6. až potom production,
7. po production overiť alias,
8. aktualizovať tento checkpoint iba ak sa production ID zmení.

## Zakázané postupy

- žiadne slepé wrapper reťazenie,
- žiadne návraty na staré deploymenty bez porovnania,
- žiadne opakované nasadenie Git/docs, ak už je zapísané,
- žiadne „opravy“ funkčných častí mimo zadania,
- žiadne prepísanie GPS/Waze/QR pri nesúvisiacej zmene,
- žiadne tvrdenie „hotovo“ bez kontroly aktuálneho aliasu.

## Ak sa kontext stratí

Stačí obnoviť:
- tento SAFE_CHECKPOINT,
- CURRENT_STATE.md,
- ALERTS_STATUS.md,
- VERCEL_SOURCE_MANIFEST.md.

A pokračovať z aktuálnych aliasov.

