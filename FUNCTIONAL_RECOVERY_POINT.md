# FUNCTIONAL RECOVERY POINT — OWNER APPROVED STATE

Created before any Tesla Media Bridge experiment.

Branch: backup/music-functional-pre-media-bridge-20260928-1950
Source state: feature/longplay-youtube-overlay-20260928
Date: 2026-09-28

Known working in real Tesla at this point:
- YouTube search returns results.
- Clicking a result starts YouTube playback with sound.
- Tesla-fit split layout renders.
- Music / Similar music / Artist filters work.
- QR opens mobile remote; mobile UI has been repaired to compact/tappable form.
- In-app player controls and progress render.
- Shuffle/Repeat visual state was simplified.
- LongPlay pristine CORE remains separately locked at Hiepler/LongPlay@c98c0353f1b78b311255ce56fd901ecd7cd83155.

KNOWN NOT WORKING / NOT PART OF THIS RECOVERY CLAIM:
- Native Tesla left media panel still remains on FM/radio and does not adopt browser YouTube metadata/controls.

RULE:
This branch is a recovery snapshot. Do not develop on it. All Tesla Media Bridge experiments must happen on a separate branch. Never force-push or rewrite this branch.
