# PRE-DEPLOY SAFE CHECKPOINT — navigation regression work — 2026-10-19

## Aktuálny production pred zásahom
- project: `tesla-sk-waze-lab`
- alias: https://tesla-sk-waze-lab.vercel.app/
- deployment: `dpl_GektN1TN3bfWiu63wPGz6LuR9oPS`
- URL: `tesla-sk-waze-eg42b9324-lukaslejko-9932s-projects.vercel.app`
- state: READY
- target: production

Toto je povinný rollback bod pred ďalšou navigačnou zmenou.

## Dôležité
`dpl_Gekt...` sa od staršieho `dpl_Hsf...` líši iba súborom:
- `api/lab-main.js`
- Gekt SHA: `ec3c480d9667e3c183434ab9e777a90268494eb2`
- Hsf SHA: `0e51df4c2b17baf40977d78bbb96c336b06946b8`

Preto sa nesmie nový klient rekonštruovať zo staršieho Hsf/AQ3 snapshotu. Každý preview musí vychádzať z presného autentifikovaného klienta `dpl_Gekt...`.

## Read-only referencia
Produkcia `tesla-sk`:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
- iba na porovnanie; nesmie byť menená.

## Povinné testy pred production
1. on-route GPS bez reroute,
2. jeden chybný GPS fix mimo trasy,
3. dva spoľahlivé off-route fixy,
4. výrazný odklon,
5. pomalý Waze reroute,
6. zlyhaný Waze reroute,
7. návrat na starú trasu po GPS šume,
8. žiadna modrá spojnica auto → stará trasa,
9. žiadne opakované reroute requesty v krátkom slede,
10. parallel-road / route-snap ochrana,
11. príchod nesmie byť vyhlásený stovky metrov pred cieľom,
12. pri príchode žiadne `Potom`,
13. navigačné manévre musia byť po slovensky,
14. Waze dense/alternatives/lane guidance/alerts/traffic/QR/TTS/chargers bez regresie,
15. preview source musí zachovať všetky dnešné súbory mimo presne zdokumentovaného klientského zásahu.
