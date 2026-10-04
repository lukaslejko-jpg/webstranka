# Music desktop — version 20261004-6

The owner approved Preview06 on 2026-10-04 and requested that mobile and desktop use this application version.

This desktop package takes the exact `public/tesla-app.js` from accepted commit `29fe8492df7c79b0b520ddf2924626ef6c85761c`. Its SHA-256 is `d7d76636cf18486c6a0815d967a158764e81b1ea782b5975457262822d80072d`. Only the matching Play/Pause CSS indicator and script cache identifier are added to the existing desktop HTML.

Desktop base: `531e130fd52ff5d09bd1ecb749356bbeb6d01656`, deployment `dep-datcfp67bikc73d1bqig`, service `srv-datc4fo93c1s73a1bchg`, https://music-p45f.onrender.com/.

The desktop server, `/apple-touch-icon.png?v=6` endpoint, both existing icon SVG files, desktop icon link, API adapters, package and immutable vendor remain byte-identical to that base. Mobile-specific manifest/orientation settings and the historical mobile comparator page are not imported.

The accepted suite passes **69/69 tests** against this desktop HTML. JavaScript syntax checks pass. Desktop HTML SHA-256: `18b376855d7611e04d088c32711971cc41cd7c7f5877c8042dd411aba63129a6`.

The desktop release belongs to checkpoint family `MUSIC-STABLE-20261004-06`. Its exact Git and deployed identity are recorded in the shared `GOLDEN_MUSIC_STABLE_20261004_06.md` release record on the mobile/documentation branch. Preserve the earlier desktop deployment for rollback.
