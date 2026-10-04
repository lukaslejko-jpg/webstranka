# Music mobile — exact startup comparison on one origin

Date: 2026-10-04.
Status: COMPARISON ONLY. Audible automatic playback after refresh remains unresolved. This is not an autoplay fix, release candidate acceptance, or stable/GOLDEN designation.

## Confirmed owner result

The owner's `IMG_7527.jpeg` shows the current diagnostic preview on an iPhone, with the last song and search list restored, time 0:00, and the exact message `Prehliadač zablokoval automatické spustenie. Ťukni na ▶.` The current script produces that message only after the actual YouTube `onAutoplayBlocked` event. This is now evidence from the owner's phone, not just the cloud browser. The screenshot's browser controls resemble Chrome on iOS; its exact app/version and the earlier successful browsing context are not independently confirmed.

The reported failure therefore reaches the player and produces an explicit autoplay rejection. It is not evidence of a missing saved track, an empty list, a readiness timeout, or successful audible playback.

## Exact code comparison

Reference application: mobile production commit `163953618b01c714b5773830648415be0726fa47`. Its application script is byte-for-byte identical to the owner-accepted GOLDEN `447441d68b672a3d82c91561521dee531b188229` script; both have Git blob `fa53c2eda8145bb47edc77eca7b64ce693454981`.

Current application: `9ad89a42c57fdba8ae4c2c5c8ab9c4c09b2913d3`, with documentation head `460846875d2830f0c7fc1e64df532667d3b74481` before this comparison addition.

| Startup setting or step | Reference | Current application |
| --- | --- | --- |
| Script order | YouTube IFrame API, then application | Same |
| Constructor | One player, no initial `videoId` | Same |
| Player parameters | `playsinline:1, autoplay:1, controls:1, rel:0, origin:location.origin` | Same |
| Restored startup request | One `loadPlaylist` with `[last.id]`, index 0, startSeconds 0 | Same after the third preview parity change |
| Playback call order | `claimTeslaMedia()` → `hold()` → load | Same |
| Keep-alive and touch handlers | Original implementation | Unchanged |
| Live iframe `allow` | Includes `autoplay` | Identical, includes `autoplay` |
| Live iframe `sandbox` | Absent | Absent |
| Server code | Original | Unchanged |
| Relevant restrictive HTTP headers in checked responses | Absent | Absent |

Root independently read the actual generated iframe DOM on production and preview. Both loaded the same YouTube widget build `8ab5c328` and had identical permissions and player parameters apart from their actual origins. The HTML application diff is the pause indicator and script cache version. The passive diagnostic timer does not delay or add a playback request. Restoring the original pre-ready retry would not affect onReady restoration because the player is already ready then.

No omitted original autoplay setting was identified. `allow="autoplay"` is already present. An additional Play command, synthetic gesture, muted playback, or constructor change must not be described as a proven repair of the owner's audible autoplay failure.

## Isolated reference page

The existing preview gains a reference route at:

`/startup-reference-1639536/?mobile=1`

- `public/startup-reference-1639536/tesla-app.js` is the complete original mobile production script, without edits.
- Its `index.html` is the original mobile production HTML. Only the application script URL changes to `./tesla-app.js?v=1639536`, so this page cannot accidentally execute the current script.
- The main preview application's HTML and JavaScript are unchanged by this addition.
- The same preview service serves both versions, keeping the origin, server, API and browser context available for direct comparison. This eliminates the production-versus-preview origin difference from that comparison; it does not grant additional browser playback permission.
- The reference reads the existing last track, Favorites and recent history from the same origin. Like the original application, startup writes that last track and recent history. It does not read or write the new `teslaYT:session` key. For a controlled comparison, use the existing saved song and refresh; do not edit Favorites, choose a different track, or use the remote from the reference page.
- The reference has the original interface and original behavior, including its old Play icon and singleton queue. It is a temporary diagnostic page, not the place to verify the accepted pause/list features. Remove the reference before promoting an accepted application release.
- Compare the pages sequentially in one browser tab. Concurrent players can compete for audio/MediaSession. Reload after opening the reference so the test is not based solely on the navigation interaction. Do not use the QR remote during comparison; the legacy remote polling also behaves like an ordinary reload.

## Local verification

- Independent review found no blocker for this isolated reference. It does not alter the main application or add a new playback strategy.
- The reference script is exactly 15,179 bytes; SHA-256 `7228b807413e684c9267e1548d8a1b0752f4c6d237809ad511f022865f38a9b9` matches the original commit.
- The reference HTML differs from the original only at the application script URL. The main app HTML and JavaScript are unchanged from the deployed diagnostic build.
- JavaScript syntax and whitespace checks passed.
- The existing full-app harness compared both scripts with the same saved track/session and a player that remains unstarted. After 1,500 ms both emitted exactly one `loadPlaylist([last.id], index:0)`, zero extra Play calls, and zero Pause calls. This confirms startup command parity; it does not simulate browser audio permission.
- The reference left the new `teslaYT:session` snapshot byte-for-byte unchanged in that fixture.
- No additional implementation-mirroring regression suite was introduced for these static copies; the main application's prior 47 passing tests remain the last verification of its unchanged source.

## Interpretation

The remaining useful phone comparison is the exact original code and current code on this one origin, with the same saved song and refresh sequence. Automatic sound in the original but not current version would justify further isolation of initialization differences. Failure in both demonstrates that copying the original startup code onto this origin is insufficient under those tested phone conditions. Neither result by itself proves that deployment onto another origin will grant autoplay.

No further change to production or stable tag is authorized by a failed preview test. The requirement remains open until audible behavior is confirmed on the relevant device.

## Recovery and deployment

- Production service: `srv-datcj8d9fdbs73b7iv3g`.
- Production commit: `163953618b01c714b5773830648415be0726fa47`.
- Production deployment: `dep-datdogc9v7es738aofdg`, confirmed live before this addition.
- Existing free preview service: `srv-db17m8navr4c73alkop0`, auto-deploy off.
- Previous preview deployment: `dep-db18lc0u01pc73dbbf6g`.
- Previous preview app commit: `9ad89a42c57fdba8ae4c2c5c8ab9c4c09b2913d3`.

Deployment identity and live comparison results will be recorded after verification.

## Primary reference

YouTube documents `onAutoplayBlocked` for rejected `autoplay`, `loadPlaylist`, `loadVideoById` and `playVideo`, including lack of user interaction or missing iframe permission: https://developers.google.com/youtube/iframe_api_reference#Events

Chrome documents permission delegation, which does not create an unconditional audio exemption: https://developer.chrome.com/blog/autoplay/
