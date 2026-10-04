# Music mobile — connect lock-screen seeking to YouTube

Date: 2026-10-04. Candidate: **MOBILE-PREVIEW-20261004-05**.

## Owner result: rejected as a lock-screen fix

The owner tested Preview05 and reported that seeking from about one second to fifteen seconds only moves the system indicator. It alternates between fifteen and zero once per second, while the song does not audibly seek. Both the timeline and relative controls show an inaccurate position. The owner also reproduced Search switching back from Home after a response arrives.

The 58 passing script tests below demonstrated callback registration and application commands; they did not demonstrate native iPhone ownership, a stable system clock, or an audible seek. Preview05 is not an accepted lock-screen checkpoint. The next correction and its separate acceptance boundary are recorded in [music-mobile-navigation-native-20261004.md](music-mobile-navigation-native-20261004.md).
Status: implementation, technical verification and preview deployment checks passed; real iPhone lock-screen acceptance pending.

## Problem and observed evidence

The owner accepted the preceding mobile changes after the original/current Safari comparison, then reported that lock-screen Pause works but seeking does not, in both versions. `IMG_7526.jpeg` shows the system timeline and ten-second backward/forward buttons. These are seeking controls within the song; they are not the app's Next/Previous track buttons.

The overlay publishes `MediaSession.setPositionState()` and registers play, pause, nexttrack and previoustrack. It contains **no** handler for seekto, seekbackward or seekforward. Its only existing YouTube seek call comes from the application's own HTML slider. Therefore the parent page has no explicit route from a system seek command to the actual YouTube player.

Publishing the current time and receiving a user request to change that time are separate parts of Media Session. The missing handlers are a concrete defect, although adding them does not prove that the user's browser will route every background command to the parent page.

## Isolated implementation

Only mobile mode (`?mobile=1`, also used by the mobile app manifest) gains three action handlers, registered once:

| System action | Forwarded request |
| --- | --- |
| `seekto` | `player.seekTo(details.seekTime, true)` |
| `seekbackward` | Seek from the actual YouTube time backward by `seekOffset`, default 10 seconds |
| `seekforward` | Seek from the actual YouTube time forward by `seekOffset`, default 10 seconds |

Every target is clamped to the actual track duration. Unready player, absent current track, unavailable/invalid duration, invalid seek time, and non-positive or invalid explicit offset are ignored. Each registration is guarded separately so one unsupported action does not prevent the others. Player API exceptions do not interrupt the app.

The adapter calls only `seekTo`. It does not load another video, replace the player, start/pause music, change the playlist, alter Favorites, or claim a different Media Session. YouTube remains the source of truth for current time and state. Relative seeks read its current time for each command; there is no predicted clock or unconfirmed position update. Existing action registrations for play/pause/next/previous do not clear these distinct seek action slots.

## Related paused-seek correction

The existing near-end polling condition also ran while paused. A read-only reproduction paused a track at 179.5/180 seconds and advanced the timers: it loaded the next track and began playing. This would undermine seeking near the end while paused.

The condition now requires actual PLAYING state in mobile mode before scheduling that existing near-end transition. Other modes keep their prior condition. This small guard preserves pause after a seek near the end without issuing extra Play/Pause commands. Ordinary playing transitions retain their existing path.

## Scope and recovery

- Accepted preceding checkpoint: [MOBILE-SAFARI-20261004-01](music-mobile-safari-checkpoint-20261004.md).
- Previous preview deployment: `dep-db18som0tbcc73a345lg`, commit `4252531a585e51ccdec813ea19d23528cbf3fd73`.
- Production: `dep-datdogc9v7es738aofdg`, commit `163953618b01c714b5773830648415be0726fa47`; unchanged.
- The original playback initialization, autoplay parameters, keep-alive audio, MediaSession ownership behavior, metadata/time publication, queue and search behavior remain the preceding implementation.
- No changes to the immutable vendor core, server, APIs, QR remote or other Music services.
- Main script cache and startup build identifier: `20261004-5`.
- The exact-original reference page remains available as its unchanged historical comparator. It does not include this new repair; use the main preview link for acceptance.

## Verification and acceptance boundary

Full-script test result: **58/58 passed** (the preceding 47 regressions plus 11 targeted seek tests). The new tests exercise the registered Media Session callbacks, time boundaries, unsupported APIs, fresh player time, paused state, and the related near-end guard. They verify one seek per valid action and no extra Play, Pause, load, helper-audio or queue changes. The test double does not invent a successful seek by advancing its own time. It cannot verify physical iPhone lock-screen routing, audible playback, or Safari execution while the phone is locked.

The first new regression test was also run against the preceding application and correctly failed because the `seekto` handler was missing. JavaScript syntax and whitespace checks passed. Independent source review found no blocker and confirmed that the minified source diff contains only the documented mobile adapter, mobile paused-state guard and build/cache changes.

The phone test is: open the main preview in Safari, play a song, lock the phone, try both ten-second controls and the timeline, then Pause and seek while paused. The paused song must remain paused; Play must resume. Returning to the app should show the resulting YouTube position. Do not repeat the already completed autoplay comparison.

## Verified preview deployment

- Preview commit: `7f8c91b787e410b868fcfc00db1ab8d4d5e59873`.
- Deployment: `dep-db198a9srm7s73alhaag`.
- Render status: live; finished `2026-10-04T18:00:42.248984Z`.
- Verified versioned acceptance link: https://music-mobile-favorites-preview.onrender.com/?mobile=1&v=20261004-5
- Existing preview service: `srv-db17m8navr4c73alkop0`, free plan, auto-deploy off.
- Live HTML and application script returned HTTP 200 and matched the tested commit byte for byte. `/health` returned `ok:true` with the original core identifier. The historical reference script still matches its original bytes.
- Browser inspection confirmed the `20261004-5` script/build, restored Favorites list and selected song, and exactly one YouTube iframe. No new application exception was observed; the existing cloud-browser autoplay rejection remains present.
- Clicking the ordinary Play control cleared the startup message and retained the selected song/list. This is a UI check, not a claim of audible playback or of native lock-screen event delivery in this cloud browser.
- Proof screenshot: `music-mobilne-posuvanie-test-20261004-5.jpg`.
- Production was verified to serve the exact `1639536` application before the preview update and was not deployed by this task. Stable/GOLDEN designation and production promotion remain pending the requested real-device acceptance.

## Primary sources

- Apple WWDC21, Media Session and Now Playing actions: https://developer.apple.com/videos/play/wwdc2021/10189/
- YouTube `seekTo()` (including paused-state behavior and seeking outside the buffer): https://developers.google.com/youtube/iframe_api_reference#seekTo
- W3C action details and session routing: https://www.w3.org/TR/mediasession/
