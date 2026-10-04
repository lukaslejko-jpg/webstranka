# Music Offline — reálne možnosti YouTube audia

Dátum overenia: **4. október 2026**. Stav: **dokončená rešerš; odporúčanie na praktický pilot**.

## Rozhodnutie

Ako prvý bezplatný kandidát na priame napojenie do Music odporúčame **Yoinku Free**. Má verejne zdokumentované získanie MP3, opakovanú dennú kvótu a registráciu bez platobnej karty. Po získaní bezplatného účtu a kľúča treba overiť skutočné audio a jeho uloženie v Music. Druhý kandidát je **Tunelio**. Ak je cieľom vlastná prevádzka, najbližším hotovým komponentom je **MeTube**.

Predchádzajúce zlyhanie konkrétnej požiadavky z Renderu nepotvrdzuje všeobecnú nemožnosť offline YouTube. Podrobný záznam pôvodného pokusu zostáva v [dokumentácii Preview 03](music-offline-youtube-20261004-03.md). Táto rešerš rozširuje pôvodný zoznam kandidátov; drahá ponuka Zyla nie je jediná možnosť.

## Čo sa overilo

Prečítali sa oficiálne cenníky, API dokumentácie, podmienky a dostupné zdrojové kódy. Overila sa aj pripravená integrácia v našom repozitári a nástroje zo snímky používateľa. Nové služby sa označujú ako **doložené kandidáty**, nie ako úspešne otestované sťahovanie.

V tejto rešerši sa nevytvoril účet, neaktivovala platba, nepoužil API kľúč a nevykonala konverzia. Mobilná fyzická skúška zostáva súčasťou pilotu. Uvedené ceny sú v USD podľa stránok poskytovateľov v deň overenia; nejde o garantovanú budúcu ponuku ani konečnú faktúru.

## 1. Služby na priame napojenie do Music

