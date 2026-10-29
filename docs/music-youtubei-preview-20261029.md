# YouTube.js test 2026-10-29

Preview Render: music-complete-test.onrender.com. Existing service, no production changes.

Replace `yt-search` with pinned `youtubei.js@18.3.0` in Express `/api/youtube-search`; preserve response `items` structure, existing player, and QR `/api/simple-remote` endpoints. No Vercel required. Search results not guaranteed equivalent to YouTube.com; check `DJ jany` and track click before release. This test service is not a 1:1 clone of current production; do not promote blindly.

Rollback preview source to commit `dee246418a743019d9e6102d87861762933ab5ef`; production stays at `941f4bdd9c148d2c7c470e44d02021cd8b336bc3`.
