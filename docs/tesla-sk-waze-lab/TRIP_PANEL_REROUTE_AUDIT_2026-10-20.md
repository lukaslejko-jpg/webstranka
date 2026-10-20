# TRIP PANEL REROUTE AUDIT — 2026-10-20

> **SUPERSEDED / INCORRECT CONCLUSION**
>
> Tento audit bol neskôr vyhodnotený ako chybný, pretože kontroloval iba to, že ETA/time/distance sa po reroute prepočítajú z novej route, ale ignoroval staršie chránené pravidlo z `NAV_GUIDANCE_FIX_2026-10-19.md` a `SAFE_CHECKPOINT.md`:
>
> **spodný trip progress sa pri reroute/zmene alternatívy nesmie resetovať na nulu.**
>
> Správny source of truth je:
> [TRIP_PROGRESS_CARRY_RESTORE_2026-10-20.md](TRIP_PROGRESS_CARRY_RESTORE_2026-10-20.md)

## Čo bolo v tomto audite správne

Správne bolo potvrdené, že po úspešnom reroute sa majú z novej Waze route prepočítať:
- remaining distance,
- remaining time,
- ETA.

Reálne príklady:
- 05:33:19 → 05:33:25: route +86 m / +5 s,
- 07:14:52 → 07:14:59: route -58 m / -8 s.

## Čo bolo nesprávne

Nesprávny záver bol:
- že progress bar sa má resetovať voči novému `route.total`,
- a že toto je správne správanie.

Dokumentovaný historický checkpoint `dpl_BkqdtjLCUHttGozS4pYyivFjZ3Q5` používal:
- `progressBase`,
- `carriedProgress`,
- carry-forward progress formula.

Reroute/alternative switch bol definovaný ako **pokračovanie tej istej jazdy**.

## Správne pravidlo

Po reroute:
- remaining distance = NOVÁ route,
- remaining time = NOVÁ route,
- ETA = NOVÁ route,
- progress bar = POKRAČOVANIE pôvodnej jazdy, bez resetu na 0 %.

Pri novom cieli:
- progress začína od 0 %.

Pri manuálnom prepnutí alternatívy pre ten istý cieľ:
- progress pokračuje.

## Oprava

Správanie bolo obnovené v release:
- production `dpl_AP8X3Zag6D6RyqUXHAMYGQ9j7svA`
- tested preview `dpl_HWUXeWE14H4bW8qr3RbbR52JTFhY`
- rollback `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`

Detail:
[TRIP_PROGRESS_CARRY_RESTORE_2026-10-20.md](TRIP_PROGRESS_CARRY_RESTORE_2026-10-20.md)
