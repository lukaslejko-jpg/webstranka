# TRIP PROGRESS CARRY RESTORE — 2026-10-20

## Scope
Release only for `tesla-sk-waze-lab`.

Protected `tesla-sk` stayed read-only and unchanged:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Current LAB production
- deployment: `dpl_AP8X3Zag6D6RyqUXHAMYGQ9j7svA`
- URL: `tesla-sk-waze-4av6x8vjx-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Immediate rollback:
- `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`

Tested preview:
- `dpl_HWUXeWE14H4bW8qr3RbbR52JTFhY`

## Why this release was required
The protected navigation rule had already been documented in:
- `NAV_GUIDANCE_FIX_2026-10-19.md`
- `SAFE_CHECKPOINT.md`

Required behavior:
- reroute/alternative switch is continuation of the same trip,
- bottom progress must NOT restart from zero,
- remaining ETA/time/distance must be recalculated from the NEW route,
- manually selected Waze alternative index should be preserved across reroute when still valid.

The current production before this release had lost:
- `progressBase`,
- `carriedProgress`,
- carry-forward progress formula,
- selected alternative preservation.

A later audit incorrectly treated the reset-to-new-route progress as correct. That audit is now explicitly superseded.

## Historical source restored
Historical documented checkpoint:
- `dpl_BkqdtjLCUHttGozS4pYyivFjZ3Q5`

Historical mechanism restored onto the current codebase:
1. route object contains `progressBase`,
2. `setRoute()` checks whether the destination is effectively the same trip,
3. it calculates carried progress from the old route + previous base,
4. new route gets that carry base,
5. `renderTrip()` combines carried trip base with fresh progress inside the new route,
6. a genuinely new destination resets progress to zero,
7. reroute preserves the manually selected Waze alternative index when available.

## Correct behavior
During reroute request:
- lower text can show `Prepočítavam trasu…`.

After successful reroute:
- remaining distance = NEW route,
- remaining time = NEW route,
- ETA = NEW route,
- destination preserved,
- progress bar = CONTINUATION of the original trip and must not restart from zero.

Manual alternative switch:
- same destination = same trip,
- progress is carried forward.

New destination:
- progress resets to zero.

## Preview tests
Trip carry regression:
- 12/12 PASS

Covered:
- same trip carries progress,
- longer reroute recalculates time/distance,
- longer reroute does not reset progress,
- shorter reroute recalculates time/distance,
- shorter reroute does not reset progress,
- progress advances from carried base,
- repeated reroutes compound without going backwards,
- new destination resets progress,
- manual alternative switch carries progress,
- reroute preserves selected alternative,
- missing alternative is clamped,
- fresh route starts with alternative 0.

Isolation audit:
- browser JS compile PASS
- voice byte-identical
- music byte-identical
- GPS byte-identical
- reroute hysteresis preserved
- no CAR → stale-route connector preserved
- maneuver latch preserved
- arrival safety preserved
- QR preserved
- Waze alerts preserved

Preserved hashes:
- voice: `2342c89da4b7fb97f6578b1a1de73e85871ee5b724d90e2f0bedf145979cc3dd`
- music: `030f80c7f595dc38af6d26034ff3d5b0166e87c468b9869059a56924b54cabaf`
- GPS: `f605301b0706d41576b034a126b0eb9b500c9fae2507695de0f9e304132a1885`

## Full preview / production regression
Routes:
- today 05:33:19: 200 / geometry ratio 0.999 / lane guidance
- today 05:53:35: 200 / geometry ratio ~1.0
- today 07:14:52: 200 / geometry ratio 1.002
- Demjata start: 200 / ratio 1.000
- return Demjata: 200 / ratio 1.015
- Košice: 200 / ratio 0.999 / lane guidance

Services:
- root 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false / live POLICE present
- traffic 200
- phone/QR 200 / relay / role=phone / dest
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200
- voice diagnostics endpoint preserved

Runtime:
- only known Node `DEP0169 url.parse()` warning
- no new functional exception group.

## Source integrity
Production vs rollback:
- only `api/lab-main.js` changed

Old SHA:
- `64527d66fc45931d3c8d044fb968d88c3e129b06`

New SHA:
- `28a9a856d71225df3f9e082f98d0419a5cc41cc5`

New production SHA exactly matches tested preview.

No preview test/audit endpoint was deployed to production.

`api/waze-route-dense.js` and all backend services stayed unchanged.
