# PRE-DEPLOY TRIP PROGRESS CARRY RESTORE — 2026-10-20

## Current production / rollback
- project: `tesla-sk-waze-lab`
- production: `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`
- URL: `tesla-sk-waze-aorbayvj9-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Immediate rollback:
- `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`

Protected `tesla-sk` remains read-only:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Documentation source of truth found
`NAV_GUIDANCE_FIX_2026-10-19.md` and `SAFE_CHECKPOINT.md` explicitly require:

- reroute/alternative switch is continuation of the same trip,
- bottom trip progress must be carried forward and must NOT restart from zero,
- remaining ETA/time/distance must still be recalculated from the new valid route,
- manually selected Waze alternative index must be preserved across reroute if it still exists.

Historical implementation:
- functional checkpoint `dpl_BkqdtjLCUHttGozS4pYyivFjZ3Q5`

Historical mechanism:
- route state contains `progressBase`,
- `setRoute()` calculates `carriedProgress` from previous route position,
- new route receives that carried base,
- `renderTrip()` combines:
  - carried trip base,
  - fresh progress within the new route,
- reroute preserves `activeRouteAlternative` when possible.

## Regression found in current production
Current production had lost:
- `progressBase`,
- `carriedProgress`,
- carry-forward progress formula,
- alternative-index preservation.

As a result:
- remaining time/distance/ETA were correctly recalculated,
- BUT trip progress restarted against the new route and could jump back toward zero.

This violated documented protected behavior.

## Preview
Tested preview:
- `dpl_HWUXeWE14H4bW8qr3RbbR52JTFhY`
- URL: `tesla-sk-waze-3fcm5uvhk-lukaslejko-9932s-projects.vercel.app`

Application source diff:
- only `api/lab-main.js`
- production SHA: `64527d66fc45931d3c8d044fb968d88c3e129b06`
- preview SHA: `28a9a856d71225df3f9e082f98d0419a5cc41cc5`

Preview-only test endpoints:
- `api/trip-carry-regression.js`
- `api/trip-carry-isolation-audit.js`

They must NOT be deployed to production.

## Tests
Trip carry regression:
- 12/12 PASS

Verified:
- same trip carries existing progress,
- longer reroute recalculates remaining distance/time,
- longer reroute does not reset progress,
- shorter reroute recalculates remaining distance/time,
- shorter reroute does not reset progress,
- progress continues forward on new route,
- second reroute compounds without going backwards,
- new destination resets progress,
- manual alternative switch carries progress,
- reroute preserves selected alternative,
- missing alternative index is clamped,
- fresh route starts with alternative 0.

Isolation audit:
- browser JS compile PASS
- voice section byte-identical
- music section byte-identical
- GPS section byte-identical
- reroute hysteresis preserved
- no CAR → stale-route connector preserved
- maneuver latch preserved
- arrival safety preserved
- QR preserved
- Waze alerts preserved

Full backend/service preview:
- tested Waze routes 200
- geometry ratios ~0.999–1.015
- lane guidance present where expected
- waze-drive 200 / degraded:false
- events 200 / degraded:false / live POLICE present
- traffic 200
- phone/QR 200
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200
- voice diagnostics endpoint preserved

## Correct behavior after release
During reroute:
- lower text may show `Prepočítavam trasu…` while waiting.

After successful reroute:
- remaining distance = NEW route,
- remaining time = NEW route,
- ETA = NEW route,
- destination = same destination,
- progress bar = CONTINUATION of original trip, never restart from zero.

New destination:
- progress resets to zero.

Manual route alternative switch:
- treated as same trip,
- progress carried forward.
