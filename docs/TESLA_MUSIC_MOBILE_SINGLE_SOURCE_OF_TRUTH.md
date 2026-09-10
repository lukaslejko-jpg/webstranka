# TESLA MUSIC MOBILE — JEDINÝ ZDROJ PRAVDY

## 1. Aktuálny overený východiskový bod: V39

Produkcia: https://tesla-waze-piped.vercel.app/

- Vercel projekt: tesla-waze-piped.
- Project ID: prj_3UUsvRZV5rzNI7Qdkt4LzBYWEPwe.
- Team ID: team_dev6vKKH2V0qxtGe0uy6GpT6.
- Skutočný produkčný deployment: dpl_6Yv3qLSw4f4sWVECoYfig4kjsqTn.
- Deployment URL: https://tesla-waze-piped-2ryagje21-lukaslejko-9932s-projects.vercel.app.
- Stav overený cez Vercel: READY, target production; alias tesla-waze-piped.vercel.app je priradený tomuto deploymentu.
- Identifikácia živej verzie: /version.json, release = 39; HTML meta tesla-music-build = 39; API hlavička X-Tesla-Music-Release = 39.
- Repo: lukaslejko-jpg/webstranka; pracovná vetva tesla-music-v6-preview.
- Reprodukovateľný produkčný balík: tesla-music-production/.
- Commit balíka s backendom, buildom a schválenou ikonou: 717ed9a244ba9e3b1472b3c1a8c15329c6f8364d.
- Frontend použitý v tomto konkrétnom builde: tesla-music-v7-preview/ z pevného commitu e75b715b6ae67f0ca1b4efd36110acaddf6c3c8b.
- Konfigurácia tesla-music-production/vercel.json bola následne zosúladená s presne nasadenými kompatibilnými cestami ikon commitom bc78a746e37cd4b9565d8911225e61c036cc5904.

Zmena v GitHube sama osebe NIE JE nasadenie. Zelený opravný workflow s git commit/git push NIE JE dôkazom funkčnej produkcie.

## 2. Čo bolo opravené

Predchádzajúca produkčná hlavná stránka obsahovala starý bootstrap, ktorý za behu sťahoval HTML/CSS/JS z pohyblivej GitHub vetvy a preberal iba telo HTML. Hlavička pôvodného dokumentu sa tým neprenášala. V39 namiesto toho počas buildu vytvorí kompletný statický frontend na Verceli. Používateľov prehliadač už pri štarte nesťahuje aplikačné skripty z raw.githubusercontent.com.

Starý apple-touch-icon.jpg v repozitári bol reálne poškodený. Kontrolný build ho odmietol správou Invalid JPEG file structure: SOS before SOF. Tento neúspešný build dpl_2V3gt5p6bziRRDnvyztH9DKTykTn NIE JE produkčný východiskový bod.

Ikona bola znovu pripravená z používateľom priloženého, schváleného obrázka vinylovej platne. Nový serverový /api/youtube-search poskytuje priamo JSON metadáta verejných videí; nepresmerováva na starý chránený Vercel deployment a nepotrebuje používateľské konto.

## 3. Vyhľadávanie — záväzné nastavenie

Vyhľadávanie musí fungovať bez prihlásenia. Jediný klientsky endpoint:

/api/youtube-search?q=

Používajú ho hlavné search(), discover() aj ctxFetch() v mode-v9.js. Nesmie sa obnoviť Supabase twyoutubesearch ani music-search. Existujúci account-v8.js obsahuje spätnú poistku pre staré volanie twyoutubesearch, nie aktívne vyhľadávanie cez Supabase.

Backend: tesla-music-production/api/youtube-search.js. V39 načítava verejné vyhľadávacie metadáta YouTube a vracia items s youtubeId, title, artist, duration, artwork. Nesťahuje ani neextrahuje audio/video streamy. Výpadok zdroja musí vrátiť JSON chybu a príslušný stav, nie prihlasovacie HTML vydávané za úspešné vyhľadávanie.

Samotné HTTP 200 nestačí. Overiť Content-Type application/json, obsah items a reálne vykreslenie výsledkov po kliknutí na Hľadať. Vyhľadávacie metadáta sú závislé od dostupnosti upstream zdroja; úspešný test nie je záruka jeho nepretržitej dostupnosti.

## 4. Skutočne vykonané produkčné testy

Čas reportu: 2026-09-10T18:14:47.450Z.

Workflow: Tesla Music V39 final live UI test.
Run: 34513099813; job: 102991816955; výsledok SUCCESS.
https://github.com/lukaslejko-jpg/webstranka/actions/runs/34513099813

Testoval sa výlučne kanonický origin https://tesla-waze-piped.vercel.app, anonymne, bez účtu:

- API mama mia: HTTP 200, JSON, 15 výsledkov; ABBA - Mamma Mia (Official Music Video), ABBA - Mamma Mia (Lyrics).
- API Karel Gott: HTTP 200, JSON, 17 výsledkov; Je jaká je, Zůstanu svůj.
- API abba: HTTP 200, JSON, 19 výsledkov.
- Desktop Chromium, 1280 × 900: vyplnenie #q, skutočné kliknutie #go, načítanie a vykreslenie 15 výsledkov mama mia a 17 výsledkov Karel Gott.
- Mobilné rozloženie Chromium, 390 × 844 s dotykovým režimom: rovnaké kliknutia a vykreslenie 15 a 17 výsledkov.
- V oboch kontextoch sa schválený apple-touch-icon úspešne dekódoval ako obrázok 180 × 180.
- V oboch kontextoch existuje inline SVG v #shuffle a záložka Poradie.
- V oboch kontextoch: 0 starých Supabase vyhľadávacích požiadaviek a 0 zachytených frontendových JavaScript výnimiek.

