# Tesla Waze – VERIFIED RUNTIME GUIDE

**Dátum:** 2026-09-10  
**Účel:** Toto je hlavný pracovný runbook pre ďalšie zásahy do Tesla Waze. Pri každej ďalšej práci ho treba načítať ako prvý zdroj a až potom čítať konkrétny kód. Cieľom je nehádať, nerozbíjať funkčný stav a meniť vždy iba jednu vec naraz.

---

## 1. HLAVNÉ PRAVIDLO

**Nikdy nezačínať novú úpravu naslepo.**

Pred každým zásahom:

1. načítať tento dokument,
2. overiť aktuálny HEAD vetvy `tesla-waze-preview-v1`,
3. porovnať ho s posledným fyzicky potvrdeným stavom,
4. vytvoriť novú záložnú vetvu,
5. meniť iba jednu funkčnú oblasť,
6. po zápise spraviť `compare_commits`,
7. ak diff obsahuje niečo mimo plánovaného zásahu, zmenu neakceptovať,
8. pri regresii okamžite použiť zálohu, nie pridávať ďalšie opravné vrstvy.

**Mapa, GPS, routing, hlas a hudba sú samostatné subsystémy. Oprava jedného nesmie meniť ostatné.**

---

## 2. AKTUÁLNY FUNKČNÝ REFERENČNÝ STAV

### Produkcia

- Tesla Waze: `https://tesla-waze.vercel.app/`
- Tesla Music: `https://tesla-waze-piped.vercel.app/`
- Izolovaný Tesla backend: `https://europrojekty-app.vercel.app/`

### GitHub

- Repo: `lukaslejko-jpg/webstranka`
- Aktívna Tesla Waze vetva: `tesla-waze-preview-v1`
- Aktuálny funkčný runtime commit pred pridaním tohto dokumentu:
  - `6c67918821a6c1c29bb7a790c9608054463d34c9`

**Pozor:** samotné pridanie tohto Markdown dokumentu posunie HEAD vetvy, ale nemení runtime súbory. Pri rollbacku runtime sa preto orientovať podľa vyššie uvedeného commitu a záložných vetiev, nie iba podľa HEAD po dokumentačných commitoch.

### Fyzicky potvrdené používateľom

- vyhľadávanie cieľa funguje,
- výpočet Waze trasy funguje,
- hlas navigácie po poslednej TTS oprave **funguje**,
- hlas funguje cez serverom vygenerované MP3 audio, nie cez browser SpeechSynthesis.

### Stav mapy

Používateľ uviedol, že mapy už „išli celkom fajn“ pred poslednými hlasovými experimentmi. Preto sa mapová logika pri hlasových opravách nesmie meniť. Na mapu existuje samostatný chránený baseline nižšie.

---

## 3. CHRÁNENÉ ZÁLOHY / NÁVRATOVÉ BODY

### Hlavný mapový baseline – NEPOHYBOVAŤ

- `tesla-waze-map-baseline-20260910-v154`
- commit: `37aafdd59eaf1a4d6486291ef1be29b5af8b946f`

Toto je používateľom výslovne označený **východiskový bod pre mapy**. Túto vetvu nikdy neupravovať ani neposúvať.

### Ďalšie dôležité zálohy

- `tesla-waze-backup-before-buffer-v155-20260910`
- `tesla-waze-backup-before-zoom-hysteresis-v156-20260910`
- `tesla-waze-backup-before-keepbuffer-v157-20260910`
- `tesla-waze-backup-before-reroute-swap-v158-20260910`
- `tesla-waze-backup-before-forward-prefetch-v159-20260910`
- `tesla-waze-backup-before-nav-transition-v160-20260910`
- `tesla-waze-backup-before-heading-transition-v161-20260910`
- `tesla-waze-backup-before-mediasession-controls-v162-20260910`
- `tesla-waze-backup-before-voice-fix-v163-20260910`
- `tesla-waze-backup-good-map-before-voice-v164-20260910`
- `tesla-waze-backup-before-voice-scopefix-v165-20260910`
- `tesla-waze-backup-good-map-before-direct-voice-v166-20260910`
- `tesla-waze-backup-before-verified-tts-v167-20260910`

Posledná záloha tesne pred funkčným serverovým TTS:

- `tesla-waze-backup-before-verified-tts-v167-20260910`
- base commit: `8fa67ea84ff33bc911ef53d4225759490f0e7b3b`

Funkčný TTS commit nad touto zálohou:

- `6c67918821a6c1c29bb7a790c9608054463d34c9`

