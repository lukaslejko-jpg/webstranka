# TESLA MUSIC SAFE CORE

SAFE CORE branch: `safe/tesla-youtube-core-20260928`

## Immutable rule
The SAFE CORE is never edited, rebased, force-pushed, or used for experiments.

## Development rule
All Tesla changes are overlays on `feature/tesla-youtube-app-20260928`.
Do not modify mobile Music or production Music while developing Tesla.

## Required layers
1. Core: search + single playback + queue + open-browser auto-next.
2. Tesla background: LongPlay silent keep-alive + MediaSession.
3. UI overlay: layout, resize/swap, controls, durations.
4. Library overlay: Pre teba, Vyhľadané, Obľúbené, Naposledy.
5. Discovery overlay: filters, similar music, artist.
6. Remote overlay: QR/mobile remote.
7. Validation overlay: automated smoke tests.

## Promotion gate
Never promote to /desktop until all automated tests pass and the user confirms one complete real-Tesla test.
