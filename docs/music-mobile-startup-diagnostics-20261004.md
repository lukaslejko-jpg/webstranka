# Music mobile — fourth preview: identify the failed startup stage

Date: 2026-10-04. Candidate: MOBILE-PREVIEW-20261004-04.
Status: DIAGNOSTIC PREVIEW. Automatic audible playback on the owner's iPhone remains unresolved. This is not a confirmed autoplay fix or a stable/GOLDEN release.

## Owner feedback and recovery points

The owner confirmed the other requested changes but reported no automatic playback after refreshing. The third preview restored the original one-track startup request; the owner repeated the exact test and confirmed it still did not start. Further playback rewrites without new evidence are not justified.

- Existing preview URL: https://music-mobile-favorites-preview.onrender.com/?mobile=1
- Service: srv-db17m8navr4c73alkop0; free; auto-deploy off.
- Previous preview application: 2f91e1f8da6347aa78e1861ac08978a76131e8d8.
- Previous preview deployment: dep-db18catg1s2s7391i0dg.
- Previous documentation head: 39c0f36f60f2e0a83c0966b69b33570e0b64edb4.
- Production: https://music-mobile-307.onrender.com/?mobile=1; service srv-datcj8d9fdbs73b7iv3g; commit 163953618b01c714b5773830648415be0726fa47; deployment dep-datdogc9v7es738aofdg. Production is unchanged.

Current diagnostic preview:
- Application commit: 9ad89a42c57fdba8ae4c2c5c8ab9c4c09b2913d3.
- Deployment: dep-db18lc0u01pc73dbbf6g.
- Render status: live; finished 2026-10-04T17:20:06.708544Z.
- Same preview service and address, with production and stable designation still pending.

## Evidence from the actual baseline

- The complete app script in GOLDEN 447441d68b672a3d82c91561521dee531b188229 is byte-for-byte identical to the current mobile production script.
- Production and third-preview constructors both omit `videoId` and use identical `playerVars`, including `autoplay: 1` and `playsinline: 1`.
- With identical stored last-track data, production and third preview each send exactly one `loadPlaylist([last.id], index: 0)` and no additional `playVideo` or pause command during startup.
- The keep-alive, gesture setup, media-session handlers and media bridge match the actual production source. The server source is unchanged.
- Live responses from production and preview were HTTP 200. Neither response supplied Content-Security-Policy, Permissions-Policy, Feature-Policy, Cross-Origin-Embedder-Policy, Cross-Origin-Opener-Policy or Referrer-Policy headers in the checked responses.
- The original production also selected the last song but remained at 0:00 in the cloud browser. An Audio keep-alive autoplay rejection in its console does not establish that YouTube rejected the video request.
- The older 09dc48d7495bf25057e8e8d69e6d03b60e43abf5 source does not contain onReady restoration, despite the later narrative GOLDEN record describing immediate playback. Its narrative is not evidence of an additional startup mechanism to restore. The later 447441 source is the relevant code comparison.

These findings do not establish the owner's iPhone cause. The different production/preview origins and the phone's exact browser or standalone-app context remain unconfirmed conditions.

## Diagnostic overlay

A passive observer watches only the automatic restoration attempt. It records a build, result and available player state in `data-startup-*` attributes on the existing status element. It changes no playback command, queue, selected index, retry behavior, media-session ownership, keep-alive or original LongPlay core.

The observer begins while waiting for player readiness and resets its 12-second observation window when the existing automatic load is sent. It distinguishes these outcomes:

| Signal | Result shown to the user |
| --- | --- |
| Actual YouTube `onAutoplayBlocked` | Prehliadač zablokoval automatické spustenie. Ťukni na ▶. |
| No player readiness after 12 seconds | Prehrávač sa ešte nepripravil. Skontroluj pripojenie. |
| Player state CUED after 12 seconds | Skladba je pripravená, ale prehrávanie sa nespustilo. Ťukni na ▶. |
| Player state BUFFERING after 12 seconds | Skladba sa stále načítava. Skontroluj pripojenie. |
| Other unfinished state after 12 seconds | Automatické spustenie sa nedokončilo. Ťukni na ▶. |
| Exception caught during onReady restoration | Obnovenie prehrávania sa nepodarilo. Ťukni na ▶. |

Only the actual `onAutoplayBlocked` event can produce the browser-blocking message. A timeout is not interpreted as a browser policy decision. The otherwise-silent onReady catch now exposes a bounded error detail in a diagnostic attribute.

PLAYING observed through a state event or the existing polling stops the observer. It means the YouTube playing state was observed, not that audible sound was verified. Manual Play, a new selection, Next/Previous through the existing start path, and player errors cancel the old observer. Clearing a diagnostic message preserves any newer search status. No-track startup does not create a false failure. Diagnostics stay in the current page; no new server telemetry or stored listening history is added.

The script cache version is `20261004-4`. Existing Play/Pause and saved-list behavior remains present.

## Verification

- Source validation confirmed that removing only the planned observer hooks reproduces the preceding app implementation exactly.
- JavaScript syntax and whitespace checks passed.
- Full-script suite: 47/47 passed, comprising the previous 42 regressions plus 5 targeted diagnostic tests with multiple readiness, state and interaction cases.
- Independent review: ready for diagnostic preview; no concrete blockers. No playback, pause or queue commands were added.
- Live diagnostic preview: browser loaded `tesla-app.js?v=20261004-4`, and fetched HTML/JavaScript matched the committed application byte for byte. `/health` returned `ok: true` with the unchanged LongPlay core and YouTube overlay.
- A full refresh restored the saved Favorites list and last selected song. The actual YouTube event triggered the visible message `Prehliadač zablokoval automatické spustenie. Ťukni na ▶.` The observed diagnostic attributes were build `20261004-4`, result `blocked`, state `-1`, and no startup error. This is direct evidence of rejected automatic playback in the cloud browser; it is not yet evidence of the same cause on the owner's iPhone.
- A subsequent manual Play cleared the diagnostic message and changed the observation result to `cancelled`, retaining the selected song and list. This check verifies the diagnostic clears correctly, not audible media playback.
- Screenshot of the actual blocked message: `music-dovod-automatickeho-startu-20261004-4.jpg`.

## Primary API references and interpretation

Google documents `onAutoplayBlocked` for rejected autoplay, `loadPlaylist`, `loadVideoById` and `playVideo` requests. `onReady` only indicates readiness to receive API calls: https://developers.google.com/youtube/iframe_api_reference#Events

WebKit documents gesture restrictions for audible media, with no-gesture autoplay exceptions for muted or audio-free video. `playsinline` controls inline presentation rather than granting audio permission: https://webkit.org/blog/6784/new-video-policies-for-ios/

These policies motivate measuring the actual rejection event; they do not by themselves prove what happened on the owner's current phone.

## Required next evidence

On the same preview link, refresh without pressing Play and wait approximately 15 seconds. Read the short status directly under the controls. The owner need only report that wording. If it reports a browser block, we have evidence of the actual YouTube rejection on that device; if it reports another stage, continue from that stage without attributing it to autoplay policy. The unresolved autoplay requirement must not be recorded as accepted or deployed to production.
