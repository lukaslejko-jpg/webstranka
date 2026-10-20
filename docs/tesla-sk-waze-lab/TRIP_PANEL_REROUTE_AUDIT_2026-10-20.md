# TRIP PANEL REROUTE AUDIT — 2026-10-20

## Scope
Audit only. No production code change was required.

Current LAB production:
- deployment: `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`
- URL: `tesla-sk-waze-aorbayvj9-lukaslejko-9932s-projects.vercel.app`
- alias: https://tesla-sk-waze-lab.vercel.app/
- state: READY

Protected `tesla-sk` remained read-only:
- `dpl_CzSmztcBiqLUhiMCBzCFed8xeEma`

## Question
Does the lower trip panel keep the old route after reroute and only continue counting down?

## Result
No.

Current code path:
1. `routeTo(...,{reroute:true})` fetches a new Waze route.
2. `setRoute(buildRoute(newRoute), d, { reroute:true })` replaces the current route object.
3. `setRoute()` immediately calls `navUpdate()` when GPS is available.
4. `navUpdate()` recalculates:
   - remaining distance from new `r.total - loc.along`,
   - remaining time from new route steps and `r.after`,
   - arrival time,
   - progress against new `route.total`.
5. `renderTrip()` writes the new values into:
   - `tArrive`,
   - `tRest`,
   - `tripProgress`.

During the network request itself:
- old route object still exists,
- but `tRest` is explicitly replaced by `Prepočítavam trasu…`,
- once Waze responds, the panel is rebuilt from the new route.

## Real-drive evidence
05:33:19 → 05:33:25:
- first route: 66 064 m / 3 125 s
- new reroute: 66 150 m / 3 130 s
- panel basis can increase: +86 m / +5 s

07:14:52 → 07:14:59:
- first route: 8 101 m / 714 s
- new reroute: 8 043 m / 706 s
- panel basis can decrease: -58 m / -8 s

This proves the panel does not simply continue subtracting from the old route.

## Deterministic regression
Test preview:
- `dpl_DAKAeR5fBxWNE41X8UufhDWuZ6kH`

Trip panel regression:
- 6/6 PASS

Verified:
- reroute replaces total distance,
- reroute replaces remaining distance,
- reroute replaces duration basis,
- progress resets against new route total,
- shorter reroute can reduce panel values,
- longer reroute can increase panel values.

No application files differed from production in this audit preview; only the test endpoint was added.

## Full application smoke
Routes:
- today 05:33:19: 200, geometry ratio 0.999, 4 alternatives, lane guidance present
- today 05:53:35: 200, geometry ratio 0.999
- today 07:14:52: 200, geometry ratio 1.002
- Demjata start: 200, geometry ratio 1.000
- return Demjata: 200, geometry ratio 1.015
- Košice: 200, geometry ratio 0.999, lane guidance present

Services:
- root 200
- waze-drive 200 / degraded:false
- events 200 / degraded:false / live POLICE present during audit
- traffic 200
- phone/QR 200 / relay / role=phone / dest
- TTS 200 audio/mpeg
- chargers 328 / 69 live
- availability 2/2
- icon 200
- voice diagnostics endpoint preserved

Runtime:
- only known Node `DEP0169 url.parse()` warning
- no new functional exception group

## Deployment decision
No production deployment performed.

Reason:
- behavior is already correct,
- a no-op deployment would add risk and create an unnecessary checkpoint without changing functionality.

Current safe production therefore remains:
- `dpl_3F1A6qb5vZTxbfcjWJTWeMj7e2Wm`
