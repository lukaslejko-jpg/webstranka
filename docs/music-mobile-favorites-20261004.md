# Music mobile — Favorites playback repair, 2026-10-04

## Exact recovery point
- Live URL: https://music-mobile-307.onrender.com/?mobile=1
- Render service: srv-datcj8d9fdbs73b7iv3g
- Live deployment before change: dep-datdogc9v7es738aofdg
- Source commit: 163953618b01c714b5773830648415be0726fa47
- Deployment branch: mobile/music-app-from-golden-20260928
- Live JavaScript blob: fa53c2eda8145bb47edc77eca7b64ce693454981
- Live HTML and JavaScript were downloaded and matched to this exact source.
- Auto-deploy is disabled. The repair is developed on a separate branch.

## Scope
Repair the selection-to-playlist mapping in the existing YouTube overlay for the mobile service. A click on a visible favorite passes that visible list into playback. If there is no selected track, Play starts the first visible track. An already selected track keeps its pause/resume behavior. Next, Previous, and repeat retain the selected source playlist. Merely browsing another tab does not replace playback.

No changes to the upstream vendor/LongPlay core, other Music services, MediaSession, background keep-alive, layout, search API, QR pairing, or stored favorites.

## Evidence
The live Favorites tab assigns items from likes but does not set the playlist used by start(). start() maps a missing track index from -1 to 0 and sends either an empty list or the previous search list to YouTube. The displayed title can then disagree with the requested playlist. The generic Play handler also does not choose a track when none is selected.

## Validation status
- Baseline reproduction: confirmed with empty and stale playback queues. In the live UI, selecting Queen – Bohemian Rhapsody from Favorites after searching for a-ha displays Queen below the player while the actual YouTube frame loads a-ha – Take On Me.
- Regression tests: 10/10 pass against the full patched overlay script. The same tests against the downloaded live baseline fail 8/10 and pass the two playback-preservation cases. Command: `node --test longplay-youtube-overlay/test/favorites-playback.test.mjs`.
- Independent source review: passed; no blocking regression identified.
- Preview service: srv-db17m8navr4c73alkop0, plan free, auto-deploy disabled.
- Preview URL: https://music-mobile-favorites-preview.onrender.com/?mobile=1
- Preview deployment: dep-db17m9navr4c73alktgg, status live; exact tested commit a29b5f9c6aa758b45cfa00d6bc14bbad34ff6efa.
- Served preview JavaScript matches the locally tested file byte for byte; health endpoint succeeds; no Render application error logs were returned.
- Real browser selection check: search Queen, save two favorites, search a-ha, open Favorites, select the second favorite. Both the application title and the YouTube iframe identify fJ9rUzIMcZQ (Queen official), instead of the stale a-ha search result.
- Two real Next clicks alternate only between the two selected favorites: vbvyNnw8Qjg (Live Aid) and fJ9rUzIMcZQ (official). The same iframe element remains present.
- Runtime limitation: YouTube metadata and playlist selection load, but the media stream stalls at time 0 with readyState 0 in this cloud browser on both the original and preview versions, including after a direct click inside the player. No error is reported by the video element. Audible playback, timed transitions, and physical iPhone/background behavior could not be verified. The cause of this environment limitation is not asserted.
- Production deployment: NOT performed. APP_CHANGE_SAFETY_RULES.md requires a real playback test before production. The original mobile service and deployment branch remain at the recovery point; an iPhone playback check is still needed before promotion.
- New GOLDEN designation: not requested; requires owner acceptance under repository rules.

## Rollback
Preserve the deployment and source commit above. If a regression appears after production deployment, redeploy the exact baseline (Render rollback to dep-datdogc9v7es738aofdg), or restore the baseline tree in a new commit on the mobile deployment branch and trigger its deployment. Do not force-push or change another service.

## Owner follow-up and second preview
The owner confirmed on 2026-10-04 that Favorites starts with audible sound on the iPhone at the preview URL. The attached screenshot also shows active YouTube playback while the outside button remains a play triangle. The owner then requested two follow-up changes: a real Play/Pause indicator and restoration of the last displayed list for continued playback. They explicitly requested another preview test before production, and a stable version label only after their acceptance. See `docs/music-mobile-session-20261004.md`.
