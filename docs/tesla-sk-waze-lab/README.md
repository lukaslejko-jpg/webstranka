# Tesla SK – Waze LAB

Dokumentácia samostatnej LAB navigačnej aplikácie:

- LAB: https://tesla-sk-waze-lab.vercel.app/
- Vercel project: `tesla-sk-waze-lab`
- Vercel project ID: `prj_ehViWi0r8gYe226ofNZqneWzeE32`
- Git dokumentačná vetva: `docs/tesla-sk-waze-lab-20261018`

> Dôležité: samotný zdroj Tesla/Waze LAB zatiaľ nie je Git-linked projekt. Táto vetva slúži ako bezpečný Git snapshot stavu, architektúry, deployment ID a rollback bodov, aby sa stav aplikácie už nemusel rekonštruovať iba z Vercel histórie.

## Pravidlo nasadzovania

1. Pracovať iba na LAB.
2. Väčšia zmena vždy: preview → regresný test → LAB alias.
3. Pred každým zásahom poznačiť rollback deployment.
4. Nevrstviť viac proxy wrapperov nad sebou, ak sa dá zmena spraviť v jednej vrstve.
5. Pri každom release overiť po prihlásení:
   - GPS fresh fix,
   - Waze dense route,
   - Trasy,
   - lane guidance,
   - QR/pairing,
   - TTS,
   - /phone.html,
   - žiadny 508 loop.
6. UI a funkcie mimo zadanej zmeny nemeníme.

Podrobný stav je v [CURRENT_STATE.md](CURRENT_STATE.md).


## Aktuálny clean LAB checkpoint

Po GPS diagnostike 2026-10-18 bol LAB prestavaný na jeden samostatný deployment bez historického runtime proxy reťazca.

- current deployment: `dpl_75KudV7ypV5rohArwwMiWB6Z4RU9`
- GPS: rovnaký mechanizmus ako read-only produkcia `tesla-sk`
- detail: [CLEAN_LAB_GPS_2026-10-18.md](CLEAN_LAB_GPS_2026-10-18.md)
- recovery: [SAFE_CHECKPOINT.md](SAFE_CHECKPOINT.md)

Produkciu `tesla-sk` pri LAB práci nemeniť bez výslovného súhlasu používateľa.
