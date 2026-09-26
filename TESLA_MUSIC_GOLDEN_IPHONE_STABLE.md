# TESLA MUSIC — GOLDEN iPHONE STABLE BASE

**Status:** LOCKED FUNCTIONAL BASE  
**Confirmed:** 2026-09-26 on a real iPhone  
**Golden branch:** `golden/tesla-music-iphone-stable-20260926`  
**Source commit:** `5cffabd206a5f0ecee100fca5bda727c9b8c485c`  
**Verified preview:** `https://tesla-waze-piped-h6gkc3w2l-lukaslejko-9932s-projects.vercel.app`  
**Verification workflow:** GitHub Actions run `36230438812`

## What the user verified on the real iPhone

This is the first protected baseline after the iPhone playback repair.

- tapping a track starts playback;
- manual Next changes track and playback continues;
- automatic transition after ENDED continues to the next track;
- playback continues on the iPhone lock screen/background;
- the lock screen currently shows 10-second seek controls. This is ACCEPTED. Do not change Media Session merely to replace these with Next/Previous unless the user explicitly requests a separate experiment.

## GOLDEN RULE: BUILD AROUND IT, NEVER THROUGH IT

All future Tesla Music work must treat this version as the immutable functional core.

**Go above it, around it, or below it — do not rewrite the working center.**

A new feature must be implemented as an isolated additive layer wherever technically possible. Do not refactor, replace, clean up, modernize, or reinterpret the working playback path merely because another implementation looks cleaner.

The golden branch is a return point, not a development branch. Never commit experiments directly to it.

## Locked playback contract

Do not change the verified V39 playback path unless the user's task explicitly requires a playback-core change:

- track click -> V39 `player.loadVideoById(t.id)`;
- Next -> existing V39 `playTrack(next)`;
- ENDED + AUTO -> existing V39 `next(false)`;
- no V40/native-playlist playback interceptor;
- no extra `playVideo()` polling/spam;
- do not destroy/recreate the YouTube player between tracks;
- the minimized iPhone YouTube iframe must remain rendered and retain a real box (never `display:none`, zero-size, `hidden`, or detached);
- no layer may repeatedly write `display:none!important` to `#playerWindow` on the mobile root;
- background/lock-screen playback must not regress.

## Mandatory development procedure

1. Start from the latest accepted functional state, with this golden branch retained untouched as rollback.
2. State exactly one requested change and list what must remain unchanged.
3. Create a separate feature/test branch. Never develop on this golden branch.
4. Make the smallest isolated change. Prefer an adapter/overlay/new component over edits to the playback core.
5. Before preview, run static checks and regression tests. A test using a mocked YouTube API proves DOM/control flow only; it must never be reported as proof of real iPhone audio or lock-screen behavior.
6. Preview only. Never change production directly.
7. Verify at minimum:
   - searched/selected track starts playing;
   - one Next = exactly one next track and it is PLAYING;
   - ENDED = exactly one next track and it is PLAYING;
   - no radio takeover;
   - no double skip;
   - no player/app flashing or recreation;
   - minimized player/iframe remains rendered;
   - search and Pre teba remain functional;
   - desktop/Tesla behavior has no unrelated regression.
8. For any change touching playback, visibility, iframe, Media Session, background behavior, service worker, or player lifecycle, require a real iPhone test before production.
9. Only after the real-device test passes may the exact tested preview be promoted. Prefer promotion of that exact deployment, not a rebuild.
10. If any regression appears, STOP. Do not stack another hotfix on the broken candidate. Return to this golden baseline and solve the new request around it.

## Special rule for Media Session / lock-screen controls

Changing the lock-screen 10-second seek buttons to Previous/Next is a separate experiment. It must not be bundled with unrelated work. Preserve this golden version first, create a separate preview, and prove that click, Next, ENDED and locked-iPhone continuation still work. If any of those regress, discard the experiment and keep the current controls.

## Definition of “functional”

A desktop/mock test alone is insufficient for iPhone playback claims. “Functional on iPhone” means the real-device sequence has been confirmed: track click -> playing; Next -> playing; ENDED -> next playing; locked/background -> playback continues.

When in doubt, preserve this baseline and stop rather than changing the working playback core.
