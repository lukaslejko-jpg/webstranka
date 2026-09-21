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

### Tesla Music — minimálna akceptačná hranica
Nasledujúce body sú **povinné minimum**. Ak ktorýkoľvek z nich zlyhá, verzia sa nesmie označiť ako funkčná ani nasadiť do produkcie:

- sekcia **Vyhľadané** musí fungovať, zobrazovať správne výsledky a zostať použiteľná po prehratí skladby,
- skladba sa musí spustiť bez chyby,
- prechod zo skladby na ďalšiu skladbu musí byť plynulý,
- **rádio nesmie prebrať prehrávanie** pri automatickom pokračovaní ani po stlačení Next,
- Next musí prejsť presne na jednu ďalšiu skladbu,
- Previous musí fungovať korektne,
- nesmie dochádzať k preskakovaniu viacerých skladieb naraz,
- pri prepínaní skladby nesmie blikať celá aplikácia, prehrávač ani hudobné okno,
- pri načítavaní novej skladby nesmie byť viditeľné opakované preblikávanie alebo opakované reloadovanie prehrávača,
- prehrávač nesmie počas prechodu zbytočne zaniknúť a znovu sa vytvoriť,
- prehrávanie sa nesmie samovoľne zastaviť po približne minúte,
- AUTO/shuffle musia zostať podľa schváleného stavu,
- minimalizácia/obnovenie prehrávača nesmie zastaviť skladbu,
- background playback sa nesmie zlomiť,
- vyhľadávanie a „Pre teba“ musia zostať funkčné.

### Tesla Music — povinný test prechodu skladieb
Pred každým produkčným nasadením sa musí reálne vykonať minimálne tento scenár:

1. Spustiť skladbu z **Vyhľadané**.
2. Nechať ju načítať a hrať.
3. Stlačiť **Next**.
4. Overiť, že sa spustila presne jedna ďalšia skladba.
5. Overiť, že sa nespustilo rádio.
6. Overiť, že aplikácia ani prehrávač nepreblikli.
7. Zopakovať prechod ešte aspoň raz.
8. Overiť aj automatický prechod na ďalšiu skladbu, ak je dostupný.
9. Ak sa objaví rádio, bliknutie, viacnásobný preskok alebo reload prehrávača, test je neúspešný a produkčné nasadenie je zakázané.

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
