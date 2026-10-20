# PRE-DEPLOY TODAY LAST DRIVE REROUTE FIX — 2026-10-20

## Current production / rollback
- project: `tesla-sk-waze-lab`
- deployment: `dpl_Do9x8bnASfyGaGWHQbZqwmxcbtzp`
- URL: `tesla-sk-waze-o0ro9niff-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

This is the immediate rollback point.

## Last drive analysis

Observed route requests:
- 05:31:55 / 05:31:56 to Demjata
- 05:32:34 destination switched to 48.661434,21.239140
- 05:33:19 / 05:33:25 / 05:33:31 repeated reroutes
- 05:34:40 another reroute
- 05:53:35 / 05:53:41 repeated reroutes
- 06:19 / 06:21 / 06:22 reroutes near destination
- 06:49 / 07:06 / 07:14 reroutes toward Vranovská
- 07:14:52 / 07:14:59 repeated reroute pair

Geometry is no longer the cause:
- route geometry ratios on today's repeated points are ~0.999–1.002,
- first-step ratios are sane.

## Confirmed reroute hysteresis problem
At 05:33:19:
- inferred vehicle heading: ~15°
- all 4 Waze alternatives started ~182°
- heading mismatch: ~167°

At 05:33:25:
- inferred vehicle heading: ~69°
- all 4 Waze alternatives started ~313°
- mismatch: ~116°

At 05:53:35:
- vehicle heading ~193°
- all 3 alternatives started ~347°
- mismatch ~154°

Therefore choosing a different Waze alternative cannot solve the local loop: all alternatives share the same initial local reversal.

## Fix
The first real off-route reroute remains immediate.

After accepting a route:
- normal reroute gets 12 s stabilization,
- reroute whose initial heading differs >=100° from vehicle heading gets 30 s stabilization,
- initial/non-reroute route with >=100° mismatch gets 10 s stabilization,
- initial route with locally sparse geometry >150 m gets 6 s stabilization,
- emergency deviation >250 m can bypass stabilization,
- first-fix heading detection is disabled on local geometry gaps >120 m,
- two-fix lateral fallback remains,
- global 6 s request throttle remains.

This prevents requesting effectively the same Waze route every 6 seconds while preserving the first immediate reroute.

## Tested preview
- `dpl_GJgPrDMiyVcbGv4616E5TMYAUinB`
- URL: `tesla-sk-waze-inxduo43q-lukaslejko-9932s-projects.vercel.app`

Tests:
- reroute hysteresis: 9/9 PASS
- browser JS compile: PASS
- voice section byte-identical
- music section byte-identical
- GPS section byte-identical
- no CAR → stale-route connector preserved
- arrival banner safety preserved
- maneuver latch preserved
- QR preserved
- Waze alerts preserved

Voice hash:
- `2342c89da4b7fb97f6578b1a1de73e85871ee5b724d90e2f0bedf145979cc3dd`

Music hash:
- `030f80c7f595dc38af6d26034ff3d5b0166e87c468b9869059a56924b54cabaf`

GPS hash:
- `f605301b0706d41576b034a126b0eb9b500c9fae2507695de0f9e304132a1885`

## Route regression
Today's repeated points:
- 05:33:19 ratio 0.999
- 05:53:35 ratio 1.000
- 07:14:52 ratio 1.002

Other checkpoints:
- Demjata start ratio 1.000
- return Demjata ratio 1.015
- Košice ratio 0.999

Services:
- root 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- traffic 200
- phone/QR 200 + relay
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200
- voice diagnostics endpoint preserved

## Source diff
Production vs preview application files:
- only `api/lab-main.js` differs
- old SHA: `0f89af1ddceda3273302c40137c4ef3ffbc603bc`
- preview SHA: `64527d66fc45931d3c8d044fb968d88c3e129b06`

Preview-only test endpoints:
- `api/reroute-hysteresis-test.js`
- `api/reroute-isolation-audit.js`

They must NOT be deployed to production.

## Read-only protected production
`tesla-sk`:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
- unchanged / read-only
