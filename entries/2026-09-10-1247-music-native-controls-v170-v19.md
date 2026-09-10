# Zásahový záznam – Tesla Music / natívny Tesla panel

Dátum: 2026-09-10

## V170 – natívny Tesla MediaSession bridge
Subsystém: SHELL/MUSIC bridge
Dôvod: Tesla panel zobrazoval metadata skladby, ale Späť/Ďalšia boli sivé; pri prepnutí sa vracalo rádio.
Backup vetva pred aktiváciou: `tesla-waze-backup-before-native-media-activate-v170-20260910`
Base commit pred aktiváciou: `cb6967a892fa491c0bafb9d456933841ba7bf0a1`
Zmenená vetva: `tesla-waze-preview-v1`
Zmenený súbor: `tesla-waze-preview/media-session-v112.js`
Aktivačný commit: `f8b29de1573701cb637c646d3ca0daea1cde2e7a`
Diff: 1 súbor, žiadne zmeny mapy/GPS/routingu/TTS.
Funkcia: z mapového iframe nastavuje `parent.navigator.mediaSession`, registruje play/pause/nexttrack/previoustrack, posiela príkazy do `musicFrame`, pri Next/Prev drží playbackState=playing cca 5 s.
Stav: NEOVERENÉ – čaká na fyzický Tesla test.
Poznámka: Pri neúspechu rollback iba na backup vetvu vyššie. Neobnovovať starý V168 commit `08f64f...`.

## V18 – Play bootstrap
Subsystém: MUSIC
Dôvod: po otvorení hudby bolo `current=null`; Play nemal načítanú skladbu, zatiaľ čo Next skladbu vybral.
Backup: `tesla-music-backup-before-play-fix-v18-20260910`
Commit: `f5607fafc26f5fd0ca6cbf88e4dc87fe6742c373`
Súbor: `tesla-music-v7-preview/mode-v9.js`
Správanie: keď Play/BPlay nemá `current`, vyberie poslednú prehrávanú alebo prvú platnú skladbu z queue a spustí `playTrack()`.
Mini Play: `mini-v7.js` volá `bplay.click()`, preto V18 pokrýva aj `miniPlay`.
Produkcia: potvrdené serverovo cez `https://tesla-waze-piped.vercel.app/api/asset?name=mode-v9.js&v=23` – V18 blok je servírovaný.
Stav: NEOVERENÉ – čaká na fyzický Tesla test.

## V19 – transition audio hold
Subsystém: MUSIC
Dôvod: počas YouTube handoffu prechádza player cez BUFFERING/UNSTARTED/CUED a pôvodné `media()` tieto stavy označovalo ako paused, čo mohlo vrátiť audio focus rádiu.
Backup: `tesla-music-backup-before-transition-hold-v19-20260910`
Commit: `85d15150fb60a2d81e83287ca438e4dc3fa8bde3`
Súbor: `tesla-music-v7-preview/mode-v9.js`
Diff: +59 riadkov, iba mode-v9.js.
Správanie: počas cca 5 s handoffu drží MediaSession ako playing; skutočný YT stav PAUSED (2) zostáva paused; parentu posiela playing=true počas prechodu; po PLAYING sa hold zruší.
Produkcia: potvrdené serverovo cez `/api/asset?name=mode-v9.js&v=23` – V19 blok je servírovaný.
Stav: NEOVERENÉ – čaká na fyzický Tesla test.

## Chránené oblasti
- MAP: nemeniť pri testovaní V170/V18/V19.
- VOICE: TTS `https://europrojekty-app.vercel.app/api/tesla/tts` nemeníť.
- Ak sa aplikácia prestane načítavať, najprv rollback iba V170 cez jeho backup; hudobné V18/V19 sú samostatná vetva/subsystém.
