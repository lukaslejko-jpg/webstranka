# Music mini controls - latest smoke verification
Date: 2026-10-29
Reference saved: a236ffe2436e4f8bee7d855b465617e404b90413, deployment dep-dbhlkiegekts73bk529g, original service music-complete-test.
Candidate LIVE: dep-dbhm720ae00c73e4qjrg, code SHA 326fde04c19f52c608da904fc800084976a3efb0, service music-mini-controls-test on Job Render account.
Git diff against reference: CSS only +4 lines in public/index.html; backend +3/-1 lines in server.js to proxy search queries to original reference search endpoint with local fallback. Other JavaScript (playback, sessions, QR) unchanged.
Actual Render service-internal smoke: haloween music HTTP 200, count 20, elapsed 2583ms, pass=true. DJ jany HTTP 200, count 20, elapsed 10465ms, pass=true. Note 10.5s DJ jany is still slow compared with desired first response.
Different origin means localStorage data from original domain cannot transfer; thus cross-domain session restoration is NOT 1:1 for existing stored browser state. All search inputs and result contract are forwarded to original service. Connection to source may fail; local fallback is active.
Player CSS structural comparison and build passed; no browser-native iPhone pointer-click validation and actual QR/media testing. Do not certify absolute 1:1 without mobile E2E. Production untouched.
Known dependency scan shows four high severity vulnerabilities on test. Exact result is candidate test, not authorized production release.