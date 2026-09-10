# Tesla Music Mobile – jediný zdroj pravdy

**Stav k:** 10. 9. 2026  
**Platnosť:** mobilná PWA Tesla Music  
**Repo:** `lukaslejko-jpg/webstranka`  
**Pracovná vetva:** `tesla-music-v6-preview`  
**Adresár mobilnej aplikácie:** `tesla-music-v7-preview/`  
**Produkcia:** `https://tesla-waze-piped.vercel.app`

---

## 1. Rozsah projektu

Tento dokument je jediný zdroj pravdy pre mobilnú verziu Tesla Music. Desktopové rozhranie a Tesla Waze navigácia sú mimo rozsahu, pokiaľ nie sú nevyhnutné ako infraštruktúra pre mobilnú PWA.

Zmeny v Tesla Music nesmú zasiahnuť do chránených častí Tesla Waze: GPS, Waze routing, heading-up, projekcia trasy, traffic logika, tile/cache, rerouting a navigačné heuristiky.

Offline modul sa nesmie spustiť pri `?map=1` ani `?embed=1`.

---

## 2. Aktuálna architektúra mobilnej PWA

Mobilná PWA používa oficiálny YouTube IFrame Player pre online prehrávanie.

Vyhľadávanie je anonymné a nesmie vyžadovať prihlásenie do Google/YouTube účtu.

Aktuálna cesta vyhľadávania:

`Mobilná PWA -> /api/youtube-search?q=... -> Vercel -> výsledky YouTube`

Prihlásenie do YouTube účtu je voliteľné a slúži iba pre Likes, účet a personalizáciu. Nesmie byť podmienkou pre vyhľadávanie ani základné prehrávanie.

Viditeľný názov fronty je vždy **Poradie**, nikdy `Queue`.

---

## 3. Oprava anonymného vyhľadávania – V27

Dňa 10. 9. 2026 bolo opravené mobilné vyhľadávanie bez konta.

Súbor `tesla-music-v7-preview/app-v7.js` už nepoužíva Supabase endpoint `twyoutubesearch`.

Aktuálne používa:

`const SEARCH_API='/api/youtube-search?q=';`

Tento endpoint sa používa pre:

- hlavné vyhľadávanie používateľa,
- automatické dohľadávanie podobných skladieb,
- ďalšie skladby interpreta.

Overené na Verceli:

- `/api/youtube-search?q=Karel%20Gott` vracia HTTP 200 a reálne výsledky,
- `/api/asset?name=app-v7.js&v=27` vracia verziu s `SEARCH_API='/api/youtube-search?q='`.

Supabase už nie je v kritickej ceste mobilného vyhľadávania.

---

## 4. Offline – aktuálny cieľ

Offline skladby sa ukladajú **priamo do iPhonu**, nie na Synology.

Cieľová cesta:

`↓ Offline -> resolver -> povolený zdroj audia -> download -> IndexedDB v iPhone -> ✓ Offline`

Lokálna databáza:

- IndexedDB databáza: `teslaMusicOfflineV1`
- store: `tracks`

Offline skladba je fyzicky uložená v zariadení, ale nie ako používateľsky viditeľný MP3 súbor v aplikácii Súbory. Je uložená v privátnom úložisku PWA.

---

## 5. Offline resolver – V28

Aktuálny súbor:

`tesla-music-v7-preview/offline-v20.js`

Aktuálna runtime značka:

`__TESLA_OFFLINE_V28__`

Resolver pracuje s týmito zdrojmi:

1. Jamendo
2. ccMixter
3. Openverse Audio
4. Internet Archive – vrátane priorizácie Netlabels a Open Source Audio
5. Wikimedia Commons
6. MusicBrainz ako metadata/normalizácia identity skladby

YouTube sa používa iba ako zdroj identity, názvu, interpreta, výsledkov a prehrávania. Nie ako zdroj extrahovaného audio súboru.

Nepoužívať Piped, ytdl, extrakciu YouTube stream URL ani obchádzanie YouTube Premium ochrany.

---

## 6. Rights Gate

Offline súbor sa môže uložiť iba vtedy, ak je overené, že zdroj povoľuje download alebo má kompatibilnú licenciu.

Resolver musí odmietnuť:

- all rights reserved,
- access restricted,
- sample,
- preview,
- excerpt,
- trailer,
- podcast,
- interview,
- audiobook,
- nesprávnu skladbu,
- nesprávneho interpreta,
- nesprávnu verziu,
- karaoke/cover/live/remix, ak používateľ požaduje inú verziu.