---

## 4. PRODUKČNÁ ARCHITEKTÚRA TESLA WAZE

Produkčný root `https://tesla-waze.vercel.app/` používa top-level shell `shell-v144.js`.

Shell:

- vytvorí mapový iframe,
- číta GPS cez `navigator.geolocation.watchPosition`,
- posiela GPS do mapového iframe cez `postMessage`,
- spravuje hudobný iframe a hudobný FAB,
- hudobný origin je `https://tesla-waze-piped.vercel.app`.

Mapový iframe smeruje na:

- `/tesla-waze-preview/live3.html`

Produkčný Vercel `live3.html` je wrapper V128c. Ten načítava z GitHub raw:

- `tesla-waze-preview-v1/tesla-waze-preview/live3.html`

Dôležité:

- Vercel wrapper používa `cache:'no-store'` pre GitHub raw `live3.html`,
- zmeny v aktívnej GitHub vetve sa preto môžu dostať do produkčného runtime bez klasického Vercel redeployu,
- wrapper zároveň prepisuje niektoré asset URL.

Runtime `app.js` je uložený komprimovane ako:

- `app.js.gz.b64`

`live3.html` ho načíta, rozbalí cez `pako`, upraví cez `patchRuntime(text)` a spustí cez Blob script.

**Preto je `patchRuntime()` kritické miesto. Malá zmena v ňom môže zasiahnuť veľkú časť navigácie.**

---

## 5. VYHĽADÁVANIE CIEĽA – FUNKČNÉ

Pôvodný search išiel cez Supabase/twapi a bol nespoľahlivý kvôli egress obmedzeniam.

Aktuálny izolovaný search backend:

- `https://europrojekty-app.vercel.app/api/tesla/search`

GitHub backend repo:

- `lukaslejko-jpg/lukaslejko-jpg-synology-drive-bridge`

Search commit:

- `534fb1f127179a82bbc503172fd735f32acc7654`

Runtime patch v `live3.html`:

```js
out=out.replace(
  "fetch('/api/search?'+u",
  "fetch('https://europrojekty-app.vercel.app/api/tesla/search?'+u"
);
```

Fyzicky potvrdené adresy pri testoch:

- Demjata 307
- Vranovská 2547/41

**Search momentálne nemeníť, pokiaľ používateľ výslovne nehlási problém s vyhľadávaním.**

---

## 6. ROUTING – FUNKČNÝ

Pôvodný Supabase `twroute` bol nahradený izolovaným Vercel backendom.

Aktuálny route endpoint:

- `https://europrojekty-app.vercel.app/api/tesla/route`

Backend commit:

- `5689cdbc1a4aa36c7dfd92a598b6efe56129ff8a`

Runtime patch:

```js
out=out.replace(
  "https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twroute?",
  "https://europrojekty-app.vercel.app/api/tesla/route?"
);
```

Backend používa Waze RoutingManager:

- `https://routing-livemap-row.waze.com/RoutingManager/routingRequest`

A vracia normalizovanú geometriu, kroky, vzdialenosť, čas a traffic dáta.

Používateľ fyzicky potvrdil: **routing funguje**.

**Routing URL a normalizáciu nemeníť bez samostatného testu mimo produkcie.**

---

## 7. HLAS NAVIGÁCIE – AKTUÁLNE FUNKČNÝ

### Čo NEfungovalo

1. Produkčný endpoint:
   - `https://tesla-waze.vercel.app/api/tts`
   - vracal `404 NOT_FOUND`.

2. Browser `SpeechSynthesis` / `browserSpeak()`:
   - v Tesla browseri bol nespoľahlivý / nevydával hlas,
   - opakované pokusy cez `speechSynthesis` neviedli k funkčnému výsledku.

3. Starý dedup patch obsahoval:

```js
if(bucket==='step')return;
```

To potláčalo prvé vzdialenejšie hlásenia.

### Čo FUNGUJE

Bol vytvorený izolovaný serverový TTS backend:

- `https://europrojekty-app.vercel.app/api/tesla/tts`

Backend repo:

- `lukaslejko-jpg/lukaslejko-jpg-synology-drive-bridge`

Záloha backendu pred TTS:

- `backup-before-tesla-tts-20260910`

TTS commity:

- `3fc3839a9fe31e7fd101bbbc6a1c01b275534b32` – prvý TTS endpoint
- `2ff369e87aabbbab80b1da6a75b3421db21102b7` – GET diagnostika

Overený deployment:

