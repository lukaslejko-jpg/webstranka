# Music — obnovený bod SAFE BASE 158 + QR

Dátum overenia: 26. 9. 2026.
Aplikácia sa používateľovi označuje ako **Music**.

## Presná identita

- Hlavná adresa: https://tesla-waze-piped.vercel.app/
- Produkčný projekt: tesla-waze-piped
- Project ID: prj_3UUsvRZV5rzNI7Qdkt4LzBYWEPwe
- Team ID: team_dev6vKKH2V0qxtGe0uy6GpT6
- Produkčný deployment potvrdený cez Vercel API: **dpl_5HgqHqmmyxfvTztAduHumgkd6fHv**
- Jeho nemenná adresa: https://tesla-waze-piped-naie1keil-lukaslejko-9932s-projects.vercel.app/
- HTML build: **168-test**. Ide o zachovanú QR nadstavbu nad základom 158, nie o nové zostavenie vytvorené pri tejto obnove.
- Pôvodný samotný SAFE BASE 158: **dpl_Bd6H4i853jeN7SstdpzLz9npZMLx**.
- Schválená QR referencia: **dpl_Cy4GCgxJcFivhpkKj88oMQUEHmEr**, projekt music-qr-test, https://music-qr-test.vercel.app/.

**Samotný rollback na dpl_Bd6H4i853jeN7SstdpzLz9npZMLx nestačí, keď používateľ požaduje zachovať QR nadstavbu. Nenahrádzať tento obnovený stav iným odhadnutým deploymentom.**

## Dokončené overenie

GitHub Actions: https://github.com/lukaslejko-jpg/webstranka/actions/runs/36265310119
Job: 108468749586. Výsledok: SUCCESS, 12 kontrol PASS.
Overovacia revízia: abcf0689ec196f4bc3ba9f1b49ffbbb976fce159.
Artifact: restored-music-158-qr-verification, ID 10913961590 (retencia 30 dní).

Overené na verejnej produkcii:

- HTML build 168-test a presná zhoda HTML so schválenou referenciou.
- Presná zhoda a syntaktická kontrola app-v7.js, simple-remote-v159.js, ui-cleanup-v165.js, mode-v9.js, rescue-v135.js a mobile-v128-music-logic.js.
- /desktop aj /desktop/ vrátili HTML a HTTP 200.
- QR API odpovedalo; odoslanie a následné vyzdvihnutie príkazu v samostatnej testovacej relácii prešlo.
- Vyhľadávanie Kali vrátilo 17 výsledkov.

SHA-256:

- index.html: 785f88a5e1ee83fa2e203435512edab89513a638ec301b75f54e267dad72a81e
- app-v7.js: f55a71664b660d14b004ebd948fd7b5a7aaa944fe025cc21dc1b8ff9a57bce92
- simple-remote-v159.js: 78cc3d469fd9dda199d037379daba9b27a7d2c1398dc858b502ebe3a971ccd74

## Hranice výsledku

Toto je obnova zachovanej verzie, nie oprava jej pôvodných problémov. Reálny zvuk, ručné a automatické prechody ani prehrávanie pri zamknutom iPhone neboli týmto overovacím jobom testované. HTTP 200 na desktopovej adrese nie je dôkaz kompletného testu desktopového prehrávania. Presná zhoda app-v7.js bola overená voči QR referencii 168, nie novým porovnaním celého základu 158. Pôvodne hlásený nestabilný zvuk sa nesmie označiť za opravený.

Obnovovací pokus 36265172557 bol zrušený po potvrdení existujúceho správneho deploymentu. Overovací job nepriraďuje domény a nenasadzuje kód; jediný testovací zápis je izolovaný QR príkaz, nie používateľská relácia.

## Výslovné používateľské obmedzenie

**TinyFish nepoužívať. Prácu na Music riešiť cez GitHub a Vercel.**
Pri ďalšom zásahu zachovať prehrávač aj QR. Žiadny nový playback patch, refaktoring, výmena základu ani odstraňovanie nadstavby bez výslovného zadania. Pred každým budúcim zásahom znovu overiť aktuálnu produkciu; tento záznam nie je automatický súhlas s nasadením.
