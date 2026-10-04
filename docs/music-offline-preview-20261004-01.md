# Music Offline — Preview 01

Release: **MUSIC-OFFLINE-PREVIEW-20261004-01**.

Status: **PREVIEW — príprava samostatného nasadenia; čaká na akceptáciu na iPhone**.

## Rozsah a súhlas

Vlastník 2026-10-04 o 21:38 Europe/Bratislava schválil návrh vytvoriť samostatnú skúšobnú kópiu Kasette a po úspešnom teste ju pripojiť odkazom k Music. Schválenie sa týka nového oddeleného preview. Nie je akceptáciou funkčnosti na iPhone ani pokynom upraviť existujúcu mobilnú/desktop produkciu pred touto skúškou.

Vetva: `feature/music-offline-preview-20261004`, vytvorená presne z `ee547488cb1c51845754529d8bdf2d49fbc0b51c` (Music06).

Upstream: `nico-alvz/kasette@ee170285664f14f7e044fd7d0f683c6d0751f469`, verzia 1.4.0, BSD-3-Clause. Pozri `music-offline/README.md` a priloženú pôvodnú licenciu.

## Zachovaný návratový bod Music06

Pred začiatkom práce boli oba nasledujúce deploymenty cez Render overené ako `live`:

| Aplikácia | Service | Deployment | Runtime commit |
| --- | --- | --- | --- |
| Mobil | `srv-datcj8d9fdbs73b7iv3g` | `dep-db1a50rncjis73bsjqug` | `29fe8492df7c79b0b520ddf2924626ef6c85761c` |
| Desktop | `srv-datc4fo93c1s73a1bchg` | `dep-db1a57egekts73ct9j2g` | `941f4bdd9c148d2c7c470e44d02021cd8b336bc3` |

Na oboch produkčných adresách vrátil živý `tesla-app.js?v=20261004-6` HTTP 200 a SHA-256 `d7d76636cf18486c6a0815d967a158764e81b1ea782b5975457262822d80072d`.

Pevné checkpoint vetvy `checkpoint/music-stable-20261004-06` a `checkpoint/music-desktop-stable-20261004-06` zostávajú zachované. Žiadny pôvodný runtime súbor sa v offline úlohe nemení.

## Úpravy pre offline preview

- Celá aplikácia je pod `music-offline/`, s vlastným manifestom, úložiskami, service workerom a verziou.
- Slovenčina, tmavý vzhľad, návod na inštaláciu do iPhonu, stav pripravenosti na offline.
- Kompletný offline shell; pri chýbajúcom súbore sa nesmie hlásiť úspešná pripravenosť.
- Aktualizácia vymaže iba staré cache Music Offline, nie cache iných aplikácií.
- Audio sa ukladá ako skutočné Bloby do IndexedDB. Server neprijíma hudbu, nemá účet ani hudobný backend.
- Opravené indexovanie obnovenej/odstránenej fronty a ochrana pred dokončením staršieho výberu skladby.
- Nasledujúci zdroj sa pripravuje vopred. Prehráva jeden audio element; systémový čas vychádza z jeho skutočného času.

## Overenie

- Priebežná kontrola: všetky moduly majú platnú syntax a sú zahrnuté v precache; manifest a čísla verzií sú konzistentné.
- Node testy: slovenské a existujúce preklady, čítanie audio metadát, offline odpovede bez siete, izolácia mazania cache a odmietnutie neúplnej inštalácie.
- Lokálne Chromium nemožno spustiť: vykonávacie prostredie odmietlo vytvorenie lokálneho socketu. Z tejto cesty nevznikol žiadny úspešný browser test.
- Skutočný browser smoke test sa vykoná na novom preview v podporovanom cloudovom prehliadači.
- **Fyzický iPhone, režim Lietadlo a zamknutá obrazovka: čaká na vlastníka.**

## Akceptácia pred prepojením do Music

1. Pridať aplikáciu na plochu v Safari, otvoriť ju ikonou a počkať na zelenú pripravenosť.
2. Importovať niekoľko vlastných MP3/M4A; po importe spustiť prvú skladbu.
3. V režime Lietadlo odskúšať Play/Pause, Next/Previous, posun času a viac prirodzených prechodov.
4. Rovnaké ovládanie a pokračovanie odskúšať pri zamknutej obrazovke; zobrazený čas musí zodpovedať zvuku.
5. Znova otvoriť aplikáciu bez siete; skontrolovať knižnicu, frontu a obnovenie skladby/pozície po stlačení Prehrať.
6. Až po potvrdení môže ďalšia izolovaná zmena pridať tlačidlo Offline do Music06.

Toto preview nie je nový GOLDEN ani náhrada Music06. Presné identifikátory nového nasadenia a výsledky browser smoke testu sa doplnia po jeho dokončení.
