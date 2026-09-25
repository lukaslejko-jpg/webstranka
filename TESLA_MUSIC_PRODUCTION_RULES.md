# Tesla Music – produkčné pravidlá

## Cieľ
Tesla Music musí byť plnohodnotná, stabilná hudobná aplikácia pre mobil aj Tesla `/desktop`.
Zmeny sa nesmú vrstviť ako ďalšie rescue/hotfix hacky. Každá zmena musí mať jedného vlastníka logiky, test a jasný rollback bod.

## Nemenné pravidlá

1. **Jeden playback owner**
   - Iba jeden modul smie vlastniť `YT.Player`, `playTrack()`, `next()`, `prev()`, AUTO, Shuffle, MediaSession a spracovanie `onStateChange`.
   - Žiadny ďalší skript nesmie tieto funkcie neskôr prepisovať.
   - Mobil a Tesla používajú rovnaké playback jadro; líši sa iba UI.

2. **Native YouTube playlist pre plynulé a background prehrávanie**
   - Po spustení skladby sa pripraví natívny YouTube playlist s dostatočným bufferom skladieb.
   - Prechod skladba → skladba robí YouTube native playlist.
   - Pri `ENDED` sa nesmie robiť `fetch`, `loadVideoById()` ani paralelný `next(false)`.
   - Žiadne rádio/end-screen medzi skladbami.
   - Žiadne JS timery ako jediný mechanizmus background pokračovania.

3. **Žiadne dvojité AUTO mechanizmy**
   - Generický near-end `next(false)` mimo playback ownera je zakázaný.
   - Na iPhone/iOS je povolený iba jeden riadený continuity handoff v playback ownery tesne pred koncom skladby, ak je potrebný na zachovanie background prehrávania. Musí ísť o presne jeden `nextVideo()` v už pripravenom native playliste, s ochranou proti opakovanému ticku a dvojitému preskoku.
   - Ak iOS handoff prebehol, paralelný `ENDED → next(false)` je zakázaný; ENDED môže urobiť iba jednorazový fallback, ak sa preukázateľne nezmenilo video.
   - Jeden koniec skladby = jeden prechod.

4. **Fronta musí byť pripravená vopred**
   - API vyhľadávanie nesmie byť v kritickej ceste prechodu skladby.
   - Keď zostáva málo položiek, fronta sa dopĺňa vopred na pozadí.
   - Pri samotnom prechode sa nesmie čakať na sieť.

5. **Žiadne rescue polling hacky**
   - Zakázané je periodické opravovanie playera/UI cez `setInterval` každých stovky ms.
   - Zakázané je opakované `playVideo()` spamovanie.
   - Zakázané je tiché pomocné audio `silence.wav` ako most medzi skladbami.

6. **Desktop a mobil sa nesmú navzájom prepisovať**
   - Mobilná playback logika nesmie bežať na `/desktop`.
   - Desktop UI logika nesmie prepisovať playback core.
   - `/desktop` aj `/desktop/` musia smerovať na ten istý desktop.

7. **Jeden render owner**
   - Startup nesmie robiť sériu viditeľných renderov a následné DOM preusporiadanie.
   - Ranking/poradie sa vypočíta pred renderom.
   - Už zobrazené karty sa po stovkách ms nesmú fyzicky prehadzovať.
   - Žiadne preblikovanie starého obsahu pred aktuálnym obsahom.

8. **Jeden build**
   - Produkčný build musí mať jednu verziu assetov.
   - Nemiešať napr. `?v=128` a `?v=153`.
   - Meta build číslo, asset verzie a nasadený commit musia byť konzistentné.

9. **Vyhľadané**
   - Viditeľný názov fronty/výsledkov musí zostať `Vyhľadané`.
   - Search musí fungovať bez Google/YouTube loginu.
   - Žiadny zásah do search UX bez výslovnej potreby.

10. **UI prehrávača**
   - Pri zmene skladby sa nesmie automaticky otvárať alebo zväčšovať player window.
   - Tesla zostáva na spodnej lište, ak ho používateľ sám neotvorí.
   - Mobilné a desktop zobrazenie musia zachovať existujúci layout, pokiaľ zmena nesúvisí s playback opravou.

11. **Bez rádia**
   - Po skončení skladby sa nesmie na sekundu zobraziť ani spustiť YouTube rádio/autoplay odporúčanie.
   - Prechod musí byť priamo `PLAYING A → ENDED A → PLAYING B` v rámci pripraveného native playlistu.

12. **Postup zmien**
   - Každý konflikt odstrániť samostatne.
   - Po každom kroku spustiť automatické regresné testy.
   - Ak test neprejde, nepokračovať na ďalší krok.
   - Produkciu nemeníme počas refaktoringu.

## Povinná akceptácia pred produkciou

1. Root mobil sa načíta bez viditeľného prebliknutia starých zoznamov.
2. `/desktop` sa načíta bez prebliknutia.
3. `/desktop/` funguje rovnako ako `/desktop`.
4. `Vyhľadané` zostáva `Vyhľadané`.
5. Search `Kali` vráti reálne hudobné výsledky.
6. Klik na prvú skladbu vytvorí native playlist s viac ako 20 skladbami.
7. `loadPlaylist()` sa použije pri štarte playlistu; `loadVideoById()` sa nepoužíva na každý automatický prechod.
8. Manual Next = presne jedna skladba.
9. Previous = presne jedna skladba.
10. Žiadny double skip.
11. Pri konci skladby sa nespúšťa nové YouTube search API volanie.
12. Žiadny rádio/end-screen medzistav.
13. Minimálne 10 automatických prechodov za sebou.
14. Žiadny reload celej stránky ani iframe spam.
15. Player window sa pri prechode sám neotvorí.
16. Mobil background test: viac prirodzených prechodov pri zhasnutom/pozadí na reálnom iPhone; simulácia ani desktop browser sa nepovažujú za náhradu.
17. Po návrate do foreground UI ukazuje reálne prehrávanú skladbu.
18. Tesla `/desktop`: viac automatických prechodov bez prebliknutia a bez rádia.
19. `/api/youtube-search` je HTTP 200.
20. Konzola bez nových JS chýb.

## Deploy pravidlo

1. Východiskový bod = posledný funkčný produkčný deployment.
2. Vytvoriť preview.
3. Overiť kompletnú akceptáciu.
4. **Ten istý overený deployment** priradiť produkčnému aliasu; žiadny rebuild medzi preview a produkciou.
5. Po produkcii opakovať smoke test.
6. Uložiť nový rollback/golden deployment.
7. Ak production smoke test zlyhá, okamžitý rollback na predchádzajúci golden deployment.