---

## 7. Wikimedia Commons – exact fallback (od V26, aktívny vo V28)

V26 obsahuje presný fallback `commonsExact()`.

Pri známej skladbe skúša presné názvy súborov napríklad:

- `File:Interpret - Skladba.ogg`
- `File:Interpret – Skladba.ogg`
- `File:Skladba - Interpret.ogg`
- MP3 varianty rovnakých názvov

Ak presný názov neexistuje, pokračuje pôvodné fulltextové vyhľadávanie Commons.

V26 zároveň opravuje identitu pri generických YouTube uploaderoch typu `Audio Library` a porovnáva aj časti názvu oddelené pomlčkou.

---

## 8. Offline diagnostika

Offline modul už nemá pri zlyhaní zobrazovať iba všeobecné `Nenájdené`.

Má zobrazovať konkrétny dôvod, napríklad:

- `Offline zlyhalo: resolve:no_candidates`
- `Offline zlyhalo: Failed to fetch`
- `Offline zlyhalo: audio 403`
- `Offline zlyhalo: small audio`

To umožní rozlíšiť:

1. problém identity,
2. problém vyhľadávania,
3. problém licencie,
4. problém CORS/downloadu,
5. problém uloženia do iPhonu.

---

## 9. YouTube účet

YouTube účet je voliteľný.

Môže slúžiť na:

- synchronizáciu Likes,
- doplnenie používateľského profilu,
- personalizované odporúčania.

Nesmie blokovať:

- otvorenie aplikácie,
- vyhľadávanie,
- zobrazenie výsledkov,
- online prehrávanie,
- Offline resolver pre verejne a legálne dostupné zdroje.

YouTube Music Premium offline súbory nie je možné exportovať do Tesla Music IndexedDB ako MP3/M4A.

---

## 10. Supabase

Supabase projekt:

`dimvegkezslqjtsxdohp`

Historicky obsahoval offline queue/resolver/worker, ale bol zasiahnutý egress obmedzením HTTP 402 `exceed_egress_quota`.

Preto:

- mobilné vyhľadávanie už cez Supabase nejde,
- aktuálny mobilný Offline V28 nepoužíva Supabase queue,
- Supabase nesmie byť znovu zavedený do kritickej cesty bez výslovného rozhodnutia.

---

## 11. Synology

Pre aktuálnu mobilnú Offline architektúru sa Synology nepoužíva.

Synology môže byť v budúcnosti použité ako centrálna cache alebo archív, ale nie je potrebné na uloženie skladby do iPhonu.

Europrojekty aplikácia musí zostať úplne nedotknutá.

---

## 12. Service Worker a cache

Pri významnej zmene mobilnej PWA sa musí zvýšiť verzia cache, aby iPhone nenačítal starý JavaScript.

Historická cache: `tesla-music-pwa-v24`.

Pri ďalšej väčšej stabilnej verzii použiť nové číslo, napr. V27/V28, a vždy overiť, že root, asset loader a Service Worker ukazujú na rovnakú verziu.

`/embed.html` nesmie prepísať root cache.

---

## 13. Zakázané regresie

Nesmie sa znovu zaviesť:

- MutationObserver do Offline/decorate logiky,
- Piped audio stream API,
- ytdl,
- extrakcia YouTube stream URL,
- Google AccountChooser workaround,
- raw.githack runtime loader,
- loader spôsobujúci sivú alebo nefunkčnú stránku,
- závislosť anonymného Search od účtu,
- závislosť Search od Supabase.

---

## 14. Povinný postup zmien

Každá zmena musí byť úzka a vratná.

Pred produkčným potvrdením treba overiť minimálne:

1. root PWA,
2. `/api/youtube-search`,
3. príslušný `/api/asset`,
4. Service Worker/cache pri väčšej verzii,
5. `?embed=1`,
6. `?map=1`,
7. anonymné vyhľadávanie bez účtu,
8. fyzický test na iPhone.

Serverový test nie je fyzický test iPhonu.

---

## 15. Aktuálne overený stav

K 10. 9. 2026:

- mobilná PWA je dostupná na Verceli,
- anonymný `/api/youtube-search` funguje bez konta,
- `app-v7.js` V27 používa Vercel Search API,
- Offline V26 je servovaný z Vercelu,
- Offline V26 používa Jamendo/Openverse/Internet Archive/Wikimedia,
- Offline V26 má presný Wikimedia fallback a diagnostiku,
- Supabase nie je v kritickej ceste Search ani aktuálneho mobilného Offline flow,
- konečné potvrdenie úspešného fyzického uloženia konkrétnej skladby do iPhonu ešte treba dokončiť reálnym testom.