Dôkazy: artifact tesla-music-v39-final-production-verification, ID 10166575192, obsahuje desktop-v39.png, mobile-v39.png a verification-v39.json. Report je tiež v logu jobu pod VERIFIED_REAL_PRODUCTION_UI.

Tieto testy sú automatizované testy Chromium. Nejde o fyzický test používateľovho iPhonu, iOS dialógu Pridať na plochu ani fyzického prehliadača Tesly. Vykreslenie ikony v systémovom dialógu iOS sa nesmie vydávať za fyzicky overené.

## 5. Schválená ikona

Výlučne používateľom vybraná čierna vinylová platňa s červeným stredom a veľkou bielou notou. Žiadna náhradná generická nota.

- Zdroj: tesla-music-production/selected-vinyl-v39.webp, 256 × 256, 5136 bajtov.
- Git blob: 6c30a34e513e52c627785ddc3b3532f15dab63d9.
- SHA-256: c219e78c0ce44d7cf49ad3213f8fb0aaa48a13a9f27fdf017640f67e837c9dfb.
- Prenos bol overený porovnaním Git blob SHA s miestnym súborom.
- Build overuje checksum aj dekódovanie a vyrába skutočné PNG súbory 32, 180, 192 a 512 px.
- iPhone: /icons/music-v39-180.png, rel=apple-touch-icon v skutočnom hlavnom HTML head.
- Favicon: /icons/music-v39-32.png.
- Manifest: /manifest.webmanifest; PNG ikony 192 a 512 px, názov Tesla Music.
- Koreňový fallback: /apple-touch-icon.png.
- Spätná kompatibilita: /api/apple-touch-icon smeruje na nové PNG; /favicon.ico smeruje na PNG favicon; /apple-touch-icon-precomposed.png smeruje na PNG 180 px.

Ikonu už nevkladať ako ručne skrátené base64, chybný JPEG ani iba runtime data URI. Pri ďalšej zmene overiť dekódovanie, nie len status 200.

## 6. Prehrávanie a UI

Prehrávanie zostáva cez oficiálny YouTube IFrame Player. Nepridávať Piped stream API, ytdl ani extrakciu YouTube audio/video streamov. Poradie sa nesmie premenovať na Queue. Shuffle je inline SVG, nie Unicode glyph závislý od fontu vozidla.

Účet je voliteľný pre Likes a personalizáciu. Príslušný existujúci tok cez tesla-waze.vercel.app sa nemenil. Testy vyššie neoverovali prihlásený účet ani fyzické prehrávanie v aute.

## 7. Offline, AirPlay a uložené údaje

Offline aj AirPlay zostávajú odstránené. V39 ich neobnovuje. Service worker sw.js je iba online sieťový worker a neukladá hudbu na offline prehrávanie. Pri aktivácii odstráni iba staré cache s prefixom tesla-music-pwa-. Nemaže localStorage ani IndexedDB.

Pri oprave sa nemenili názvy kľúčov profilu, obľúbených, histórie ani účtu. Nesmie sa vyžadovať plošné mazanie dát stránky, ktoré by odstránilo naučený profil.

## 8. Zálohy a návrat

Pred touto opravou bola vytvorená vetva backup/tesla-music-before-production-repair-v39 z commitu e75b715b6ae67f0ca1b4efd36110acaddf6c3c8b.

Predchádzajúci produkčný deployment dpl_9gmc1xfz5XnQS54PALGw9BUw4XQY je zachovaný pre technický návrat; je to však predchádzajúci hlásený chybný stav, nie odporúčaná funkčná verzia.

Historické zálohy zostávajú:
- backup/tesla-music-baseline-20260910-1818, commit 097fdd5122e05542836bdd9fe6915545835cd983.
- backup/tesla-music-before-selected-icon-v36.
- backup/tesla-music-before-ios-home-icon-v37.

## 9. Zásady ďalších zásahov

1. Pred zmenou záloha aktuálneho zdroja aj identifikácia produkčného deploymentu.
2. Meniť iba Tesla Music v dohodnutom rozsahu. Europrojekty, Synology a používateľov počítač sa nemenia.
3. Nasadzovať celý tesla-music-production balík vrátane API a ikon; nie iba index alebo ikonu.
4. Build používa pevný frontend commit. Nové zmeny frontendových súborov vyžadujú vedomú aktualizáciu tohto pinu, test a nové nasadenie. Žiadna pohyblivá GitHub vetva načítavaná za behu v prehliadači.
5. Po nasadení skontrolovať READY a skutočné priradenie kanonického aliasu.
6. Overiť verziu na kanonickej adrese, JSON výsledky, skutočné kliknutie na Hľadať, vykreslenie kariet, PNG decode, SVG shuffle a absenciu starého Supabase search.
7. Nepovažovať prihlasovaciu stránku s HTTP 200 za úspešný API test.
8. Nekombinovať neoverené zdroje zo starých deploymentov a nevracať Offline/AirPlay bez samostatného rozhodnutia.
9. Každú stabilnú zmenu zapísať sem. Fyzické správanie na zariadení má prednosť pred predpokladom; presne rozlišovať automatizovaný test od fyzického testu.
