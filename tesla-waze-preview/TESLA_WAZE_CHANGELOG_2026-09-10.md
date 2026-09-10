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
- Dnešný hudobný kód už obsahuje neskoršie V18/V19 vrstvy vrátane playback-state hold, ale rádio stále preskočí.
- Neopakovať staré keepalive experimenty naslepo.

## DÔLEŽITÝ HISTORICKÝ FUNKČNÝ BOD HUDBY
- Commit: `35824fabbbb6959d659d687ade37332c8aa25195`
- Commit message: `music: seamless YouTube handoff without radio gap`
- Tento commit je kľúčový referenčný bod pre opravu rádiovej medzery.
- Zaviedol `gaplessBusy`, `handoffYoutubeTrack()`, `nextMusicTrack()`, `prevMusicTrack()` a prechod cez jeden existujúci `YT.Player.loadVideoById()` bez okamžitého zrušenia prehrávača.
- V `onStateChange` ignoroval dočasné `PAUSED/CUED/UNSTARTED` počas `gaplessBusy` a neznižoval playback stav počas handoffu.
- Pred koncom skladby spúšťal prechod pri cca `d-t <= 0.38 s`.
- Dnešná vetva `tesla-music-v6-preview` je 353 commitov nad týmto bodom, preto NEROBIŤ rollback celej hudby. Preniesť iba funkčnú handoff logiku.

## Aktuálny pracovný plán pre rádio medzi skladbami
1. Zachovať dnešný Tesla Music UI, queue, odporúčania a sibling overlay architektúru.
2. Nepoužiť ďalší tichý keepalive ako prvú voľbu.
3. Porovnať dnešný `mode-v9.js` s logikou z `35824fab...`.
4. Preniesť iba princíp seamless handoffu: jeden trvalý YT player, `gaplessBusy`, ignorovanie prechodových pause/cued/unstarted stavov, `loadVideoById()` na existujúcom playeri.
5. Pred zásahom vytvoriť novú hudobnú zálohu.
6. Po zásahu spraviť diff iba na hudobných súboroch.
7. Fyzicky overiť v Tesle: Next/auto-next nesmie na okamih pustiť FM rádio.
8. Až po potvrdení označiť ako funkčný nový referenčný stav.

## Povinné pracovné pravidlo odteraz
`backup -> jedna úzka zmena -> compare diff -> fyzický test -> zápis do CHANGELOGU`

Ak niečo zlyhá, okamžite rollback. Nevrstviť ďalšie opravy na neoverenú zmenu.
