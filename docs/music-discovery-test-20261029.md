# Music discovery test 2026-10-29

Scope: isolated Render preview only, no production changes, no QR implementation changes.

Baseline deployed preview: cb1d6a18ece519802948f5cfce640ae4f9b43983, deploy dep-dbhijp08v5cc738jg6d0. Production reference was 941f4bdd9c148d2c7c470e44d02021cd8b336bc3 (verify again before production change).

Changed: server `/api/youtube-search` page query and capped continuation pages, 5-minute bounded in-memory query cache; `/api/youtube-related` uses music related when available, otherwise a video-search fallback based on the track metadata; client infinite scroll and dynamic queue expansion, playlist deduplication and short history exclusions for shuffle.

Unchanged: `/api/simple-remote` QR/remote contract, IFrame player initialization and styling. No YouTube recommendation equivalence guarantee. `hasMore` and getContinuation depend on current youtubei.js API; verify in live API calls, search DJ jany, search relaxing music, iPhone/Tesla playback and QR before release. No live user playback verified in this task.

Potential issues: YouTube may restrict playback or API on Render IP. Server memory cache is process-local. Free hosting cold starts. Security: in-memory cache bounded, query trimmed, search pages capped, video IDs validated.

Test service: https://music-complete-test.onrender.com. Production not approved for deployment.
