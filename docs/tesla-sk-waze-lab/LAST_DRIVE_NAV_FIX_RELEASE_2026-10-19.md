# LAST DRIVE NAVIGATION FIX RELEASE — 2026-10-19

## Scope
Release only for `tesla-sk-waze-lab`.

Protected production `tesla-sk` remained read-only and unchanged:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Current LAB production
- deployment: `dpl_Do9x8bnASfyGaGWHQbZqwmxcbtzp`
- URL: `tesla-sk-waze-o0ro9niff-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Immediate rollback:
- `dpl_92bcPeKpMLuXXAYSbsq4ACC7Yi9z`

Tested preview:
- `dpl_5hUeoqRpGVYGDt1zZSPPcwFVSxSu`

## Last drive analysis

### Repeated reroute loop
Real Waze route requests during the drive:
- 19:41:42
- 19:42:05
- 19:42:15
- 19:42:23
- 19:42:29
- 19:42:35
- 19:43:03

The app was therefore re-routing roughly every 6–10 seconds on the problematic section.

### Confirmed bad first-step geometry
At 19:42:35:
- Waze first step: 26 m
- old rendered geometry: 160 m
- ratio: 6.136

The Waze segment endpoint used by the old splitter referenced the opposite directed node. This made the freshly calculated route geometrically wrong immediately after reroute and could trigger another off-route cycle.

### Confirmed duplicate arrival geometry
Return route:
- Waze total: 896 m
- old client polyline: 1 282 m

A final Waze `arrive` step with distance 0 m still carried hundreds of meters of geometry and was being counted/drawn.

### Premature arrival banner
The client used static `arrive` instruction text:
- `Dorazili ste do cieľa`

That text could be displayed as the next maneuver hundreds of meters before the actual physical arrival guard fired.

## Geometry fix
`api/waze-route-dense.js` now:
- uses raw Waze route coordinates as the sole geometry source,
- segments the raw Waze polyline by cumulative Waze-declared step distances,
- does not use directed Waze segment endpoints for step boundaries,
- does not inject OSRM into dense route geometry,
- makes zero-distance steps add no extra route geometry,
- updates maneuver locations to the derived raw-distance step boundary.

### Production route results
Last-drive bad point:
- Waze total: 13 147 m
- polyline: 13 130 m
- ratio: 0.999
- first step: 26 m
- rendered first step: 27 m
- first-step ratio: 1.032

Demjata start:
- Waze total: 12 952 m
- polyline: 12 958 m
- ratio: 1.000
- first step: 1 131 m
- rendered: 1 127 m
- ratio: 0.997

Return Demjata:
- Waze total: 896 m
- polyline: 910 m
- ratio: 1.015
- first step: 73 m
- rendered: 74 m
- ratio: 1.016

Other tested routes:
- Reverse ratio: 1.002
- Košice ratio: 0.999
- tested self intersections: 0

## Off-route/reroute fix
Client now:
- never draws an artificial CAR → route connector,
- always starts displayed route at the projected route SNAP point,
- can detect a real committed turn away from route on the first reliable fix.

First-fix committed-turn reroute requires:
- GPS accuracy <= 35 m,
- speed >= 2.5 m/s,
- lateral route distance > max(18 m, 0.9 * accuracy),
- heading mismatch >= 50 degrees.

Fallback behavior remains:
- normal two reliable off-route fixes,
- strong-deviation reroute,
- global 6 s reroute storm throttle.

## Arrival behavior
Before actual physical arrival:
- far arrive maneuver banner: `Pokračujte k cieľu`
- near: `Cieľ je pred vami`

Final:
- `Dorazili ste do cieľa`

is still produced only by actual `arrive()`.

## Voice/music/GPS preservation
Isolation audit passed.

The following sections are byte-identical to previous production:
- voice section,
- music section,
- GPS/location section.

Voice hash:
- `2342c89da4b7fb97f6578b1a1de73e85871ee5b724d90e2f0bedf145979cc3dd`

Music hash:
- `030f80c7f595dc38af6d26034ff3d5b0166e87c468b9869059a56924b54cabaf`

GPS hash:
- `f605301b0706d41576b034a126b0eb9b500c9fae2507695de0f9e304132a1885`

The voice path that was working in the car was intentionally not modified.

## Source integrity
Compared with rollback `dpl_92bc...`, production changed only:

- `api/lab-main.js`
  - old SHA: `94b31ccaffa3981694380e2eb6da5984ca815d1f`
  - new SHA: `0f89af1ddceda3273302c40137c4ef3ffbc603bc`

- `api/waze-route-dense.js`
  - old SHA: `5cb25a987ff7e293564d50aef53908c638352aa3`
  - new SHA: `058fcd14f0cbd0307fc2cbb1130458a2f5b3c02d`

Both SHAs exactly match the tested preview.

All other production files remained unchanged.

## Full regression after production deploy
- root 200
- Waze dense routes 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false
- live POLICE present during production smoke
- traffic 200
- phone/QR 200 / relay / role=phone / dest
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200
- voice diagnostics endpoint preserved

Runtime:
- only known Node `DEP0169 url.parse()` warning
- no new functional exception group observed

## Field verification still required
Server and deterministic regression tests prove the corrected geometry/state rules, but real moving-car GPS behavior still requires a physical drive check for:
- immediate first-fix reroute after an intentional wrong turn,
- no blue CAR → old-route rubber band,
- route remaining visually aligned through the exact junction used in the last drive.
