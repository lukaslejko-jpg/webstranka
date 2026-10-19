# Navigation guidance fix — 2026-10-19

## Release

- production alias: `https://tesla-sk-waze-lab.vercel.app/`
- production deployment: `dpl_BkqdtjLCUHttGozS4pYyivFjZ3Q5`
- clean tested preview: `dpl_9une1vS8WzqSo36dTKTYPENxHfvm`
- previous functional production / rollback: `dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`
- production vs tested preview source differences: **0 / 16**
- only source file changed against the previous production: `api/lab-main.js`
- unchanged source files: **15 / 16**

## Root causes found

1. The maneuver banner advanced as soon as GPS projection crossed the maneuver start coordinate:
   `steps[k + 1].start <= loc.along`.
   This could show the following maneuver while the vehicle was still entering the current junction.

2. Several instruction branches were still hard-coded in English:
   `fork`, `merge`, `on ramp`, `off ramp`, `end of road`, and non-straight `continue`.

3. Lane guidance correctly used Waze `clientLaneSet`, but selected and unselected arrows were visually too similar.

4. Every `setRoute()` reset the route state and `wazePassedAlong` to zero. During reroute this briefly painted the new route as a fresh full route and reset the trip progress.

5. `renderTrip()` calculated progress only from the current route total. A reroute therefore returned the bottom progress bar to the beginning.

6. `routeTo(..., {reroute:true})` always reset `activeRouteAlternative` to route 0, even when the driver had selected another Waze alternative.

7. Tesla navigation TTS used WebAudio gain capped effectively at 1.0 by the UI volume value.

## Fixes

- All navigation maneuver wording used by the banner/TTS is Slovak.
- The active maneuver is now locked through the physical junction.
  - it is marked near the junction,
  - it remains active while entering/passing it,
  - it advances only after **two reliable GPS fixes** beyond an adaptive 18–42 m pass buffer,
  - at <= 25 m the banner shows **Teraz**.
- The following maneuver can still be shown as `Potom`, but it does not replace the active maneuver prematurely.
- Lane selection still comes **only from Waze**. No lane is inferred from geometry.
  - Waze-selected lanes are larger, white-bordered and strongly highlighted,
  - non-selected lanes are visually dimmed.
- On reroute, the displayed route starts at current GPS position and only continues forward; the route is not first painted behind the vehicle.
- Reroute/alternative switch is treated as continuation of the same trip:
  - bottom progress is carried forward and cannot restart from zero,
  - the remaining ETA/time/distance is still recalculated from the new valid route,
  - destination is preserved.
- A selected Waze alternative index is preserved across reroute when that alternative index still exists.
- WebAudio navigation voice at the existing 100% setting receives **1.33× gain** (capped at 1.35).
- Waze routing, GPS source logic, alerts/police, traffic, QR/phone pairing, chargers and TTS endpoint were not changed.

## Verification before release

Clean preview: `dpl_9une1vS8WzqSo36dTKTYPENxHfvm`

- full inline client JS parse: PASS
- production vs preview source: only `api/lab-main.js` changed before release
- `/` login: 200
- `/api/waze-route-dense`: 200, 2 routes in test
- `/api/waze-drive`: 200, `degraded:false`
- `/api/events`: 200, `degraded:false`, live Waze alerts returned
- `/api/traffic`: 200, live jams returned
- `/api/tts?text=Test`: 200 `audio/mpeg`
- `/phone.html?room=TEST1234`: 200
- `/nav-icon-v8.png`: 200 `image/png`
- chargers: 200
- availability for a returned live station: 200

## Verification after release

Production: `dpl_BkqdtjLCUHttGozS4pYyivFjZ3Q5`

- alias points to the new deployment: PASS
- production state: READY
- production source vs clean tested preview: **0 differences / 16 files**
- route: PASS
- Waze drive: PASS
- events/police feed: PASS
- traffic: PASS
- TTS: PASS
- phone/QR support endpoint: PASS
- navigation icon: PASS

## Recovery

If any physical-drive regression appears, rollback target is:

`dpl_AQ3tTDpTAhJiRqBEmTa8cbYgHdn6`

This was the user-designated functional production checkpoint immediately before this navigation-guidance release.

## Physical-drive note

Server/API, source-integrity, syntax and deterministic client-logic checks passed. The exact timing feeling at a real multi-lane junction and the perceived +33% voice loudness must still be confirmed in a real Tesla drive because those depend on live GPS cadence, vehicle browser audio path and road geometry.
