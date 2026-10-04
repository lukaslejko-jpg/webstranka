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
- Separate preview and actual player check: pending.
- Production deployment: pending.
- New GOLDEN designation: not requested; requires owner acceptance under repository rules.

## Rollback
Preserve the deployment and source commit above. If a regression appears after production deployment, redeploy the exact baseline (Render rollback to dep-datdogc9v7es738aofdg), or restore the baseline tree in a new commit on the mobile deployment branch and trigger its deployment. Do not force-push or change another service.
