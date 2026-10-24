# Music mobile — accepted Safari checkpoint before lock-screen seeking

Checkpoint label: **MOBILE-SAFARI-20261004-01**.
Owner confirmation: 2026-10-04, after comparing the original and current code on the same preview origin.

## Accepted behavior and known boundary

The owner reports that both the old and new versions start and continue correctly after switching from Chrome to Safari. A hard refresh fails to start automatically in both versions. The owner therefore considers the new version correct for the previous requested changes.

This checkpoint records acceptance of Favorites playback, the Play/Pause indicator, saved last song/displayed list, and Safari restoration behaving like the original. It does not claim unconditional audible autoplay after hard refresh.

The owner also reports a pre-existing issue in both versions: lock-screen Pause works, but the timeline and the ten-second backward/forward controls do not respond. That is the next isolated mobile task, documented in [music-mobile-lockscreen-seek-20261004.md](music-mobile-lockscreen-seek-20261004.md).

This is a named recovery checkpoint for the accepted changes, **not** a declaration that lock-screen seeking works or that all production acceptance gates have passed. No new stable/GOLDEN Git tag or production promotion is included in this record.

## Exact recovery identity

- Tested main preview: https://music-mobile-favorites-preview.onrender.com/?mobile=1
- Service: `srv-db17m8navr4c73alkop0`, free, auto-deploy off.
- Deployment: `dep-db18som0tbcc73a345lg`.
- Deployed commit: `4252531a585e51ccdec813ea19d23528cbf3fd73`.
- Application code last changed in `9ad89a42c57fdba8ae4c2c5c8ab9c4c09b2913d3`; the deployed comparison commit adds the exact-original reference page without changing the main app.
- Documentation head before lock-screen work: `a11ba93b87be689acca74421bab585518dc47e4e`.
- Branch: `fix/mobile-favorites-playback-20261004`.

Production remains `https://music-mobile-307.onrender.com/?mobile=1`, service `srv-datcj8d9fdbs73b7iv3g`, deployment `dep-datdogc9v7es738aofdg`, commit `163953618b01c714b5773830648415be0726fa47`.

The immutable vendor core remains `Hiepler/LongPlay@c98c0353f1b78b311255ce56fd901ecd7cd83155`.
