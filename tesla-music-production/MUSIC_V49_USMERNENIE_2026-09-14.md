# Music V49 – stabilný stav, záloha a návrhy

Dátum: 14. 9. 2026
Produkcia: https://tesla-waze-piped.vercel.app
Stabilná verzia: V49
Záloha vetvy: `backup/music-v49-stable-2026-09-14`
Dokumentačná vetva: `docs/music-v49-usmernenie-2026-09-14`

## 1. Stabilný stav V49

V49 je referenčný stabilný bod. Ďalšie úpravy sa majú robiť iba ako samostatné, malé vrstvy nad týmto stavom a nikdy nie prepisom fungujúcich častí bez porovnania so zálohou.

Zachované funkčné oblasti:

- mobilné prehrávanie cez existujúci YouTube player,
- anonymné vyhľadávanie bez Google/YouTube účtu,
- plný search backend Release 40 s fallbackmi,
- horný riadok na mobile v tvare `⋮ | Hľadať na YouTube | lupa`,
- admin `⋮` iba pre admin používateľov,
- Music účty a profil používateľa cez Synology,
- background kontrola session a admin práv bez reloadu prehrávača,
- admin prefetch na pozadí,
- samostatný YouTube účet pre každého Music používateľa,
- priebežné hľadanie s debounce,
- bez MutationObserver slučiek v search layoute,
- žiadna auth/profile operácia nesmie reloadovať stránku počas prehrávania.

## 2. Kritické pravidlá pre ďalší vývoj

1. Pred každou ďalšou zmenou vytvoriť nový návratový bod/verziu.
2. Nikdy neupravovať prehrávač kvôli admin, login, Synology alebo YouTube account funkcionalite.
3. Admin vrstva musí zostať asynchrónna a nesmie blokovať UI.
4. Search layout nesmie používať MutationObserver, ktorý zároveň mení sledované atribúty.
5. Vyhľadávanie musí naďalej fungovať bez Google účtu.
6. `⋮` nesmú zaberať priestor vyhľadávaciemu poľu ani ho prekrývať.
7. Žiadna synchronizácia profilu nesmie volať `location.reload()` počas prehrávania.
8. Každá nová verzia musí po deployi overiť minimálne: načítanie app, vyhľadávanie, prehranie skladby, ďalšia/predchádzajúca, admin `⋮`, otvorenie admin panela a zachovanie session.

## 3. Návrhy do budúcna – zatiaľ NEIMPLEMENTOVAŤ

### A. Dynamickejšia sekcia „Pre teba“

Cieľ: sekcia „Pre teba“ nemá po každom otvorení začínať rovnakými skladbami. Má zostať personalizovaná, ale zároveň pôsobiť živo a priebežne ukazovať nové relevantné skladby.

Navrhovaný princíp:

- približne 60–70 % obsahu ponechať z najlepšie hodnoteného osobného profilu,
- približne 20–30 % primiešavať z nových skladieb objavených cez `discover`, súvisiace vyhľadávania a čerstvé výsledky,
- približne 10 % ponechať na miernu rotáciu starších obľúbených skladieb,
- prvých 5–8 pozícií nemá byť pri každom otvorení v rovnakom poradí,
- skladbu, ktorá bola práve hore v „Pre teba“, dočasne penalizovať pri ďalšom otvorení, aby sa zoznam prirodzene obmieňal,
- nové relevantné skladby majú dostať krátkodobý „novinka bonus“, aby sa vôbec dostali medzi známe obľúbené skladby,
- stále rešpektovať existujúce filtre, aby sa do automatického hudobného výberu nedostávali podcasty, rozhovory, filmy, návody a podobný obsah,
- rotácia nesmie meniť samotné naučené skóre používateľa; má meniť iba poradie zobrazenia.

Odporúčaný bezpečný model pre budúcu verziu:

`displayScore = personalScore + freshnessBonus + smallSessionRotation - recentExposurePenalty`

Tak sa zachová učenie používateľa, ale zobrazenie nebude statické.

### B. „Čerstvo objavené“ bez novej záložky

Namiesto pridávania ďalšej záložky možno nové skladby iba prirodzene zamiešať do „Pre teba“. Pri nových skladbách možno voliteľne na krátky čas zobraziť malý štítok `Nové`.

### C. Denná/session rotácia

Poradie odporúčaní sa môže meniť raz za otvorenie aplikácie alebo raz za deň, nie každých pár sekúnd. Tým sa zabráni skákaniu kariet počas používania.

### D. Ochrana prehrávanej skladby

Ak sa „Pre teba“ na pozadí obnoví, aktuálne prehrávaná skladba, queue a prehrávač sa nesmú meniť. Obnoviť sa smie iba zoznam kariet.

## 4. Návrh postupu pre budúcu implementáciu „Pre teba“

Keď sa táto zmena bude realizovať, odporúčaný postup je:

1. vytvoriť ďalšiu verziu nad V49,
2. meniť iba výpočet a poradie `rows()` pre `foryou`,
3. nedotýkať sa `playTrack()`, player API, auth, admin ani search backendu,
4. najprv otestovať bez nasadenia,
5. overiť, že pri opakovanom otvorení sa prvé skladby mierne menia,
6. overiť, že obľúbené skladby stále zostávajú silne zastúpené,
7. overiť, že novinky nevytláčajú profil používateľa úplne,
8. až potom nasadiť ako samostatnú ďalšiu verziu.

## 5. Rollback

Ak sa pri budúcej úprave objaví regresia, návratový bod je:

`backup/music-v49-stable-2026-09-14`

Produkčný referenčný stav je Music V49. Dokumentačná vetva neslúži na produkčný deploy.
