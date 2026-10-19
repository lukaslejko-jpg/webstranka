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


## Kompletný audit po clean rebuild

Aktuálny produkčný LAB po kompletnom audite:
- deployment: `dpl_HuM6uhGntoq9GfVPbqfvyLkWcezt`
- tested preview: `dpl_41S9ENJffykDfRVipeyUoKnSBjFe`
- source rozdiely preview/production: 0
- raw Waze helper: `tesla-sk-waze-lab-raw`

Kompletné výsledky:
[FULL_AUDIT_CLEAN_LAB_2026-10-18.md](FULL_AUDIT_CLEAN_LAB_2026-10-18.md)

Aktuálny recovery bod:
[SAFE_CHECKPOINT.md](SAFE_CHECKPOINT.md)


## Obnovené pôvodné zobrazenie alternatívnych trás

Aktuálny LAB po UI oprave:
- deployment: `dpl_79yKXi6QWM5x1xgUyDMMLyyE2LhX`
- tested preview: `dpl_Gp4mwm4cG6dLXh4XEauvLyiYCdTu`

Alternatívne trasy sú znovu:
- samostatné tlačidlá dole nad trip/ETA panelom,
- bez spoločného čierneho okna,
- automaticky skryté po 60 sekundách,
- znovu dostupné cez `••• → Trasy`.

Detail:
[ROUTE_ALTERNATIVES_UI_FIX_2026-10-18.md](ROUTE_ALTERNATIVES_UI_FIX_2026-10-18.md)


## Demjata 307 — oprava začiatku Waze trasy

Aktuálny LAB:
- deployment: `dpl_2FT7pyPFTHy9cHmExEgYq95AewGY`
- tested preview: `dpl_F259eNqB4GmudK113QcbQQWk6cve`

Dense Waze teraz opravuje chýbajúci prvý raw segment cez Waze-only connector + tail.
Detail:
[DEMJATA_ROUTE_START_FIX_2026-10-18.md](DEMJATA_ROUTE_START_FIX_2026-10-18.md)


## Tesla SK first-step parity

Aktuálny LAB:
- deployment: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- preview: `dpl_DRRt8WZG1BGVsuFkqf8bPeXwV3h8`

Pri chýbajúcej raw Waze geometrii prvého kroku sa iba tento krátky úsek kreslí rovnakým step-geometry princípom ako `tesla-sk`. Waze ostáva zdrojom routing rozhodnutia.

Detail:
[TESLA_SK_FIRST_STEP_PARITY_2026-10-18.md](TESLA_SK_FIRST_STEP_PARITY_2026-10-18.md)


## Off-route: bez modrej „gumy“

Aktuálny LAB:
- deployment: `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`
- preview: `dpl_BcsXKRmQ9ceigoNjC8kL345T9XK9`

Pri odbočení mimo aktívnej trasy sa stará modrá línia okamžite odpojí od auta a zostane skrytá počas reroute.

Detail:
[OFF_ROUTE_NO_RUBBER_BAND_2026-10-19.md](OFF_ROUTE_NO_RUBBER_BAND_2026-10-19.md)


## Rollback off-route release

Aktuálny LAB:
- deployment: `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`
- source-identical s `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

Revertovaný a nepoužívať:
- `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`

Detail:
[ROLLBACK_OFF_ROUTE_2026-10-19.md](ROLLBACK_OFF_ROUTE_2026-10-19.md)