- `dpl_33KcDCqrLSTgtX8hdWyXJoqQiuas`
- stav: `READY`

Pri diagnostickom teste endpoint vrátil:

- HTTP `200`,
- `audio/mpeg`,
- 22 080 bajtov MP3 audia,
- testovacia veta: „O 300 metrov odbočte doprava.“

Používateľ následne fyzicky potvrdil: **„funguje!!!!“**

### Aktuálny runtime patch pre TTS

V `tesla-waze-preview/live3.html`:

```js
out=out.replace(
  "PROD_ORIGIN+'/api/tts'",
  "'https://europrojekty-app.vercel.app/api/tesla/tts'"
);
```

Aktuálny hlasový dedup patch ponecháva aj vzdialený `step` ako platnú prvú úroveň:

```js
const sig=voiceManeuverSignature(step),
      rank=({step:1,3000:2,2000:3,1000:4,500:5,200:6,now:7})[bucket]||1,
      seen=voiceManeuverHistory.get(sig)||0;
```

### DÔLEŽITÉ PRAVIDLO PRE HLAS

**Nevracať sa k browser SpeechSynthesis ako primárnemu riešeniu.**

Primárna cesta hlasu je:

`voiceNavigation()` → `speak()` → `https://europrojekty-app.vercel.app/api/tesla/tts` → base64 MP3 → `AudioContext.decodeAudioData()` → prehratie cez `AudioBufferSourceNode`.

Browser speech môže zostať iba fallback.

### Poznámka k upstream TTS

Izolovaný backend momentálne získava MP3 z Google Translate TTS endpointu. Je to prakticky funkčné riešenie, ale nie je to garantované stabilné oficiálne API. Ak sa hlas niekedy znova pokazí, **najprv otestovať samotný `/api/tesla/tts`**, až potom meniť klienta.

---

## 8. MAPA – CHRÁNENÁ OBLASŤ

### Leaflet nastavenia

Základ mapy používa:

```js
zoomAnimation:false,
fadeAnimation:false,
markerZoomAnimation:false
```

**Tieto animácie NEZAPÍNAŤ.**

Experiment V152 s animáciami fyzicky spôsobil katastrofické rozpadanie / blikanie otočených tiles. Tento typ zmeny sa nesmie znovu aplikovať.

### Tile vrstvy

Waze road tiles:

```text
https://www.waze.com/row-tiles/live/base/{z}/{x}/{y}/tile.png
```

Satelitné vrstvy používajú ArcGIS.

### keepBuffer

Aktuálny runtime patch:

```js
const common={maxZoom:20,keepBuffer:5,updateWhenIdle:false,updateWhenZooming:false}
```

Pôvodne bolo `keepBuffer:3`.

### Zoom hysteréza

Aktuálne je v `live3.html` vložené `navigationZoomStable()`.

Cieľ:

- zabrániť prepínaniu zoomu sem-tam pri hraniciach vzdialenosti,
- zoom-in hold cca 800 ms,
- zoom-out hold cca 1800 ms,
- reset pri novej trase.

**Nezapínať animovaný zoom.**

### Route visibility / off-route ochrana

Aktuálny runtime obsahuje ochranu, aby pri krátkom GPS mismatch nezmizla aktívna modrá trasa.

Off-route reroute je potlačený pri veľmi nízkej rýchlosti a prah pre reroute bol zvýšený z 1 hitu na 2.

### Chránený baseline

Ak sa mapa začne po novej úprave rozpadať, prvý referenčný bod je:

- `tesla-waze-map-baseline-20260910-v154`

Ak regresia vznikla po novšej úprave, používať najbližšiu zálohu pred danou zmenou.

---

## 9. TILE CACHE / PREFETCH – DÔLEŽITÁ REALITA

`offline-sw-v98.js` existuje v GitHub zdroji, ale produkčný Vercel path bol pri kontrole:

- `/tesla-waze-preview/offline-sw-v98.js`
- výsledok: `404`

Pôvodná registrácia service workeru v `app.js` je navyše podmienena:

```js
location.hostname==='raw.githack.com'
```

Produkcia beží na `tesla-waze.vercel.app`, takže tento SW sa tam týmto kódom neregistruje.

**Nezapínať service worker naslepo.** Najprv musí existovať rovnakooriginový SW asset na Verceli a musí sa overiť scope.

### Helpery V155–V162

Boli vytvorené viaceré experimentálne helpery:

- passive tile prefetch,
- forward prefetch,
- navigation transition helper,
- manual zoom warmup,
- parent MediaSession helper.

