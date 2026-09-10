# TESLA MUSIC MOBILE — JEDINÝ ZDROJ PRAVDY

Stavový dokument a záväzný východiskový bod pre všetky ďalšie zásahy do mobilnej Tesla Music PWA.

## 1. Záväzný východiskový bod

Východiskový stav projektu je commit:

`097fdd5122e05542836bdd9fe6915545835cd983`

Záloha tohto stavu je branch:

`backup/tesla-music-baseline-20260910-1818`

Každá ďalšia zmena musí vychádzať z tohto stavu alebo z jeho overeného následníka. Pred zásahom do funkčnej časti sa musí vytvoriť bod návratu.

## 2. Produkcia a repozitár

- Produkcia Tesla Music: `https://tesla-waze-piped.vercel.app`
- Vercel projekt: `tesla-waze-piped`
- GitHub repozitár: `lukaslejko-jpg/webstranka`
- Aktívna produkčná vetva Tesla Music: `tesla-music-v6-preview`
- Mobilný zdrojový adresár: `tesla-music-v7-preview/`

## 3. Vyhľadávanie — záväzné nastavenie

Vyhľadávanie skladieb musí fungovať bez prihlásenia do účtu.

Povinný endpoint:

`/api/youtube-search?q=`

Zakázaný návrat na starý Supabase endpoint:

`https://dimvegkezslqjtsxdohp.supabase.co/functions/v1/twyoutubesearch`

Funkcie `search()` aj automatické dohľadávanie súvisiacich skladieb musia používať iba `/api/youtube-search`.

Pri každej zmene Tesla Music sa musí po nasadení otestovať aspoň jeden anonymný dotaz na produkcii a musí vrátiť HTTP 200 s reálnymi výsledkami.

## 4. Prehrávanie

Prehrávanie zostáva cez oficiálny YouTube IFrame Player.

Nesmie sa zavádzať:

- Piped stream API,
- ytdl,
- priame extrahovanie YouTube streamov,
- priame YouTube audio URL mimo oficiálneho prehrávača.

## 5. Offline a AirPlay

Offline modul bol z projektu odstránený a nie je súčasťou aktuálneho funkčného základu.

AirPlay modul bol z projektu odstránený a nie je súčasťou aktuálneho funkčného základu.

Nesmú sa znovu zaviesť bez samostatného rozhodnutia a testu mimo funkčného produkčného základu.

## 6. UI a názvoslovie

- Záložka fronty sa vždy volá `Poradie`.
- Nesmie sa zobrazovať `Queue`.
- Ikony, ktoré Tesla browser nemusí vedieť vykresliť z fontu, majú byť riešené SVG, nie závislosťou od Unicode glyphu.
- Shuffle ikona má byť SVG priamo v tlačidle.
- Hudobná favicon musí byť vložená do skutočného `document.head` produkčnej stránky, nie iba do zdrojového `index.html`, ak produkčný bootstrap `<head>` nepreberá.
- Schválená ikona Tesla Music pri linku je používateľom vybraná ikona čiernej vinylovej platne s červeným stredom a veľkou bielou hudobnou notou. V36 je vložená priamo ako dátová JPEG favicon do `document.head`, aby ju produkčný bootstrap neodstránil.
- Pred nasadením schválenej ikony V36 bola vytvorená záloha `backup/tesla-music-before-selected-icon-v36`.

## 7. Účet

Účet je voliteľný a používa sa iba pre YouTube Likes/personalizáciu. Vyhľadávanie nesmie byť na účte závislé.

## 8. Zásady ďalších zásahov

1. Pred každou zmenou vytvoriť zálohu/bod návratu.
2. Meniť iba mobilnú Tesla Music, pokiaľ nie je výslovne zadané inak.
3. Po každej zmene skontrolovať, že anonymný Search stále funguje.
4. Nevracať Supabase search.
5. Nevracať Offline ani AirPlay bez samostatného rozhodnutia.
6. Každú stabilnú zmenu zapísať do tohto dokumentu.
7. Fyzické správanie v Tesle/iPhone má prednosť pred teoretickým predpokladom.
8. Nikdy netvrdiť, že zmena je nasadená alebo funkčná, kým nie je overená na produkcii alebo fyzickom zariadení podľa povahy zmeny.

## 9. Kontrolný bod pred ďalšou prácou

Pred ďalšou úpravou treba overiť:

- produkčný `/api/youtube-search` = HTTP 200,
- aktuálny `app-v7.js` používa `/api/youtube-search`,
- starý Supabase search sa v aktívnom klientovi nenachádza,
- Shuffle používa SVG,
- favicon je zapisovaná do skutočného `document.head`,
- Offline a AirPlay nie sú aktívne.

Tento dokument je jediný zdroj pravdy pre mobilnú Tesla Music PWA a má sa aktualizovať pri každej stabilnej zmene.