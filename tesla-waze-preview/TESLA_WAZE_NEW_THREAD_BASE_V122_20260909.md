# TESLA WAZE – NEW THREAD BASE / HANDOFF

Date: 2026-09-09
Repository: `lukaslejko-jpg/webstranka`
Production branch: `tesla-waze-preview-v1`
Production URL: `https://tesla-waze.vercel.app/`
Verified production HEAD at handoff time: `006deb2978ace8b7335cf320aeb22da3ebd8f8e3`
Production commit message: `music: direct player with V118 map V122 [skip ci]`
Exact rollback branch: `tesla-waze-backup-v122-exact-20260909-0903`

---

## 1. MANDATORY WORKFLOW – DO NOT BREAK THIS

This project MUST use a MICRO-PATCH / HARD-SCOPE workflow.

Before EVERY production intervention:
1. Fetch and verify the exact current `tesla-waze-preview-v1` HEAD.
2. Create a rollback branch from that exact HEAD.
3. Create a separate work branch with the next numeric version.
4. Change only the explicitly requested scope.
5. Do not modify unrelated map, music, OAuth, navigation, search, mobile or offline logic.
6. Verify JS syntax.
7. Rebuild gzip/base64 runtime asset whenever `app.js` or `app.css` changes.
8. Verify decompressed `.gz.b64` is byte-for-byte equal to source runtime file.
9. Verify the diff before deployment.
10. Promote only intended runtime files to production.
11. Verify production HEAD after deployment before claiming success.
12. After each step, report exactly what was changed, diff scope, production commit and rollback branch.

Never create helper/probe/noop files on production.
Never claim deployment if only a work branch changed.
If a visible result is wrong, inspect actual DOM/CSS/handlers before another patch.

---

## 2. ABSOLUTE STABLE-BASE RULES

The following foundation must NOT be changed unless the user explicitly approves changing that foundation:

### MAP CORE
- Leaflet map initialization and Waze tile source.
- GPS acquisition/watchdog.
- Route projection and route cursor logic.
- Reroute logic.
- Heading-up logic once verified in Tesla.
- Car arrow must remain visually pointing UP.
- Driven route must visually progress from BOTTOM to TOP.
- Navigation route must not rubber-band backwards.
- V90 forward-only `nearestNavigation()` behavior must not be reverted.
- V95 traffic trimming behind vehicle must not be reverted.

### TILE RENDER / PERFORMANCE
V114 removed risky per-tile GPU promotion:
- no `.leaflet-tile { will-change: transform; backface-visibility:hidden; }`
Do not reintroduce per-tile compositor forcing unless tested separately.

### OFFLINE CACHE
V115 moved CacheStorage writes out of the critical online tile response path.
Online tile response should not wait for opening/writing CacheStorage.
Offline fallback must remain a separate fallback layer.
Do not put synchronous cache work back in front of every online tile request.

### MUSIC
Music changes must NOT be allowed to reparent, transform, blank, overlay or destroy the map DOM.
A music Play/Next/Previous event must never alter `#map`, `.mapwrap`, Leaflet container, map bearing or map initialization.

### MOBILE MUSIC UI
Do not reintroduce duplicate search fields or overlapping controls.
Do not re-add `renderPlayer()` to minimize handlers.
The compact/minimized state must not restart the current song.

### TESLA MEDIA CONTROLS
The app should expose `play`, `pause`, `nexttrack`, `previoustrack` through Media Session when supported by Tesla Chromium.
Do not move Media Session into a new playback engine unless playback and map survival are tested first.

---

## 3. CURRENT PRODUCTION ARCHITECTURE

`live3.html` dynamically loads runtime assets from the production branch:
- `tesla-waze-preview/app.js.gz.b64`
- `tesla-waze-preview/app.css.gz.b64`

Runtime assets can update without full Vercel rebuild.

Main application remains monolithic in `app.js`:
- map
- GPS
- navigation
- traffic
- Smart Music UI/state
- search / queue

There have been experiments with isolated YouTube iframe engines (`music-isolated-engine-v110/v111/v117`), but the V117/V119 path caused severe Tesla regressions including grey screen / map failure after Play. Do NOT reintroduce that architecture without isolated testing outside production.

Current V122 commit message indicates direct player with V118 map baseline.

---

## 4. VERSION HISTORY THAT MATTERS

### V90 – navigation core
- forward-only route projection from current `routeCursor`
- immediate off-route reroute
- reduced camera redraw
Preserve.

### V91 – music navigation stability
- removed navigation-wide watchdog that repeatedly forced YouTube resume
- CUED/UNSTARTED no longer trigger destructive playback restart
Preserve.

### V92 – map camera churn reduction
- heading threshold increased
- bearing updates throttled
Preserve concept.

### V94 – map/music compositor mitigation
- CSS compositor isolation was attempted
Some rules may have later evolved; do not blindly restore old CSS.

### V95 – route camera + traffic trim
- route-ahead heading used for navigation camera
- traffic jam lines behind current route progress trimmed
Preserve.

### V96 – navigation voice + trip line
- cloud TTS gain fixed from `4*voiceVolume` to `voiceVolume`
- trip panel start → destination line added
Preserve.

### V97+ – free-drive heading work
Goal: when no route is active, map and arrow should still be heading-up.
This area has regressed multiple times; treat as protected and test physically in Tesla.

### V98 – offline cache
Service Worker added for map tile cache.

