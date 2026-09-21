# APP CHANGE SAFETY RULES

## Účel

Tento dokument je záväzný postup pre všetky zmeny aplikácií. Cieľom je zabrániť tomu, aby malá úprava poškodila prehrávanie, navigáciu, API, layout, prihlásenie alebo inú už fungujúcu časť aplikácie.

---

## 1. Pred zásahom

Pred každou úpravou:

1. Načítať aktuálnu produkčnú aplikáciu.
2. Zistiť presný aktuálny produkčný deployment ID.
3. Skontrolovať aktuálny zdrojový kód, nie starú lokálnu kópiu.
4. Uložiť návratový bod:
   - deployment ID,
   - commit SHA, ak existuje Git,
   - prípadne ZIP zálohu.
5. Zapísať si, čo presne sa mení a čo sa **nesmie meniť**.

Ak nie je možné jednoznačne určiť aktuálny produkčný stav, zmena sa nesmie nasadiť.

---

## 2. Izolácia zmeny

Pri malej požiadavke sa mení iba nevyhnutná časť.

Príklady:

- zmena veľkosti kariet → iba CSS/layout,
- zmena jedného tlačidla → iba daný komponent,
- oprava prepočtu trasy → iba navigačná logika,
- zmena hudobného overlayu → nesmie meniť prehrávaciu logiku.

Zakázané je počas jednej malej úlohy „upratať“, refaktorovať alebo meniť nesúvisiace časti bez výslovného súhlasu používateľa.

---

## 3. Preview je povinné

Každá zmena musí najprv ísť do samostatného **preview/test deploymentu**.

Preview musí obsahovať rovnaký základ ako produkcia a iba zamýšľanú zmenu.

Ak sa nedá bezpečne vytvoriť preview bez prepisovania alebo rekonštrukcie celej aplikácie, nasadenie sa zastaví a hľadá sa bezpečnejšia cesta.

---

## 4. Povinné testovanie

Pred produkciou sa testuje minimálne:

### Všeobecne
- aplikácia sa načíta bez chyby,
- hlavná obrazovka je vizuálne správna,
- konzola/runtime nehlási novú chybu,
- existujúce API stále odpovedajú,
- nesúvisiace funkcie ostali funkčné.

### Tesla Music
- skladba sa spustí,
- prehrávanie pokračuje,
- Next funguje bez preskakovania viacerých skladieb,
- Previous funguje,
- prehrávanie sa nezastaví po približne minúte,
- rádio nepreberie prehrávanie,
- AUTO/shuffle ostávajú podľa schváleného stavu,
- minimalizácia/obnovenie prehrávača nezastaví skladbu,
- background playback sa nezlomí,
- vyhľadávanie a „Pre teba“ ostanú funkčné.

### Tesla Waze
- mapa sa načíta bez bliknutia,
- GPS poloha sa aktualizuje,
- šípka a mapa majú správny smer,
- navigácia drží trasu,
- odchýlka spustí prepočet,
- stará trasa sa nenaťahuje za vozidlom,
- hlasové pokyny fungujú,
- dopravné udalosti sa načítajú bez falošných dát,
- hudobný overlay nepoškodí mapu ani navigáciu.

---

## 5. Produkcia

Produkcia sa mení až po úspešnom preview teste.

Preferovaný postup:

1. Preview deployment je overený.
2. Povýši sa **presne ten istý deployment** do produkcie.
3. Nevytvára sa nové „rovnaké“ zostavenie, ak platforma umožňuje promotion.
4. Po produkčnom nasadení sa vykoná krátky smoke test.
5. Nový funkčný deployment ID sa uloží ako nový návratový bod.

---

## 6. Rollback

Pred zmenou musí byť známe, na čo sa dá okamžite vrátiť.

Ak sa po nasadení prejaví regresia:

1. Nevykonávať ďalšie experimentálne opravy priamo na produkcii.
2. Najprv rollback na posledný potvrdený funkčný deployment.
3. Až potom analyzovať chybu v preview.
4. Poškodená verzia sa nesmie používať ako nový základ.

---

## 7. Zakázané postupy

Zakázané je:

- meniť produkciu bez zálohy,
- robiť viac nesúvisiacich zmien naraz,
- nasadzovať neotestovanú verziu,
- tvrdiť „hotovo“ bez overenia,
- rekonštruovať aplikáciu zo starých súborov, keď existuje aktuálna produkcia,
- meniť mobil pri úprave desktopu, ak to používateľ nechcel,
- meniť prehrávač pri čisto vizuálnej zmene,
- meniť navigáciu pri čisto hudobnej zmene,
- používať falošné produkčné dáta,
- ukladať heslá/tokeny do repozitára,
- prepájať nesúvisiace projekty len preto, že je to technicky jednoduchšie.

---

## 8. „Golden deployment“

Každá aplikácia má mať evidovaný posledný potvrdený funkčný stav:

- názov aplikácie,
- produkčný deployment ID,
- dátum,
- krátky zoznam overených funkcií.

Po každej úspešnej zmene sa tento záznam aktualizuje.

Starý golden deployment sa nemaže, kým nový neprejde reálnym používaním.

---

## 9. Záverečné pravidlo

> **Nič iné nemením** znamená presne to: žiadna ďalšia logika, layout, API, refaktor ani „vylepšenie“ mimo výslovne zadanej zmeny.

Bezpečnosť fungujúcej aplikácie má vyššiu prioritu než rýchlosť zásahu.
