# Tesla Waze backup – V144 / Music V17

Dátum vytvorenia zálohy: 2026-09-09

## Produkčný rollback bod
- URL: https://tesla-waze.vercel.app
- Vercel production deployment: `dpl_4Rc6yAeSDyLrR5QfzXmVkE7nAgAC`
- Stav pri vytvorení zálohy: READY / produkcia funkčná
- Mapový wrapper: V128c
- Shell: V144
- Google OAuth + YouTube Likes backend: zachovaný

## Tesla Music rollback bod
- Zdrojová vetva: `tesla-music-v6-preview`
- Backup vetva: `backup-tesla-waze-v144-music-v17-20260909`
- Music logika: V17
- Hlavné posledné relevantné commity:
  - V17 kontextové prehrávanie / nekonečný feed: `653f7273474f96bfa8ecafca84ee0ba600133c7b`
  - MINI stabilný layout / hudobný filter / plynulý resize: `18386b99be788bbf02a8d27f9497231f057b9318`
  - Google OAuth / YouTube Likes live refresh: `b7c9bf6cc4af7c653c9c11d736ba664b6e8d2952`

## Aktuálne správanie, ktoré sa má považovať za východiskové
- mapa má prioritu
- hudba sa otvorí cez ikonu 🎵
- MINI štartuje vpravo dole
- MINI video skryté
- FULL používa pôvodný odtestovaný standalone layout
- YouTube účet a Likes fungujú
- `Queue` je lokalizované ako `Poradie`
- Auto-next používa hudobný filter
- `Pre teba` sa priebežne rozširuje

## Poznámka k rollbacku
Najspoľahlivejší rollback celej produkčnej aplikácie je návrat na immutable Vercel deployment `dpl_4Rc6yAeSDyLrR5QfzXmVkE7nAgAC`. Hudobný zdrojový stav je zachovaný v backup vetve uvedenej vyššie.