### V102–V107 – mobile music max layout
Multiple iterations fixed duplicate search / buttons / video overlap.
Do not reintroduce old mobile CSS layers blindly.

### V110–V117 – isolated music engine experiments
This architecture introduced iframe bridge `twMusicEngine` and later Media Session inside it.
It caused Tesla-specific failures including map blanking/grey screen on Play.
Do NOT restore this path without explicit approval and off-production validation.

### V112 – Media Session metadata layer
Separate Media Session metadata/controller layer existed and did not intentionally change map.
Tesla decides which controls it actually shows.

### V114 – tile GPU cleanup
Removed per-tile `will-change: transform` / `backface-visibility:hidden` forcing.
Goal: reduce checkerboarding/kockovanie.

### V115 – async offline cache writes
Online tiles return from network without first waiting for cache open/write.
Cache write happens in background.

### V116 / V118 – heading-up correction attempts
V116 unified bearing but used wrong convention.
V118 restored proven convention:
- prefer `map.setHeading(h,{ease:1,deadzone:0})`
- fallback `map.setBearing(-h)`
- free-drive heading delta threshold 25°
- bearing update minimum interval ~2500 ms
This was based on prior stable behavior.

### V119 / V120 / V121
Attempts to recover music after isolated engine regressions.
V121 reverted too much of `app.js` and temporarily lost newer map logic.

### V122 – CURRENT PRODUCTION
Production HEAD at handoff:
`006deb2978ace8b7335cf320aeb22da3ebd8f8e3`
Message:
`music: direct player with V118 map V122 [skip ci]`
This is the current baseline to inspect first in a new thread.

Important: user requested a handoff before completing a fresh physical Tesla test of this V122 build. Therefore treat V122 as CURRENT, but not yet fully user-validated.

---

## 5. CURRENT USER-REPORTED PROBLEMS / PRIORITIES

Highest priority items:

1. MAP MUST LOAD RELIABLY
- User has repeatedly seen black/grey map while arrow/UI remains visible.
- This means Leaflet/app shell may be alive while tiles fail or a compositor/player layer breaks map visibility.
- Music Play must never affect whether tiles are visible.

2. HEADING-UP MUST BE CONSISTENT
- Arrow visually UP.
- Road/route runs from BOTTOM to TOP.
- Must work with route and without route.
- No random rotation in every direction.
- Avoid frequent bearing churn.

3. TILE CHECKERBOARDING / KOCKOVANIE
- V114 removed per-tile GPU forcing.
- V115 removed cache work from critical online path.
- Continue diagnosis only after verifying these two changes physically in Tesla.

4. MUSIC MUST BE COMPLETELY DECOUPLED FROM MAP SIDE EFFECTS
- Play/Next/Previous must not blank/restart/flicker the map.
- User specifically wants music to continue indefinitely with related/random tracks.
- Current direct player baseline must be tested before any new isolation architecture.

5. TESLA MEDIA PANEL
- Preserve Media Session actions where supported:
  - play
  - pause
  - nexttrack
  - previoustrack
- User explicitly wants Next/Previous controllable from Tesla panel.

6. MOBILE MAX MUSIC
- Search must work.
- No duplicate search.
- No overlapping controls.
- Video toggle must hide/show correctly.

---

## 6. HOW TO CONTINUE IN A NEW THREAD

First message in new thread should do this in order:

1. Read this file.
2. Fetch current production branch `tesla-waze-preview-v1`.
3. Confirm whether HEAD is still `006deb2978ace8b7335cf320aeb22da3ebd8f8e3` or newer.
4. Do not change anything until the user states which symptom to test/fix next.
5. If continuing stabilization, use next version number AFTER the current production version.
6. Create exact rollback before every patch.
7. One issue per version.
8. After each patch, give user a concise report and wait for physical Tesla result before touching another subsystem.

Recommended next verification order:
A. Does V122 load map tiles at cold start?
B. Does Play leave the map visible?
C. Does music actually play and advance?
D. Does heading remain bottom→top while driving?
E. Does checkerboarding improve?
F. Do Tesla panel Next/Previous work?

Do NOT combine A–F into one patch.

---

## 7. KNOWN ROLLBACK / REFERENCE BRANCHES

Exact handoff backup:
`tesla-waze-backup-v122-exact-20260909-0903`

Useful historical backups include:
- `tesla-waze-backup-before-nav-v95-20260907`
- `tesla-waze-backup-before-v96-20260907`
- `tesla-waze-backup-before-offline-v98-20260907`
- `tesla-waze-backup-before-v112-20260908`
- `tesla-waze-backup-before-v114-20260908`
- `tesla-waze-backup-before-v115-20260908`
- `tesla-waze-backup-before-v118-20260909`
- `tesla-waze-backup-before-v119-20260909`
- `tesla-waze-backup-before-v120-20260909`
- `tesla-waze-backup-before-v121-20260909`
- `tesla-waze-backup-before-v122-20260909`

Do not assume a historical branch is better than current production; compare exact diffs first.

---

## 8. FINAL PROTECTION RULE

Once the user confirms a stable Tesla state, create a named stable baseline branch and a permanent project instruction file stating:

`MAP BASE / NAV CORE / TILE PIPELINE / MUSIC-TO-MAP ISOLATION CONTRACT / TESLA MEDIA SESSION CONTRACT – DO NOT MODIFY WITHOUT EXPLICIT USER APPROVAL.`

Future work must be layered around that baseline, never by casually rewriting it.