Produkčný V128c wrapper načítava `media-session-v112.js` z raw GitHubu, ale relatívne URL vytvorené týmto skriptom sa môžu rozlišovať voči dokument originu Vercelu. Preto **nesmie sa automaticky predpokladať, že každý relatívne načítaný helper je v produkcii aktívny**.

Pri ďalšej práci treba každú pomocnú URL overiť cez produkčný browser/Vercel a nespoliehať sa iba na GitHub commit.

---

## 10. HUDOBNÝ PANEL TESLY – STAV

Tesla Music samostatná produkcia:

- `https://tesla-waze-piped.vercel.app`

Vnútorný hudobný prehrávač už obsahuje:

```js
navigator.mediaSession.setActionHandler('play', ...)
navigator.mediaSession.setActionHandler('pause', ...)
navigator.mediaSession.setActionHandler('nexttrack', ...)
navigator.mediaSession.setActionHandler('previoustrack', ...)
```

A vnútorné funkcie:

- `mnext()` / `next()`
- `mprev()` / `prev()`

fungujú pre UI prehrávača.

### Prečo Tesla panel neukazoval Ďalšia / Späť

Top-level Tesla shell `shell-v144.js` vlastní samostatný hudobný iframe, ale nemal vlastné MediaSession handlery. Tesla môže brať natívny panel z top-level browsing contextu a ignorovať iframe MediaSession.

Bola pripravená bridge logika, ale **hudobná produkcia sa deployuje ako samostatný 9-súborový Vercel bundle**, nie automaticky z GitHub vetvy `tesla-music-v6-preview`.

Preto GitHub zmena na hudobnej strane ešte sama osebe neznamenala, že produkcia ju používa.

### Dôležité

**Aktuálne nepovažovať Tesla natívne tlačidlá Ďalšia/Späť za vyriešené, kým ich používateľ fyzicky nepotvrdí v aute.**

Neriešiť hudbu súčasne s mapou alebo hlasom.

---

## 11. SYNLOGY / EUROPROJEKTY BACKEND – HRANICE

Izolovaný Tesla backend beží v projekte:

- Vercel project: `europrojekty-app`
- Project ID: `prj_bpYGbAjHR0DbahVpfIaCitXxaR9Q`
- GitHub repo: `lukaslejko-jpg/lukaslejko-jpg-synology-drive-bridge`

Tesla endpointy tam boli pridané ako samostatné cesty:

- `/api/tesla/search`
- `/api/tesla/route`
- `/api/tesla/tts`

**Pravidlo:** Tesla endpointy musia zostať izolované a nesmú meniť existujúcu Europrojekty/Synology SFTP logiku.

Nikdy nevypisovať ani nezdieľať citlivé hodnoty environment variables.

---

## 12. ČO JE ZAKÁZANÉ ROBIŤ BEZ VÝSLOVNÉHO DÔVODU

1. Nezapínať Leaflet `zoomAnimation`, `fadeAnimation`, `markerZoomAnimation`.
2. Nevracať runtime loader cez raw.githack.
3. Nevracať Piped/ytdl/stream extraction.
4. Nevracať search alebo route späť na nefunkčné Supabase endpointy.
5. Nevracať primárny hlas na `tesla-waze.vercel.app/api/tts` – tento endpoint bol 404.
6. Nevracať primárny hlas na `SpeechSynthesis`.
7. Nemeniť mapu pri oprave hlasu.
8. Nemeniť hlas pri oprave hudby.
9. Nemeniť routing pri oprave mapových tiles.
10. Nevytvárať viac opravných vrstiev po regresii – najprv rollback.
11. Nepovažovať GitHub commit za produkčne aktívny bez overenia URL/runtime.
12. Nepohybovať vetvu `tesla-waze-map-baseline-20260910-v154`.

---

## 13. POVINNÝ ROLLBACK POSTUP

Ak používateľ povie, že sa po poslednom zásahu niečo zhoršilo:

1. **zastaviť ďalšie úpravy,**
2. identifikovať poslednú zálohu pred daným zásahom,
3. zistiť jej presný commit SHA,
4. `update_ref` aktívnej vetvy späť na tento commit,
5. overiť, že produkčný raw GitHub už ukazuje rollbacknutý obsah,
6. až po používateľovom potvrdení pokračovať,
7. novú opravu skúšať samostatne.

Neopravovať regresiu ďalšími 3–4 vrstvami bez rollbacku.

---

## 14. TESTOVACÍ CHECKLIST PO KAŽDEJ ZMENE

