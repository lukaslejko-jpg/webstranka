# Music search recovery — 2026-10-29

Baseline production: `941f4bdd9c148d2c7c470e44d02021cd8b336bc3`, Render deploy `dep-db1a57egekts73ct9j2g`.

Problem: `/api/youtube-search` depended on `music-qr-test.vercel.app`, which returned HTTP 402 `DEPLOYMENT_DISABLED` on 2026-10-29.

Change: Render Express search route now uses `yt-search` directly and returns the established `items` schema (`youtubeId`, `title`, `artist`, `duration`, `artwork`). Existing `/api/simple-remote`, QR, HTML, player and vendor remain unchanged. No Spotify required.

Risks: third-party YouTube HTML/search changes, blocking or throttling may return HTTP 502. Search result ranking is not guaranteed identical to YouTube site. No production release until actual preview HTTP search, remote pairing, playback tests pass.

Rollback: redeploy prior production SHA/deployment after explicit authorization; no database migration.
