# PRE-DEPLOY LAST DRIVE NAVIGATION FIX — 2026-10-19

## Current production / rollback
- project: `tesla-sk-waze-lab`
- production: `dpl_92bcPeKpMLuXXAYSbsq4ACC7Yi9z`
- URL: `tesla-sk-waze-6elz415o8-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

This is the immediate rollback point.

## Last drive evidence
Observed route requests:
- 19:41:42
- 19:42:05
- 19:42:15
- 19:42:23
- 19:42:29
- 19:42:35
- 19:43:03

Repeated reroute interval: roughly 6–10 seconds.

Confirmed geometry defect at 19:42:35:
- Waze first step distance: 26 m
- old rendered first-step geometry: 160 m
- ratio: 6.136

Confirmed premature arrival-banner defect:
- return route to Demjata still had an `arrive` maneuver hundreds of meters before physical destination,
- banner could therefore display `Dorazili ste do cieľa` before arrival guard actually fired.

Confirmed duplicate terminal geometry:
- return route Waze total: 896 m
- old client polyline: 1 282 m
- duplicate zero-distance terminal `arrive` step contributed extra geometry.

## Tested preview
Preview:
- `dpl_5hUeoqRpGVYGDt1zZSPPcwFVSxSu`

### Geometry strategy
- use raw Waze polyline only,
- split step geometry by cumulative Waze-declared step distances,
- do not use segment endpoint coordinates for step boundaries,
- zero-distance steps do not add route geometry,
- no OSRM substitution in dense geometry.

Results:
- last-drive bad point: Waze 13 147 m / polyline 13 130 m / ratio 0.999
- first step: 26 m / rendered 27 m / ratio 1.032
- Demjata start: 12 952 m / polyline 12 958 m / ratio 1.000
- return Demjata: 896 m / polyline 910 m / ratio 1.015
- reverse: ratio 1.002
- Košice: ratio 0.999
- self intersections on tested last-drive/Demjata/return routes: 0

### Off-route behavior
- blue route is always anchored at route SNAP point, never directly at CAR,
- artificial CAR → stale-route rubber band is impossible,
- reliable real turn away from route can trigger reroute on first fix when:
  - accuracy <= 35 m,
  - speed >= 2.5 m/s,
  - physical separation > max(18 m, 0.9 * accuracy),
  - heading mismatch >= 50 degrees,
- otherwise two-fix fallback remains,
- strong deviation remains,
- 6 s reroute storm throttle remains.

### Arrival banner
Before physical arrival:
- far: `Pokračujte k cieľu`
- near: `Cieľ je pred vami`

Final `Dorazili ste do cieľa` remains owned only by actual `arrive()`.

## Isolation audit
PASS:
- browser JS compile
- voice section byte-identical to production
- music section byte-identical to production
- GPS section byte-identical to production
- maneuver latch preserved
- QR preserved
- Waze alerts preserved

Voice hash:
- `2342c89da4b7fb97f6578b1a1de73e85871ee5b724d90e2f0bedf145979cc3dd`

Music hash:
- `030f80c7f595dc38af6d26034ff3d5b0166e87c468b9869059a56924b54cabaf`

GPS hash:
- `f605301b0706d41576b034a126b0eb9b500c9fae2507695de0f9e304132a1885`

## Preview service regression
- root 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false / live POLICE present during test
- traffic 200
- phone/QR 200 + relay + role=phone + dest
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200
- voice diagnostics endpoint unchanged

## Read-only reference
`tesla-sk` remains unchanged/read-only:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`
