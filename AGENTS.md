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

## Zásada

**Najprv záloha → potom preview → potom test → až potom produkcia → rollback musí byť pripravený.**

Toto pravidlo má prednosť pred rýchlosťou nasadenia.
