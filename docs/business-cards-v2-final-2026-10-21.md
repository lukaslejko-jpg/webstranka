# JOB & DUES – digitálne vizitky v2 – finálny stav

Dátum: 2026-10-21

## Bezpečný prístav

Pred úpravami bol vytvorený:
- branch: `backup/business-cards-20261021-safe-harbor`
- checkpoint: `docs/business-cards-safe-harbor-2026-10-21.md`
- pôvodný main pred v2: `2d795bba68328164e2f965a272207fa73e41c5c1`

## Krátke produkčné URL

- Jaroslava: https://jobdues.sk/jaroslava
- Lukáš: https://jobdues.sk/lukas
- Zuzana: https://jobdues.sk/zuzana

Krátke adresy sú riešené cez Vercel rewrites v hlavnom projekte `jobdues.sk`.

## Aktuálne produkčné deploymenty

### Ing. Jaroslava Lejková, MBA
- Vercel projekt: `jobdues-jaroslava-wallet`
- projekt ID: `prj_Fzx8LsBXTkrdADCuzN48ZLxSQSFE`
- aktuálny deployment: `dpl_HmHo5LETphxSKEsyizPJAkWn6efr`

### Mgr. Lukáš Lejko, MBA
- Vercel projekt: `jobdues-lukas-wallet`
- projekt ID: `prj_cnEhcshvdwRMNrMqhFWjDdn6FvCh`
- aktuálny deployment: `dpl_9hi9fKjJYeds4yn6GW3MbjBZmJDr`

### Ing. Zuzana Sedlaková
- Vercel projekt: `jobdues-zuzana-wallet`
- projekt ID: `prj_9weO8KtbltMjhuEzs7ujPemQrw6t`
- aktuálny deployment: `dpl_7z2poBLe5UXoAKe2w6S6s5xNRTWX`

## Webová vizitka

Každá vizitka obsahuje:
- firemnú identitu JOB & DUES,
- meno a pracovnú pozíciu,
- Europrojekty / Eurofondy + Účtovníctvo,
- mobil,
- e-mail,
- web,
- prevádzku Vranovská 41, 080 06 Prešov,
- tlačidlo Apple Wallet,
- Uložiť kontakt,
- Zdieľať kontakt,
- QR modal,
- Otvoriť web,
- krátky link,
- stručný text o JOB & DUES.

### Navigácia na prevádzku

Adresa `Vranovská 41, 080 06 Prešov` je na všetkých 3 vizitkách klikateľná.

Klik otvorí Apple Maps navigáciu:
`https://maps.apple.com/?daddr=Vranovsk%C3%A1%2041%2C%20080%2006%20Pre%C5%A1ov&dirflg=d`

## Kontakt / vCard

vCard obsahuje:
- N + FN vrátane titulov,
- JOB & DUES s.r.o.,
- pracovnú pozíciu,
- mobil,
- e-mail,
- web,
- adresu,
- kategórie:
  - Europrojekty
  - Eurofondy
  - Účtovníctvo
  - Príspevky
  - Dotácie
  - Verejné obstarávanie
  - HR
  - JOB & DUES
- poznámku s krátkym opisom firmy,
- vložené PHOTO s korporátnou grafikou.

### Dôležitý limit iOS

PHOTO je vo vCard fyzicky prítomné a bolo overené na živých .vcf súboroch.

Pri importe cez iOS/Kameru však iPhone v testovanom scenári PHOTO ignoruje a namiesto firemného obrázka zobrazuje iniciálu kontaktu.

Toto nie je chyba obsahu vCard. Webový import .vcf nedokáže na iOS spoľahlivo vynútiť kontaktnú fotografiu. Preto túto časť nepovažujeme za bezpečne garantovanú funkciu bez natívneho Contacts riešenia.

## QR

QR na webovej vizitke smeruje na krátku webovú vizitku, nie na starý priamy vCard obsah:
- `jobdues.sk/jaroslava`
- `jobdues.sk/lukas`
- `jobdues.sk/zuzana`

Tým sa zabraňuje tomu, aby starý QR obsahoval zastaraný kontakt.

## Apple Wallet

Každý používateľ má samostatný Apple Wallet pass.

Wallet obsahuje:
- JOB & DUES logo,
- meno,
- funkciu,
- mobil,
- e-mail,
- hlavné služby: Europrojekty & Účtovníctvo,
- viditeľný QR kód,
- zadnú stranu s oblasťami a popisom firmy,
- pole `DIGITÁLNA VIZITKA / ZDIEĽAŤ`.

QR vo Wallet passe smeruje na krátku digitálnu vizitku:
- `jobdues.sk/jaroslava`
- `jobdues.sk/lukas`
- `jobdues.sk/zuzana`

Z digitálnej vizitky je možné kontakt uložiť, zdieľať, zobraziť QR alebo otvoriť web.

## Absolútne odkazy

Keďže krátke URL sú rewrite z `jobdues.sk` do samostatných Vercel projektov, interaktívne tlačidlá musia používať absolútne URL konkrétneho projektu.

Opravené:
- Apple Wallet,
- Uložiť kontakt,
- Zdieľať kontakt,
- QR asset.

Tým sa odstránila chyba `jobdues.sk/api/wallet -> 404 NOT_FOUND`.

## Kontrola po poslednej oprave

Overené:
- všetky 3 produkčné vizitky: READY
- všetky 3 krátke URL: HTTP 200
- všetky 3 vCard: HTTP 200
- PHOTO je prítomné v živom vCard
- všetky 3 Apple Wallet endpointy: HTTP 302 na podpísaný .pkpass
- všetky 3 webvizitky obsahujú Apple Maps navigačný link

## Pravidlo pre ďalšie úpravy

Tieto 3 vizitky sú samostatné produkčné celky.

Pri ďalšej zmene:
1. nemení sa iný používateľ bez výslovného zadania,
2. pred zásahom sa porovná aktuálny deployment,
3. mení sa iba požadovaná časť,
4. po deployi sa overí web, vCard, Wallet a krátka URL,
5. pri regresii sa použije bezpečný prístav.
