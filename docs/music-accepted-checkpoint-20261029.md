# Music accepted preview checkpoint - 2026-10-29

EXACT Render LIVE deployment: dep-dbhldfgae00c73e2us40
EXACT deployed code SHA: b463043c74e199e70d1d5be59d3d211c4c88a8c1
Preview URL: https://music-complete-test.onrender.com/
Service: srv-datanl7pn0mc73bisnl0
Repo: lukaslejko-jpg/webstranka
Branch: feature/music-complete-overlay-20260928

Owner says this version searches faster, so freeze code and functionality: no further changes to search, player, QR, mobile or desktop. Documentation commit only; do not trigger new deployment.

Search uses parallel youtubei.js, yt-search and own OpenTune fallback, in-memory cache about 5 minutes, progressive pages and auxiliary mix/live/playlist/remix searches. Client appends up to 100 unique results in batches of 20.

Queue expansion attempts related music via youtubei.js, otherwise metadata search, and skips queued/recently played IDs. Shuffle skips played IDs. This does not guarantee new uploads or release-date ranking. Identical queries may yield similar results and YouTube personalized recommendations are not reproduced.

Render log smoke: DJ jany HTTP 200, 20 items, 600 ms, passed. haloween music HTTP 502, 0 items, 37603 ms, failed. Other searches showed subsecond warm continuation. This checkpoint is accepted by the user for perceived speed, not technically certified for all queries.

Session restoration in localStorage persists displayed items, selected track and queue; iOS automatic playback may be blocked.

Do not modify production. Future improvements to novelty require separate scoped change and real API, playback, QR and mobile regression gates. Security audit previously found vulnerable dependencies.