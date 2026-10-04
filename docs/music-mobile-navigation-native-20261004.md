# Music mobile — independent browsing lists and native media ownership

Date: 2026-10-04. Candidate: **MOBILE-PREVIEW-20261004-06**.

## Problems reproduced and scope

The owner reported two failures in Preview05: the lock-screen position oscillates between the requested time and zero without seeking the audible song, and selecting Home from Search switches back to Search after the response completes. The requested scope also includes every section transition and incremental loading compared with the functional baseline.

The navigation audit compared the production application at `163953618b01c714b5773830648415be0726fa47`, the historical GOLDEN application, and the current preview. Home calls the same search function as a manual query. That function selects Search when its asynchronous response arrives and overwrites the Search cache. The old implementation also appends newly found tracks to the playback queue irrespective of the queue's originating list. Its prefetched-page cursor is saved without the corresponding unread buffer, allowing tracks to be skipped after a reload.

The lock-screen audit found an independent one-second silent WAV looping in the parent page while YouTube is the audible player. The parent MediaSession repeatedly publishes YouTube time, although its native media element is that one-second helper. WebKit's `MediaElementSession::clientCharacteristicsChanged(true)` preserves the declared duration/rate but replaces the published position with the owning media element's actual `currentTime()`. A loop returns that helper to zero. This is a source-supported explanation matching the owner's once-per-second symptom; it is not a trace from the owner's exact iOS build.

Historical branches `mobile/music-lockscreen-direct-player-20260928` (`863cd41`), `mobile/music-single-mediasession-owner-20260928` (`f2dbc84`) and `mobile/music-lockscreen-no-position-20260928` (`509f5d8`) were inspected. All retained the helper and some parent MediaSession publishing. The latter two have an identical tree. None tested fully leaving system ownership to the actual YouTube media element.

## Correction

- Home and Search keep their own query, tracks, pagination cursor, unread buffer, request revision and scroll position. Navigation changes only through an explicit section, search or filter action. Late responses may update their own cache but cannot select a section.
- Incremental results extend only the matching feed and, when that feed owns playback, its playback queue. Browsing a different list must not replace or contaminate the playing list.
- An available unread buffer is displayed immediately. If a fresh batch contains only duplicates, loading continues through at most one complete variant cycle (four batches, sixteen queries), then stops. This avoids stalling at an unchanged scroll boundary without introducing unlimited requests.
- Persist feed cursors together with unread buffers. Preserve version-1 session compatibility and the accepted policy that the last displayed list becomes the continuation list on restoration.
- On `?mobile=1`, do not create or play the silent helper and do not publish or register a competing parent MediaSession. Let the browser use the actual YouTube media element for native time and system actions. The app's existing YouTube player and local controls remain in use.
- Remove the ineffective Preview05 parent seek adapter. Preserve its mobile paused-near-end guard so a paused seek cannot trigger the polling timer's Next action.

No immutable vendor changes, new server API, CSS/layout changes, production update or new paid service are part of this task. The nonmobile media path retains its previous helper and MediaSession behavior. The historical original-source comparator remains unchanged.

## Recovery and release identity

- Accepted preceding recovery checkpoint: [MOBILE-SAFARI-20261004-01](music-mobile-safari-checkpoint-20261004.md), deployed commit `4252531a585e51ccdec813ea19d23528cbf3fd73`, deployment `dep-db18som0tbcc73a345lg`.
- Failed Preview05 being corrected: commit `7f8c91b787e410b868fcfc00db1ab8d4d5e59873`, deployment `dep-db198a9srm7s73alhaag`; documentation head `c0e717eeb3287d8ad50e153df00c4ed7fb873fe5`.
- Existing free preview service: `srv-db17m8navr4c73alkop0`; auto-deploy off; branch `fix/mobile-favorites-playback-20261004`.
- Cache/build identifier: `20261004-6`.
- Production recovery: service `srv-datcj8d9fdbs73b7iv3g`, deployment `dep-datdogc9v7es738aofdg`, commit `163953618b01c714b5773830648415be0726fa47`.
- Immutable upstream core: `Hiepler/LongPlay@c98c0353f1b78b311255ce56fd901ecd7cd83155`.

## Verification boundary

The complete application test suite passes **69/69 tests**: 47 preceding regressions, six native-ownership/local-control tests, and sixteen navigation/loading tests. The navigation suite includes all sixteen ordered tab combinations, concurrent and stale responses, explicit filters, empty Home, separate queue ownership, duplicate-only results, immediate buffered results, cursor/buffer restoration and mobile scrolling. The native suite covers boot, gesture, restoration, player events, polling, app controls, paused near-end seeking, unavailable MediaSession and the unchanged nonmobile media path.

The new mobile ownership tests failed before the helper/parent-session correction, while their nonmobile comparison passed. The test double never advances its time just because a seek command was sent. These tests cannot simulate real iOS system controls, physical audible seeking or background execution.

JavaScript syntax and whitespace checks pass. Exact source comparisons confirm that `start`, `next`, `prev`, `tick` and YouTube initialization remain byte-identical to Preview05. HTML/CSS differ only in the script cache identifier. The immutable vendor and historical original-source reference are unchanged. Independent navigation review exercised pending selections and late requests and found the duplicate-only loading gap, which is now covered by the bounded continuation and its regression tests.

Deployment and live-browser results are recorded below after execution. No claim of successful native iPhone seeking or background continuity is made before the owner's device test.

Required phone acceptance: play a song in the updated main preview, lock for at least two minutes, verify that the timeline advances steadily, seek to a clearly different audible passage with both the timeline and the relative controls, Pause/Resume, and let a song cross its end while locked. This checks the real audio and background continuation as well as the indicator. Removing the competing helper may expose a browser background-playback restriction; that remains a concrete test risk, not a confirmed success.

For navigation, switch among Home, Search, Favorites and Recently played while results are loading; revisit previous results and scroll to load more. A section must remain selected until another explicit action, and playing Favorites must retain its queue while Search/Home are browsed. Check restoration of the last displayed list and its unread loaded tracks.

Stable/GOLDEN designation and production promotion stay pending the requested device acceptance. The prior Safari startup comparison was already accepted; unconditional hard-refresh autoplay is not being introduced.

## Primary technical sources

- WebKit position replacement and media-element document ownership: https://chromium.googlesource.com/external/github.com/WebKit/webkit/+/00f03c1f906ff25f9536f528e81477c861c0325c/Source/WebCore/html/MediaElementSession.cpp
- Same position replacement in the official historical source: https://github.com/WebKit/WebKit/blob/a1197f89b028684053b8ef59c3e88babed27493a/Source/WebCore/html/MediaElementSession.cpp
- Apple WWDC21, adopting Media Session: https://developer.apple.com/videos/play/wwdc2021/10189/
- W3C Media Session routing: https://www.w3.org/TR/mediasession/
- YouTube public `seekTo` contract: https://developers.google.com/youtube/iframe_api_reference#seekTo
