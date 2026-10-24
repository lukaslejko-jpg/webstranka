# Music — MUSIC-STABLE-20261004-06

Status: **OWNER ACCEPTED — stable/GOLDEN application checkpoint; mobile and desktop production live**.

## Owner confirmation

On 2026-10-04 at 20:46:45 Europe/Bratislava (`2026-10-04T18:46:45Z`), the owner confirmed testing https://music-mobile-favorites-preview.onrender.com/?mobile=1&v=20261004-6, reported that everything looks correct, requested this version be marked in documentation and Git as another recovery point, and approved it for both mobile and desktop.

This is the owner's reported acceptance of the linked version. Automated and cloud-browser checks remain distinct from that device confirmation; no independent device telemetry was captured.

## Exact shared application identity

- Release name: `MUSIC-STABLE-20261004-06`.
- Owner-tested application commit: `29fe8492df7c79b0b520ddf2924626ef6c85761c`.
- Remote mobile/documentation checkpoint branch: `checkpoint/music-stable-20261004-06`. Its finalized commit contains the exact accepted mobile runtime plus this release documentation.
- Remote desktop checkpoint branch: `checkpoint/music-desktop-stable-20261004-06`. Its finalized commit contains the desktop package below plus this release documentation. These are branch references, not Git tags; keep both fixed after release finalization.
- Accepted preview deployment: `dep-db19o82d0e5s73ep0mu0` on service `srv-db17m8navr4c73alkop0`.
- App script/cache identifier: `20261004-6`.
- Shared `public/tesla-app.js` SHA-256: `d7d76636cf18486c6a0815d967a158764e81b1ea782b5975457262822d80072d`.
- Immutable upstream: `Hiepler/LongPlay@c98c0353f1b78b311255ce56fd901ecd7cd83155`.

The mobile package is the exact accepted preview commit. The desktop package uses the identical application script with the accepted Pause indicator and cache identifier, while retaining its existing desktop icon endpoint, icon link and page head. It does not acquire the mobile manifest's portrait/start-URL settings.

## Accepted changes

- Favorites and displayed-list selection use the appropriate playback queue.
- Play/Pause indicates the real player state.
- The selected song and last displayed continuation list survive restoration.
- Home, Search, Favorites and Recently played stay on the explicitly selected section.
- Search and recommendations have separate results, request state and scrolling positions.
- Incremental loading preserves the selected playback queue, saves its unread buffer and cursor, and handles duplicate-only batches without an endless request loop.
- On `?mobile=1`, system media ownership follows YouTube without the competing one-second helper. Nonmobile media behavior retains the existing desktop path.

The previously accepted hard-refresh autoplay limitation remains unchanged. This release is not a promise that a browser will always allow audible autoplay after a hard reload.

## Production promotion and rollback

Both production services are free-plan Git-backed Render services with auto-deploy off. No service configuration or plan was changed. Their existing production branches were fast-forwarded, then each existing service was explicitly deployed. Both deployments reported `live`; the served HTML and application script were compared byte for byte with the prepared packages.

| Target | Production runtime commit | Live deployment | Live since (UTC) | Production branch |
| --- | --- | --- | --- | --- |
| Mobile | `29fe8492df7c79b0b520ddf2924626ef6c85761c` | `dep-db1a50rncjis73bsjqug` | `2026-10-04T19:01:56.233525Z` | `mobile/music-app-from-golden-20260928` |
| Desktop | `941f4bdd9c148d2c7c470e44d02021cd8b336bc3` | `dep-db1a57egekts73ct9j2g` | `2026-10-04T19:02:18.182732Z` | `release/music-short-link-icon4-20260928` |

The finalized checkpoint references include documentation-only descendants of these runtime commits. Production was not rebuilt just to add the acceptance/deployment record. The served application remains version `20261004-6` on both targets.

The following exact pre-promotion recovery points were read from Render and Git before any production change:

| Target | URL | Service | Previous live deployment | Previous commit | Production branch |
| --- | --- | --- | --- | --- | --- |
| Mobile | https://music-mobile-307.onrender.com/?mobile=1 | `srv-datcj8d9fdbs73b7iv3g` | `dep-datdogc9v7es738aofdg` | `163953618b01c714b5773830648415be0726fa47` | `mobile/music-app-from-golden-20260928` |
| Desktop | https://music-p45f.onrender.com/ | `srv-datc4fo93c1s73a1bchg` | `dep-datcfp67bikc73d1bqig` | `531e130fd52ff5d09bd1ecb749356bbeb6d01656` | `release/music-short-link-icon4-20260928` |

The older GOLDEN records and [accepted Safari checkpoint](https://github.com/lukaslejko-jpg/webstranka/blob/checkpoint/music-stable-20261004-06/docs/music-mobile-safari-checkpoint-20261004.md) remain available. Production promotion did not rewrite or delete them.

## Verification

The approved source passed 69/69 application tests and live preview navigation/loading/restoration checks, recorded in [the Preview06 report](https://github.com/lukaslejko-jpg/webstranka/blob/checkpoint/music-stable-20261004-06/docs/music-mobile-navigation-native-20261004.md). The desktop package also passed the same 69 tests against its retained desktop HTML. Exact comparisons verified that the desktop server, PNG icon route, icon assets, API adapters, package and immutable vendor are unchanged.

Before promotion, the accepted preview's desktop mode retained 49 Search results and 14 Home recommendations when switching sections. With shuffle disabled, two Next actions selected exactly the following two list entries, and Previous selected the preceding entry. The page retained one YouTube iframe. This was a DOM/navigation and command check; audible playback, automatic completion and native lock-screen behavior were not independently established in the cloud browser. Device acceptance is the owner's confirmation above.

Post-deployment checks on 2026-10-04:

- Both `/health` endpoints returned HTTP 200 and `ok: true` with the pinned upstream core.
- Both production application scripts were byte-identical to the accepted Preview06 script and its SHA-256 above.
- Mobile HTML SHA-256: `5226ff84a60e758fa9e89c32a761869224b396d8939350bb9e186cbc65e2f7fa`; exact match to the accepted mobile package.
- Desktop HTML SHA-256: `18b376855d7611e04d088c32711971cc41cd7c7f5877c8042dd411aba63129a6`; exact match to the prepared desktop package.
- The existing desktop `/apple-touch-icon.png?v=6` returned HTTP 200, `image/png`, a valid PNG signature and SHA-256 `313b1164ac04e5518ccdebedf7302b6e20e2ad8b63923c8145afacd5a8f27754`.
- Both live pages loaded the `20261004-6` script. Live Search returned 27 mobile results and 26 desktop results for Queen; counts reflect the live search response, not a fixed fixture.
- Switching to Home stayed on Home on both targets, and returning to Search retained those results. No application warnings/errors containing `tesla-app` were recorded in either cloud-browser tab during the check.

The production runtime commits and the fixed checkpoint references above are the new release/recovery baseline. The preview remains available at the exact owner-tested URL.

## Future changes

Keep the checkpoint references fixed. Start the next requested change on a separate branch from the appropriate accepted package. Record its new preview and acceptance separately. If a future change regresses playback, navigation, background behavior or loading, restore the corresponding accepted deployment/commit recorded here rather than using a failed experiment as the new base.
