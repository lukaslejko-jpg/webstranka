# JOB & DUES – digitálne vizitky v2

Dátum nasadenia: 2026-10-21

## Bezpečný prístav

Pred úpravou bol vytvorený:
- branch: backup/business-cards-20261021-safe-harbor
- checkpoint dokument: docs/business-cards-safe-harbor-2026-10-21.md
- pôvodný main pred v2: 2d795bba68328164e2f965a272207fa73e41c5c1

## Produkčné vizitky v2

### Ing. Jaroslava Lejková, MBA
- krátky link: https://jobdues.sk/jaroslava
- projekt: jobdues-jaroslava-wallet
- deployment: dpl_Gz2T8n4wMrQGZqo8FWTkYhjNZkyj

### Mgr. Lukáš Lejko, MBA
- krátky link: https://jobdues.sk/lukas
- projekt: jobdues-lukas-wallet
- deployment: dpl_DGcR6xUSp3RAJPjXafX6315LCbLF

### Ing. Zuzana Sedlaková
- krátky link: https://jobdues.sk/zuzana
- projekt: jobdues-zuzana-wallet
- deployment: dpl_CiBf42PsAB6CCiYWVVonDP1d1xQU

## Zmeny v2

1. Kontakt / vCard
- meno a priezvisko vrátane titulov,
- firma a pracovná pozícia,
- mobil, e-mail, web, prevádzka,
- logo JOB & DUES ako contact photo,
- kategórie/kľúčové slová: Europrojekty, Eurofondy, Účtovníctvo, Príspevky, Dotácie, Verejné obstarávanie, HR, JOB & DUES,
- poznámka s krátkym opisom firmy a referenčnými číslami 500+ eurofondových projektov a 600+ vybavených príspevkov.

2. Webová vizitka
- rovnaká firemná identita,
- pozadie z firemného webu,
- Apple Wallet,
- Uložiť kontakt,
- Zdieľať kontakt,
- QR modal na rýchle naskenovanie,
- Otvoriť web,
- zobrazený krátky link,
- krátky text o JOB & DUES.

3. Krátke URL
- /jaroslava
- /lukas
- /zuzana
Realizované cez Vercel rewrites v koreňovom projekte jobdues.sk.

4. Apple Wallet
- zachované samostatné passy pre každú osobu,
- logo JOB & DUES zladené s tmavomodrou kartou,
- meno, funkcia, mobil, e-mail,
- hlavné služby Europrojekty & Účtovníctvo,
- QR na uloženie kontaktu,
- zadná strana rozšírená o oblasti a krátky opis firmy.

## Overenie po deployi

- všetky 3 produkčné deploymenty: READY
- všetky 3 krátke URL: HTTP 200
- všetky 3 vCard súbory: HTTP 200
- všetky 3 Apple Wallet endpointy: HTTP 302 na podpísaný .pkpass