| Poskytovateľ | Bezplatné použitie | Ďalšie náklady | Hodnotenie pre Music |
| --- | --- | --- | --- |
| [Yoinku](https://yoinku.com/en/pricing) | 5 stiahnutí denne na účet, bez karty | Hobby 9 USD/mesiac, 50 stiahnutí denne | Prvý bezplatný pilot; denná kvóta sa obnovuje. |
| [Tunelio](https://tunelio.dev/) | 100 úvodných kreditov, bez karty | Pro 9 USD/mesiac, 100 000 kreditov | Druhý pilot; bezplatný kredit je úvodný. |
| [Video Download API](https://video-download-api.com/pricing) | Oprávnené nové účty môžu dostať jednorazový kredit 0,005 USD | MP3 od 0,0002 USD za požiadavku; dobíjanie kreditu | Nízka zverejnená sadzba, pred platbou treba overiť celé účtovanie a minimálne dobitie. |
| [VideoScale.sh](https://videoscale.sh/) | 10 GB prenosu po registrácii, bez karty | Ďalší prenos od 0,80 USD/GB | Rezerva; verejná prezentácia uvádza API aj konverziu na MP3. |

### Yoinku: prvý pilot

[Oficiálna dokumentácia](https://yoinku.com/en/api) uvádza autentifikáciu hlavičkou `x-api-key`, zistenie informácií cez `/api/v1/info` a vytvorenie súboru cez `/api/v1/download`. Audio formáty zahŕňajú `a-mp3` a `a-m4a`; odpoveď obsahuje názov a odkaz platný približne hodinu. Platí aj limit 5 požiadaviek za minútu na IP. Denná kvóta účtu je spoločná pre web aj API.

Pri jednom účte pripojenom k Music sa kvóta zdieľa medzi jej používateľmi. Kľúč preto patrí na server; ochrana našej kvóty musí zahŕňať prístup k vytváraniu úloh, samotné CORS nie je autentifikácia. Získané audio sa musí celé uložiť lokálne. Následné prehrávanie z uloženého súboru už nevyžaduje platnosť pôvodného odkazu.

[Podmienky](https://yoinku.com/en/terms) vyžadujú oprávnenie spracúvať obsah a neobsahujú záruku dostupnosti. [Prevádzkovateľ](https://yoinku.com/en/tokushoho) je jednotlivec; nemáme doloženú dlhodobú spoľahlivosť. Maximálna dĺžka audia nebola z verejných podkladov potvrdená. API dokumentácia bola získaná cez index vyhľadávania, priame načítanie tejto stránky nástrojom vracalo timeout; cenník a podmienky sa načítali. To nenahrádza test API.

### Tunelio: pripravená záloha

[API dokumentácia](https://tunelio.dev/docs/) opisuje `/info` za 6 kreditov a `/create?quality=mp3` za 10 kreditov. Zo 100 úvodných kreditov vychádza 6 kompletných postupov informácie + MP3, prípadne 10 samotných vytvorení odkazu. Ide o výpočet z cenníka, nie meranie úspešných skladieb. Výstup zahŕňa názov, veľkosť a podpísanú URL, typicky platnú približne šesť hodín. Kľúč je Bearer token a poskytovateľ požaduje uloženie na serveri.

Na platené používanie treba pred výberom preveriť účtovanie a limity. Úvodná stránka a technická dokumentácia sa rozchádzajú v opise limitu Pro; konzervatívne sa riadiť technickým limitom 5 požiadaviek za sekundu. Pre náš pilot s jednotlivými skladbami nie je výkon hlavné kritérium.

### Video Download API: lacná sadzba s podmienkami

[Pravidlá skúšobného kreditu](https://video-download-api.com/free-youtube-downloader-api) vyžadujú potvrdený e-mail, oprávnený účet a dostupnosť denného prideľovania. Kredit existuje až vtedy, keď ho zobrazí účet. Poskytovateľ uvádza až 25 štandardných požiadaviek; metadáta a ďalšie operácie môžu tiež míňať kredit, preto to nemožno zamieňať za garantovaných 25 kompletných importov skladieb.

MP3 sadzba v [cenníku](https://video-download-api.com/pricing) má základné trvanie 180 minút. Minimálne dobitie a presný celkový náklad nášho postupu neboli potvrdené. Najprv by sa použil iba pridelený bezplatný kredit a skontrolovala spotreba po jednom výsledku. Nízka cena sama osebe nepotvrdzuje dostupnosť služby.

### VideoScale.sh: ďalšia možnosť bez paušálu

[Poskytovateľ](https://videoscale.sh/) deklaruje 10 GB ako počiatočný objem, následné dobíjanie a výstup audia vrátane MP3. Nejde o doložených 10 GB zadarmo každý mesiac. Pred pilotom treba preveriť účtovanie konverzie, minimum dobitia, presný kontrakt API a podmienky. Na prvý test má Yoinku jasnejšie zverejnený denný bezplatný model.

## 2. Hotové riešenie pre vlastný server

**[MeTube](https://github.com/alexta69/metube)** je hotové webové rozhranie nad yt-dlp, distribuované aj ako Docker kontajner. Má front úloh, audio formáty a odkazy na výsledné súbory. Zdroj je pod AGPL-3.0. Je vhodným základom pre samostatnú službu, ktorú by náš adaptér napojil na Music.

Softvér nemá poplatok za každú skladbu; vlastná prevádzka však potrebuje server, úložisko a údržbu. Používa rovnaký základný downloader ako pôvodný pokus, takže inštalácia MeTube sama nepotvrdzuje vyriešenie zisteného odmietnutia zdroja. Pred integráciou musí prejsť obyčajný funkčný test na zvolenom hostingu. Netvrdíme, že NAS alebo iná sieť automaticky vyrieši dostupnosť.

Synology je iba potenciálne miesto prevádzky po overení modelu, procesora, RAM a podpory kontajnerov. Vyžadoval by samostatnú službu, priečinok, HTTPS a prístup. Existujúci projekt Finance AI ani jeho prístupy nie sú súčasťou návrhu.

**[Cobalt](https://github.com/imputnet/cobalt)** má vlastný sťahovací základ a je ďalší možný komponent. [Otvorené oznámenie správcu hlavnej inštancie](https://github.com/imputnet/cobalt/issues/1356) však popisuje blokovanie YouTube. Verejnú stránku preto nepovažujeme za overenú funkčnú náhradu. Toto oznámenie sa týka uvedenej inštancie; nie je testom každej možnej vlastnej prevádzky.

## 3. Použitie priamo na iPhone

### Súbor zo Safari → import do existujúcej Music Offline

Tento postup využíva dnešný import:

1. Webový sťahovač vytvorí skutočný MP3 alebo podporovaný M4A a používateľ súbor uloží.
2. Stiahnutý súbor otvorí v aplikácii Súbory; predvolená cesta môže byť iCloud Drive → Downloads.
3. Otvorí tú istú nainštalovanú Music Offline, v ktorej má knižnicu, a zvolí import.
4. Vyberie jeden alebo viac súborov a po dokončení uloženia overí prehrávanie bez internetu.

Cestu k stiahnutým súborom popisuje [Apple](https://support.apple.com/en-us/102440). Náš `music-offline/public/index.html` obsahuje vstup s `multiple`; `importFiles()` v `music-offline/public/app.js` ukladá každý vybraný súbor cez `putAudio()`. Import teda podporuje viac súborov naraz. Úspech samotného webového prevodu zostáva samostatnou podmienkou.

Používateľom poslaný [TurboScribe downloader](https://turboscribe.ai/sk/downloader/youtube/mp3/free) je možný zdroj pre ručný súborový postup, ak daný prevod úspešne dokončí. [Podpora TurboScribe](https://turboscribe.ai/support) však výslovne neponúka API ani automatizovaný prístup. Na priamu integráciu je preto vhodnejší dokumentovaný poskytovateľ API.

### Bezplatná skratka SW-DLT

**[SW-DLT](https://github.com/net00-1/SW-DLT)** je hotová iOS skratka používajúca [a-Shell mini](https://apps.apple.com/us/app/a-shell-mini/id1543537943). Zdieľaný odkaz spracuje na zariadení a výsledok možno uložiť do Súborov. Autor poskytuje [hotové vydania](https://github.com/net00-1/SW-DLT/releases), takže používateľ nemusí zostavovať aplikáciu na počítači.

Má však konkrétne otvorené hlásenie [HTTP 403 na YouTube](https://github.com/net00-1/SW-DLT/issues/140) z augusta 2026 na iPhone s iOS 26.6. Je to dôvod na skúšku na zariadení, nie dôkaz univerzálneho zlyhania. Skratka a jej konfigurácia potrebujú kontrolu pred integráciou; aktuálne podklady obsahujú aj prihlasovacie možnosti. V rámci rešerše sa neinštalovala a neimportovali sa žiadne cookies.

Automatické prijatie súboru do nainštalovanej PWA cez systémové Zdieľať nemožno prisľúbiť iba pridaním manifestu: [požiadavka WebKitu na Web Share Target](https://bugs.webkit.org/show_bug.cgi?id=194593) zostáva otvorená. Pri tomto variante počítame s výberom súboru v Music. Pri priamom API variante tento dodatočný krok odpadne.

### YouTube Music Premium

[Oficiálna iOS aplikácia](https://support.google.com/youtubemusic/answer/6313535?co=GENIE.Platform%3DiOS&hl=sk) podporuje offline hudbu s Premium a vyžaduje pravidelné pripojenie, najmenej raz za 30 dní. [Google vysvetľuje](https://support.google.com/youtube/answer/7381437?hl=en), že jeho offline súbory nie sú exportované MP3. Táto cesta rieši počúvanie v aplikácii Google; neposkytuje importovateľný súbor pre Music.

## 4. Programy zo snímky používateľa

| Názov | Výsledok preverenia | Využitie pre tento projekt |
| --- | --- | --- |
| [FlixGrab Music](https://freegrabapp.com/en/product/flixgrab-music/) | Autor uvádza Windows a audio M4A/MP3. | Počítačový pomocník na získanie súboru; verejné integračné API sa nedoložilo. |
| [You-Get](https://github.com/soimort/you-get) | Otvorený nástroj pre príkazový riadok, licencia MIT, sťahuje audio a video. | Možný serverový komponent; nie hotová iPhone aplikácia ani záruka dostupnosti konkrétneho zdroja. |
| [CTGMediaExtractor](https://sourceforge.net/p/ctgmediaextractor/code/ci/main/tree/CTGMediaExtractor.vbproj) | Projekt je Windows Forms/.NET; odkazuje aj na privátne knižnice CTGVidX a ClarkTribeGames. | Nie je pripraveným samostatným komponentom pre našu webovú aplikáciu. |
| YouTube Music | Oficiálna offline aplikácia Google, uvedená vyššie. | Použiteľná v rámci služby Google; neposkytuje súbor do Music. |
| Video social downloader, VideoFrom, YouTubePlayer | Katalógové záznamy sú identifikované; aktuálne podporované integračné API od autorov sa nedoložilo. | Bez ďalšieho dôkazu ich nevyberáme ako základ iPhone integrácie. |

[Katalóg zo snímky](https://stiahnut.sk/tag/stahovanie-hudby-z-youtube) pomohol určiť názvy. Rozhodujúce technické tvrdenia vyššie vychádzajú z autorov a zdrojového kódu. Označenie „mobilné“ v katalógu samo nepotvrdzuje dostupnosť pre iPhone.

## 5. Ako napojiť vybranú službu

Pripravená vetva už obsahuje formulár s odkazom, stav úlohy, zrušenie, kontrolu výsledku a uloženie celého audia. Potrebná zmena je adaptér poskytovateľa v samostatnom serveri. Existujúci prehrávač zostáva vlastníkom prehrávania; dokončenie sťahovania nemá prepnúť zobrazenie ani rozpracovaný zoznam.

Navrhovaný postup:

1. Používateľ v Music vloží odkaz a stlačí „Uložiť offline“.
2. Server overí vstup a limit, použije tajný API kľúč a získa výsledný súbor.
3. Overí typ, veľkosť, dekódovateľnosť a trvanie audia. Prevzaté externé URL sa nesmú zmeniť na ľubovoľný proxy prístup; kľúč sa neposiela na doménu výsledného súboru.
4. Existujúce rozhranie `/api/jobs` odovzdá overený súbor Music. Klient potvrdí uloženie Blobu a až potom zverejní skladbu v knižnici.
5. Music prehráva uložené audio lokálne. Výpadok poskytovateľa ovplyvní nové sťahovanie, nie už uložené skladby.

Limity existujúceho pilotu, 20 minút a 30 MB na výslednú skladbu, sú vhodný úvodný rozsah. Nie sú tvrdením o maximách poskytovateľa. Pri vyčerpanej kvóte sa zobrazí zrozumiteľná správa; platený plán sa neaktivuje automaticky.

## 6. Prvý praktický test a kritériá dokončenia

Vstupom je bezplatný účet Yoinku a jeho kľúč uložený ako tajná hodnota servera. Pre test sa vyberú tri verejné nahrávky, pri ktorých je dovolené stiahnutie. Kľúč nepatrí do HTML, Git ani verejného klientského JavaScriptu.

| Overenie | Podmienka úspechu |
| --- | --- |
| Skutočné získanie súboru | API dokončí prevod; získame dekódovateľné audio z daného odkazu, zmeranú veľkosť a trvanie. |
| Uloženie do Music | Dokončený zápis audia pred zobrazením v knižnici; súbor má nenulovú overenú veľkosť. |
| Tri skladby na iPhone | Import cez integrované tlačidlo, správne názvy a prehrávanie každej skladby. |
| Obnovenie a odpojenie | Po dokončenom uložení obnoviť PWA, vypnúť Wi-Fi aj mobilné dáta a overiť zvuk i pokračovanie zoznamu. |
| Ovládanie pri zamknutí | Pauza, ďalšia skladba a posun času menia skutočné audio; čas nepreskakuje. Vyžaduje fyzický iPhone. |
| Opakovaný odkaz | Opätovný výber uloženej skladby nevytvorí nechcenú kópiu a zbytočne neminie ďalšiu konverziu. |
| Chyby | Vyčerpaná kvóta, zrušenie a nedostatok miesta nevytvoria neúplnú položku ani neovplyvnia prehrávanie. |

Nie je potrebné úmyselne vyčerpať reálnu dennú kvótu na testovanie chybového UI; tieto stavy možno overiť kontrolovaným testom adaptéra. Opakované reálne volania sa robia iba na vyriešenie konkrétnej neistoty.

Po tomto overení dostane používateľ samostatný náhľad na odskúšanie. Funkčný checkpoint sa vytvorí až podľa výsledku a používateľského potvrdenia. Predchádzajúce úspešné testy klienta a backendu sú zaznamenané v dokumentácii Preview 03; nepotvrdzujú funkčnosť nového poskytovateľa.

## 7. Stav verzií pri ukončení rešerše

Táto zmena obsahuje iba dokumentáciu na vetve `feature/music-offline-youtube-20261004`. Neobsahuje nový adaptér, kľúč, zmenu služby ani deploy. Chránené body zostávajú:

- `checkpoint/music-offline-preview-20261004-02` — funkčná Music Offline TEST02.
- `checkpoint/music-stable-20261004-06` — potvrdená mobilná Music06.
- `checkpoint/music-desktop-stable-20261004-06` — potvrdená desktopová Music06.

Odporúčanie na pokračovanie je konkrétne: **bezplatný pilot Yoinku → skutočné MP3 → existujúce lokálne úložisko Music → používateľský test na iPhone**. Tunelio je pripravený kandidát pre prípad, že prvý pilot nedosiahne požadovaný výsledok.
