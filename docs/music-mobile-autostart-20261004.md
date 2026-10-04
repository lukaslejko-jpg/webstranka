# Music mobile — third preview: reload playback

Date: 2026-10-04. Candidate: MOBILE-PREVIEW-20261004-03.
Status: PREVIEW. Owner verification of automatic audible playback after refresh is required before acceptance or production deployment.

Owner result: FAILED AUTOSTART RETEST. The owner followed the steps and reported that the song still did not start automatically. The singleton startup hypothesis did not resolve the symptom. Do not promote or label this candidate stable. The next evidence-gathering step is recorded in [music-mobile-startup-diagnostics-20261004.md](music-mobile-startup-diagnostics-20261004.md).

## Owner feedback and recovery points

The owner tested the second preview and reported that the requested changes worked, except that refreshing the page no longer automatically started the last song as before.

- Second preview: https://music-mobile-favorites-preview.onrender.com/?mobile=1
- Preview service: srv-db17m8navr4c73alkop0; free plan; auto-deploy disabled.
- Previous preview application: a1b7d75e32096e045ffaf98fad8f3a9d2dec5ea5.
- Previous preview deployment: dep-db183mhsrm7s73agvv80.
- Documentation head before this follow-up: 1625bc5e0898b67cc38dd887d78ac0a660cf73ae.
- First preview with owner-confirmed Favorites sound: a29b5f9c6aa758b45cfa00d6bc14bbad34ff6efa; deployment dep-db17m9navr4c73alktgg.
- Production remains https://music-mobile-307.onrender.com/?mobile=1, service srv-datcj8d9fdbs73b7iv3g, commit 163953618b01c714b5773830648415be0726fa47, deployment dep-datdogc9v7es738aofdg. No production changes are part of this follow-up.

Current third preview:
- Application commit: 2f91e1f8da6347aa78e1861ac08978a76131e8d8.
- Deployment: dep-db18catg1s2s7391i0dg.
- Render status: live; finished 2026-10-04T17:01:14.027932Z.
- Same preview service and address; production unchanged. This is not a stable/GOLDEN designation.

## Finding and narrowly scoped correction

Both prior previews used the same YouTube player constructor, `autoplay: 1`, and automatic `start(last)` in `onReady`. The removed 500 ms not-ready retry was not used on an ordinary page reload: `onReady` already set `ready = true` before calling `start`.

The demonstrated difference was the initial playlist request. The first preview sent only `[last.id]` at index 0. Restoring the displayed list in the second preview changed that request to the full list, potentially with a nonzero index. A side-by-side full-script harness comparison confirmed this difference. The test environment has not established that it causes the iPhone symptom; this correction restores the owner-tested startup request while preserving the newly accepted list behavior.

Only automatic startup now calls `start(track, undefined, true)`. It sends the same one-track YouTube playlist at index 0 as the first preview, while retaining the complete application queue and its actual selected index. Nothing truncates or temporarily replaces the saved queue. Next, Previous and automatic continuation use the unchanged handlers and the full saved list.

Both last-track and recent-history fallback startup use this path. An explicit selection or Play before readiness still takes precedence and retains its full requested list. There is no extra playback command, retry loop, new iframe, gesture handler, or MediaSession/keep-alive change. The Play/Pause state indicator and saved-list implementation remain in place. The cache version is `20261004-3`.

The original LongPlay core remains pinned and unchanged. Only the existing mobile preview overlay, relevant tests and this record are changed.

## Verification

- Source review confirmed the exact four planned startup substitutions; MediaSession, keep-alive claim, Next/Previous, polling and media bridge functions are unchanged.
- JavaScript syntax and whitespace checks passed.
- Full-script regression suite: 42/42 passed (`node --test longplay-youtube-overlay/test/*.test.mjs`). Coverage includes the original Favorites and saved-list regressions, one-track startup parity, complete retained DOM/storage queue and selected index, Next/Previous/ENDED, recent fallback, and early explicit selections without duplicate loads.
- The player mock can now remain cued after a load request. Tests distinguish a sent startup request from actual playback and confirm no new retries or pause overrides were introduced. They do not establish that Safari permits audible autoplay.
- Independent final review: ready for preview, no concrete blockers; exact startup substitutions and no queue truncation or extra playback requests confirmed.
- Render reports the exact candidate commit live. Downloaded JavaScript and HTML matched the committed application byte for byte. The browser loaded `tesla-app.js?v=20261004-3`. `/health` returned `ok: true` with the unchanged LongPlay core and YouTube overlay. No application error logs were returned for the checked post-deploy window.
- Live browser: a full refresh restored both Favorites cards in their saved order and automatically selected the saved last song in the iframe. Next selected the other song from that saved list. The cloud video element remained at `currentTime: 0` and `readyState: 0`, so this verifies restoration and continuation selection, not audible autoplay. Owner verification on iPhone remains pending.
- The earlier cloud-browser observation showed the restored correct song and list but did not establish audible autoplay. Its iframe already allowed `autoplay`; a console autoplay rejection came from the existing keep-alive call. This is a limitation of that observation, not evidence that the owner's phone has the same cause.
- After an explicit Play attempt in the previous preview, the cloud iframe's video element reported `paused: false`, `currentTime: 0`, `duration: 359`, and `readyState: 0`. Media therefore did not advance in this browser even after an explicit interaction; the phone remains necessary for the audible-start acceptance check.

API reference: https://developers.google.com/youtube/iframe_api_reference — `loadPlaylist` already requests loading and playback. A separate `playVideo` command is also subject to browser autoplay policy, so adding one without evidence would not establish a fix.

## Remaining acceptance check

On the same preview address, refresh once to get the update, play a saved song, then refresh again. Confirm that the last song starts with sound without another press of Play, the pause symbol reflects actual playback, and the next song follows the saved list. Only after the owner accepts the corrected version should it receive a stable recovery label and be deployed to production.
