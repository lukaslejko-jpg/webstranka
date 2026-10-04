# Music Offline — samostatný downloader (preview)

**Stav 4. 10. 2026: server sa nasadil, ale skutočný YouTube test skončil `source_blocked / bot_confirmation / probe`. MP3 nebolo získané a nový frontend sa nezverejnil.** Presný stav a zachované návratové body: `../docs/music-offline-youtube-20261004-03.md`. Úspešné jednotkové testy neznamenajú úspešné sťahovanie z hostingu.

Táto služba prijme jeden verejný YouTube odkaz, pripraví MP3 a dočasne ho poskytne Music Offline na uloženie do zariadenia. Nie je súčasťou produkčnej Music06 ani jej servera. Zmena frontendovej aplikácie a jej nasadenie sa evidujú samostatne.

## Spustenie na Render

- Runtime: Python; jedna webová služba, jeden proces.
- Build: `pip install -r music-offline-downloader/requirements.txt && python music-offline-downloader/check_runtime.py && python -m unittest discover -s music-offline-downloader/tests -v`
- Start: `python music-offline-downloader/app.py`
- Health check: `/health`
- `NODE_VERSION=22`
- `ALLOWED_ORIGINS=https://music-offline-307.onrender.com`
- Voliteľne `MUSIC_DOWNLOAD_TMP`: samostatný dočasný adresár tejto služby.
- ffmpeg a ffprobe musia byť dostupné v runtime; build kontroluje aj Node >=22 a presné Python balíky.
- yt-dlp používa `--compat-options no-certifi`, teda systémový zoznam certifikačných autorít so zapnutým overovaním TLS. Nepoužíva `--no-check-certificates`.

## API

Všetky `/api/` požiadavky vyžadujú presný hlavičkový `Origin` z `ALLOWED_ORIGINS`. CORS nepoužíva cookies. Verejný `/health` slúži aj platformovému monitorovaniu. CORS obmedzuje používanie z prehliadača; nie je prihlasovaním ani ochranou pred klientom, ktorý si sám nastaví HTTP hlavičky.

1. `POST /api/jobs` s JSON `{"url":"https://www.youtube.com/watch?v=YE7VzlLtp-4"}` vráti HTTP 202 a `{id,state,videoId,expiresAt}`. `expiresAt` je Unix čas v milisekundách. Prvá úloha už môže mať stav `preparing`.
2. `GET /api/jobs/{id}` vracia stav: `queued`, `preparing`, `downloading`, `converting`, `ready`, `failed` alebo `cancelled`. Nevykazuje odhadované percentá.
3. Stav `ready` pridáva vrcholové polia `title`, `artist`, `durationMs`, `bytes`, `sha256`, `sourceUrl`, `filePath`. `filePath` má presne tvar `/api/jobs/{id}/audio`.
4. `GET /api/jobs/{id}/audio` vráti úplný súbor ako `audio/mpeg`. Frontend musí overiť veľkosť/hash a uložiť skutočné bajty, až potom oznámiť offline dostupnosť.
5. `DELETE /api/jobs/{id}` zruší úlohu; prebiehajúci subprocess aj jeho skupinu procesov ukončí. Opakované zrušenie je bezpečné.

Chyba hotovej úlohy je reťazec: `{id,state:"failed",error:"source_blocked",...}`. HTTP chyby vracajú `{error:"code"}`. Kódy: `invalid_url`, `invalid_request`, `origin_not_allowed`, `rate_limited`, `busy`, `job_expired`, `not_ready`, `cancelled`, `timeout`, `source_blocked`, `source_unavailable`, `unsupported_source`, `duration_limit`, `too_large`, `conversion_failed`. `rate_limited` a `busy` obsahujú hlavičku `Retry-After` v sekundách.

Pri neúspešnom zdrojovom subprocess-e môže úloha navyše uviesť iba pevné diagnostické kategórie `reason` a `stage`. `stage` je `probe` alebo `download`; `reason` je `bot_confirmation`, `login_required`, `http_403`, `http_429`, `age_confirmation`, `rate_limited`, `access_forbidden`, `too_large`, `timeout` alebo `source_unavailable`. Text stderr, adresy zo zdroja ani prihlasovacie údaje sa do diagnostiky nevracajú a nelogujú. Rozpoznanie „not a bot“ má prednosť pred všeobecným „sign in“. Existujúce pole `error` sa tým nemení.

## Hranice preview

- Jedna aktívna úloha a najviac dve čakajúce. Najviac 12 dočasných záznamov.
- Životnosť úlohy 15 minút od prijatia; po expirácii alebo reštarte môže byť potrebné opakovanie.
- Zdroj najviac 20 minút, 80 000 000 bajtov; výsledok MP3 128 kbps, najviac 30 000 000 bajtov.
- Celá úloha najviac 240 sekúnd, samotná konverzia najviac 180 sekúnd, zisťovanie zdroja najviac 75 sekúnd.
- Najviac 6 prijatých úloh za hodinu na pozorovanú IP spojenia a 30 celkovo. Proxy hlavičky sa zámerne nepreberajú. Za Render proxy preto môžu viacerí používatelia zdieľať konzervatívny limit 6/hodinu; nejde o overený limit na každé koncové zariadenie.
- Žiadosť má najviac 4 096 bajtov, samotný odkaz najviac 2 048 znakov.
- Podporuje sa iba jeden kanonický YouTube video identifikátor. Ostatné parametre vrátane playlistu sa odstránia. Služba neprijíma všeobecné mediálne URL, súbory s konfiguráciou, cookies, prihlasovacie údaje, nastavenia proxy ani ľubovoľné argumenty konvertora.
- ID úlohy je náhodný 128-bitový prístupový identifikátor. Služba neposkytuje prehľad všetkých úloh. Metadáta zdroja so sieťovými adresami sa neposielajú klientovi a po úspechu sa odstránia.
- Služba neponúka obchádzanie prihlásenia, ochrany obsahu či zdrojových obmedzení. Blokovaný/nedostupný zdroj sa oznámi stavom chyby.
- Dočasné dáta sú na disku tejto služby. Už uložená hudba v mobile sa pri výpadku downloadera nemení.

## Overenie

Lokálne jednotkové testy kontrolujú validáciu URL, HTTP hranice a CORS, kvóty, frontu, zrušenie pred štartom aj počas práce, odstránenie čiastočných súborov, expiráciu, limity súborov a skutočné ukončenie subprocessu po časovom limite. Testovacie prehrateľné zdroje ani úspešnosť YouTube z Render siete sa nesimulujú ako dôkaz nasadenej funkčnosti.

**Pred sprístupnením tlačidla používateľovi treba vykonať skutočné stiahnutie cez nasadenú službu**, overiť MP3 a až následne skúšku uloženia/prehrávania v offline aplikácii. Úspešný lokálny test nie je zárukou, že YouTube bude akceptovať dátovú sieť hostingu. Fyzické správanie na iPhone zostáva samostatnou skúškou.