### Na PC

Overiť podľa typu zmeny:

- produkcia sa načíta bez chyby,
- search autocomplete,
- výber cieľa,
- výpočet trasy,
- prepnutie `Celá trasa ↔ Navigovanie`,
- ručný zoom +/-,
- hudba sa otvorí a nezrúti mapu,
- ak ide o TTS, najprv otestovať endpoint samostatne.

### V Tesle

Fyzicky potvrdiť:

- tiles sa nerozpadajú pri jazde a rotácii,
- modrá trasa ostáva viditeľná,
- reroute nebliká,
- heading je stabilný,
- hlas sa prehráva cez reproduktory,
- hlasitosť navigácie reaguje na slider,
- hudba sa neprepína sama,
- natívny Tesla media panel sa správa podľa očakávania.

**PC test nenahrádza fyzické overenie Tesla Chromium pri heading/rotácii.**

---

## 15. AKTUÁLNY HLAS – DIAGNOSTIKA PRI BUDÚCEJ CHYBE

Ak používateľ povie „hlas nejde“:

### Krok 1 – nemeníť klienta

Najprv otestovať:

`https://europrojekty-app.vercel.app/api/tesla/tts?q=O%20300%20metrov%20odbocte%20doprava`

Očakávanie:

- HTTP 200,
- JSON s `audioContent`,
- `contentType: audio/mpeg`,
- `bytes > 0`.

### Krok 2

Ak backend nefunguje, opravovať iba backend.

### Krok 3

Ak backend funguje, skontrolovať v `live3.html`, že runtime obsahuje:

```js
out=out.replace(
  "PROD_ORIGIN+'/api/tts'",
  "'https://europrojekty-app.vercel.app/api/tesla/tts'"
);
```

### Krok 4

Až potom kontrolovať `speak()` / AudioContext prehrávanie.

**Nezačínať SpeechSynthesis experimentmi.**

---

## 16. AKTUÁLNE KĽÚČOVÉ COMMIT SHA

Tesla Waze:

- chránený map baseline: `37aafdd59eaf1a4d6486291ef1be29b5af8b946f`
- route backend switch: `738142411d952999efb6be48029c9d50fa06427c`
- map visibility baseline: `37aafdd59eaf1a4d6486291ef1be29b5af8b946f`
- parent MediaSession stage / dobrý mapový bod pred hlasovými experimentmi: `6b786c4e60fa3a1e1eeabfef4a331496582d7360`
- direct voice dedup fix: `8fa67ea84ff33bc911ef53d4225759490f0e7b3b`
- **funkčný serverový TTS klient:** `6c67918821a6c1c29bb7a790c9608054463d34c9`

Tesla backend:

- search: `534fb1f127179a82bbc503172fd735f32acc7654`
- route: `5689cdbc1a4aa36c7dfd92a598b6efe56129ff8a`
- TTS initial: `3fc3839a9fe31e7fd101bbbc6a1c01b275534b32`
- TTS diagnostic GET: `2ff369e87aabbbab80b1da6a75b3421db21102b7`

---

## 17. PRACOVNÝ POSTUP PRE ĎALŠIEHO ASISTENTA / ĎALŠIU RELÁCIU

Pri otvorení novej konverzácie alebo po strate kontextu postupovať takto:

1. načítať tento dokument,
2. načítať aktuálny `tesla-waze-preview/live3.html`,
3. načítať relevantný konkrétny súbor iba podľa riešeného problému,
4. overiť produkčný endpoint/browser URL,
5. zistiť posledný používateľom fyzicky potvrdený stav,
6. vytvoriť backup branch,
7. spraviť jediný úzky zásah,
8. compare diff,
9. až potom dať používateľovi test.

### Zásada

**Nehádať architektúru podľa názvu súboru. Najprv overiť, ktorý kód sa skutočne vykonáva v produkcii.**

Produkčný wrapper, GitHub raw a Vercel bundle môžu mať rozdielne cesty a cache správanie.

---

## 18. POSLEDNÝ POTVRDENÝ VÝSLEDOK

Po presmerovaní hlasu na overený endpoint:

`https://europrojekty-app.vercel.app/api/tesla/tts`

používateľ fyzicky potvrdil:

> „funguje!!!!“

Tento výsledok je odteraz **referenčný stav hlasu navigácie**.

Ak budú nasledovať ďalšie úpravy, tento bod sa nesmie stratiť. Pred každou ďalšou úpravou vytvoriť nový rollback branch.
