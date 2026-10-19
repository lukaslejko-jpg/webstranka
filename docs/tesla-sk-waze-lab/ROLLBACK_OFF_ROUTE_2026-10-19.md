# ROLLBACK OFF-ROUTE RELEASE — 2026-10-19

## Dôvod rollbacku
Release:
- `dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`

zaviedol izolovanú off-route vizuálnu logiku, ktorá mala odstrániť modrú „gumu“ za autom.

Následná regresná analýza ukázala vedľajšie riziká:
- celá modrá trasa mohla zmiznúť už po jednom chybnom GPS fixe,
- pri zlyhaní alebo pomalom reroute mohla zostať stará trasa skrytá príliš dlho,
- banner/ETA mohli ešte používať starú route logiku, hoci modrá trasa už bola skrytá,
- vizuálny stav a routing stav neboli dostatočne oddelené.

Táto analýza mala byť vykonaná pred production nasadením.

## Vykonaný rollback
Rollback source:
- `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

Nový production redeploy:
- `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`
- URL: `tesla-sk-waze-d8e6cklzt-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY
- source: redeploy

## Overenie identity
Porovnanie:
- rollback source: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- aktuálny production: `dpl_Hsf76xmRRT8FkS4GLiUhVxAiRsUa`

Výsledok:
- source differences: **0**
- deployment obsah je byte-for-byte zhodný na úrovni source file SHA.

Po rollbaku:
- root → 200
- `/api/waze-route-dense` → 200
- `/api/waze-drive` → 200

## Status revertovaného release
`dpl_GCVfCs9ZT2H5DD9g79R8V3RxtbbW`:
- nepoužívať ako recovery bod,
- nepovažovať za funkčný checkpoint,
- jeho off-route vizuálnu zmenu neopakovať bez kompletnej preview regresnej analýzy.

## Produkcia tesla-sk
Produkcia `tesla-sk` nebola menená:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Povinné pravidlo do budúcna
Pri každom zásahu do `navUpdate`, `off-route`, `rerouting`, `M.setRoute` alebo `M.clearRoute`:
1. najprv rozobrať všetky prechodové stavy,
2. preveriť GPS noise,
3. preveriť úspešný reroute,
4. preveriť pomalý reroute,
5. preveriť zlyhaný reroute,
6. preveriť banner/ETA konzistenciu,
7. až potom preview,
8. až po úspešnej jazdnej/regresnej kontrole production.