---

## 16. Najbližší krok

1. Na iPhone bez prihláseného YouTube účtu overiť Search.
2. Vyhľadať testovaciu skladbu.
3. Spustiť `↓ Offline`.
4. Ak zlyhá, zapísať presnú hlášku `Offline zlyhalo: ...`.
5. Podľa nej opraviť už iba konkrétny resolver/download krok.

---

**Pravidlo:** Ak je informácia v inom staršom dokumente v rozpore s týmto súborom, platí tento dokument. Pri každej ďalšej stabilnej zmene mobilnej Tesla Music sa musí aktualizovať tento súbor v tom istom pracovnom kroku.


## 8. Offline V28 – maximalizácia bezplatných zdrojov

Resolver bol rozšírený bez platených služieb a bez závislosti od Synology/Supabase queue. Aktívne zdroje sú:

- Jamendo – iba výsledky s explicitne povoleným downloadom a CC licenciou,
- ccMixter – verejné RSS/Pool API, iba plné audio enclosure s Creative Commons licenciou,
- Openverse Audio – širšie vyhľadávanie cez všetky query varianty a väčší počet kandidátov,
- Internet Archive – prioritne Netlabels a Open Source Audio, potom všeobecné audio,
- Wikimedia Commons – exact fallback + fulltext fallback,
- MusicBrainz – iba identifikácia/metadáta, nie zdroj audio súboru.

Free Music Archive sa nepripája priamo: verejné API bolo ukončené a FMA nepovoľuje hotlinking bez osobitného súhlasu. Freesound sa nepripája ako automatický full-download zdroj: originálny download cez API vyžaduje OAuth používateľa; preview súbory sa v Tesla Music nepovažujú za plnohodnotný offline zdroj.

Pravidlo ostáva nezmenené: kandidát sa uloží do IndexedDB iPhonu iba po úspešnom Rights Gate a po stiahnutí reálneho audio súboru väčšieho než minimálny limit.


---

## 15. AirPlay / systémový výstup – V29

Mobilná Tesla Music obsahuje tlačidlo **AirPlay** bez potreby prihlásenia.

Pri lokálnom alebo offline audiu používa natívny iOS/Safari playback-target picker cez `webkitShowPlaybackTargetPicker()` a povoľuje AirPlay na HTML audio elemente cez `x-webkit-airplay=allow`.

Pri online YouTube zostáva prehrávanie výhradne cez oficiálny YouTube IFrame Player. Aplikácia nastaví iframe pre kompatibilné systémové prehrávanie, ale nemá prístup k internému `<video>` elementu vo cross-origin YouTube iframe. Ak Safari neposkytne natívny picker priamo, používateľ vyberie AirPlay cez ovládanie YouTube alebo Ovládacie centrum iPhonu.

V29 nemení YouTube Search, účet, Offline resolver ani Tesla Waze navigáciu.


## V29 – AirPlay a permanentný cache bust

Produkčný root, Service Worker a asset loadery používajú verziu V29. Service Worker cache je `tesla-music-pwa-v29`; CORE používa assety s `&v=29` a root registruje `/sw.js?v=29`. `account-v8.js` načítava `/api/asset?name=offline-v20.js&v=29`. Tým sa zabraňuje tomu, aby iPhone po nasadení novej mobilnej funkcie ostal na starej V23/V24 cache.

Offline modul V29 pridáva tlačidlo `◉ AirPlay` do hornej lišty mobilnej Tesla Music. Pri lokálnom/offline audiu používa systémový iOS AirPlay picker, ak ho WebKit sprístupní. Funkcia nevyžaduje YouTube konto a nemení Tesla Waze navigáciu.


## V31 – odstránenie Offline a AirPlay (10. 9. 2026)
- Offline modul bol odstránený z aktívnej Tesla Music PWA.
- Odstránený je loader `offline-v20.js`, samotný `offline-v20.js` aj súvisiace offline workflowy.
- AirPlay doplnok V29/V30 bol odstránený spolu s Offline modulom.
- Aktívny rozsah: anonymné YouTube vyhľadávanie, oficiálny YouTube IFrame Player, Pre teba, Obľúbené, Naposledy prehrané, Poradie a voliteľné YouTube konto.
- Offline sťahovanie ani vlastný AirPlay ovládač sa ďalej nepovažujú za funkcie projektu.
