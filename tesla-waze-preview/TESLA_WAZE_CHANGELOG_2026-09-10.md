# Tesla Waze / Tesla Music – CHANGELOG 2026-09-10

Tento súbor sa má aktualizovať po každom zásahu. Každá zmena má mať: zálohu, presný rozsah zásahu, výsledok diffu a fyzické potvrdenie používateľom.

## Stabilný referenčný stav Tesla Waze
- Produkcia: `https://tesla-waze.vercel.app/`
- Funkčný runtime základ: `6c67918821a6c1c29bb7a790c9608054463d34c9`
- Dokumentačný commit nad týmto stavom: `379d67a0afffcd8a7db3b7e0ddb15355c271f6a1`
- Fyzicky potvrdené: stránka sa načíta, mapa ide, vyhľadávanie ide, routing ide, hlas navigácie ide cez serverový TTS, hudba hrá.

## Hlas navigácie – potvrdené funkčné
- TTS endpoint: `https://europrojekty-app.vercel.app/api/tesla/tts`
- Backend commit: `3fc3839a9fe31e7fd101bbbc6a1c01b275534b32`
- Diagnostika: `2ff369e87aabbbab80b1da6a75b3421db21102b7`
- Overený test: HTTP 200, `audio/mpeg`, 22 080 bajtov MP3.
- Používateľ fyzicky potvrdil hlas: `funguje!!!!`.
- Nepoužívať browser SpeechSynthesis ako primárny hlas.

## MediaSession / natívny Tesla panel – ZLYHANÉ POKUSY
### V168
- Záloha: `tesla-waze-backup-before-native-media-v168-20260910`
- Pokus o top-level MediaSession bridge cez mapový runtime spôsobil pád stránky / Tesla renderer error.
- Rollback na `379d67a0afffcd8a7db3b7e0ddb15355c271f6a1`.

### V170
- Záloha: `tesla-waze-backup-before-top-media-v170-20260910`
- Pokus o MediaSession append do `media-session-v112.js` opäť spôsobil pád po načítaní stránky.
- Rollback bol overený cez `compare_commits`: aktívna vetva identická so zálohou, 0 zmien.

### Záver pre Tesla panel
- V Tesla paneli sa zobrazuje skladba a Play/Pause.
- Späť/Ďalšia zostávajú sivé.
- Ďalšie MediaSession hacky cez mapový iframe alebo `media-session-v112.js` NEPOUŽÍVAŤ.
- Ak sa bude riešiť top-level Tesla panel, riešiť iba cez skutočný `shell-v144.js`/Vercel bundle, nie cez mapový runtime.

## Rádio medzi skladbami – aktuálne nevyriešené
- Fyzický problém: pri prepnutí skladby Tesla na približne sekundu pustí FM rádio a potom nabehne ďalšia skladba.
- Dnešný hudobný kód už obsahoval neskoršie V18/V19 vrstvy vrátane playback-state hold, ale rádio stále preskočilo.
- Neopakovať staré keepalive experimenty naslepo.

## DÔLEŽITÝ HISTORICKÝ FUNKČNÝ BOD HUDBY
- Commit: `35824fabbbb6959d659d687ade37332c8aa25195`
- Commit message: `music: seamless YouTube handoff without radio gap`
- Tento commit je kľúčový referenčný bod pre opravu rádiovej medzery.
- Zaviedol `gaplessBusy`, `handoffYoutubeTrack()`, `nextMusicTrack()`, `prevMusicTrack()` a prechod cez jeden existujúci `YT.Player.loadVideoById()` bez okamžitého zrušenia prehrávača.
- V `onStateChange` ignoroval dočasné `PAUSED/CUED/UNSTARTED` počas `gaplessBusy` a neznižoval playback stav počas handoffu.
- Pred koncom skladby spúšťal prechod pri cca `d-t <= 0.38 s`.
- Nevracať celú hudbu na tento historický commit; prenášať iba konkrétnu overenú logiku po jednej zmene.

