# Music mobile — second preview: Play/Pause and saved lists

Date: 2026-10-04. Candidate: MOBILE-PREVIEW-20261004-02.
Status: PREVIEW; owner retest pending. Do not designate GOLDEN or promote before the owner confirms this version.

Owner retest update: the owner subsequently reported all requested behavior OK except automatic playback after refreshing the page. This candidate was not accepted as stable or promoted. The narrowly scoped follow-up is recorded in [music-mobile-autostart-20261004.md](music-mobile-autostart-20261004.md).

## Request and recovery points
The owner confirmed audible Favorites playback in the first preview and asked for:
1. A pause symbol while music is playing, returning to the play symbol when paused.
2. Remembering the last displayed songs and last selected song, so reopening can continue through that displayed list.
3. Another preview on the existing test URL before production; mark a stable version after acceptance because another change is planned afterward.

Owner-tested first preview:
- URL: https://music-mobile-favorites-preview.onrender.com/?mobile=1
- Service: srv-db17m8navr4c73alkop0; plan free; auto-deploy disabled.
- Deployment: dep-db17m9navr4c73alktgg.
- Application commit: a29b5f9c6aa758b45cfa00d6bc14bbad34ff6efa.
- Documentation head before this update: bd006b3af46b9947981e8ad18fc8319af71dad20.

Production remains separately recoverable:
- URL: https://music-mobile-307.onrender.com/?mobile=1
- Service: srv-datcj8d9fdbs73b7iv3g.
- Deployment: dep-datdogc9v7es738aofdg.
- Commit: 163953618b01c714b5773830648415be0726fa47.

Current second preview:
- URL: https://music-mobile-favorites-preview.onrender.com/?mobile=1
- Service: srv-db17m8navr4c73alkop0; existing free preview, auto-deploy remains disabled.
- Application commit: a1b7d75e32096e045ffaf98fad8f3a9d2dec5ea5.
- Deployment: dep-db183mhsrm7s73agvv80; live at 2026-10-04T16:42:29.982162Z.
- This candidate is not a stable/GOLDEN version. Production was not deployed or changed.

## Resulting behavior
- The outside Play button shows two pause bars when YouTube reports PLAYING (state 1). Its accessible action is Pozastaviť. Paused, cued, ended, unstarted, and buffering states show the play symbol and Prehrať. State events update it immediately and the existing tick provides a fallback. Playback actions and MediaSession handlers retain their existing behavior.
- A versioned local `teslaYT:session` snapshot stores current track, displayed items, active queue, view, query, cached search results/page, filter, shuffle, and repeat. No server account or new remote data storage is involved.
- Startup restores the displayed list and controls synchronously, before YouTube readiness, without rerunning the search. The last displayed nonempty list becomes the continuation queue for that visit. If the last selected song is absent, it is prepended once. An empty displayed list falls back to the saved active queue.
- During a running session, changing tabs alone keeps current playback. Search results have a separate cache so returning to Vyhľadané renders the actual search list.
- An explicit selection before iframe readiness takes precedence over automatic restoration. Central Play respects the pending selection or saved track and does not accidentally choose the first list item.
- Navigation and search revision/query guards prevent late requests from overwriting or polluting the last displayed list.
- Writes happen on list/selection/setting changes and page lifecycle events, not every playback tick. Malformed stored state and unavailable storage do not block playback. Legacy last/recent data remains a fallback.
- Snapshot lists are normalized, deduplicated by valid 11-character video ID, and bounded to 2000 items. Canonical Favorites are not truncated; editing an existing list larger than the snapshot bound preserves untouched entries.
- The JavaScript URL uses `v=20261004-2` to load the changed script after refreshing the same preview address.

## Scope
Only the existing mobile service overlay and its tests/documentation are changed. The upstream LongPlay vendor core, server/API, QR pairing, MediaSession, background keep-alive, and other Music services are not modified. This branch remains a preview branch.

## Verification
- `node --check longplay-youtube-overlay/public/tesla-app.js`: passed.
- Full-script VM suite: 38/38 passed in the final combined run, including the original 10 Favorites regressions. Command: `node --test longplay-youtube-overlay/test/*.test.mjs`.
- Independent review: ready for preview after six concrete edge cases were reproduced and fixed (recent order, late prefetch query, malformed ID/duration, >2000 favorites preservation, early Play resume, early explicit selection).
- Render reports the exact second-preview commit live. Downloaded HTML and JavaScript matched the committed source byte for byte; `/tesla-app.js?v=20261004-2` was also confirmed in the browser. The health endpoint returned `ok: true` with the existing LongPlay core and YouTube overlay.
- Live browser check: selected a Favorite, fully reloaded the page, and observed the same Favorites heading and two cards in the same order restored before the YouTube iframe was ready. The iframe then selected the saved song. Next selected the second song from that restored list. Screenshot: `music-obnoveny-zoznam-20261004-2.jpg` (evidence of list restoration, not audible playback).
- The cloud browser did not stream audible media; the player remained at 0:00, so an actual live PLAYING-to-pause-icon transition still needs the owner's phone check. The state-to-icon behavior is covered by the automated suite.
- Browser reloads logged an autoplay `NotAllowedError` from the existing keep-alive startup call before a user gesture. That code is unchanged. Render returned no application error logs for the checked new-deployment window.
- Physical iPhone test of this new candidate: pending. The owner confirmed sound on the preceding preview, not this new candidate.

## Next owner check and version designation
On the same preview URL, refresh, open a list and start a song. Confirm the outside control becomes pause and returns to play when paused. Refresh/open again and confirm the list and selected track return; Next should continue within that saved list. After the owner confirms the candidate, record the exact accepted deployment/commit and create a stable recovery label before making the next requested change. Keep both recovery points above available.
