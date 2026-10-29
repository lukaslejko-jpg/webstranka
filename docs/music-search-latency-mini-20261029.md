# Music search and mini control check

Render logs show first page 44246ms and 46040ms for searches; available direct HTTP test failed due DNS in tooling, so `haloween music` endpoint is not independently measured here. Former production relied on Vercel proxy, now unavailable, so the original loading mechanism cannot restore server response speed by itself. UI batches are 20, but only render after upstream responds.

Change: lower mini-player button hidden until upper minimize pressed; expanded mode shows upper button and keeps QR unobstructed. Production and QR untouched.

Verify after deployment on iPhone and PC; do not call latency fixed. Current backend performance remains a blocker.