## Stav po neúspešnom seamless handoff porte
- Commit `05c81013ebc4ce0750937dfd92c4a6ba2aaf6b37` preniesol handoff do `app-v7.js`, ale následný V29 deployment priniesol regresiu UI.
- Tento zásah bol z `app-v7.js` vrátený commitom `b1537d6bf1f4d0b2da75c029123f4fbd5622f4ba`.
- Neoznačovať `05c81013...` za aktuálne funkčný produkčný stav.

## MINI / FULL UI – referenčné správanie
- MINI: malý hudobný panel nad mapou, video skryté, rovnaký YouTube player pokračuje; čas/seek, Späť, Play/Pause, Ďalšia, obľúbené a odporúčania.
- FULL: plávajúce okno, drag, resize, maximalizácia/obnova, zachovaný prehrávač bez reloadu.
- Prepínanie MINI ↔ FULL nesmie vytvoriť nový YouTube player ani reštartovať skladbu.
- Záloha pred embed bridge fixom: `tesla-music-backup-before-embed-bridge-fix-20260910`.
- Commit bridge opravy: `1d2fd23d65590c26beea47d7a794129e2cd50c42`.
- Podstata bridge opravy: `embed=1` sa považuje za mapový režim a komunikácia MINI/FULL/move/resize/close smeruje na top-level Tesla Waze cez `window.top`.

## 2026-09-10 – núdzová obnova Tesla Music produkcie
- Pri vynútenom prázdnom redeployi vznikol 404 production stav; tento postup NEOPAKOVAŤ.
- Produkcia bola následne obnovená deploymentom `dpl_XeJLxY4EbT5ekxQYaV2L7BD1T5Yx`.
- Aktuálny Vercel `index.html` aj `embed.html` používajú priamy bootstrap z GitHub vetvy `tesla-music-v6-preview/tesla-music-v7-preview/`.
- Bootstrap načítava `index.html`, `style-v7.css`, `mode-v9.css`, potom `app-v7.js`, `mini-v7.js`, `account-v8.js`, `mode-v9.js` a YouTube IFrame API.
- Dôvod: obísť rozbitý asset-bundle/embed medziframe stav a zachovať same-origin localStorage.
- Produkčné `https://tesla-waze-piped.vercel.app/` aj `/embed.html?map=1&embed=1` boli po obnove overené HTTP 200.

## 2026-09-10 – známa regresia: prvé Play po otvorení hudby
### Symptóm
- Používateľ klikne na ikonu 🎵, otvorí sa hudba, ale prvé `Play` nič neurobí.
- `Ďalšia` skladbu spustí.

### Skutočná príčina
- V základnom `app-v7.js` je `current=null` po novom otvorení stránky.
- Pôvodné `toggle()` pri Play iba volá `player.playVideo()`, ale ak ešte nebola vybraná skladba, YouTube player nemá čo prehrať.
- `Ďalšia` funguje, lebo najprv vyberie položku z `queue` a zavolá `playTrack()`.
- Druhá hrana problému: ak Play príde skôr než `ready=true`, pôvodný kód príkaz zahodí.

### Oprava SMART_PLAY_V33
- Záloha: `tesla-music-backup-before-smart-play-20260910`.
- Commit: `77437776e4fc63ced875d18320212d40f914a7aa`.
- Zmenený iba `tesla-music-v7-preview/account-v8.js`.
- `Play` teraz:
  1. ak player ešte nie je ready, uloží `pendingSmartPlay=true`;
  2. po `onReady` pending Play vykoná;
  3. ak `current` neexistuje, vyberie prvú hudobnú položku z `queue` a zavolá `playTrack()`;
  4. ak už skladba existuje, správa sa normálne Play/Pause.
- Viaže sa na `play`, `bplay` aj `miniPlay`.
- Fyzické potvrdenie v Tesle: ČAKÁ SA.

## Povinné pracovné pravidlo odteraz
`backup -> jedna úzka zmena -> compare diff -> produkčné overenie -> fyzický test -> zápis do CHANGELOGU`

Ak niečo zlyhá, okamžite rollback. Nevrstviť ďalšie opravy na neoverenú zmenu.
