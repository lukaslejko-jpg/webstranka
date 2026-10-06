# ZÁVÄZNÉ PRAVIDLÁ PRE ÚPRAVY APLIKÁCIÍ

Tieto pravidlá platia pre **každú aplikáciu a každý technický zásah** v tomto projekte/repozitári, vrátane Tesla Waze, Tesla Music, Europrojekty a ďalších aplikácií.

Pred akoukoľvek zmenou musí agent/AI najprv prečítať:

- `APP_CHANGE_SAFETY_RULES.md`

## Povinné minimum

1. **Nikdy neupravovať produkciu odhadom.**
2. Pred zmenou zistiť skutočný aktuálny stav kódu a aktuálny produkčný deployment.
3. Uložiť presný návratový bod: deployment ID / commit / zálohu.
4. Meniť iba to, čo používateľ výslovne požiadal.
5. Jedna úloha = jedna izolovaná zmena, pokiaľ používateľ nepovolí viac.
6. Najprv vytvoriť **preview/test verziu**, produkciu nemenit.
7. Preview reálne technicky a vizuálne otestovať.
8. Produkciu meniť až po úspešnom teste.
9. Ak platforma umožňuje promotion, **povýšiť presne otestovaný deployment**; nevytvárať zbytočne nové zostavenie.
10. Pri chybe okamžite použiť pripravený rollback.
11. Nikdy netvrdiť, že zmena funguje, ak nebola reálne overená.
12. Nikdy nepoškodzovať nesúvisiace fungujúce časti aplikácie.
13. Pri nejasnosti radšej zastaviť nasadenie než improvizovať na produkcii.
14. Produkčné dáta, tajné údaje, tokeny a heslá sa nesmú vypisovať do chatu ani ukladať do verejnej zálohy.
15. Projekt Europrojekty sa nesmie použiť ako technický most alebo dočasné úložisko pre inú aplikáciu bez výslovného súhlasu používateľa.

## Minimálna hranica funkčnosti Tesla Music

Verzia Tesla Music sa **nesmie považovať za funkčnú ani nasadiť do produkcie**, ak neprejde minimálne týmito testami:

- sekcia **Vyhľadané** musí fungovať a zobrazovať výsledky korektne,
- prechod zo skladby na skladbu musí byť plynulý a bez prepnutia do rádia,
- pri Next / automatickom prechode sa nesmie samovoľne spustiť rádio,
- pri prepínaní alebo načítavaní skladby nesmie obrazovka ani prehrávač preblikávať,
- nesmie dôjsť k preskakovaniu viacerých skladieb naraz,
- prehrávač musí zostať stabilný pri načítaní ďalšej skladby.

Ak čo i len jeden z týchto bodov zlyhá, deployment je neúspešný a nesmie byť produkčný.

## Zásada

**Najprv záloha → potom preview → potom test → až potom produkcia → rollback musí byť pripravený.**

Toto pravidlo má prednosť pred rýchlosťou nasadenia.

## ZÁVÄZNÉ PRAVIDLO: LINK A STAV „FUNKČNÉ“ AŽ PO OVERENÍ

Toto pravidlo vzniklo po incidente TEST03 dňa 6. 10. 2026 a má prednosť pred rýchlosťou nasadenia.

- Stav platformy **LIVE / deployed / build passed nie je dôkaz funkčnosti aplikácie**.
- Agent nesmie používateľovi poslať testovací link s tvrdením „funkčné“, „opravené“, „obnovené“ alebo ekvivalentom, kým neoveril minimálne: HTTP načítanie stránky, úspešný štart frontendového JavaScriptu, vykreslenie hlavného UI a konkrétnu menenú funkciu.
- Pri mobilnej/Safari chybe musí byť pred ďalším používateľským testom vykonaná frontendová syntaktická/runtime kontrola alebo nasadená viditeľná diagnostika `window.onerror` + `unhandledrejection`; nesmie sa postupovať sériou odhadov.
- Known-good verzia znamená iba verziu **reálne potvrdenú používateľským testom alebo reprodukovateľným E2E testom**, nie commit odhadnutý podľa času či úspešného deployu.
- Rollback sa robí na **celý presný snapshot/commit**, nie ručným skladaním vybraných súborov, ak nebolo preukázané, že ide o identický strom.
- Po regresii: known-good snapshot → jedna izolovaná zmena → automatická kontrola → reálny E2E/device test → až potom odkaz používateľovi.
- Ak fyzický/device test nie je možné vykonať nástrojmi agenta, musí to agent výslovne uviesť. V takom prípade nesmie označiť verziu za funkčnú; môže ju označiť iba ako „nasadená, čaká na device test“.
- TEST03 nesmie poškodiť ani meniť akceptovaný Music baseline alebo TEST02.
