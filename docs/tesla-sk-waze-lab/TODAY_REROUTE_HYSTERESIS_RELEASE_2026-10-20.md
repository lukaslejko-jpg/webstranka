# TODAY LAST DRIVE REROUTE HYSTERESIS RELEASE — 2026-10-20

## Scope
Release only for `tesla-sk-waze-lab`.

Protected `tesla-sk` remained read-only and unchanged:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Current LAB production
- deployment: `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`
- URL: `tesla-sk-waze-aorbayvj9-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Immediate rollback:
- `dpl_Do9x8bnASfyGaGWHQbZqwmxcbtzp`

Tested preview:
- `dpl_GJgPrDMiyVcbGv4616E5TMYAUinB`

## Last drive findings
Repeated Waze reroutes were observed at:
- 05:33:19 / 05:33:25 / 05:33:31
- 05:53:35 / 05:53:41
- 07:14:52 / 07:14:59

Geometry was already sane:
- today's route geometry ratios were ~0.999–1.002,
- so repeated reroute was not caused by the previous polyline inflation bug.

### Heading evidence
At 05:33:19:
- vehicle heading inferred from sequential fixes: ~15°
- every Waze alternative started ~182°
- mismatch ~167°

At 05:33:25:
- vehicle heading ~69°
- every Waze alternative started ~313°
- mismatch ~116°

At 05:53:35:
- vehicle heading ~193°
- every Waze alternative started ~347°
- mismatch ~154°

All alternatives shared the same initial local reversal, so choosing a different route alternative could not solve the loop.

## Fix
The first genuine off-route reroute remains immediate.

After accepting a route:
- normal reroute: 12 s stabilization
- reroute whose initial heading differs >=100°: 30 s stabilization
- initial/non-reroute route with >=100° mismatch: 10 s stabilization
- initial route with local geometry gap >150 m: 6 s stabilization

During stabilization:
- normal heading/lateral disagreement does not trigger a new reroute,
- emergency deviation >250 m may still bypass the hold.

Additional safety:
- first-fix heading detection is only trusted when local geometry gap <=120 m,
- two-fix lateral fallback remains,
- strong-deviation reroute remains,
- global 6 s request throttle remains.

This prevents asking Waze effectively the same question every 6 seconds while preserving the first immediate reroute.

## Test results
Reroute hysteresis deterministic tests:
- 9/9 PASS

Client isolation audit:
- browser JS compile PASS
- voice section byte-identical
- music section byte-identical
- GPS section byte-identical
- no CAR → stale-route connector preserved
- arrival safety preserved
- maneuver latch preserved
- QR preserved
- Waze alerts preserved

Hashes preserved:
- voice: `2342c89da4b7fb97f6578b1a1de73e85871ee5b724d90e2f0bedf145979cc3dd`
- music: `030f80c7f595dc38af6d26034ff3d5b0166e87c468b9869059a56924b54cabaf`
- GPS: `f605301b0706d41576b034a126b0eb9b500c9fae2507695de0f9e304132a1885`

## Route regression
Production smoke:
- 05:33:19 route ratio 0.999
- 05:53:35 route ratio 0.999
- 07:14:52 route ratio 1.002
- Demjata start ratio 1.000
- return Demjata ratio 1.015

Lane guidance:
- present on today's long routes

## Production services
- root 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone/QR 200 + relay + role=phone + dest
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200
- voice diagnostics endpoint preserved

Live POLICE count was 0 in the final tested bbox; this is a live-data state, not an endpoint failure.

## Source integrity
Production vs rollback:
- only `api/lab-main.js` changed

Old SHA:
- `0f89af1ddceda3273302c40137c4ef3ffbc603bc`

New SHA:
- `64527d66fc45931d3c8d044fb968d88c3e129b06`

New production SHA exactly matches tested preview.

No test/audit endpoints were deployed to production.

`api/waze-route-dense.js` remained unchanged:
- `058fcd14f0cbd0307fc2cbb1130458a2f5b3c02d`

## Runtime
Only known warning remains:
- Node `DEP0169 url.parse()`

No new functional exception group was observed.

## Field verification
Real-car verification still required for the behavioral result:
- first wrong turn should reroute immediately,
- same opposite-heading Waze response must no longer cause 6-second reroute loops,
- no blue CAR → old-route rubber band,
- voice remains functional exactly as before this release.
